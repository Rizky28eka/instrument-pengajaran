import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, doc, setDoc, updateDoc } from 'firebase/firestore'
import { deleteObject, getBytes, listAll, ref, uploadBytes } from 'firebase/storage'
import { DOKUMEN } from '@/features/documents/config'
import {
  anonim,
  initEnv,
  isiDokumenBaru,
  isiDokumenTersedia,
  MIME_PDF,
  pathDokumen,
  rincianBerkas,
  sebagai,
  seed,
  seedDasar,
  seedDokumen,
  SEKOLAH_A,
  SEKOLAH_B,
  UKURAN_UJI,
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
  await env.clearStorage()
  await seedDasar(env)
})

const bita = (n = UKURAN_UJI) => new Uint8Array(n).fill(7)
const storageOf = (uid: string, verified = true) => sebagai(env, uid, { verified }).storage()
const objek = (uid: string, path: string, verified = true) => ref(storageOf(uid, verified), path)
const meta = (contentType = MIME_PDF) => ({ contentType })
const PATH = pathDokumen('dok1')

/** Menaruh berkas langsung (melewati Rules) agar tes baca/hapus punya objek nyata. */
async function taruhBerkas(path: string, n = UKURAN_UJI) {
  await env.withSecurityRulesDisabled(async (c) => {
    await uploadBytes(ref(c.storage(), path), bita(n), meta())
  })
}

describe('Storage: mengunggah ke path yang sudah dicadangkan metadata', () => {
  beforeEach(async () => {
    await seedDokumen(env, 'dok1', isiDokumenBaru({ by: 'supA1' }, Timestamp.now()))
  })

  it('pengunggah dapat mengunggah ke path, ukuran, dan tipe yang tercatat di metadata', async () => {
    await assertSucceeds(uploadBytes(objek('supA1', PATH), bita(), meta()))
  })

  it('rekan sesekolah yang bukan pengunggah ditolak', async () => {
    await assertFails(uploadBytes(objek('supA2', PATH), bita(), meta()))
  })

  it('anggota sekolah lain ditolak', async () => {
    await assertFails(uploadBytes(objek('supB', PATH), bita(), meta()))
  })

  it('path lain di dokumen yang sama (nama berbeda) ditolak', async () => {
    const lain = pathDokumen('dok1', { uuid: '11111111-2222-4333-8444-555555555555' })
    await assertFails(uploadBytes(objek('supA1', lain), bita(), meta()))
  })

  it('path sekolah lain ditolak walau dokumen dan pengunggah sah', async () => {
    await assertFails(uploadBytes(objek('supA1', pathDokumen('dok1', { schoolId: SEKOLAH_B })), bita(), meta()))
  })

  it('subfolder tambahan di bawah folder versi ditolak', async () => {
    const dalam = PATH.replace('/v1/', '/v1/sub/')
    await assertFails(uploadBytes(objek('supA1', dalam), bita(), meta()))
  })

  it('tipe konten berbeda dari metadata ditolak', async () => {
    await assertFails(uploadBytes(objek('supA1', PATH), bita(), meta('image/png')))
    await assertFails(uploadBytes(objek('supA1', PATH), bita(), meta('text/html')))
  })

  it('ukuran berbeda dari metadata ditolak', async () => {
    await assertFails(uploadBytes(objek('supA1', PATH), bita(UKURAN_UJI + 1), meta()))
  })

  it('berkas di atas batas 10 MB ditolak walau metadata (dimanipulasi) menyetujuinya', async () => {
    const besar = DOKUMEN.maksUkuranByte + 1
    await seedDokumen(env, 'dok1', {
      ...isiDokumenBaru({ by: 'supA1' }, Timestamp.now()),
      pending: { ...rincianBerkas({ by: 'supA1', ukuran: besar }), startedAt: Timestamp.now() },
    })
    await assertFails(uploadBytes(objek('supA1', PATH), bita(besar), meta()))
  })

  it('setelah difinalisasi, tidak ada jalur tulis lagi ke objek itu (versi tidak berubah diam-diam)', async () => {
    await assertSucceeds(uploadBytes(objek('supA1', PATH), bita(), meta()))
    // Finalisasi metadata: pending dikosongkan, versi tercatat. (Penimpaan selagi pending masih
    // dicadangkan tidak diuji: emulator memetakannya ke "create"; di produksi `allow update: if false`.)
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
    await assertFails(uploadBytes(objek('supA1', PATH), bita(), meta()))
    await assertFails(uploadBytes(objek('supA2', PATH), bita(), meta()))
  })

  it('tanpa dokumen metadata, upload ke path mana pun ditolak', async () => {
    await assertFails(uploadBytes(objek('supA1', pathDokumen('tidakAda')), bita(), meta()))
  })

  it('dokumen tanpa unggahan tertunda tidak menerima berkas baru', async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
    await assertFails(uploadBytes(objek('supA1', pathDokumen('dok1', { uuid: '11111111-2222-4333-8444-555555555555' })), bita(), meta()))
  })

  it('dokumen yang sudah dihapus-lunak tidak menerima berkas', async () => {
    await seed(env, async (db) => {
      await updateDoc(doc(db, 'documents/dok1'), { status: 'dihapus' })
    })
    await assertFails(uploadBytes(objek('supA1', PATH), bita(), meta()))
  })

  it('akun anonim, belum disetujui, ditangguhkan, atau email belum terverifikasi ditolak', async () => {
    await assertFails(uploadBytes(ref(anonim(env).storage(), PATH), bita(), meta()))
    await assertFails(uploadBytes(objek('baru1', PATH), bita(), meta()))
    await assertFails(uploadBytes(objek('nonaktifA', PATH), bita(), meta()))
    await assertFails(uploadBytes(objek('supA1', PATH, false), bita(), meta()))
  })

  it('pengguna yang dicabut dari sekolah di tengah proses tidak dapat lagi mengunggah', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users/supA1'), { schoolId: SEKOLAH_B }, { merge: true })
    })
    await assertFails(uploadBytes(objek('supA1', PATH), bita(), meta()))
  })

  it('versi baru: unggah ke path versi 2 hanya setelah metadata mencadangkannya', async () => {
    await seedDokumen(env, 'dok1', {
      ...isiDokumenTersedia({ by: 'supA1' }),
      pending: { ...rincianBerkas({ by: 'supA1', versi: 2 }), startedAt: Timestamp.now() },
    })
    await assertSucceeds(uploadBytes(objek('supA1', pathDokumen('dok1', { versi: 2 })), bita(), meta()))
    await assertFails(uploadBytes(objek('supA1', pathDokumen('dok1', { versi: 3 })), bita(), meta()))
  })
})

describe('Storage: membaca (hanya anggota sekolah, tanpa URL publik)', () => {
  beforeEach(async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
    await taruhBerkas(PATH)
  })

  it('anggota sekolah dapat mengunduh', async () => {
    await assertSucceeds(getBytes(objek('supA2', PATH)))
    const data = await getBytes(objek('supA1', PATH))
    expect(data.byteLength).toBe(UKURAN_UJI)
  })

  it('sekolah lain tidak dapat mengunduh walau mengetahui path-nya', async () => {
    await assertFails(getBytes(objek('supB', PATH)))
  })

  it('admin sistem tanpa penugasan sekolah tidak dapat mengunduh', async () => {
    await assertFails(getBytes(objek('adminB', PATH)))
  })

  it('anonim, belum disetujui, dan ditangguhkan ditolak', async () => {
    await assertFails(getBytes(ref(anonim(env).storage(), PATH)))
    await assertFails(getBytes(objek('baru1', PATH)))
    await assertFails(getBytes(objek('nonaktifA', PATH)))
  })

  it('dokumen yang dihapus-lunak tidak dapat diunduh', async () => {
    await seed(env, async (db) => {
      await updateDoc(doc(db, 'documents/dok1'), { status: 'dihapus' })
    })
    await assertFails(getBytes(objek('supA1', PATH)))
  })

  it('daftar isi folder tidak dapat dienumerasi', async () => {
    await assertFails(listAll(ref(storageOf('supA1'), `sekolah/${SEKOLAH_A}/dokumen/dok1/v1`)))
    await assertFails(listAll(ref(storageOf('supA1'), `sekolah/${SEKOLAH_A}/dokumen`)))
  })
})

describe('Storage: menghapus', () => {
  it('pengunggah membersihkan berkas dari unggahan yang gagal difinalisasi', async () => {
    await seedDokumen(env, 'dok1', isiDokumenBaru({ by: 'supA1' }, Timestamp.now()))
    await taruhBerkas(PATH)
    await assertFails(deleteObject(objek('supA2', PATH)))
    await assertSucceeds(deleteObject(objek('supA1', PATH)))
  })

  it('berkas dokumen yang tersedia tidak dapat dihapus langsung', async () => {
    await seedDokumen(env, 'dok1', isiDokumenTersedia({ by: 'supA1' }))
    await taruhBerkas(PATH)
    await assertFails(deleteObject(objek('supA1', PATH)))
  })

  it('penghapusan permanen: hanya pembuat, hanya setelah dokumen berstatus dihapus', async () => {
    await seedDokumen(env, 'dok1', { ...isiDokumenTersedia({ by: 'supA1' }), status: 'dihapus' })
    await taruhBerkas(PATH)
    await assertFails(deleteObject(objek('supA2', PATH)))
    await assertFails(deleteObject(objek('supB', PATH)))
    await assertSucceeds(deleteObject(objek('supA1', PATH)))
  })

  it('penghapusan permanen dapat diulang tanpa error otorisasi bila sebagian berkas sudah hilang (idempoten)', async () => {
    await seedDokumen(env, 'dok1', { ...isiDokumenTersedia({ by: 'supA1' }), status: 'dihapus' })
    await taruhBerkas(PATH)
    await assertSucceeds(deleteObject(objek('supA1', PATH)))
    // Percobaan kedua: objek sudah tidak ada → bukan penolakan izin, melainkan "tidak ditemukan".
    await expect(deleteObject(objek('supA1', PATH))).rejects.toMatchObject({ code: 'storage/object-not-found' })
  })
})
