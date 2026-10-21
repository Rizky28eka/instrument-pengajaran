import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { ambilEnv, BARU, depan, INVITE, isiDataAwal, sebagai, sebagaiBaru, SEK_A, SEK_B, siapkanEnv } from './helpers'

beforeAll(async () => {
  await siapkanEnv()
})
beforeEach(async () => {
  await isiDataAwal()
})
afterAll(async () => {
  await ambilEnv().cleanup()
})

/** Meniru aplikasi: profil + penandaan undangan terpakai dalam satu batch. */
async function tebus(db: Firestore, uid: string, inviteId: string, profil: Record<string, unknown> = {}) {
  const b = writeBatch(db)
  b.set(doc(db, 'users', uid), {
    email: BARU.email,
    nama: 'Pengguna Baru',
    schoolId: SEK_A,
    role: 'supervisor',
    status: 'active',
    inviteId,
    createdAt: serverTimestamp(),
    ...profil,
  })
  b.update(doc(db, 'invites', inviteId), { usedBy: uid, usedAt: serverTimestamp() })
  return b.commit()
}

describe('menebus undangan', () => {
  it('berhasil dengan undangan valid, lalu pengguna dapat membaca data sekolahnya', async () => {
    const db = sebagaiBaru()
    await assertSucceeds(tebus(db, BARU.uid, INVITE.ok))
    await assertSucceeds(getDoc(doc(db, 'schools', SEK_A)))
    await assertSucceeds(getDoc(doc(db, 'guru', 'guru-a1')))
  })

  it('undangan admin menghasilkan peran admin', async () => {
    const db = sebagaiBaru()
    await assertSucceeds(tebus(db, BARU.uid, INVITE.adminA, { role: 'admin' }))
  })

  it('ditolak jika email belum terverifikasi', async () => {
    await assertFails(tebus(sebagaiBaru({ verified: false }), BARU.uid, INVITE.ok))
  })

  it('ditolak jika profil mengklaim sekolah berbeda dari undangan', async () => {
    await assertFails(tebus(sebagaiBaru(), BARU.uid, INVITE.ok, { schoolId: SEK_B }))
  })

  it('ditolak jika profil menaikkan peran melebihi undangan (supervisor → admin)', async () => {
    await assertFails(tebus(sebagaiBaru(), BARU.uid, INVITE.ok, { role: 'admin' }))
  })

  it('ditolak jika status awal bukan active', async () => {
    await assertFails(tebus(sebagaiBaru(), BARU.uid, INVITE.ok, { status: 'disabled' }))
  })

  it('ditolak untuk undangan kedaluwarsa', async () => {
    await assertFails(tebus(sebagaiBaru(), BARU.uid, INVITE.kadaluarsa))
  })

  it('ditolak untuk undangan yang sudah terpakai', async () => {
    await assertFails(tebus(sebagaiBaru(), BARU.uid, INVITE.terpakai))
  })

  it('ditolak untuk ID undangan yang tidak ada', async () => {
    await assertFails(tebus(sebagaiBaru(), BARU.uid, 'undangan-tidak-ada-00000000'))
  })

  it('ditolak jika email akun tidak sama dengan email di profil', async () => {
    await assertFails(tebus(sebagaiBaru(), BARU.uid, INVITE.ok, { email: 'orang.lain@contoh.id' }))
  })

  it('undangan terikat email: ditolak untuk email lain', async () => {
    await assertFails(tebus(sebagaiBaru(), BARU.uid, INVITE.khususEmail))
  })

  it('undangan terikat email: berhasil untuk email yang sama (tanpa membedakan huruf besar/kecil)', async () => {
    const db = sebagaiBaru({ email: 'khusus@contoh.id' })
    await assertSucceeds(tebus(db, BARU.uid, INVITE.khususEmail, { email: 'khusus@contoh.id' }))
  })

  it('ditolak jika menulis profil sendiri tanpa menandai undangan terpakai', async () => {
    const db = sebagaiBaru()
    await assertFails(
      setDoc(doc(db, 'users', BARU.uid), {
        email: BARU.email, nama: 'X', schoolId: SEK_A, role: 'supervisor', status: 'active', inviteId: INVITE.ok, createdAt: serverTimestamp(),
      }),
    )
  })

  it('ditolak jika menandai undangan terpakai tanpa membuat profil', async () => {
    await assertFails(updateDoc(doc(sebagaiBaru(), 'invites', INVITE.ok), { usedBy: BARU.uid, usedAt: serverTimestamp() }))
  })

  it('ditolak jika undangan ditandai terpakai oleh uid orang lain', async () => {
    const db = sebagaiBaru()
    const batch = writeBatch(db)
    batch.set(doc(db, 'users', BARU.uid), {
      email: BARU.email, nama: 'X', schoolId: SEK_A, role: 'supervisor', status: 'active', inviteId: INVITE.ok, createdAt: serverTimestamp(),
    })
    batch.update(doc(db, 'invites', INVITE.ok), { usedBy: 'orangLain', usedAt: serverTimestamp() })
    await assertFails(batch.commit())
  })

  it('ditolak jika menulis profil untuk uid orang lain', async () => {
    await assertFails(tebus(sebagaiBaru(), 'adminA', INVITE.ok))
  })

  it('tidak bisa dipakai dua kali: tebusan kedua pada undangan yang sama gagal', async () => {
    await assertSucceeds(tebus(sebagaiBaru(), BARU.uid, INVITE.ok))
    await assertFails(tebus(sebagaiBaru({ uid: 'baru2', email: 'baru2@contoh.id' }), 'baru2', INVITE.ok, { email: 'baru2@contoh.id' }))
  })

  it('pengguna yang sudah punya profil tidak dapat menimpa profilnya (naik peran / pindah sekolah)', async () => {
    const db = sebagai('supA1')
    await assertFails(
      setDoc(doc(db, 'users', 'supA1'), {
        email: 'sup.a1@contoh.id', nama: 'x', schoolId: SEK_B, role: 'admin', status: 'active', inviteId: INVITE.untukB, createdAt: serverTimestamp(),
      }),
    )
    await assertFails(updateDoc(doc(db, 'users', 'supA1'), { role: 'admin' }))
    await assertFails(updateDoc(doc(db, 'users', 'supA1'), { schoolId: SEK_B }))
    await assertFails(updateDoc(doc(db, 'users', 'supA1'), { status: 'active' }))
  })
})

describe('undangan: pembuatan dan pengelolaan', () => {
  const baru = (patch: Record<string, unknown> = {}) => ({
    schoolId: SEK_A, role: 'supervisor', email: null, createdBy: 'adminA', createdAt: serverTimestamp(), expiresAt: depan(7), usedBy: null, usedAt: null, ...patch,
  })
  const ID = 'undangan-baru-0000000000001'

  it('admin membuat undangan untuk sekolahnya', async () => {
    await assertSucceeds(setDoc(doc(sebagai('adminA'), 'invites', ID), baru()))
  })

  it('admin membuat undangan admin dan undangan terikat email', async () => {
    await assertSucceeds(setDoc(doc(sebagai('adminA'), 'invites', ID), baru({ role: 'admin', email: 'a@b.id' })))
  })

  it('admin tidak dapat membuat undangan untuk sekolah lain', async () => {
    await assertFails(setDoc(doc(sebagai('adminA'), 'invites', ID), baru({ schoolId: SEK_B })))
  })

  it('supervisor biasa tidak dapat membuat undangan', async () => {
    await assertFails(setDoc(doc(sebagai('supA1'), 'invites', ID), baru({ createdBy: 'supA1' })))
  })

  it.each([
    ['peran tidak dikenal', { role: 'superadmin' }],
    ['masa berlaku lebih dari 30 hari', { expiresAt: depan(45) }],
    ['sudah kedaluwarsa saat dibuat', { expiresAt: Timestamp.fromMillis(Date.now() - 1000) }],
    ['langsung ditandai terpakai', { usedBy: 'x', usedAt: Timestamp.now() }],
    ['createdBy palsu', { createdBy: 'orangLain' }],
    ['createdAt bukan waktu server', { createdAt: Timestamp.fromMillis(0) }],
    ['field tambahan', { akses: 'penuh' }],
  ])('ditolak: %s', async (_nama, patch) => {
    await assertFails(setDoc(doc(sebagai('adminA'), 'invites', ID), baru(patch)))
  })

  it('ID undangan terlalu pendek (mudah ditebak) ditolak', async () => {
    await assertFails(setDoc(doc(sebagai('adminA'), 'invites', 'pendek'), baru()))
  })

  it('admin mendaftar undangan sekolahnya, tetapi tidak sekolah lain', async () => {
    const db = sebagai('adminA')
    await assertSucceeds(getDocs(query(collection(db, 'invites'), where('schoolId', '==', SEK_A))))
    await assertFails(getDocs(query(collection(db, 'invites'), where('schoolId', '==', SEK_B))))
    await assertFails(getDocs(collection(db, 'invites')))
  })

  it('supervisor biasa tidak dapat mendaftar undangan', async () => {
    await assertFails(getDocs(query(collection(sebagai('supA1'), 'invites'), where('schoolId', '==', SEK_A))))
  })

  it('admin mencabut undangan yang belum terpakai, tetapi tidak yang sudah terpakai', async () => {
    const db = sebagai('adminA')
    await assertSucceeds(deleteDoc(doc(db, 'invites', INVITE.ok)))
    await assertFails(deleteDoc(doc(db, 'invites', INVITE.terpakai)))
  })

  it('admin sekolah A tidak dapat mencabut undangan sekolah B', async () => {
    await assertFails(deleteDoc(doc(sebagai('adminA'), 'invites', INVITE.untukB)))
  })

  it('supervisor biasa tidak dapat mencabut undangan', async () => {
    await assertFails(deleteDoc(doc(sebagai('supA1'), 'invites', INVITE.ok)))
  })
})

describe('pengelolaan pengguna', () => {
  it('admin menonaktifkan dan mengaktifkan kembali supervisor sekolahnya', async () => {
    const db = sebagai('adminA')
    await assertSucceeds(updateDoc(doc(db, 'users', 'supA1'), { status: 'disabled' }))
    await assertSucceeds(updateDoc(doc(db, 'users', 'nonaktifA'), { status: 'active' }))
  })

  it('pengguna yang dinonaktifkan langsung kehilangan akses', async () => {
    await assertSucceeds(updateDoc(doc(sebagai('adminA'), 'users', 'supA1'), { status: 'disabled' }))
    await assertFails(getDoc(doc(sebagai('supA1'), 'guru', 'guru-a1')))
  })

  it('admin tidak dapat mengubah peran, sekolah, atau email pengguna', async () => {
    const db = sebagai('adminA')
    await assertFails(updateDoc(doc(db, 'users', 'supA1'), { role: 'admin' }))
    await assertFails(updateDoc(doc(db, 'users', 'supA1'), { schoolId: SEK_B }))
    await assertFails(updateDoc(doc(db, 'users', 'supA1'), { email: 'baru@contoh.id' }))
    await assertFails(updateDoc(doc(db, 'users', 'supA1'), { status: 'disabled', role: 'admin' }))
  })

  it('admin tidak dapat menonaktifkan dirinya sendiri', async () => {
    await assertFails(updateDoc(doc(sebagai('adminA'), 'users', 'adminA'), { status: 'disabled' }))
  })

  it('status hanya boleh active atau disabled', async () => {
    await assertFails(updateDoc(doc(sebagai('adminA'), 'users', 'supA1'), { status: 'super' }))
  })

  it('admin sekolah B tidak dapat mengubah pengguna sekolah A', async () => {
    await assertFails(updateDoc(doc(sebagai('adminB'), 'users', 'supA1'), { status: 'disabled' }))
  })

  it('supervisor biasa tidak dapat mengubah pengguna lain', async () => {
    await assertFails(updateDoc(doc(sebagai('supA1'), 'users', 'supA2'), { status: 'disabled' }))
  })

  it('profil tidak dapat dihapus', async () => {
    await assertFails(deleteDoc(doc(sebagai('adminA'), 'users', 'supA1')))
  })

  it('membaca profil: diri sendiri dan admin sekolah yang sama, bukan sekolah lain atau rekan sejawat', async () => {
    await assertSucceeds(getDoc(doc(sebagai('supA1'), 'users', 'supA1')))
    await assertSucceeds(getDoc(doc(sebagai('adminA'), 'users', 'supA1')))
    await assertFails(getDoc(doc(sebagai('supA1'), 'users', 'supA2')))
    await assertFails(getDoc(doc(sebagai('adminB'), 'users', 'supA1')))
  })

  it('admin mendaftar pengguna sekolahnya; supervisor tidak', async () => {
    await assertSucceeds(getDocs(query(collection(sebagai('adminA'), 'users'), where('schoolId', '==', SEK_A))))
    await assertFails(getDocs(query(collection(sebagai('adminA'), 'users'), where('schoolId', '==', SEK_B))))
    await assertFails(getDocs(query(collection(sebagai('supA1'), 'users'), where('schoolId', '==', SEK_A))))
  })
})
