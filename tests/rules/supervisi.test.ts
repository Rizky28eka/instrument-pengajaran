import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  ambilEnv,
  GURU_A1,
  GURU_A_NONAKTIF,
  GURU_B1,
  isiDataAwal,
  isiSupervisi,
  metaBuat,
  riwayat,
  sebagai,
  SEK_A,
  SEK_B,
  siapkanEnv,
  SNAPSHOT_UJI,
  SV_A1,
  tulisSupervisi,
  ubahSupervisi,
} from './helpers'

beforeAll(async () => {
  await siapkanEnv()
})
beforeEach(async () => {
  await isiDataAwal()
})
afterAll(async () => {
  await ambilEnv().cleanup()
})

const BARU = 'sv-baru'
const dokumenBaru = (uid = 'supA1', patch: Record<string, unknown> = {}) => ({ ...isiSupervisi(SEK_A, GURU_A1, 'Budi'), ...metaBuat(uid), ...patch })

describe('membuat supervisi', () => {
  it('supervisor membuat dokumen valid beserta riwayat awal', async () => {
    await assertSucceeds(tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru(), riwayat('buat', 1, 'supA1')))
  })

  it('dapat dibaca kembali oleh rekan satu sekolah', async () => {
    await tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru(), riwayat('buat', 1, 'supA1'))
    await assertSucceeds(getDoc(doc(sebagai('supA2'), 'supervisi', BARU)))
  })

  it('ditolak tanpa entri riwayat (jejak audit tidak dapat dilewati)', async () => {
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru(), null))
  })

  it('ditolak jika riwayat memakai aksi atau pelaku palsu', async () => {
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru(), riwayat('ubah', 1, 'supA1')))
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru(), riwayat('buat', 1, 'adminA')))
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru(), { ...riwayat('buat', 1, 'supA1'), waktu: Timestamp.fromMillis(0) }))
  })

  it('ditolak untuk sekolah yang bukan miliknya', async () => {
    const d = { ...isiSupervisi(SEK_B, GURU_B1, 'Sari'), ...metaBuat('supA1') }
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, d, riwayat('buat', 1, 'supA1')))
  })

  it('ditolak jika guru berasal dari sekolah lain', async () => {
    const d = { ...isiSupervisi(SEK_A, GURU_B1, 'Sari'), ...metaBuat('supA1') }
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, d, riwayat('buat', 1, 'supA1')))
  })

  it('ditolak jika guru tidak aktif', async () => {
    const d = { ...isiSupervisi(SEK_A, GURU_A_NONAKTIF, 'Lama'), ...metaBuat('supA1') }
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, d, riwayat('buat', 1, 'supA1')))
  })

  it('ditolak jika nama guru tidak sama dengan data master', async () => {
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru('supA1', { guruNama: 'Orang Lain' }), riwayat('buat', 1, 'supA1')))
  })

  it('ditolak jika atas nama pengguna lain (createdBy palsu)', async () => {
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru('supA2'), riwayat('buat', 1, 'supA1')))
  })

  it.each([
    ['createdAt dari jam klien', { createdAt: Timestamp.fromMillis(0) }],
    ['rev bukan 1', { rev: 5 }],
    ['sudah ditandai terhapus', { deletedAt: serverTimestamp(), deletedBy: 'supA1' }],
    ['field asing / eskalasi', { admin: true }],
    ['skor di atas 4', { skor: { A1: 5, A2: 4 } }],
    ['skor nol', { skor: { A1: 0 } }],
    ['skor pecahan teks', { skor: { A1: '4' } }],
    ['ringkasan nilai > 100', { ringkasan: { total: 1, maks: 1, nilai: 150 } }],
    ['tanggal tidak valid', { identitas: { ...isiSupervisi(SEK_A, GURU_A1, 'Budi').identitas, tanggal: '21/10/2026' } }],
    ['model pembelajaran tidak dikenal', { identitas: { ...isiSupervisi(SEK_A, GURU_A1, 'Budi').identitas, modelPembelajaran: 'Hybrid' } }],
    ['catatan terlalu panjang', { catatan: { kekuatan: 'x'.repeat(4001), perbaikan: '', rekomendasi: '' } }],
    ['versi instrumen tidak cocok dengan snapshot', { versiInstrumen: 'lain' }],
    ['skor terlalu banyak entri', { skor: Object.fromEntries(Array.from({ length: 130 }, (_, i) => [`K${i}`, 3])) }],
  ])('ditolak: %s', async (_nama, patch) => {
    await assertFails(tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru('supA1', patch), riwayat('buat', 1, 'supA1')))
  })
})

describe('mengubah supervisi', () => {
  const ubah = (db: ReturnType<typeof sebagai>, uid: string, patch: Record<string, unknown> = {}, rev = 2) =>
    ubahSupervisi(
      db,
      SV_A1,
      { catatan: { kekuatan: 'revisi', perbaikan: '', rekomendasi: '' }, rev, updatedAt: serverTimestamp(), updatedBy: uid, ...patch },
      riwayat('ubah', rev, uid),
      rev,
    )

  it('pembuat mengubah isi dokumennya', async () => {
    await assertSucceeds(ubah(sebagai('supA1'), 'supA1'))
  })

  it('admin sekolah mengubah dokumen supervisor', async () => {
    await assertSucceeds(ubah(sebagai('adminA'), 'adminA'))
  })

  it('supervisor lain di sekolah yang sama tidak dapat mengubah dokumen orang lain', async () => {
    await assertFails(ubah(sebagai('supA2'), 'supA2'))
  })

  it('admin sekolah lain tidak dapat mengubah', async () => {
    await assertFails(ubah(sebagai('adminB'), 'adminB'))
  })

  it('ditolak tanpa menaikkan rev', async () => {
    await assertFails(ubah(sebagai('supA1'), 'supA1', {}, 1))
  })

  it('ditolak melompati rev', async () => {
    await assertFails(ubah(sebagai('supA1'), 'supA1', {}, 3))
  })

  it('lost update: penyimpanan kedua dengan rev usang ditolak', async () => {
    const db = sebagai('supA1')
    await assertSucceeds(ubah(db, 'supA1', {}, 2)) // tab pertama berhasil → rev menjadi 2
    await assertFails(ubah(db, 'supA1', { catatan: { kekuatan: 'tab lama', perbaikan: '', rekomendasi: '' } }, 2)) // tab kedua masih rev 1
    await assertSucceeds(ubah(db, 'supA1', {}, 3)) // setelah memuat ulang, rev 3 dapat
  })

  it('ditolak tanpa entri riwayat', async () => {
    await assertFails(
      ubahSupervisi(sebagai('supA1'), SV_A1, { rev: 2, updatedAt: serverTimestamp(), updatedBy: 'supA1', catatan: { kekuatan: 'x', perbaikan: '', rekomendasi: '' } }, null, 2),
    )
  })

  it.each([
    ['schoolId (pindah sekolah)', { schoolId: SEK_B }],
    ['guruId', { guruId: GURU_B1 }],
    ['guruNama', { guruNama: 'Palsu' }],
    ['pembuat', { createdBy: 'supA2' }],
    ['nama pembuat', { createdByName: 'Palsu' }],
    ['waktu pembuatan', { createdAt: Timestamp.fromMillis(0) }],
    ['versi instrumen', { versiInstrumen: 'baru-9' }],
    ['snapshot instrumen', { instrumen: { ...SNAPSHOT_UJI, nama: 'Diubah' } }],
  ])('field yang tidak boleh berubah: %s', async (_nama, patch) => {
    await assertFails(ubah(sebagai('supA1'), 'supA1', patch))
  })

  it('ditolak jika updatedBy dipalsukan atau updatedAt bukan waktu server', async () => {
    await assertFails(ubah(sebagai('supA1'), 'supA1', { updatedBy: 'adminA' }))
    await assertFails(ubah(sebagai('supA1'), 'supA1', { updatedAt: Timestamp.fromMillis(0) }))
  })

  it('ditolak jika nilai baru melanggar validasi (skor 9)', async () => {
    await assertFails(ubah(sebagai('supA1'), 'supA1', { skor: { A1: 9 } }))
  })

  it('riwayat tidak dapat dipalsukan atas nama orang lain', async () => {
    await assertFails(
      ubahSupervisi(
        sebagai('supA1'),
        SV_A1,
        { catatan: { kekuatan: 'x', perbaikan: '', rekomendasi: '' }, rev: 2, updatedAt: serverTimestamp(), updatedBy: 'supA1' },
        riwayat('ubah', 2, 'adminA'),
        2,
      ),
    )
  })
})

describe('soft-delete dan pemulihan', () => {
  const hapus = (db: ReturnType<typeof sebagai>, uid: string, patch: Record<string, unknown> = {}) =>
    ubahSupervisi(db, SV_A1, { deletedAt: serverTimestamp(), deletedBy: uid, rev: 2, updatedAt: serverTimestamp(), updatedBy: uid, ...patch }, riwayat('hapus', 2, uid), 2)

  const pulihkan = (db: ReturnType<typeof sebagai>, uid: string) =>
    ubahSupervisi(db, SV_A1, { deletedAt: null, deletedBy: null, rev: 3, updatedAt: serverTimestamp(), updatedBy: uid }, riwayat('pulihkan', 3, uid), 3)

  it('pembuat menghapus (soft) dokumennya', async () => {
    await assertSucceeds(hapus(sebagai('supA1'), 'supA1'))
  })

  it('admin menghapus (soft) dokumen supervisor', async () => {
    await assertSucceeds(hapus(sebagai('adminA'), 'adminA'))
  })

  it('supervisor lain tidak dapat menghapus dokumen orang lain', async () => {
    await assertFails(hapus(sebagai('supA2'), 'supA2'))
  })

  it('penghapusan tidak boleh sekaligus mengubah isi', async () => {
    await assertFails(hapus(sebagai('supA1'), 'supA1', { skor: { A1: 1 } }))
  })

  it('penghapusan harus memakai aksi "hapus" pada riwayat', async () => {
    await assertFails(
      ubahSupervisi(sebagai('supA1'), SV_A1, { deletedAt: serverTimestamp(), deletedBy: 'supA1', rev: 2, updatedAt: serverTimestamp(), updatedBy: 'supA1' }, riwayat('ubah', 2, 'supA1'), 2),
    )
  })

  it('setelah dihapus, dokumen tidak lagi terbaca oleh supervisor tetapi terbaca oleh admin', async () => {
    await hapus(sebagai('supA1'), 'supA1')
    await assertFails(getDoc(doc(sebagai('supA1'), 'supervisi', SV_A1)))
    await assertFails(getDoc(doc(sebagai('supA2'), 'supervisi', SV_A1)))
    await assertSucceeds(getDoc(doc(sebagai('adminA'), 'supervisi', SV_A1)))
  })

  it('daftar milik supervisor hanya memuat dokumen yang belum dihapus', async () => {
    await hapus(sebagai('supA1'), 'supA1')
    const db = sebagai('supA2')
    const hasil = await assertSucceeds(getDocs(query(collection(db, 'supervisi'), where('schoolId', '==', SEK_A), where('deletedAt', '==', null))))
    if (hasil.docs.some((d) => d.id === SV_A1)) throw new Error('dokumen terhapus ikut tampil')
    // Query tanpa filter deletedAt berpotensi mengembalikan dokumen terhapus → ditolak untuk supervisor.
    await assertFails(getDocs(query(collection(db, 'supervisi'), where('schoolId', '==', SEK_A))))
  })

  it('admin dapat mendaftar semua dokumen sekolah termasuk yang terhapus', async () => {
    await hapus(sebagai('supA1'), 'supA1')
    await assertSucceeds(getDocs(query(collection(sebagai('adminA'), 'supervisi'), where('schoolId', '==', SEK_A))))
  })

  it('isi dokumen yang sudah dihapus tidak dapat diubah', async () => {
    await hapus(sebagai('supA1'), 'supA1')
    await assertFails(
      ubahSupervisi(sebagai('adminA'), SV_A1, { catatan: { kekuatan: 'x', perbaikan: '', rekomendasi: '' }, rev: 3, updatedAt: serverTimestamp(), updatedBy: 'adminA' }, riwayat('ubah', 3, 'adminA'), 3),
    )
  })

  it('admin memulihkan; pembuat (bukan admin) tidak dapat', async () => {
    await hapus(sebagai('supA1'), 'supA1')
    await assertFails(pulihkan(sebagai('supA1'), 'supA1'))
    await assertSucceeds(pulihkan(sebagai('adminA'), 'adminA'))
    await assertSucceeds(getDoc(doc(sebagai('supA2'), 'supervisi', SV_A1)))
  })

  it('hard-delete tetap ditolak', async () => {
    await assertFails(deleteDoc(doc(sebagai('adminA'), 'supervisi', SV_A1)))
  })
})

describe('riwayat audit', () => {
  it('terbaca oleh anggota sekolah, bukan sekolah lain', async () => {
    await tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru(), riwayat('buat', 1, 'supA1'))
    await assertSucceeds(getDoc(doc(sebagai('adminA'), 'supervisi', BARU, 'riwayat', '1')))
    await assertFails(getDoc(doc(sebagai('adminB'), 'supervisi', BARU, 'riwayat', '1')))
  })

  it('tidak dapat diubah atau dihapus (append-only), bahkan oleh pembuatnya atau admin', async () => {
    await tulisSupervisi(sebagai('supA1'), BARU, dokumenBaru(), riwayat('buat', 1, 'supA1'))
    for (const siapa of ['supA1', 'adminA'] as const) {
      const ref = doc(sebagai(siapa), 'supervisi', BARU, 'riwayat', '1')
      await assertFails(updateDoc(ref, { aksi: 'ubah' }))
      await assertFails(deleteDoc(ref))
      await assertFails(setDoc(ref, riwayat('buat', 1, siapa)))
    }
  })

  it('entri yatim (tanpa perubahan dokumen induk) ditolak', async () => {
    const db = sebagai('supA1')
    await assertFails(setDoc(doc(db, 'supervisi', SV_A1, 'riwayat', '2'), riwayat('ubah', 2, 'supA1')))
    await assertFails(setDoc(doc(db, 'supervisi', SV_A1, 'riwayat', '99'), riwayat('ubah', 99, 'supA1')))
  })
})

describe('master data guru', () => {
  const guruBaru = (patch: Record<string, unknown> = {}) => ({
    schoolId: SEK_A, nama: 'Guru Baru', mapel: 'Matematika', aktif: true, createdAt: serverTimestamp(), createdBy: 'supA1',
    updatedAt: serverTimestamp(), updatedBy: 'supA1', ...patch,
  })

  it('anggota sekolah menambah guru di sekolahnya', async () => {
    await assertSucceeds(setDoc(doc(sebagai('supA1'), 'guru', 'guru-baru'), guruBaru()))
  })

  it('tidak dapat menambah guru ke sekolah lain', async () => {
    await assertFails(setDoc(doc(sebagai('supA1'), 'guru', 'guru-baru'), guruBaru({ schoolId: SEK_B })))
  })

  it.each([
    ['nama kosong', { nama: '' }],
    ['nama terlalu panjang', { nama: 'x'.repeat(121) }],
    ['aktif bukan boolean', { aktif: 'ya' }],
    ['createdBy palsu', { createdBy: 'adminA' }],
    ['field asing', { gaji: 1 }],
  ])('ditolak: %s', async (_n, patch) => {
    await assertFails(setDoc(doc(sebagai('supA1'), 'guru', 'guru-baru'), guruBaru(patch)))
  })

  it('mengganti nama guru tidak mengubah identitasnya (ID tetap), tetapi sekolah dan pembuat terkunci', async () => {
    const db = sebagai('supA1')
    const ref = doc(db, 'guru', GURU_A1)
    const dasar = { nama: 'Budi Santoso', mapel: 'IPA', aktif: true, updatedAt: serverTimestamp(), updatedBy: 'supA1' }
    await assertSucceeds(updateDoc(ref, dasar))
    await assertFails(updateDoc(ref, { ...dasar, schoolId: SEK_B }))
    await assertFails(updateDoc(ref, { ...dasar, createdBy: 'supA1' }))
    await assertFails(updateDoc(ref, { ...dasar, updatedBy: 'adminA' }))
  })

  it('menonaktifkan guru (pengganti hapus)', async () => {
    await assertSucceeds(updateDoc(doc(sebagai('adminA'), 'guru', GURU_A1), { aktif: false, updatedAt: serverTimestamp(), updatedBy: 'adminA' }))
  })

  it('sekolah lain tidak dapat mengubah guru', async () => {
    await assertFails(updateDoc(doc(sebagai('supB'), 'guru', GURU_A1), { aktif: false, updatedAt: serverTimestamp(), updatedBy: 'supB' }))
  })
})
