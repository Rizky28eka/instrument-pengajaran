import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  ambilEnv,
  anonim,
  GURU_A1,
  GURU_B1,
  INVITE,
  isiDataAwal,
  sebagai,
  sebagaiBaru,
  SEK_A,
  SEK_B,
  siapkanEnv,
  SV_A1,
  SV_B1,
  TL_A1,
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

const SEMUA_DOKUMEN: [string, string][] = [
  ['schools', SEK_A],
  ['users', 'adminA'],
  ['guru', GURU_A1],
  ['supervisi', SV_A1],
  ['tindakLanjut', TL_A1],
]

describe('pengguna anonim', () => {
  it.each(SEMUA_DOKUMEN)('tidak dapat membaca %s/%s', async (kol, id) => {
    await assertFails(getDoc(doc(anonim(), kol, id)))
  })

  it('tidak dapat membaca undangan maupun mendaftar daftarnya', async () => {
    await assertFails(getDoc(doc(anonim(), 'invites', INVITE.ok)))
    await assertFails(getDocs(collection(anonim(), 'invites')))
  })

  it('tidak dapat menulis apa pun', async () => {
    const { setDoc } = await import('firebase/firestore')
    await assertFails(setDoc(doc(anonim(), 'guru', 'x'), { nama: 'x' }))
    await assertFails(setDoc(doc(anonim(), 'supervisi', 'x'), { schoolId: SEK_A }))
    await assertFails(setDoc(doc(anonim(), 'users', 'x'), { role: 'admin' }))
  })

  it('tidak dapat mendaftar seluruh koleksi', async () => {
    for (const kol of ['users', 'guru', 'supervisi', 'tindakLanjut', 'schools']) {
      await assertFails(getDocs(collection(anonim(), kol)))
    }
  })
})

describe('akun login yang belum disetujui (tanpa profil)', () => {
  it.each(SEMUA_DOKUMEN.filter(([k]) => k !== 'users'))('tidak dapat membaca %s/%s', async (kol, id) => {
    await assertFails(getDoc(doc(sebagaiBaru(), kol, id)))
  })

  it('tidak dapat membaca profil orang lain', async () => {
    await assertFails(getDoc(doc(sebagaiBaru(), 'users', 'adminA')))
  })

  it('tidak dapat menjadikan dirinya admin dengan menulis profil sendiri tanpa undangan', async () => {
    const { setDoc, serverTimestamp } = await import('firebase/firestore')
    await assertFails(
      setDoc(doc(sebagaiBaru(), 'users', 'baru1'), {
        email: 'baru@contoh.id', nama: 'Baru', schoolId: SEK_A, role: 'admin', status: 'active', inviteId: 'palsu', createdAt: serverTimestamp(),
      }),
    )
  })

  it('tidak dapat membuat guru, supervisi, atau tindak lanjut', async () => {
    const { setDoc } = await import('firebase/firestore')
    await assertFails(setDoc(doc(sebagaiBaru(), 'guru', 'x'), { schoolId: SEK_A, nama: 'x' }))
    await assertFails(setDoc(doc(sebagaiBaru(), 'supervisi', 'x'), { schoolId: SEK_A }))
    await assertFails(setDoc(doc(sebagaiBaru(), 'tindakLanjut', 'x'), { schoolId: SEK_A }))
  })

  it('tidak dapat membuat undangan', async () => {
    const { setDoc, serverTimestamp, Timestamp } = await import('firebase/firestore')
    await assertFails(
      setDoc(doc(sebagaiBaru(), 'invites', 'undangan-palsu-0000000000001'), {
        schoolId: SEK_A, role: 'admin', email: null, createdBy: 'baru1', createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000), usedBy: null, usedAt: null,
      }),
    )
  })
})

describe('pengguna dengan email belum terverifikasi', () => {
  it('ditolak membaca walaupun punya profil aktif', async () => {
    const db = sebagai('belumVerifikasiA')
    await assertFails(getDoc(doc(db, 'supervisi', SV_A1)))
    await assertFails(getDoc(doc(db, 'guru', GURU_A1)))
    await assertFails(getDoc(doc(db, 'schools', SEK_A)))
    await assertFails(getDoc(doc(db, 'users', 'supA1')))
  })

  it('tetap dapat membaca profilnya sendiri (aplikasi perlu statusnya untuk mengarahkan alur)', async () => {
    await assertSucceeds(getDoc(doc(sebagai('belumVerifikasiA'), 'users', 'belumVerifikasiA')))
  })
})

describe('pengguna dinonaktifkan', () => {
  it('ditolak membaca data sekolahnya sendiri', async () => {
    const db = sebagai('nonaktifA')
    await assertFails(getDoc(doc(db, 'supervisi', SV_A1)))
    await assertFails(getDoc(doc(db, 'guru', GURU_A1)))
    await assertFails(getDoc(doc(db, 'schools', SEK_A)))
  })
})

describe('isolasi antar sekolah', () => {
  it('supervisor sekolah A membaca data sekolah A', async () => {
    const db = sebagai('supA1')
    await assertSucceeds(getDoc(doc(db, 'supervisi', SV_A1)))
    await assertSucceeds(getDoc(doc(db, 'guru', GURU_A1)))
    await assertSucceeds(getDoc(doc(db, 'tindakLanjut', TL_A1)))
    await assertSucceeds(getDoc(doc(db, 'schools', SEK_A)))
  })

  it('supervisor sekolah A tidak dapat membaca data sekolah B', async () => {
    const db = sebagai('supA1')
    await assertFails(getDoc(doc(db, 'supervisi', SV_B1)))
    await assertFails(getDoc(doc(db, 'guru', GURU_B1)))
    await assertFails(getDoc(doc(db, 'schools', SEK_B)))
    await assertFails(getDoc(doc(db, 'users', 'supB')))
  })

  it('admin sekolah A tidak dapat membaca data sekolah B', async () => {
    const db = sebagai('adminA')
    await assertFails(getDoc(doc(db, 'supervisi', SV_B1)))
    await assertFails(getDoc(doc(db, 'guru', GURU_B1)))
    await assertFails(getDoc(doc(db, 'users', 'adminB')))
  })

  it('query yang menarget sekolah lain ditolak', async () => {
    const db = sebagai('supA1')
    await assertFails(getDocs(query(collection(db, 'supervisi'), where('schoolId', '==', SEK_B), where('deletedAt', '==', null))))
    await assertFails(getDocs(query(collection(db, 'guru'), where('schoolId', '==', SEK_B))))
  })

  it('query tanpa batas sekolah ditolak (tidak boleh mengambil semua)', async () => {
    const db = sebagai('supA1')
    await assertFails(getDocs(collection(db, 'supervisi')))
    await assertFails(getDocs(collection(db, 'guru')))
    await assertFails(getDocs(collection(db, 'tindakLanjut')))
  })

  it('query yang dibatasi ke sekolah sendiri berhasil', async () => {
    const db = sebagai('supA1')
    await assertSucceeds(getDocs(query(collection(db, 'supervisi'), where('schoolId', '==', SEK_A), where('deletedAt', '==', null))))
    await assertSucceeds(getDocs(query(collection(db, 'guru'), where('schoolId', '==', SEK_A))))
  })

  it('pengguna sekolah B sebaliknya hanya melihat sekolah B', async () => {
    const db = sebagai('supB')
    await assertSucceeds(getDoc(doc(db, 'supervisi', SV_B1)))
    await assertFails(getDoc(doc(db, 'supervisi', SV_A1)))
  })

  it('koleksi sekolah tidak dapat didaftar siapa pun', async () => {
    await assertFails(getDocs(collection(sebagai('adminA'), 'schools')))
  })

  it('dokumen sekolah tidak dapat ditulis klien, bahkan oleh admin', async () => {
    const { setDoc, updateDoc } = await import('firebase/firestore')
    await assertFails(updateDoc(doc(sebagai('adminA'), 'schools', SEK_A), { nama: 'Diubah' }))
    await assertFails(setDoc(doc(sebagai('adminA'), 'schools', 'sekolah-baru'), { nama: 'X' }))
  })
})

describe('tidak ada hard-delete dari klien', () => {
  it.each(['adminA', 'supA1'] as const)('%s tidak dapat menghapus supervisi', async (siapa) => {
    await assertFails(deleteDoc(doc(sebagai(siapa), 'supervisi', SV_A1)))
  })

  it('tidak dapat menghapus guru, tindak lanjut, atau profil', async () => {
    const db = sebagai('adminA')
    await assertFails(deleteDoc(doc(db, 'guru', GURU_A1)))
    await assertFails(deleteDoc(doc(db, 'tindakLanjut', TL_A1)))
    await assertFails(deleteDoc(doc(db, 'users', 'supA1')))
  })
})

describe('koleksi yang tidak dikenal ditolak (deny-by-default)', () => {
  it('membaca dan menulis koleksi acak gagal untuk admin sekalipun', async () => {
    const { setDoc } = await import('firebase/firestore')
    const db = sebagai('adminA')
    await assertFails(getDoc(doc(db, 'rahasia', 'x')))
    await assertFails(setDoc(doc(db, 'rahasia', 'x'), { a: 1 }))
  })
})
