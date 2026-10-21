import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc, Timestamp, writeBatch, type Firestore } from 'firebase/firestore'

export const PROJECT_ID = 'demo-instrumen'

export const SEK_A = 'sekolah-a'
export const SEK_B = 'sekolah-b'

/** Identitas pengguna uji. `verified: false` meniru email password yang belum diverifikasi. */
export const PENGGUNA = {
  adminA: { uid: 'adminA', email: 'admin.a@contoh.id', schoolId: SEK_A, role: 'admin', status: 'active' },
  supA1: { uid: 'supA1', email: 'sup.a1@contoh.id', schoolId: SEK_A, role: 'supervisor', status: 'active' },
  supA2: { uid: 'supA2', email: 'sup.a2@contoh.id', schoolId: SEK_A, role: 'supervisor', status: 'active' },
  adminB: { uid: 'adminB', email: 'admin.b@contoh.id', schoolId: SEK_B, role: 'admin', status: 'active' },
  supB: { uid: 'supB', email: 'sup.b@contoh.id', schoolId: SEK_B, role: 'supervisor', status: 'active' },
  nonaktifA: { uid: 'nonaktifA', email: 'nonaktif.a@contoh.id', schoolId: SEK_A, role: 'supervisor', status: 'disabled' },
  belumVerifikasiA: { uid: 'belumVerifikasiA', email: 'bv.a@contoh.id', schoolId: SEK_A, role: 'supervisor', status: 'active' },
} as const

export type NamaPengguna = keyof typeof PENGGUNA

/** Akun terautentikasi tanpa profil (belum menebus undangan). */
export const BARU = { uid: 'baru1', email: 'baru@contoh.id' }

export const GURU_A1 = 'guru-a1'
export const GURU_A_NONAKTIF = 'guru-a-nonaktif'
export const GURU_B1 = 'guru-b1'
export const SV_A1 = 'sv-a1' // dibuat supA1
export const SV_B1 = 'sv-b1' // dibuat supB
export const TL_A1 = 'tl-a1'

export const INVITE = {
  ok: 'invite-supervisor-a-0000000001',
  adminA: 'invite-admin-a-00000000000001',
  kadaluarsa: 'invite-kadaluarsa-000000000001',
  terpakai: 'invite-terpakai-0000000000001',
  khususEmail: 'invite-khusus-email-00000001',
  untukB: 'invite-supervisor-b-0000000001',
}

let env: RulesTestEnvironment

/** Pustaka uji bertipe Firestore compat; fungsi modular menerima objek yang sama saat runtime. */
const modular = (db: unknown) => db as Firestore

export async function siapkanEnv(): Promise<RulesTestEnvironment> {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
  return env
}

export const ambilEnv = () => env

const sehari = 86_400_000
const depan = (hari: number) => Timestamp.fromMillis(Date.now() + hari * sehari)
const lalu = (hari: number) => Timestamp.fromMillis(Date.now() - hari * sehari)

/** Menulis data awal TANPA melewati rules (meniru data yang dibuat konsol / skrip admin). */
export async function isiDataAwal() {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = modular(ctx.firestore())
    const sekarang = Timestamp.now()

    for (const [id, nama] of [[SEK_A, 'SMP A'], [SEK_B, 'SMP B']]) {
      await setDoc(doc(db, 'schools', id), { nama, createdAt: sekarang })
    }

    for (const p of Object.values(PENGGUNA)) {
      await setDoc(doc(db, 'users', p.uid), {
        email: p.email,
        nama: p.uid,
        schoolId: p.schoolId,
        role: p.role,
        status: p.status,
        inviteId: 'seed',
        createdAt: sekarang,
      })
    }

    const guru = (schoolId: string, nama: string, aktif: boolean) => ({
      schoolId, nama, mapel: 'IPA', aktif, createdAt: sekarang, createdBy: 'adminA', updatedAt: sekarang, updatedBy: 'adminA',
    })
    await setDoc(doc(db, 'guru', GURU_A1), guru(SEK_A, 'Budi', true))
    await setDoc(doc(db, 'guru', GURU_A_NONAKTIF), guru(SEK_A, 'Lama', false))
    await setDoc(doc(db, 'guru', GURU_B1), guru(SEK_B, 'Sari', true))

    await setDoc(doc(db, 'supervisi', SV_A1), { ...isiSupervisi(SEK_A, GURU_A1, 'Budi'), ...metaTersimpan('supA1', sekarang) })
    await setDoc(doc(db, 'supervisi', SV_B1), { ...isiSupervisi(SEK_B, GURU_B1, 'Sari'), ...metaTersimpan('supB', sekarang) })

    await setDoc(doc(db, 'tindakLanjut', TL_A1), {
      schoolId: SEK_A, supervisiId: SV_A1, guruId: GURU_A1, guruNama: 'Budi', deskripsi: 'Ikuti pelatihan asesmen',
      status: 'belum', penanggungJawab: 'Kepala sekolah', tenggat: '2026-12-01', selesaiAt: null,
      createdBy: 'supA1', createdAt: sekarang, updatedAt: sekarang, updatedBy: 'supA1', rev: 1,
    })

    const undangan = (schoolId: string, role: string, extra: Record<string, unknown> = {}) => ({
      schoolId, role, email: null, createdBy: 'adminA', createdAt: sekarang, expiresAt: depan(7), usedBy: null, usedAt: null, ...extra,
    })
    await setDoc(doc(db, 'invites', INVITE.ok), undangan(SEK_A, 'supervisor'))
    await setDoc(doc(db, 'invites', INVITE.adminA), undangan(SEK_A, 'admin'))
    await setDoc(doc(db, 'invites', INVITE.kadaluarsa), undangan(SEK_A, 'supervisor', { expiresAt: lalu(1) }))
    await setDoc(doc(db, 'invites', INVITE.terpakai), undangan(SEK_A, 'supervisor', { usedBy: 'orangLain', usedAt: sekarang }))
    await setDoc(doc(db, 'invites', INVITE.khususEmail), undangan(SEK_A, 'supervisor', { email: 'Khusus@Contoh.id' }))
    await setDoc(doc(db, 'invites', INVITE.untukB), undangan(SEK_B, 'supervisor', { createdBy: 'adminB' }))
  })
}

/** Konteks Firestore untuk pengguna berprofil. */
export function sebagai(nama: NamaPengguna, opsi: { verified?: boolean } = {}) {
  const p = PENGGUNA[nama]
  const verified = opsi.verified ?? nama !== 'belumVerifikasiA'
  return modular(env.authenticatedContext(p.uid, { email: p.email, email_verified: verified }).firestore())
}

/** Akun login tanpa profil. */
export function sebagaiBaru(opsi: { verified?: boolean; email?: string; uid?: string } = {}) {
  return modular(
    env
      .authenticatedContext(opsi.uid ?? BARU.uid, { email: opsi.email ?? BARU.email, email_verified: opsi.verified ?? true })
      .firestore(),
  )
}

export const anonim = () => modular(env.unauthenticatedContext().firestore())

// ------------------------------------------------------------------ pembangun dokumen

export function isiSupervisi(schoolId: string, guruId: string, guruNama: string) {
  return {
    schoolId,
    guruId,
    guruNama,
    identitas: {
      namaSekolah: 'SMP Uji',
      namaGuru: guruNama,
      mataPelajaran: 'IPA',
      kelas: 'VII A',
      namaSupervisor: 'Supervisor',
      tanggal: '2026-10-21',
      kurikulum: 'Kurikulum Merdeka',
      modelPembelajaran: 'Tatap Muka',
    },
    skor: { A1: 4, A2: 3, A3: 4 },
    catatanAspek: {},
    catatan: { kekuatan: 'baik', perbaikan: '', rekomendasi: '' },
    ringkasan: { total: 11, maks: 12, nilai: 91.67, predikat: 'Sangat Baik', terisi: 3, jumlah: 3, perAspek: {} },
    versiInstrumen: 'uji-1',
    instrumen: { versi: 'uji-1', nama: 'Uji', status: 'provisional', ambang: [], aspek: [] },
  }
}

/** Metadata untuk dokumen yang disimpan langsung (seed). */
function metaTersimpan(uid: string, waktu: Timestamp) {
  return {
    createdBy: uid, createdByName: uid, createdAt: waktu, updatedAt: waktu, updatedBy: uid, rev: 1, deletedAt: null, deletedBy: null,
  }
}

/** Metadata yang dikirim klien saat membuat dokumen (memakai waktu server). */
export function metaBuat(uid: string) {
  return {
    createdBy: uid, createdByName: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: uid, rev: 1,
    deletedAt: null, deletedBy: null,
  }
}

export function riwayat(aksi: string, rev: number, uid: string, ekstra: Record<string, unknown> = {}) {
  return { aksi, oleh: uid, olehNama: uid, waktu: serverTimestamp(), rev, ...ekstra }
}

/** Membuat supervisi lengkap dengan entri riwayat pada satu batch (seperti yang dilakukan aplikasi). */
export async function tulisSupervisi(
  db: Firestore,
  id: string,
  data: Record<string, unknown>,
  entri: Record<string, unknown> | null,
  rev = 1,
) {
  const b = writeBatch(db)
  b.set(doc(db, 'supervisi', id), data)
  if (entri) b.set(doc(db, 'supervisi', id, 'riwayat', String(rev)), entri)
  return b.commit()
}

/** Memperbarui supervisi + riwayat pada satu batch. */
export async function ubahSupervisi(
  db: Firestore,
  id: string,
  perubahan: Record<string, unknown>,
  entri: Record<string, unknown> | null,
  rev: number,
) {
  const b = writeBatch(db)
  b.update(doc(db, 'supervisi', id), perubahan)
  if (entri) b.set(doc(db, 'supervisi', id, 'riwayat', String(rev)), entri)
  return b.commit()
}

export { depan, lalu }
