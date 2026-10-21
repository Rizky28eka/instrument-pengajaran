import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { deleteObject, ref as storageRef, uploadBytes } from 'firebase/storage'
import {
  firestoreDari,
  initEnv,
  isiDokumenBaru,
  isiDokumenTersedia,
  pathDokumen,
  rincianBerkas,
  sebagai,
  seed,
  seedDasar,
  seedDokumen,
  seedSupervisi,
  SEKOLAH_A,
  SEKOLAH_B,
} from './dokumen-helpers.ts'

/**
 * Perbedaan model akses `main` terhadap dokumen: admin SEKOLAH (bukan admin sistem) berwenang atas
 * dokumen sekolahnya sendiri, dan relasi harus merujuk entitas yang belum dihapus-lunak.
 */
let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initEnv()
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearStorage()
  await seedDasar(env)
  await seedSupervisi(env, 'sv1')
})

const db = (uid: string) => firestoreDari(sebagai(env, uid))
const ref = (uid: string, id = 'dok1') => doc(db(uid), `documents/${id}`)
const ubah = () => ({ updatedAt: serverTimestamp() })
const hapus = (oleh: string) => ({ status: 'dihapus', deletedAt: serverTimestamp(), deletedBy: oleh, ...ubah() })
const pulih = () => ({ status: 'tersedia', deletedAt: null, deletedBy: null, ...ubah() })

describe('admin sekolah atas dokumen sekolahnya', () => {
  beforeEach(async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
  })

  it('dapat menghapus-lunak dan memulihkan dokumen milik pembuat lain; admin sekolah lain tidak', async () => {
    await assertFails(updateDoc(ref('adminB'), hapus('adminB')))
    await assertSucceeds(updateDoc(ref('adminA'), hapus('adminA')))
    await assertFails(updateDoc(ref('adminB'), pulih()))
    await assertSucceeds(updateDoc(ref('adminA'), pulih()))
  })

  it('dapat menghapus permanen dokumen yang sudah di tempat sampah; tidak sebelum itu', async () => {
    await assertFails(deleteDoc(ref('adminA')))
    await assertSucceeds(updateDoc(ref('adminA'), hapus('adminA')))
    await assertFails(deleteDoc(ref('adminB')))
    await assertFails(deleteDoc(ref('supA2')))
    await assertSucceeds(deleteDoc(ref('adminA')))
  })

  it('dapat mengubah judul; rekan biasa dan admin sekolah lain tidak', async () => {
    await assertFails(updateDoc(ref('supA2'), { judul: 'Diubah rekan', ...ubah() }))
    await assertFails(updateDoc(ref('adminB'), { judul: 'Diubah orang luar', ...ubah() }))
    await assertSucceeds(updateDoc(ref('adminA'), { judul: 'Diubah admin sekolah', ...ubah() }))
  })

  it('TIDAK dapat mengganti versi dokumen orang lain (itu hanya hak pembuat)', async () => {
    await assertFails(updateDoc(ref('adminA'), { pending: { ...rincianBerkas({ versi: 2 }), startedAt: Timestamp.now() }, ...ubah() }))
  })

  it('TIDAK dapat memfinalisasi unggahan orang lain (hanya pengunggah)', async () => {
    await seedDokumen(env, 'dokBaru', isiDokumenBaru({ docId: 'dokBaru', by: 'supA1' }, Timestamp.now()))
    await assertFails(
      updateDoc(ref('adminA', 'dokBaru'), {
        status: 'tersedia',
        currentVersion: 1,
        pending: null,
        versions: [{ ...rincianBerkas({ docId: 'dokBaru' }), uploadedAt: Timestamp.now() }],
        ...ubah(),
      }),
    )
  })
})

describe('relasi harus merujuk entitas yang valid di sekolah yang sama', () => {
  it('supervisi yang sudah dihapus-lunak tidak dapat menjadi induk dokumen baru', async () => {
    await seedSupervisi(env, 'svHapus', { hapus: true })
    await assertFails(setDoc(ref('supA1', 'dokX'), isiDokumenBaru({ docId: 'dokX', supervisiId: 'svHapus' })))
    await assertSucceeds(setDoc(ref('supA1', 'dokY'), isiDokumenBaru({ docId: 'dokY', supervisiId: 'sv1' })))
  })

  it('tindak lanjut milik sekolah lain ditolak', async () => {
    await seed(env, async (d) => {
      const t = Timestamp.now()
      await setDoc(doc(d, 'tindakLanjut', 'tl-b'), {
        schoolId: SEKOLAH_B, supervisiId: 'sv-b1', guruId: 'guru-b1', guruNama: 'Sari', deskripsi: 'x', status: 'belum',
        penanggungJawab: 'x', tenggat: null, selesaiAt: null, createdBy: 'supB', createdAt: t, updatedAt: t, updatedBy: 'supB', rev: 1,
      })
    })
    await assertFails(setDoc(ref('supA1', 'dokX'), isiDokumenBaru({ docId: 'dokX', kategori: 'tindak-lanjut', supervisiId: null, tindakId: 'tl-b' })))
  })

  it('akun nonaktif atau belum diverifikasi tidak dapat membuat dokumen', async () => {
    await assertFails(setDoc(ref('nonaktifA', 'dokX'), isiDokumenBaru({ docId: 'dokX', by: 'nonaktifA' })))
    await assertFails(setDoc(ref('belumVerifikasiA', 'dokX'), isiDokumenBaru({ docId: 'dokX', by: 'belumVerifikasiA' })))
  })
})

describe('Storage: wewenang admin sekolah', () => {
  const PATH = pathDokumen('dok1')
  const objek = (uid: string, path = PATH) => storageRef(sebagai(env, uid).storage(), path)

  async function taruh() {
    await env.withSecurityRulesDisabled(async (c) => {
      await uploadBytes(storageRef(c.storage(), PATH), new Uint8Array(2048).fill(1), { contentType: 'application/pdf' })
    })
  }

  it('admin sekolah dapat menghapus berkas dokumen yang sudah di tempat sampah; admin sekolah lain dan rekan biasa tidak', async () => {
    await seedDokumen(env, 'dok1', { ...isiDokumenTersedia({ by: 'supA1' }), status: 'dihapus' })
    await taruh()
    await assertFails(deleteObject(objek('adminB')))
    await assertFails(deleteObject(objek('supA2')))
    await assertSucceeds(deleteObject(objek('adminA')))
  })

  it('berkas dokumen yang masih tersedia tidak dapat dihapus, bahkan oleh admin sekolah', async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
    await taruh()
    await assertFails(deleteObject(objek('adminA')))
  })

  it('pengguna sekolah lain tidak dapat membaca berkas; akun yang dinonaktifkan di tengah jalan pun ditolak', async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
    await taruh()
    const { getBytes } = await import('firebase/storage')
    await assertSucceeds(getBytes(objek('supA2')))
    await assertFails(getBytes(objek('supB')))
    await assertFails(getBytes(objek('adminB')))
    await assertFails(getBytes(objek('nonaktifA')))
  })
})

describe('sanity: isolasi antar sekolah tetap', () => {
  it('dokumen sekolah A tidak terbaca dari sekolah B', async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
    const { getDoc } = await import('firebase/firestore')
    await assertSucceeds(getDoc(ref('supA2')))
    await assertFails(getDoc(ref('supB')))
    await assertFails(getDoc(ref('adminB')))
    void SEKOLAH_A
  })
})
