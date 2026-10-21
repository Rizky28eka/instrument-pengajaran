import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ambilSnapshot, INSTRUMEN_AKTIF, type Instrumen } from '@/data/instrumen'
import { PesanAplikasi } from '@/features/auth/actions'
import type { Guru } from '@/features/guru/api'
import { hitungRingkasan, type Ringkasan } from '@/lib/scoring'
import { dokumenKeSupervisi, type Supervisi } from './mapper'
import type { SupervisiFormValues } from './schema'

export type { Supervisi }

export const UKURAN_HALAMAN = 25
/** Batas atas untuk dashboard dan ekspor agar pembacaan tidak tumbuh tanpa batas. */
export const BATAS_TERBARU = 500
export const BATAS_EKSPOR = 2000

const supervisiCol = () => collection(db, 'supervisi')

/** Pelaku perubahan — dicatat pada setiap entri riwayat. */
export interface Pelaku {
  uid: string
  nama: string
}

export interface HalamanSupervisi {
  item: Supervisi[]
  kursor: QueryDocumentSnapshot | null
  adaLagi: boolean
}

// Semua query dibatasi `schoolId` + `deletedAt == null`: Rules menolak query yang tidak dapat
// dibuktikan hanya mengembalikan dokumen milik sekolah pengguna yang belum dihapus.
const aktifSekolah = (schoolId: string): QueryConstraint[] => [where('schoolId', '==', schoolId), where('deletedAt', '==', null)]

export async function ambilHalaman(schoolId: string, kursor?: QueryDocumentSnapshot | null): Promise<HalamanSupervisi> {
  const q = query(
    supervisiCol(),
    ...aktifSekolah(schoolId),
    orderBy('identitas.tanggal', 'desc'),
    ...(kursor ? [startAfter(kursor)] : []),
    limit(UKURAN_HALAMAN + 1), // satu ekstra untuk mengetahui apakah masih ada halaman berikutnya
  )
  const snap = await getDocs(q)
  const ada = snap.docs.slice(0, UKURAN_HALAMAN)
  return {
    item: ada.map((d) => dokumenKeSupervisi(d.id, d.data())),
    kursor: ada.length ? ada[ada.length - 1] : null,
    adaLagi: snap.docs.length > UKURAN_HALAMAN,
  }
}

/** Dokumen terbaru, dipakai dashboard dan ekspor. `terpotong` true bila mencapai batas. */
export async function ambilTerbaru(schoolId: string, batas = BATAS_TERBARU): Promise<{ item: Supervisi[]; terpotong: boolean }> {
  const snap = await getDocs(query(supervisiCol(), ...aktifSekolah(schoolId), orderBy('identitas.tanggal', 'desc'), limit(batas)))
  return { item: snap.docs.map((d) => dokumenKeSupervisi(d.id, d.data())), terpotong: snap.size >= batas }
}

/** Tempat sampah (soft-delete). Hanya admin yang diizinkan Rules membacanya. */
export async function ambilDihapus(schoolId: string): Promise<Supervisi[]> {
  const snap = await getDocs(
    query(supervisiCol(), where('schoolId', '==', schoolId), where('deletedAt', '!=', null), orderBy('deletedAt', 'desc'), limit(100)),
  )
  return snap.docs.map((d) => dokumenKeSupervisi(d.id, d.data()))
}

export async function ambilSupervisi(id: string): Promise<Supervisi | null> {
  const snap = await getDoc(doc(db, 'supervisi', id))
  return snap.exists() ? dokumenKeSupervisi(snap.id, snap.data()) : null
}

export interface EntriRiwayat {
  rev: number
  aksi: 'buat' | 'ubah' | 'hapus' | 'pulihkan'
  oleh: string
  olehNama: string
  waktu: Date | null
  nilai?: number
  predikat?: string
}

export async function ambilRiwayat(id: string): Promise<EntriRiwayat[]> {
  const snap = await getDocs(query(collection(db, 'supervisi', id, 'riwayat'), orderBy('rev', 'desc')))
  return snap.docs.map((d) => {
    const x = d.data()
    return {
      rev: x.rev,
      aksi: x.aksi,
      oleh: x.oleh,
      olehNama: x.olehNama,
      waktu: x.waktu?.toDate?.() ?? null,
      nilai: x.ringkasan?.nilai,
      predikat: x.ringkasan?.predikat,
    }
  })
}

const entriRiwayat = (aksi: EntriRiwayat['aksi'], rev: number, p: Pelaku, ringkasan?: Ringkasan) => ({
  aksi,
  oleh: p.uid,
  olehNama: p.nama,
  waktu: serverTimestamp(),
  rev,
  ...(ringkasan ? { ringkasan: { nilai: ringkasan.nilai, predikat: ringkasan.predikat } } : {}),
})

/**
 * Perubahan data selalu sepaket dengan entri riwayat (satu batch atomik). Rules menolak perubahan
 * tanpa riwayat atau dengan nomor revisi yang usang — menolak penimpaan diam-diam (lost update).
 */
function terjemahkanPenolakan(e: unknown): never {
  if ((e as { code?: string }).code === 'permission-denied') {
    throw new PesanAplikasi(
      'Perubahan ditolak. Data mungkin sudah diubah oleh pengguna lain atau Anda tidak berhak mengubahnya. Muat ulang halaman lalu coba lagi.',
    )
  }
  throw e
}

export interface MasukanBuat {
  values: SupervisiFormValues
  guru: Guru
  namaSekolah: string
  schoolId: string
  pelaku: Pelaku
}

export async function buatSupervisi({ values, guru, namaSekolah, schoolId, pelaku }: MasukanBuat): Promise<string> {
  const ref = doc(supervisiCol())
  const ringkasan = hitungRingkasan(values.skor, INSTRUMEN_AKTIF)
  const batch = writeBatch(db)
  batch.set(ref, {
    schoolId,
    guruId: guru.id,
    guruNama: guru.nama,
    identitas: { ...values.identitas, namaSekolah, namaGuru: guru.nama },
    skor: values.skor,
    catatanAspek: values.catatanAspek,
    catatan: values.catatan,
    // Ringkasan ikut disimpan agar mudah dibaca dari Firestore console / ekspor eksternal.
    ringkasan,
    versiInstrumen: INSTRUMEN_AKTIF.versi,
    instrumen: ambilSnapshot(INSTRUMEN_AKTIF),
    createdBy: pelaku.uid,
    createdByName: pelaku.nama,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: pelaku.uid,
    rev: 1,
    deletedAt: null,
    deletedBy: null,
  })
  batch.set(doc(ref, 'riwayat', '1'), entriRiwayat('buat', 1, pelaku, ringkasan))
  try {
    await batch.commit()
  } catch (e) {
    return terjemahkanPenolakan(e)
  }
  return ref.id
}

export async function ubahSupervisi(awal: Supervisi, values: SupervisiFormValues, pelaku: Pelaku): Promise<void> {
  // Instrumen dokumen TIDAK diganti saat diubah: versi dan snapshot tetap seperti saat dibuat.
  const instrumen: Instrumen = awal.instrumen
  const ringkasan = hitungRingkasan(values.skor, instrumen)
  const rev = awal.rev + 1
  const ref = doc(supervisiCol(), awal.id)
  const batch = writeBatch(db)
  batch.update(ref, {
    identitas: { ...values.identitas, namaSekolah: awal.identitas.namaSekolah, namaGuru: awal.identitas.namaGuru },
    skor: values.skor,
    catatanAspek: values.catatanAspek,
    catatan: values.catatan,
    ringkasan,
    rev,
    updatedAt: serverTimestamp(),
    updatedBy: pelaku.uid,
  })
  batch.set(doc(ref, 'riwayat', String(rev)), entriRiwayat('ubah', rev, pelaku, ringkasan))
  try {
    await batch.commit()
  } catch (e) {
    terjemahkanPenolakan(e)
  }
}

export async function hapusSupervisi(awal: Supervisi, pelaku: Pelaku): Promise<void> {
  const rev = awal.rev + 1
  const ref = doc(supervisiCol(), awal.id)
  const batch = writeBatch(db)
  batch.update(ref, { deletedAt: serverTimestamp(), deletedBy: pelaku.uid, rev, updatedAt: serverTimestamp(), updatedBy: pelaku.uid })
  batch.set(doc(ref, 'riwayat', String(rev)), entriRiwayat('hapus', rev, pelaku))
  try {
    await batch.commit()
  } catch (e) {
    terjemahkanPenolakan(e)
  }
}

export async function pulihkanSupervisi(awal: Supervisi, pelaku: Pelaku): Promise<void> {
  const rev = awal.rev + 1
  const ref = doc(supervisiCol(), awal.id)
  const batch = writeBatch(db)
  batch.update(ref, { deletedAt: null, deletedBy: null, rev, updatedAt: serverTimestamp(), updatedBy: pelaku.uid })
  batch.set(doc(ref, 'riwayat', String(rev)), entriRiwayat('pulihkan', rev, pelaku))
  try {
    await batch.commit()
  } catch (e) {
    terjemahkanPenolakan(e)
  }
}
