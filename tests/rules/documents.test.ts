import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'
import { REVIEW_STATUS, bolehTransisiReview, perluCatatan } from '@/features/documents/review'
import { TL_A1 } from './helpers.ts'
import {
  aktifkanPengirimanGuru,
  anonim,
  entriReview,
  GURU_A1,
  GURU_B1,
  initEnv,
  isiDokumenBaru,
  isiDokumenTersedia,
  pathDokumen,
  rincianBerkas,
  sebagai,
  seedDasar,
  seedDokumen,
  seedGuruTambahan,
  seedSupervisi,
  SEKOLAH_A,
  SEKOLAH_B,
} from './dokumen-helpers.ts'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initEnv()
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearFirestore()
  await seedDasar(env)
  await seedGuruTambahan(env)
  await seedSupervisi(env, 'sv1', { by: 'supA1' })
  await seedSupervisi(env, 'svB', { by: 'supB', schoolId: SEKOLAH_B })
})

const dbOf = (uid: string, verified = true) => sebagai(env, uid, { verified }).firestore()
const ref = (uid: string, id = 'dok1') => doc(dbOf(uid), `documents/${id}`)
const ubah = () => ({ updatedAt: serverTimestamp() })
const baru = (o: Parameters<typeof isiDokumenBaru>[0] = {}) => isiDokumenBaru(o)

/** Bahan finalisasi: entri versi dari `pending` ditambah tanda waktu unggah. */
const entriVersi = (n = 1, o: Parameters<typeof rincianBerkas>[0] = {}) => ({ ...rincianBerkas({ ...o, versi: n }), uploadedAt: Timestamp.now() })
const finalisasi = (n = 1, o: Parameters<typeof rincianBerkas>[0] = {}) => ({
  status: 'tersedia',
  currentVersion: n,
  versions: arrayUnion(entriVersi(n, o)),
  pending: null,
  ...ubah(),
})

describe('documents: memulai unggahan (metadata dulu)', () => {
  it('anggota sekolah memulai unggahan dokumen pendukung supervisi', async () => {
    await assertSucceeds(setDoc(ref('supA1'), baru()))
  })

  it('dokumen administratif dan template tanpa relasi diizinkan', async () => {
    const tanpaRelasi = { supervisiId: null, guruId: null, tindakId: null }
    await assertSucceeds(setDoc(ref('supA1', 'd2'), baru({ docId: 'd2', kategori: 'administratif', ...tanpaRelasi })))
    await assertSucceeds(setDoc(ref('supA1', 'd3'), baru({ docId: 'd3', kategori: 'template', ...tanpaRelasi })))
  })

  it('dokumen administratif yang menunjuk supervisi ditolak (relasi harus sesuai kategori)', async () => {
    await assertFails(setDoc(ref('supA1'), baru({ kategori: 'administratif' })))
  })

  it('lampiran tindak lanjut wajib menunjuk tindak lanjut se-sekolah', async () => {
    await assertSucceeds(setDoc(ref('supA1'), baru({ kategori: 'tindak-lanjut', supervisiId: null, tindakId: TL_A1 })))
    await assertFails(setDoc(ref('supA1', 'd2'), baru({ docId: 'd2', kategori: 'tindak-lanjut', supervisiId: null, tindakId: 'tlHantu' })))
    await assertFails(setDoc(ref('supA1', 'd3'), baru({ docId: 'd3', kategori: 'tindak-lanjut', supervisiId: null, tindakId: null })))
  })

  it('supervisor sekolah lain, admin tanpa penugasan, dan akun tak aktif ditolak', async () => {
    await assertFails(setDoc(ref('supB'), baru({ by: 'supB' })))
    await assertFails(setDoc(ref('adminB'), baru({ by: 'adminB' })))
    for (const uid of ['baru1', 'baru2', 'nonaktifA']) await assertFails(setDoc(ref(uid), baru({ by: uid })))
  })

  it('anonim dan email belum terverifikasi ditolak', async () => {
    await assertFails(setDoc(doc(anonim(env).firestore(), 'documents/dok1'), baru()))
    await assertFails(setDoc(doc(dbOf('supA1', false), 'documents/dok1'), baru()))
  })

  it('relasi ke supervisi sekolah lain ditolak meski schoolId milik pembuat', async () => {
    await assertFails(setDoc(ref('supA1'), baru({ supervisiId: 'svB' })))
  })

  it('relasi wajib: kategori supervisi tanpa supervisiId, atau supervisi tak ada, ditolak', async () => {
    await assertFails(setDoc(ref('supA1'), baru({ supervisiId: null })))
    await assertFails(setDoc(ref('supA1'), baru({ supervisiId: 'svHantu' })))
  })

  it('kategori tidak dikenal ditolak', async () => {
    await assertFails(setDoc(ref('supA1'), baru({ kategori: 'rahasia' })))
  })

  it.each([
    ['status langsung tersedia', { status: 'tersedia' }],
    ['versi sudah terisi', { currentVersion: 1 }],
    ['daftar versi sudah terisi', { versions: [{ n: 1 }] }],
    ['field tambahan', { aman: true }],
    ['penanda hapus terisi', { deletedBy: 'supA1' }],
    ['pembuat palsu', { createdBy: 'supA2' }],
    ['stempel waktu klien', { createdAt: new Date('2020-01-01') }],
    ['status review pada kategori tanpa review', { reviewStatus: 'disetujui' }],
  ])('menolak unggahan dengan %s', async (_n, ubahan) => {
    await assertFails(setDoc(ref('supA1'), { ...baru(), ...ubahan }))
  })

  describe('rincian berkas (pending)', () => {
    const dengan = (ubahan: Record<string, unknown>) => {
      const d = baru()
      return { ...d, pending: { ...d.pending, ...ubahan } }
    }

    it.each([
      ['path di sekolah lain', { storagePath: pathDokumen('dok1', { schoolId: SEKOLAH_B }) }],
      ['path untuk dokumen lain', { storagePath: pathDokumen('dokLain') }],
      ['path versi 2 pada unggahan pertama', { storagePath: pathDokumen('dok1', { versi: 2 }) }],
      ['path memuat nama berkas asli (bukan UUID)', { storagePath: 'sekolah/sekolah-a/dokumen/dok1/v1/laporan.pdf' }],
      ['path menyusup keluar direktori', { storagePath: 'sekolah/sekolah-a/dokumen/dok1/v1/../../x.pdf' }],
      ['ekstensi di luar daftar', { storagePath: pathDokumen('dok1', { ext: 'exe' }) }],
      ['MIME HTML', { mimeType: 'text/html' }],
      ['MIME executable', { mimeType: 'application/x-msdownload' }],
      ['MIME tidak cocok dengan ekstensi', { mimeType: 'image/png' }],
      ['ukuran nol', { size: 0 }],
      ['ukuran melebihi 10 MB', { size: 10 * 1024 * 1024 + 1 }],
      ['ukuran pecahan', { size: 10.5 }],
      ['ukuran berupa teks', { size: '2048' }],
      ['sidik jari bukan SHA-256', { sha256: 'xyz' }],
      ['pengunggah palsu', { uploadedBy: 'supA2' }],
      ['nomor versi 2', { n: 2 }],
      ['nama berkas kosong', { fileName: '' }],
      ['field tambahan', { url: 'https://publik.example/x.pdf' }],
    ])('menolak %s', async (_n, ubahan) => {
      await assertFails(setDoc(ref('supA1'), dengan(ubahan)))
    })

    it('menerima batas ukuran tepat 10 MB', async () => {
      await assertSucceeds(setDoc(ref('supA1'), dengan({ size: 10 * 1024 * 1024 })))
    })
  })

  describe('pengajuan dokumen guru (fitur per sekolah)', () => {
    const pengajuan = (o: Parameters<typeof isiDokumenBaru>[0] = {}) =>
      baru({ kategori: 'pengajuan-guru', supervisiId: null, guruId: GURU_A1, ...o })

    it('ditolak selama fitur belum diaktifkan sekolah', async () => {
      await assertFails(setDoc(ref('supA1'), pengajuan()))
    })

    it('diizinkan setelah fitur aktif, dengan guru se-sekolah dan status review awal "diajukan"', async () => {
      await aktifkanPengirimanGuru(env)
      await assertSucceeds(setDoc(ref('supA1'), pengajuan()))
    })

    it('guru dari sekolah lain atau status review awal selain "diajukan" ditolak', async () => {
      await aktifkanPengirimanGuru(env)
      await assertFails(setDoc(ref('supA1'), pengajuan({ guruId: GURU_B1 })))
      await assertFails(setDoc(ref('supA1'), { ...pengajuan(), reviewStatus: 'disetujui' }))
      await assertFails(setDoc(ref('supA1'), { ...pengajuan(), reviewRiwayat: [] }))
    })
  })
})

describe('documents: membaca', () => {
  beforeEach(async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA2' }))
  })

  it('anggota sekolah membaca metadata; sekolah lain tidak', async () => {
    await assertSucceeds(getDoc(ref('supA1')))
    await assertFails(getDoc(ref('supB')))
    await assertFails(getDoc(ref('adminB')))
  })

  it('daftar harus difilter pada sekolah sendiri', async () => {
    const col = collection(dbOf('supA1'), 'documents')
    await assertSucceeds(getDocs(query(col, where('schoolId', '==', SEKOLAH_A))))
    await assertFails(getDocs(query(col, where('schoolId', '==', SEKOLAH_B))))
    await assertFails(getDocs(col))
  })

  it('anonim, belum disetujui, dan ditangguhkan ditolak', async () => {
    await assertFails(getDoc(doc(anonim(env).firestore(), 'documents/dok1')))
    await assertFails(getDoc(ref('baru1')))
    await assertFails(getDoc(ref('nonaktifA')))
  })

  it('dokumen yang belum ada: akun aktif menerima "tidak ada" (dibutuhkan agar unggahan bisa idempoten), akun lain ditolak', async () => {
    const snap = await assertSucceeds(getDoc(ref('supA1', 'belumAda')))
    expect(snap.exists()).toBe(false)
    await assertFails(getDoc(ref('baru1', 'belumAda')))
    await assertFails(getDoc(doc(anonim(env).firestore(), 'documents/belumAda')))
  })

  it('dokumen yang ada milik sekolah lain tetap ditolak walau yang meminta akun aktif', async () => {
    await assertFails(getDoc(ref('supB')))
  })
})

describe('documents: finalisasi unggahan (metadata ↔ file konsisten)', () => {
  beforeEach(async () => {
    await seedDokumen(env, 'dok1', isiDokumenBaru({ by: 'supA1' }, Timestamp.now()))
  })

  it('pengunggah memfinalisasi: menambah tepat satu versi dan mengosongkan pending', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), finalisasi()))
  })

  it('rekan sesekolah yang bukan pengunggah tidak dapat memfinalisasi', async () => {
    await assertFails(updateDoc(ref('supA2'), finalisasi()))
  })

  it('anggota sekolah lain tidak dapat memfinalisasi', async () => {
    await assertFails(updateDoc(ref('supB'), finalisasi()))
  })

  it.each([
    ['rincian versi berbeda dari pending (path)', () => finalisasi(1, { docId: 'dokLain' })],
    ['rincian versi berbeda dari pending (ukuran)', () => finalisasi(1, { ukuran: 999999 })],
    ['pending tidak dikosongkan', () => ({ ...finalisasi(), pending: rincianBerkas() })],
    ['lompat nomor versi', () => ({ ...finalisasi(), currentVersion: 2 })],
    ['tanpa mengisi daftar versi', () => ({ status: 'tersedia', currentVersion: 1, pending: null, ...ubah() })],
    ['dua versi sekaligus', () => ({ ...finalisasi(), versions: arrayUnion(entriVersi(1), entriVersi(2)) })],
    ['status menjadi dihapus', () => ({ ...finalisasi(), status: 'dihapus' })],
    ['sekaligus mengubah schoolId', () => ({ ...finalisasi(), schoolId: SEKOLAH_B })],
    ['sekaligus mengubah relasi', () => ({ ...finalisasi(), supervisiId: 'svB' })],
  ])('menolak finalisasi dengan %s', async (_n, buat) => {
    await assertFails(updateDoc(ref('supA1'), buat()))
  })

  it('unggahan pertama yang gagal dibersihkan dengan menghapus dokumen (tanpa versi)', async () => {
    await assertFails(deleteDoc(ref('supA2')))
    await assertSucceeds(deleteDoc(ref('supA1')))
  })
})

describe('documents: versi dan penggantian', () => {
  beforeEach(async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
  })

  const mulaiVersi = (n: number) => ({ pending: { ...rincianBerkas({ versi: n }), startedAt: Timestamp.now() }, ...ubah() })

  it('pembuat memulai versi berikutnya; hanya n = versi sekarang + 1', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), mulaiVersi(2)))
    await assertFails(updateDoc(ref('supA1'), mulaiVersi(1)))
    await assertFails(updateDoc(ref('supA1'), mulaiVersi(3)))
  })

  it('rekan sesekolah dan sekolah lain tidak dapat mengganti versi', async () => {
    await assertFails(updateDoc(ref('supA2'), mulaiVersi(2)))
    await assertFails(updateDoc(ref('supB'), mulaiVersi(2)))
  })

  it('batas jumlah versi (20) ditegakkan', async () => {
    await seedDokumen(env, 'penuh', isiDokumenTersedia({ docId: 'penuh', by: 'supA1', banyakVersi: 20 }))
    await assertFails(
      updateDoc(doc(dbOf('supA1'), 'documents/penuh'), {
        pending: { ...rincianBerkas({ docId: 'penuh', versi: 21 }), startedAt: Timestamp.now() },
        ...ubah(),
      }),
    )
  })

  it('selesai diunggah: versi 2 menjadi versi aktif dan versi 1 tetap utuh', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), mulaiVersi(2)))
    await assertSucceeds(updateDoc(ref('supA1'), finalisasi(2)))
    const d = (await getDoc(ref('supA1'))).data()!
    expect(d.currentVersion).toBe(2)
    expect(d.versions).toHaveLength(2)
    expect(d.versions[0].storagePath).toBe(pathDokumen('dok1', { versi: 1 }))
  })

  it('riwayat versi tidak dapat ditulis ulang', async () => {
    await assertFails(updateDoc(ref('supA1'), { versions: [], ...ubah() }))
    await assertFails(updateDoc(ref('supA1'), { 'versions': [entriVersi(1, { ukuran: 1 })], ...ubah() }))
  })

  it('riwayat versi tidak dapat dipalsukan: ukuran bertambah satu tetapi versi lama diganti', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), mulaiVersi(2)))
    await assertFails(
      updateDoc(ref('supA1'), {
        status: 'tersedia',
        currentVersion: 2,
        versions: [entriVersi(1, { ukuran: 1 }), entriVersi(2)],
        pending: null,
        ...ubah(),
      }),
    )
  })

  it('unggahan versi baru yang gagal dibatalkan: versi lama tetap, hanya pending dibersihkan', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), mulaiVersi(2)))
    await assertFails(updateDoc(ref('supA2'), { pending: null, ...ubah() }))
    await assertSucceeds(updateDoc(ref('supA1'), { pending: null, ...ubah() }))
    expect((await getDoc(ref('supA1'))).data()!.currentVersion).toBe(1)
  })

  it('tidak dapat memulai versi baru saat unggahan lain masih berjalan', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), mulaiVersi(2)))
    await assertFails(updateDoc(ref('supA1'), mulaiVersi(2)))
  })

  it('dokumen tersedia tidak dapat dihapus langsung; harus soft-delete dulu', async () => {
    await assertFails(deleteDoc(ref('supA1')))
  })

  it('judul dapat diubah pembuat, tetapi bukan oleh rekan; kategori/relasi/sekolah tidak dapat diubah', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), { judul: 'Laporan akhir', ...ubah() }))
    await assertFails(updateDoc(ref('supA2'), { judul: 'Diubah rekan', ...ubah() }))
    await assertFails(updateDoc(ref('supA1'), { judul: 'x'.repeat(200), ...ubah() }))
    await assertFails(updateDoc(ref('supA1'), { kategori: 'template', ...ubah() }))
    await assertFails(updateDoc(ref('supA1'), { supervisiId: 'svB', ...ubah() }))
    await assertFails(updateDoc(ref('supA1'), { schoolId: SEKOLAH_B, ...ubah() }))
    await assertFails(updateDoc(ref('supA1'), { createdBy: 'supA2', ...ubah() }))
  })
})

describe('documents: penghapusan lunak, pemulihan, dan penghapusan permanen', () => {
  beforeEach(async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
  })

  const hapus = () => ({ status: 'dihapus', deletedAt: serverTimestamp(), deletedBy: 'supA1', ...ubah() })

  it('pembuat menghapus-lunak; rekan dan sekolah lain tidak', async () => {
    await assertFails(updateDoc(ref('supA2'), { ...hapus(), deletedBy: 'supA2' }))
    await assertFails(updateDoc(ref('supB'), { ...hapus(), deletedBy: 'supB' }))
    await assertSucceeds(updateDoc(ref('supA1'), hapus()))
  })

  it('penanda penghapus tidak boleh dipalsukan', async () => {
    await assertFails(updateDoc(ref('supA1'), { ...hapus(), deletedBy: 'supA2' }))
    await assertFails(updateDoc(ref('supA1'), { ...hapus(), deletedAt: new Date('2020-01-01') }))
  })

  it('dokumen terhapus-lunak dapat dipulihkan pembuatnya, dan penandanya dibersihkan', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), hapus()))
    await assertFails(updateDoc(ref('supA2'), { status: 'tersedia', deletedAt: null, deletedBy: null, ...ubah() }))
    await assertSucceeds(updateDoc(ref('supA1'), { status: 'tersedia', deletedAt: null, deletedBy: null, ...ubah() }))
  })

  it('hapus permanen hanya oleh pembuat dan hanya setelah soft-delete', async () => {
    await assertFails(deleteDoc(ref('supA1')))
    await assertSucceeds(updateDoc(ref('supA1'), hapus()))
    await assertFails(deleteDoc(ref('supA2')))
    await assertFails(deleteDoc(ref('supB')))
    await assertSucceeds(deleteDoc(ref('supA1')))
  })

  it('dokumen terhapus tidak dapat diubah isinya (mis. diganti versi)', async () => {
    await assertSucceeds(updateDoc(ref('supA1'), hapus()))
    await assertFails(updateDoc(ref('supA1'), { pending: { ...rincianBerkas({ versi: 2 }), startedAt: Timestamp.now() }, ...ubah() }))
    await assertFails(updateDoc(ref('supA1'), { judul: 'Baru', ...ubah() }))
  })
})

describe('documents: review (kategori pengajuan-guru)', () => {
  const kunciPengajuan = { kategori: 'pengajuan-guru', supervisiId: null, guruId: GURU_A1 }
  const putuskan = (ke: string, oleh: string, catatan: string) => ({
    reviewStatus: ke,
    reviewRiwayat: arrayUnion(entriReview(ke, oleh, catatan)),
    ...ubah(),
  })

  async function siapkan(dari: string, o: Record<string, unknown> = {}) {
    await seedDokumen(env, 'dok1', { ...isiDokumenTersedia({ by: 'supA1', ...kunciPengajuan, reviewStatus: dari }), ...o })
  }

  const pasangan = REVIEW_STATUS.flatMap((dari) => REVIEW_STATUS.map((ke) => [dari, ke] as const))

  it.each(pasangan)('transisi %s → %s %s sesuai tabel (satu sumber kebenaran dengan UI)', async (dari, ke) => {
    await siapkan(dari)
    const hasil = updateDoc(ref('supA2'), putuskan(ke, 'supA2', 'Alasan tertulis yang jelas'))
    if (bolehTransisiReview(dari, ke)) await assertSucceeds(hasil)
    else await assertFails(hasil)
  })

  it.each(REVIEW_STATUS)('alasan kosong untuk keputusan "%s": wajib bila menolak/revisi', async (ke) => {
    await siapkan('diajukan')
    const hasil = updateDoc(ref('supA2'), putuskan(ke, 'supA2', ''))
    if (!bolehTransisiReview('diajukan', ke)) await assertFails(hasil)
    else if (perluCatatan(ke)) await assertFails(hasil)
    else await assertSucceeds(hasil)
  })

  it('alasan terlalu panjang ditolak', async () => {
    await siapkan('diajukan')
    await assertFails(updateDoc(ref('supA2'), putuskan('ditolak', 'supA2', 'x'.repeat(1001))))
  })

  it('reviewer dari sekolah lain atau akun tak aktif tidak berwenang', async () => {
    await siapkan('diajukan')
    await assertFails(updateDoc(ref('supB'), putuskan('disetujui', 'supB', '')))
    await assertFails(updateDoc(ref('adminB'), putuskan('disetujui', 'adminB', '')))
    await assertFails(updateDoc(ref('nonaktifA'), putuskan('disetujui', 'nonaktifA', '')))
  })

  it('pelaku di riwayat harus pemanggil sendiri', async () => {
    await siapkan('diajukan')
    await assertFails(updateDoc(ref('supA2'), putuskan('disetujui', 'supA1', '')))
  })

  it('riwayat keputusan tidak dapat ditulis ulang atau dikurangi', async () => {
    await siapkan('diajukan')
    await assertFails(updateDoc(ref('supA2'), { reviewStatus: 'disetujui', reviewRiwayat: [entriReview('disetujui', 'supA2')], ...ubah() }))
  })

  it('riwayat keputusan tidak dapat dipalsukan: ukuran bertambah satu tetapi entri lama diganti', async () => {
    await siapkan('diajukan')
    await assertFails(
      updateDoc(ref('supA2'), {
        reviewStatus: 'disetujui',
        reviewRiwayat: [entriReview('diajukan', 'orangLain'), entriReview('disetujui', 'supA2')],
        ...ubah(),
      }),
    )
  })

  it('keputusan tidak boleh disertai perubahan field lain', async () => {
    await siapkan('diajukan')
    await assertFails(updateDoc(ref('supA2'), { ...putuskan('disetujui', 'supA2', ''), judul: 'Diubah' }))
  })

  it('dokumen tanpa alur review tidak dapat diberi status review', async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
    await assertFails(updateDoc(ref('supA2'), putuskan('disetujui', 'supA2', '')))
  })

  it('dokumen yang sudah disetujui tidak dapat diganti versinya', async () => {
    await siapkan('disetujui')
    await assertFails(updateDoc(ref('supA1'), { pending: { ...rincianBerkas({ versi: 2 }), startedAt: Timestamp.now() }, ...ubah() }))
  })

  it('versi baru pada dokumen "perlu revisi" otomatis mengajukan ulang (tercatat di riwayat)', async () => {
    await siapkan('perlu_revisi')
    await assertSucceeds(updateDoc(ref('supA1'), { pending: { ...rincianBerkas({ versi: 2 }), startedAt: Timestamp.now() }, ...ubah() }))
    await assertFails(updateDoc(ref('supA1'), finalisasi(2)))
    await assertSucceeds(
      updateDoc(ref('supA1'), { ...finalisasi(2), reviewStatus: 'diajukan', reviewRiwayat: arrayUnion(entriReview('diajukan', 'supA1')) }),
    )
  })
})
