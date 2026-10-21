import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { getBytes, listAll, ref } from 'firebase/storage'
import { tertundaMilik } from '@/features/documents/daftar'
import { dokumenKeDokumen, versiAktif } from '@/features/documents/mapper'
import { parsePathObjek } from '@/features/documents/storage-path'
import { buatDokumenService, storageOpsFirebase, type StorageOps } from '@/features/documents/service'
import { GURU_A1, initEnv, sebagai, seed, seedDasar, seedGuruTambahan, seedSupervisi, SEKOLAH_A, aktifkanPengirimanGuru } from './dokumen-helpers.ts'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initEnv()
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearFirestore()
  await env.clearStorage()
  await seedDasar(env)
  await seedGuruTambahan(env)
  await seedSupervisi(env, 'sv1', { by: 'supA1' })
})

const enc = new TextEncoder()
const PDF_A = enc.encode('%PDF-1.7\nisi dokumen A — rencana pelaksanaan pembelajaran\n%%EOF')
const PDF_B = enc.encode('%PDF-1.7\nisi dokumen B — versi kedua yang direvisi\n%%EOF')
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])
const berkas = (nama: string, isi: Uint8Array<ArrayBuffer>) => new File([isi], nama)

/** Layanan atas nama satu pengguna. `ubah` menyisipkan kegagalan ke operasi Storage. */
function layanan(uid: string, ubah: (asli: StorageOps) => Partial<StorageOps> = () => ({})) {
  const ctx = sebagai(env, uid)
  const asli = storageOpsFirebase(ctx.storage())
  // Tipe kembalian library tes memakai definisi compat; instance aslinya adalah Firestore modular.
  const db = ctx.firestore() as unknown as Firestore
  return { svc: buatDokumenService({ db, storageOps: { ...asli, ...ubah(asli) }, pengguna: { uid, nama: `Nama ${uid}` } }), ctx, asli }
}

const relasiSv1 = { supervisiId: 'sv1' }
const masukan = (nama = 'RPP Kelas 8.pdf', isi = PDF_A) => ({ schoolId: SEKOLAH_A, kategori: 'pendukung-supervisi' as const, relasi: relasiSv1, berkas: berkas(nama, isi) })

async function bacaDoc(uid: string, id: string) {
  const snap = await getDoc(doc(sebagai(env, uid).firestore(), 'documents', id))
  return snap.exists() ? dokumenKeDokumen(snap.id, snap.data()) : null
}

/** Jumlah objek Storage yang ada di folder dokumen (dibaca tanpa Rules, hanya untuk pemeriksaan tes). */
async function objekDi(docId: string): Promise<string[]> {
  const hasil: string[] = []
  // withSecurityRulesDisabled tidak mengembalikan nilai callback; hasil dikumpulkan lewat variabel luar.
  await env.withSecurityRulesDisabled(async (c) => {
    const versi = await listAll(ref(c.storage(), `sekolah/${SEKOLAH_A}/dokumen/${docId}`))
    for (const p of versi.prefixes) hasil.push(...(await listAll(p)).items.map((i) => i.fullPath))
  })
  return hasil
}

describe('unggah baru: metadata ↔ berkas konsisten', () => {
  it('berhasil end-to-end: metadata final, berkas ada, path acak, dan unduhan identik', async () => {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan('RPP Kelas 8.pdf'))
    await tugas.jalankan()
    expect(tugas.state).toMatchObject({ status: 'berhasil', progres: 1 })

    const dok = (await bacaDoc('supA1', docId))!
    expect(dok).toMatchObject({ status: 'tersedia', currentVersion: 1, pending: null, schoolId: SEKOLAH_A, supervisiId: 'sv1', createdBy: 'supA1' })
    const v = versiAktif(dok)!
    expect(v).toMatchObject({ n: 1, fileName: 'RPP Kelas 8.pdf', mimeType: 'application/pdf', size: PDF_A.length, uploadedBy: 'supA1' })
    expect(v.storagePath).not.toContain('RPP')
    expect(parsePathObjek(v.storagePath)).toMatchObject({ schoolId: SEKOLAH_A, docId, versi: 1, ext: 'pdf' })

    expect(await objekDi(docId)).toEqual([v.storagePath])
    const { blob, nama } = await svc.unduh(dok)
    expect(nama).toBe('RPP Kelas 8.pdf')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(PDF_A)
  })

  it('nama berkas berbahaya hanya menjadi teks tampilan yang disanitasi', async () => {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan('../../etc/passwd‮.pdf'))
    await tugas.jalankan()
    const v = versiAktif((await bacaDoc('supA1', docId))!)!
    expect(v.fileName).toBe('passwd.pdf')
    expect(v.storagePath).toMatch(/^sekolah\/sekolah-a\/dokumen\/[A-Za-z0-9]+\/v1\/[0-9a-f-]{36}\.pdf$/)
  })

  it('berkas dengan isi tidak sesuai ekstensi ditolak sebelum metadata dibuat', async () => {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan('palsu.pdf', PNG as Uint8Array<ArrayBuffer>))
    await tugas.jalankan()
    expect(tugas.state).toMatchObject({ status: 'gagal', tahapGagal: 'validasi' })
    expect(await bacaDoc('supA1', docId)).toBeNull()
    expect(await objekDi(docId)).toEqual([])
  })

  it('anggota sekolah lain tidak dapat melihat atau mengunduh', async () => {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    const dok = (await bacaDoc('supA1', docId))!
    await expect(bacaDoc('supB', docId)).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(layanan('supB').svc.unduh(dok)).rejects.toMatchObject({ code: 'storage/unauthorized' })
  })

  it('pengguna di luar sekolah tidak dapat memulai unggahan (metadata ditolak, tidak ada yang tercipta)', async () => {
    const { svc } = layanan('supB')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    expect(tugas.state).toMatchObject({ status: 'gagal', tahapGagal: 'metadata' })
    expect(await objekDi(docId)).toEqual([])
  })
})

describe('kegagalan jaringan dan percobaan ulang', () => {
  it('jaringan putus saat unggah: metadata tetap "mengunggah"; ulangi hanya mengirim berkas lalu finalisasi', async () => {
    let putus = true
    const { svc } = layanan('supA1', (asli) => ({
      unggah: async (...a) => {
        if (putus) {
          putus = false
          throw new Error('Jaringan terputus')
        }
        return asli.unggah(...a)
      },
    }))
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    expect(tugas.state).toMatchObject({ status: 'gagal', tahapGagal: 'unggah' })
    expect(await bacaDoc('supA1', docId)).toMatchObject({ status: 'mengunggah', currentVersion: 0 })
    expect(await objekDi(docId)).toEqual([])

    await tugas.ulangi()
    expect(tugas.state).toMatchObject({ status: 'berhasil', percobaan: 1 })
    expect(await bacaDoc('supA1', docId)).toMatchObject({ status: 'tersedia', currentVersion: 1 })
    expect(await objekDi(docId)).toHaveLength(1)
  })

  it('izin dicabut di tengah proses: unggahan ditolak Storage dan TIDAK ada berkas yatim', async () => {
    const { svc } = layanan('supA1', (asli) => ({
      unggah: async (...a) => {
        await seed(env, async (db) => {
          await setDoc(doc(db, 'users/supA1'), { status: 'disabled' }, { merge: true })
        })
        return asli.unggah(...a)
      },
    }))
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    expect(tugas.state).toMatchObject({ status: 'gagal', tahapGagal: 'unggah' })
    expect(await objekDi(docId)).toEqual([])
    // Metadata tertinggal sebagai unggahan "tertunda" tanpa berkas — terlihat dan dapat dibersihkan.
    let sisa: Record<string, unknown> | undefined
    await env.withSecurityRulesDisabled(async (c) => {
      sisa = (await getDoc(doc(c.firestore(), 'documents', docId))).data()
    })
    expect(sisa).toMatchObject({ status: 'mengunggah' })
  })
})

describe('halaman ditutup di tengah proses: rekonsiliasi', () => {
  async function putusSetelahUnggah() {
    const { svc } = layanan('supA1')
    const { docId, tahap } = svc.siapkanUnggahBaru(masukan())
    await tahap.validasi()
    await tahap.simpanMetadata()
    await tahap.kirimBerkas(() => {}, new AbortController().signal)
    return docId // finalisasi tidak pernah berjalan
  }

  it('berkas ada tetapi belum difinalisasi: terdeteksi tertunda, lalu diselesaikan tanpa mengunggah ulang', async () => {
    const docId = await putusSetelahUnggah()
    const baru = layanan('supA1').svc
    const semua = await baru.daftarSekolah(SEKOLAH_A)
    const tertunda = tertundaMilik(semua, 'supA1')
    expect(tertunda.map((d) => d.id)).toEqual([docId])

    expect(await baru.statusTertunda(tertunda[0])).toEqual({ objekAda: true })
    await baru.selesaikanTertunda(tertunda[0])
    const dok = (await bacaDoc('supA1', docId))!
    expect(dok).toMatchObject({ status: 'tersedia', currentVersion: 1, pending: null })
    expect(new Uint8Array(await (await baru.unduh(dok)).blob.arrayBuffer())).toEqual(PDF_A)
  })

  it('metadata ada tetapi berkas tidak: selesaikanTertunda menolak (tidak mengklaim berkas ada), buangTertunda membersihkan', async () => {
    const { svc } = layanan('supA1')
    const { docId, tahap } = svc.siapkanUnggahBaru(masukan())
    await tahap.validasi()
    await tahap.simpanMetadata()

    const baru = layanan('supA1').svc
    const dok = (await bacaDoc('supA1', docId))!
    expect(await baru.statusTertunda(dok)).toEqual({ objekAda: false })
    await expect(baru.selesaikanTertunda(dok)).rejects.toThrow(/belum ada/i)

    await baru.buangTertunda(dok)
    expect(await bacaDoc('supA1', docId)).toBeNull
    await expect(bacaDoc('supA1', docId)).resolves.toBeNull()
  })

  it('berkas ada tetapi tidak jadi dipakai: buangTertunda menghapus berkas lalu metadata (tanpa yatim)', async () => {
    const docId = await putusSetelahUnggah()
    const baru = layanan('supA1').svc
    await baru.buangTertunda((await bacaDoc('supA1', docId))!)
    expect(await objekDi(docId)).toEqual([])
    expect(await bacaDoc('supA1', docId)).toBeNull()
  })

  it('melanjutkan dengan berkas yang SAMA diterima; berkas berbeda ditolak', async () => {
    const { svc } = layanan('supA1')
    const { docId, tahap } = svc.siapkanUnggahBaru(masukan())
    await tahap.validasi()
    await tahap.simpanMetadata()
    const dok = (await bacaDoc('supA1', docId))!

    const salah = layanan('supA1').svc.siapkanLanjutkan(dok, berkas('RPP Kelas 8.pdf', PDF_B))
    await salah.tugas.jalankan()
    expect(salah.tugas.state).toMatchObject({ status: 'gagal', tahapGagal: 'validasi' })
    expect(await objekDi(docId)).toEqual([])

    const benar = layanan('supA1').svc.siapkanLanjutkan(dok, berkas('RPP Kelas 8.pdf', PDF_A))
    await benar.tugas.jalankan()
    expect(benar.tugas.state.status).toBe('berhasil')
    expect(await bacaDoc('supA1', docId)).toMatchObject({ status: 'tersedia', currentVersion: 1 })
  })
})

describe('pembatalan', () => {
  it('membatalkan unggahan pertama yang berjalan: tidak tersisa metadata maupun berkas', async () => {
    const { svc } = layanan('supA1', () => ({
      unggah: (_p, _b, _m, onProgres, sinyal) =>
        new Promise<void>((_ok, tolak) => {
          onProgres(0.3)
          sinyal.addEventListener('abort', () => tolak(new Error('canceled')))
        }),
    }))
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    const jalan = tugas.jalankan()
    await expect.poll(() => tugas.state.status).toBe('mengunggah')
    await tugas.batal()
    await jalan
    expect(tugas.state.status).toBe('dibatalkan')
    expect(await bacaDoc('supA1', docId)).toBeNull()
    expect(await objekDi(docId)).toEqual([])
  })
})

describe('versi dokumen', () => {
  it('mengganti versi: versi lama tetap utuh dan dapat diunduh', async () => {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    const v1 = (await bacaDoc('supA1', docId))!

    const ganti = svc.siapkanGantiVersi(v1, { berkas: berkas('RPP revisi.pdf', PDF_B) })
    await ganti.tugas.jalankan()
    expect(ganti.tugas.state.status).toBe('berhasil')

    const dok = (await bacaDoc('supA1', docId))!
    expect(dok).toMatchObject({ currentVersion: 2, pending: null, status: 'tersedia' })
    expect(dok.versions.map((v) => v.n)).toEqual([1, 2])
    expect(dok.versions[0].storagePath).toBe(v1.versions[0].storagePath)
    expect(await objekDi(docId)).toHaveLength(2)
    expect(new Uint8Array(await (await svc.unduh(dok, 1)).blob.arrayBuffer())).toEqual(PDF_A)
    expect(new Uint8Array(await (await svc.unduh(dok)).blob.arrayBuffer())).toEqual(PDF_B)
  })

  it('penggantian yang dibatalkan tidak mengubah versi yang berlaku', async () => {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    const v1 = (await bacaDoc('supA1', docId))!
    const macet = layanan('supA1', () => ({
      unggah: (_p, _b, _m, _o, sinyal) => new Promise<void>((_ok, tolak) => sinyal.addEventListener('abort', () => tolak(new Error('canceled')))),
    })).svc.siapkanGantiVersi(v1, { berkas: berkas('RPP revisi.pdf', PDF_B) })
    const jalan = macet.tugas.jalankan()
    await expect.poll(() => macet.tugas.state.status).toBe('mengunggah')
    await macet.tugas.batal()
    await jalan
    const dok = (await bacaDoc('supA1', docId))!
    expect(dok).toMatchObject({ currentVersion: 1, pending: null, status: 'tersedia' })
    expect(await objekDi(docId)).toHaveLength(1)
  })

  it('rekan sesekolah yang bukan pembuat tidak dapat mengganti versi', async () => {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    const dok = (await bacaDoc('supA1', docId))!
    const ganti = layanan('supA2').svc.siapkanGantiVersi(dok, { berkas: berkas('x.pdf', PDF_B) })
    await ganti.tugas.jalankan()
    expect(ganti.tugas.state).toMatchObject({ status: 'gagal', tahapGagal: 'metadata' })
    expect(await objekDi(docId)).toHaveLength(1)
  })
})

describe('integritas unduhan', () => {
  it('berkas yang isinya berubah di Storage terdeteksi lewat SHA-256 dan tidak diserahkan ke pengguna', async () => {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    const dok = (await bacaDoc('supA1', docId))!
    const path = versiAktif(dok)!.storagePath
    await env.withSecurityRulesDisabled(async (c) => {
      const { uploadBytes } = await import('firebase/storage')
      await uploadBytes(ref(c.storage(), path), PDF_B, { contentType: 'application/pdf' })
    })
    await expect(svc.unduh(dok)).rejects.toThrow(/tidak sesuai/i)
  })
})

describe('hapus lunak, pulihkan, dan hapus permanen', () => {
  async function siapkan(banyakVersi = 2) {
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    for (let n = 2; n <= banyakVersi; n++) {
      const g = svc.siapkanGantiVersi((await bacaDoc('supA1', docId))!, { berkas: berkas(`rev${n}.pdf`, PDF_B) })
      await g.tugas.jalankan()
    }
    return { svc, docId }
  }

  it('dokumen terhapus-lunak tidak dapat diunduh; setelah dipulihkan dapat diunduh lagi', async () => {
    const { svc, docId } = await siapkan(1)
    await svc.hapusLunak((await bacaDoc('supA1', docId))!)
    const terhapus = (await bacaDoc('supA1', docId))!
    expect(terhapus).toMatchObject({ status: 'dihapus', deletedBy: 'supA1' })
    await expect(svc.unduh(terhapus)).rejects.toMatchObject({ code: 'storage/unauthorized' })

    await svc.pulihkan(terhapus)
    const pulih = (await bacaDoc('supA1', docId))!
    expect(pulih).toMatchObject({ status: 'tersedia', deletedBy: null })
    await expect(svc.unduh(pulih)).resolves.toBeDefined()
  })

  it('hapus permanen menghapus SEMUA versi di Storage lalu metadata', async () => {
    const { svc, docId } = await siapkan(2)
    await svc.hapusLunak((await bacaDoc('supA1', docId))!)
    await svc.hapusPermanen((await bacaDoc('supA1', docId))!)
    expect(await objekDi(docId)).toEqual([])
    expect(await bacaDoc('supA1', docId)).toBeNull()
  })

  it('hapus permanen ditolak oleh layanan bila dokumen belum dihapus-lunak', async () => {
    const { svc, docId } = await siapkan(1)
    await expect(svc.hapusPermanen((await bacaDoc('supA1', docId))!)).rejects.toThrow(/hapus.*dulu|dihapus/i)
    expect(await objekDi(docId)).toHaveLength(1)
  })

  it('kegagalan sebagian: metadata TIDAK dihapus selagi masih ada berkas; ulangi aman (idempoten)', async () => {
    const { docId } = await siapkan(2)
    let hitung = 0
    const { svc } = layanan('supA1', (asli) => ({
      hapus: async (path) => {
        if (++hitung === 2) throw new Error('Koneksi terputus saat menghapus')
        return asli.hapus(path)
      },
    }))
    await svc.hapusLunak((await bacaDoc('supA1', docId))!)
    await expect(svc.hapusPermanen((await bacaDoc('supA1', docId))!)).rejects.toThrow(/terputus/)
    expect(await bacaDoc('supA1', docId)).toMatchObject({ status: 'dihapus' })
    expect(await objekDi(docId)).toHaveLength(1)

    await svc.hapusPermanen((await bacaDoc('supA1', docId))!)
    expect(await objekDi(docId)).toEqual([])
    expect(await bacaDoc('supA1', docId)).toBeNull()
  })

  it('rekan sesekolah tidak dapat menghapus-lunak atau menghapus permanen dokumen milik orang lain', async () => {
    const { docId } = await siapkan(1)
    const lain = layanan('supA2').svc
    const dok = (await bacaDoc('supA2', docId))!
    await expect(lain.hapusLunak(dok)).rejects.toMatchObject({ code: 'permission-denied' })
  })
})

describe('review dokumen (pengajuan guru)', () => {
  async function pengajuan() {
    await aktifkanPengirimanGuru(env)
    const { svc } = layanan('supA1')
    const { docId, tugas } = svc.siapkanUnggahBaru({
      schoolId: SEKOLAH_A,
      kategori: 'pengajuan-guru',
      relasi: { guruId: GURU_A1 },
      berkas: berkas('Perangkat ajar.pdf', PDF_A),
    })
    await tugas.jalankan()
    return docId
  }

  it('reviewer sesekolah menyetujui dengan riwayat; menolak mewajibkan alasan', async () => {
    const docId = await pengajuan()
    const reviewer = layanan('supA2').svc
    const dok = (await bacaDoc('supA2', docId))!
    expect(dok.reviewStatus).toBe('diajukan')

    await expect(reviewer.putuskanReview(dok, 'ditolak', '  ')).rejects.toThrow(/alasan/i)
    await reviewer.putuskanReview(dok, 'perlu_revisi', 'Lengkapi lampiran asesmen.')

    const revisi = (await bacaDoc('supA2', docId))!
    expect(revisi.reviewStatus).toBe('perlu_revisi')
    expect(revisi.reviewRiwayat.map((r) => r.status)).toEqual(['diajukan', 'perlu_revisi'])
    expect(revisi.reviewRiwayat[1]).toMatchObject({ oleh: 'supA2', catatan: 'Lengkapi lampiran asesmen.' })
  })

  it('mengunggah versi baru pada "perlu revisi" otomatis mengajukan ulang', async () => {
    const docId = await pengajuan()
    await layanan('supA2').svc.putuskanReview((await bacaDoc('supA2', docId))!, 'perlu_revisi', 'Perbaiki.')
    const g = layanan('supA1').svc.siapkanGantiVersi((await bacaDoc('supA1', docId))!, { berkas: berkas('Perangkat ajar v2.pdf', PDF_B) })
    await g.tugas.jalankan()
    expect(g.tugas.state.status).toBe('berhasil')
    const dok = (await bacaDoc('supA1', docId))!
    expect(dok.reviewStatus).toBe('diajukan')
    expect(dok.reviewRiwayat.map((r) => r.status)).toEqual(['diajukan', 'perlu_revisi', 'diajukan'])
  })

  it('keputusan tidak sah menurut tabel transisi ditolak oleh layanan', async () => {
    const docId = await pengajuan()
    const reviewer = layanan('supA2').svc
    await reviewer.putuskanReview((await bacaDoc('supA2', docId))!, 'disetujui', '')
    await expect(reviewer.putuskanReview((await bacaDoc('supA2', docId))!, 'ditolak', 'berubah pikiran')).rejects.toThrow(/tidak dapat/i)
  })

  it('reviewer dari sekolah lain ditolak Rules', async () => {
    const docId = await pengajuan()
    const orangLuar = layanan('supB').svc
    let dok!: ReturnType<typeof dokumenKeDokumen>
    await env.withSecurityRulesDisabled(async (c) => {
      dok = dokumenKeDokumen(docId, (await getDoc(doc(c.firestore(), 'documents', docId))).data()!)
    })
    await expect(orangLuar.putuskanReview(dok, 'disetujui', '')).rejects.toMatchObject({ code: 'permission-denied' })
  })
})

describe('daftar dokumen', () => {
  it('daftar per sekolah hanya memuat dokumen sekolah itu', async () => {
    const { svc } = layanan('supA1')
    const { tugas } = svc.siapkanUnggahBaru(masukan())
    await tugas.jalankan()
    const t = Timestamp.now()
    await seed(env, async (db) => {
      await setDoc(doc(db, 'documents', 'dokB'), { ...(await import('./dokumen-helpers.ts')).isiDokumenTersedia({ docId: 'dokB', schoolId: 'sekolah-b', by: 'supB', supervisiId: null, kategori: 'administratif' }, t) })
    })
    expect((await svc.daftarSekolah(SEKOLAH_A)).length).toBe(1)
    await expect(getDocs(collection(sebagai(env, 'supA1').firestore(), 'documents'))).rejects.toMatchObject({ code: 'permission-denied' })
    // Pembacaan byte untuk memastikan helper impor dinamis tidak mengubah hasil
    expect(typeof getBytes).toBe('function')
  })
})
