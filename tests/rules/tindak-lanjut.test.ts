import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, serverTimestamp, Timestamp, updateDoc, writeBatch, type Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { ambilEnv, GURU_A1, GURU_B1, isiDataAwal, riwayat, sebagai, SEK_A, SEK_B, siapkanEnv, SV_A1, SV_B1, TL_A1 } from './helpers'

beforeAll(async () => {
  await siapkanEnv()
})
beforeEach(async () => {
  await isiDataAwal()
})
afterAll(async () => {
  await ambilEnv().cleanup()
})

const BARU = 'tl-baru'
const dokumen = (patch: Record<string, unknown> = {}) => ({
  schoolId: SEK_A, supervisiId: SV_A1, guruId: GURU_A1, guruNama: 'Budi', deskripsi: 'Observasi ulang', status: 'belum',
  penanggungJawab: 'Kepala sekolah', tenggat: '2026-12-31', selesaiAt: null, createdBy: 'supA1', createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(), updatedBy: 'supA1', rev: 1, ...patch,
})

async function buat(db: Firestore, id: string, data: Record<string, unknown>, entri: Record<string, unknown> | null) {
  const b = writeBatch(db)
  b.set(doc(db, 'tindakLanjut', id), data)
  if (entri) b.set(doc(db, 'tindakLanjut', id, 'riwayat', '1'), entri)
  return b.commit()
}

async function ubah(db: Firestore, id: string, patch: Record<string, unknown>, rev: number, entri: Record<string, unknown> | null) {
  const b = writeBatch(db)
  b.update(doc(db, 'tindakLanjut', id), patch)
  if (entri) b.set(doc(db, 'tindakLanjut', id, 'riwayat', String(rev)), entri)
  return b.commit()
}

describe('membuat tindak lanjut', () => {
  it('anggota sekolah membuatnya untuk supervisi sekolahnya', async () => {
    await assertSucceeds(buat(sebagai('supA2'), BARU, dokumen({ createdBy: 'supA2', updatedBy: 'supA2' }), riwayat('buat', 1, 'supA2')))
  })

  it('ditolak tanpa riwayat', async () => {
    await assertFails(buat(sebagai('supA1'), BARU, dokumen(), null))
  })

  it('ditolak untuk supervisi sekolah lain', async () => {
    await assertFails(buat(sebagai('supA1'), BARU, dokumen({ supervisiId: SV_B1 }), riwayat('buat', 1, 'supA1')))
  })

  it('ditolak jika schoolId tidak sama dengan sekolah supervisi / pengguna', async () => {
    await assertFails(buat(sebagai('supB'), BARU, dokumen({ schoolId: SEK_B, createdBy: 'supB', updatedBy: 'supB' }), riwayat('buat', 1, 'supB')))
  })

  it('ditolak jika guru tidak sesuai dengan guru pada supervisi', async () => {
    await assertFails(buat(sebagai('supA1'), BARU, dokumen({ guruId: GURU_B1 }), riwayat('buat', 1, 'supA1')))
  })

  it.each([
    ['status awal bukan "belum"', { status: 'selesai', selesaiAt: serverTimestamp() }],
    ['status tidak dikenal', { status: 'ngambang' }],
    ['deskripsi kosong', { deskripsi: '' }],
    ['deskripsi terlalu panjang', { deskripsi: 'x'.repeat(2001) }],
    ['tenggat bukan tanggal', { tenggat: 'minggu depan' }],
    ['rev bukan 1', { rev: 3 }],
    ['createdBy palsu', { createdBy: 'adminA' }],
    ['field asing', { prioritas: 'tinggi' }],
  ])('ditolak: %s', async (_n, patch) => {
    await assertFails(buat(sebagai('supA1'), BARU, dokumen(patch), riwayat('buat', 1, 'supA1')))
  })

  it('tenggat boleh kosong', async () => {
    await assertSucceeds(buat(sebagai('supA1'), BARU, dokumen({ tenggat: null }), riwayat('buat', 1, 'supA1')))
  })
})

describe('mengubah tindak lanjut', () => {
  const dasar = (uid: string, rev: number, patch: Record<string, unknown> = {}) => ({
    deskripsi: 'Observasi ulang', status: 'belum', penanggungJawab: 'Kepala sekolah', tenggat: '2026-12-31', selesaiAt: null,
    rev, updatedAt: serverTimestamp(), updatedBy: uid, ...patch,
  })

  it('belum → proses', async () => {
    await assertSucceeds(ubah(sebagai('supA1'), TL_A1, dasar('supA1', 2, { status: 'proses' }), 2, riwayat('status', 2, 'supA1', { dari: 'belum', ke: 'proses' })))
  })

  it('belum → selesai menetapkan selesaiAt dengan waktu server', async () => {
    await assertSucceeds(ubah(sebagai('adminA'), TL_A1, dasar('adminA', 2, { status: 'selesai', selesaiAt: serverTimestamp() }), 2, riwayat('status', 2, 'adminA')))
    const snap = await getDoc(doc(sebagai('adminA'), 'tindakLanjut', TL_A1))
    if (!snap.data()?.selesaiAt) throw new Error('selesaiAt harus terisi')
  })

  it('selesai tanpa selesaiAt ditolak, atau selesaiAt dari jam klien ditolak', async () => {
    await assertFails(ubah(sebagai('supA1'), TL_A1, dasar('supA1', 2, { status: 'selesai' }), 2, riwayat('status', 2, 'supA1')))
    await assertFails(ubah(sebagai('supA1'), TL_A1, dasar('supA1', 2, { status: 'selesai', selesaiAt: Timestamp.fromMillis(0) }), 2, riwayat('status', 2, 'supA1')))
  })

  it('selesaiAt harus kosong bila status bukan selesai', async () => {
    await assertFails(ubah(sebagai('supA1'), TL_A1, dasar('supA1', 2, { status: 'proses', selesaiAt: serverTimestamp() }), 2, riwayat('status', 2, 'supA1')))
  })

  it('selesai tidak dapat langsung kembali ke "belum"; harus dibuka ulang sebagai "proses"', async () => {
    const db = sebagai('supA1')
    await assertSucceeds(ubah(db, TL_A1, dasar('supA1', 2, { status: 'selesai', selesaiAt: serverTimestamp() }), 2, riwayat('status', 2, 'supA1')))
    await assertFails(ubah(db, TL_A1, dasar('supA1', 3, { status: 'belum' }), 3, riwayat('status', 3, 'supA1')))
    await assertSucceeds(ubah(db, TL_A1, dasar('supA1', 3, { status: 'proses' }), 3, riwayat('status', 3, 'supA1')))
  })

  it('catatan progres tanpa mengubah status tetap menaikkan rev dan menulis riwayat', async () => {
    await assertSucceeds(ubah(sebagai('supA1'), TL_A1, dasar('supA1', 2), 2, riwayat('catatan', 2, 'supA1', { catatan: 'Sudah dijadwalkan' })))
  })

  it('selesaiAt tidak berubah saat status tetap selesai', async () => {
    const db = sebagai('supA1')
    await ubah(db, TL_A1, dasar('supA1', 2, { status: 'selesai', selesaiAt: serverTimestamp() }), 2, riwayat('status', 2, 'supA1'))
    await assertFails(ubah(db, TL_A1, dasar('supA1', 3, { status: 'selesai', selesaiAt: serverTimestamp() }), 3, riwayat('catatan', 3, 'supA1')))
  })

  it('ditolak tanpa riwayat atau tanpa kenaikan rev', async () => {
    await assertFails(ubah(sebagai('supA1'), TL_A1, dasar('supA1', 2, { status: 'proses' }), 2, null))
    await assertFails(ubah(sebagai('supA1'), TL_A1, dasar('supA1', 1, { status: 'proses' }), 1, riwayat('status', 1, 'supA1')))
  })

  it('rev usang ditolak (perlindungan lost update)', async () => {
    const db = sebagai('supA1')
    await assertSucceeds(ubah(db, TL_A1, dasar('supA1', 2, { status: 'proses' }), 2, riwayat('status', 2, 'supA1')))
    await assertFails(ubah(db, TL_A1, dasar('supA1', 2, { status: 'dibatalkan' }), 2, riwayat('status', 2, 'supA1')))
  })

  it.each([
    ['sekolah', { schoolId: SEK_B }],
    ['supervisi terkait', { supervisiId: SV_B1 }],
    ['guru', { guruId: GURU_B1 }],
    ['pembuat', { createdBy: 'adminA' }],
    ['status tidak dikenal', { status: 'ngambang' }],
  ])('tidak boleh mengubah: %s', async (_n, patch) => {
    await assertFails(ubah(sebagai('supA1'), TL_A1, dasar('supA1', 2, patch), 2, riwayat('ubah', 2, 'supA1')))
  })

  it('sekolah lain tidak dapat mengubah atau membaca', async () => {
    await assertFails(ubah(sebagai('adminB'), TL_A1, dasar('adminB', 2, { status: 'proses' }), 2, riwayat('status', 2, 'adminB')))
    await assertFails(getDoc(doc(sebagai('adminB'), 'tindakLanjut', TL_A1)))
  })

  it('riwayat tindak lanjut tidak dapat dipalsukan atau diubah', async () => {
    const db = sebagai('supA1')
    await assertFails(ubah(db, TL_A1, dasar('supA1', 2, { status: 'proses' }), 2, riwayat('status', 2, 'adminA')))
    await ubah(db, TL_A1, dasar('supA1', 2, { status: 'proses' }), 2, riwayat('status', 2, 'supA1', { dari: 'belum', ke: 'proses' }))
    await assertFails(updateDoc(doc(db, 'tindakLanjut', TL_A1, 'riwayat', '2'), { catatan: 'diubah' }))
    await assertFails(deleteDoc(doc(db, 'tindakLanjut', TL_A1, 'riwayat', '2')))
  })

  it('tidak dapat dihapus', async () => {
    await assertFails(deleteDoc(doc(sebagai('adminA'), 'tindakLanjut', TL_A1)))
  })
})
