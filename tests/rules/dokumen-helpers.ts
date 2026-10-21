import type { RulesTestContext, RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { GURU_A1, GURU_A_NONAKTIF, GURU_B1, isiDataAwal, isiSupervisi, PENGGUNA, SEK_A, SEK_B, siapkanEnv } from './helpers.ts'

/**
 * Pembantu tes dokumen di atas model akses `main` (satu sekolah per pengguna; admin sekolah).
 * Persona memakai uid yang sama dengan kunci di `PENGGUNA`: supA1 (pembuat), supA2 (rekan sesekolah),
 * adminA (admin sekolah A), supB / adminB (sekolah lain), nonaktifA, belumVerifikasiA.
 */
export const SEKOLAH_A = SEK_A
export const SEKOLAH_B = SEK_B
export { GURU_A1, GURU_B1 }
export const GURU_A2_NONAKTIF = GURU_A_NONAKTIF
export const GURU_A3 = 'guru-a3'

export const initEnv = siapkanEnv

const modular = (db: unknown) => db as Firestore

/** Konteks terautentikasi dengan klaim token seperti yang dikirim Firebase Auth. */
export function sebagai(env: RulesTestEnvironment, uid: string, opsi: { verified?: boolean } = {}): RulesTestContext {
  const p = (PENGGUNA as Record<string, { email: string }>)[uid]
  return env.authenticatedContext(uid, { email: p?.email ?? `${uid}@contoh.id`, email_verified: opsi.verified ?? uid !== 'belumVerifikasiA' })
}

export const anonim = (env: RulesTestEnvironment) => env.unauthenticatedContext()

export const firestoreDari = (ctx: RulesTestContext) => modular(ctx.firestore())

/** Menulis data langsung (melewati Rules) untuk menyiapkan keadaan tes. */
export async function seed(env: RulesTestEnvironment, fn: (db: Firestore) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (c) => fn(modular(c.firestore())))
}

/** Data dasar `main` (2 sekolah, pengguna, guru, supervisi, tindak lanjut) + guru tambahan. */
export async function seedDasar(env: RulesTestEnvironment) {
  await isiDataAwal()
  await seed(env, async (db) => {
    const t = Timestamp.now()
    await setDoc(doc(db, 'guru', GURU_A3), { schoolId: SEKOLAH_A, nama: 'Siti', mapel: 'IPA', aktif: true, createdAt: t, createdBy: 'adminA', updatedAt: t, updatedBy: 'adminA' })
  })
}

export const seedGuruTambahan = async (_env: RulesTestEnvironment) => {}

/** Supervisi sederhana sebagai induk relasi dokumen. */
export async function seedSupervisi(env: RulesTestEnvironment, id: string, o: { schoolId?: string; by?: string; hapus?: boolean } = {}) {
  const schoolId = o.schoolId ?? SEKOLAH_A
  const t = Timestamp.now()
  await seed(env, async (db) => {
    await setDoc(doc(db, 'supervisi', id), {
      ...isiSupervisi(schoolId, schoolId === SEKOLAH_A ? GURU_A1 : GURU_B1, 'Budi'),
      createdBy: o.by ?? 'supA1',
      createdByName: o.by ?? 'supA1',
      createdAt: t,
      updatedAt: t,
      updatedBy: o.by ?? 'supA1',
      rev: 1,
      deletedAt: o.hapus ? t : null,
      deletedBy: o.hapus ? 'adminA' : null,
    })
  })
}

/** Mengaktifkan fitur pengajuan dokumen guru pada sekolah (di produksi: diatur lewat konsol/skrip admin). */
export async function aktifkanPengirimanGuru(env: RulesTestEnvironment, schoolId = SEKOLAH_A) {
  await seed(env, async (db) => {
    await setDoc(doc(db, 'schools', schoolId), { fitur: { pengirimanDokumenGuru: true } }, { merge: true })
  })
}

// ------------------------------------------------------------------ dokumen

export const UUID_UJI = '3f2c1a9e-8b7d-4c6e-9a10-5d4e3f2a1b0c'
export const MIME_PDF = 'application/pdf'
export const UKURAN_UJI = 2048

export const pathDokumen = (docId: string, o: { schoolId?: string; versi?: number; ext?: string; uuid?: string } = {}) =>
  `sekolah/${o.schoolId ?? SEKOLAH_A}/dokumen/${docId}/v${o.versi ?? 1}/${o.uuid ?? UUID_UJI}.${o.ext ?? 'pdf'}`

interface OpsiDokumen {
  docId?: string
  schoolId?: string
  kategori?: string
  supervisiId?: string | null
  guruId?: string | null
  tindakId?: string | null
  by?: string
  versi?: number
  ukuran?: number
  mime?: string
  ext?: string
  reviewStatus?: string | null
  status?: string
  banyakVersi?: number
}

/** Rincian satu berkas (dipakai untuk `pending` maupun entri `versions`). */
export function rincianBerkas(o: OpsiDokumen = {}) {
  const { docId = 'dok1', schoolId = SEKOLAH_A, by = 'supA1', versi = 1, ukuran = UKURAN_UJI, mime = MIME_PDF, ext = 'pdf' } = o
  return {
    n: versi,
    storagePath: pathDokumen(docId, { schoolId, versi, ext }),
    fileName: 'Laporan.pdf',
    mimeType: mime,
    size: ukuran,
    sha256: 'a'.repeat(64),
    uploadedBy: by,
  }
}

export const entriReview = (status: string, oleh: string, catatan = '') => ({ status, oleh, nama: `Nama ${oleh}`, catatan, at: Timestamp.now() })

/** Dokumen yang baru mulai diunggah (status `mengunggah`, belum ada versi). `waktu` = serverTimestamp() untuk klien. */
export function isiDokumenBaru(o: OpsiDokumen = {}, waktu: unknown = serverTimestamp()) {
  const { schoolId = SEKOLAH_A, kategori = 'pendukung-supervisi', by = 'supA1' } = o
  const relasi = {
    supervisiId: o.supervisiId === undefined ? 'sv1' : o.supervisiId,
    guruId: o.guruId === undefined ? null : o.guruId,
    tindakId: o.tindakId === undefined ? null : o.tindakId,
  }
  const perluReview = kategori === 'pengajuan-guru'
  return {
    schoolId,
    kategori,
    ...relasi,
    judul: 'Laporan.pdf',
    status: 'mengunggah',
    currentVersion: 0,
    versions: [] as unknown[],
    pending: { ...rincianBerkas({ ...o, by }), startedAt: Timestamp.now() },
    reviewStatus: perluReview ? 'diajukan' : null,
    reviewRiwayat: perluReview ? [entriReview('diajukan', by)] : [],
    createdBy: by,
    createdByName: 'Pelaku',
    createdAt: waktu,
    updatedAt: waktu,
    deletedAt: null,
    deletedBy: null,
  }
}

/** Dokumen yang sudah selesai diunggah (`banyakVersi` versi, tanpa unggahan tertunda). */
export function isiDokumenTersedia(o: OpsiDokumen = {}, waktu: unknown = Timestamp.now()) {
  const { banyakVersi = 1, by = 'supA1' } = o
  const dasar = isiDokumenBaru(o, waktu)
  return {
    ...dasar,
    status: o.status ?? 'tersedia',
    currentVersion: banyakVersi,
    versions: Array.from({ length: banyakVersi }, (_v, i) => ({ ...rincianBerkas({ ...o, versi: i + 1, by }), uploadedAt: Timestamp.now() })),
    pending: null,
    ...(o.reviewStatus !== undefined
      ? { reviewStatus: o.reviewStatus, reviewRiwayat: o.reviewStatus ? [entriReview(o.reviewStatus, by)] : [] }
      : {}),
  }
}

export async function seedDokumen(env: RulesTestEnvironment, id: string, isi: Record<string, unknown>) {
  await seed(env, async (db) => {
    await setDoc(doc(db, 'documents', id), isi)
  })
  return id
}
