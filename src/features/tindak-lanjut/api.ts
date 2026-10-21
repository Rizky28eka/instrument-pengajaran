import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { terjemahkanPenolakan } from '@/lib/penolakan'
import type { Pelaku } from '@/features/supervisi/api'
import { dokumenKeTindak } from './mapper'
import type { StatusTindak, TindakLanjut } from './logic'
import type { TindakForm } from './schema'

export const BATAS_TINDAK = 500

const tindakCol = () => collection(db, 'tindakLanjut')

export async function daftarTindakLanjut(schoolId: string): Promise<{ item: TindakLanjut[]; terpotong: boolean }> {
  const snap = await getDocs(query(tindakCol(), where('schoolId', '==', schoolId), limit(BATAS_TINDAK)))
  return { item: snap.docs.map((d) => dokumenKeTindak(d.id, d.data())), terpotong: snap.size >= BATAS_TINDAK }
}

export async function daftarUntukSupervisi(schoolId: string, supervisiId: string): Promise<TindakLanjut[]> {
  const snap = await getDocs(query(tindakCol(), where('schoolId', '==', schoolId), where('supervisiId', '==', supervisiId)))
  return snap.docs.map((d) => dokumenKeTindak(d.id, d.data()))
}

export interface EntriRiwayatTindak {
  rev: number
  aksi: 'buat' | 'ubah' | 'status' | 'catatan'
  oleh: string
  olehNama: string
  waktu: Date | null
  dari?: StatusTindak
  ke?: StatusTindak
  catatan?: string
}

export async function ambilRiwayatTindak(id: string): Promise<EntriRiwayatTindak[]> {
  const snap = await getDocs(query(collection(db, 'tindakLanjut', id, 'riwayat'), orderBy('rev', 'desc')))
  return snap.docs.map((d) => {
    const x = d.data()
    return { rev: x.rev, aksi: x.aksi, oleh: x.oleh, olehNama: x.olehNama, waktu: x.waktu?.toDate?.() ?? null, dari: x.dari, ke: x.ke, catatan: x.catatan }
  })
}

const entri = (aksi: EntriRiwayatTindak['aksi'], rev: number, p: Pelaku, ekstra: Partial<Pick<EntriRiwayatTindak, 'dari' | 'ke' | 'catatan'>> = {}) => ({
  aksi,
  oleh: p.uid,
  olehNama: p.nama,
  waktu: serverTimestamp(),
  rev,
  ...Object.fromEntries(Object.entries(ekstra).filter(([, v]) => v !== undefined && v !== '')),
})

export interface SupervisiRujukan {
  id: string
  schoolId: string
  guruId: string
  guruNama: string
}

export async function buatTindakLanjut(rujukan: SupervisiRujukan, isi: TindakForm, pelaku: Pelaku): Promise<string> {
  const ref = doc(tindakCol())
  const batch = writeBatch(db)
  batch.set(ref, {
    schoolId: rujukan.schoolId,
    supervisiId: rujukan.id,
    guruId: rujukan.guruId,
    guruNama: rujukan.guruNama,
    deskripsi: isi.deskripsi,
    status: 'belum',
    penanggungJawab: isi.penanggungJawab,
    tenggat: isi.tenggat,
    selesaiAt: null,
    createdBy: pelaku.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: pelaku.uid,
    rev: 1,
  })
  batch.set(doc(ref, 'riwayat', '1'), entri('buat', 1, pelaku))
  try {
    await batch.commit()
  } catch (e) {
    return terjemahkanPenolakan(e)
  }
  return ref.id
}

export interface PerubahanTindak {
  isi?: TindakForm
  status?: StatusTindak
  catatan?: string
}

/**
 * Satu fungsi untuk semua perubahan; jenis entri riwayat ditentukan dari yang berubah:
 * status berubah → "status"; isi berubah → "ubah"; hanya catatan → "catatan".
 * Perubahan tidak menyentuh skor supervisi (koleksi terpisah).
 */
export async function ubahTindakLanjut(awal: TindakLanjut, p: PerubahanTindak, pelaku: Pelaku): Promise<void> {
  const statusBaru = p.status ?? awal.status
  const statusBerubah = statusBaru !== awal.status
  const isiBerubah =
    !!p.isi && (p.isi.deskripsi !== awal.deskripsi || p.isi.penanggungJawab !== awal.penanggungJawab || p.isi.tenggat !== awal.tenggat)
  if (!statusBerubah && !isiBerubah && !p.catatan) return // tidak ada yang berubah: jangan menaikkan rev

  const rev = awal.rev + 1
  const aksi: EntriRiwayatTindak['aksi'] = statusBerubah ? 'status' : isiBerubah ? 'ubah' : 'catatan'
  const ref = doc(tindakCol(), awal.id)
  const batch = writeBatch(db)
  batch.update(ref, {
    deskripsi: p.isi?.deskripsi ?? awal.deskripsi,
    penanggungJawab: p.isi?.penanggungJawab ?? awal.penanggungJawab,
    tenggat: p.isi ? p.isi.tenggat : awal.tenggat,
    status: statusBaru,
    // selesaiAt: dicap saat masuk "selesai", dihapus saat keluar, dibiarkan bila tetap selesai.
    ...(statusBaru === 'selesai' ? (awal.status === 'selesai' ? {} : { selesaiAt: serverTimestamp() }) : { selesaiAt: null }),
    rev,
    updatedAt: serverTimestamp(),
    updatedBy: pelaku.uid,
  })
  batch.set(doc(ref, 'riwayat', String(rev)), entri(aksi, rev, pelaku, { dari: statusBerubah ? awal.status : undefined, ke: statusBerubah ? statusBaru : undefined, catatan: p.catatan }))
  try {
    await batch.commit()
  } catch (e) {
    terjemahkanPenolakan(e)
  }
}
