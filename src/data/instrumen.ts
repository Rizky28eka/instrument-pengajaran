/**
 * Registri instrumen supervisi.
 *
 * - `INSTRUMEN_AKTIF` dipakai untuk supervisi BARU.
 * - Dokumen lama membawa snapshot instrumennya sendiri (lihat `features/supervisi/api.ts`),
 *   sehingga mengganti instrumen aktif tidak mengubah hasil historis.
 */
import { INSTRUMEN_V1 } from './instrumen-v1'
import { semuaIndikator, skorMaksTotal, type Instrumen } from './instrumen-types'

export * from './instrumen-types'

export const INSTRUMEN_TERDAFTAR: Record<string, Instrumen> = {
  [INSTRUMEN_V1.versi]: INSTRUMEN_V1,
}

export const INSTRUMEN_AKTIF: Instrumen = INSTRUMEN_V1

/** Dokumen yang dibuat sebelum versioning (tanpa field `instrumen`) memakai isi yang sama dengan v1. */
export const INSTRUMEN_LEGACY: Instrumen = INSTRUMEN_V1

// Pintasan untuk antarmuka yang menampilkan instrumen aktif.
export const ASPEK = INSTRUMEN_AKTIF.aspek
export const SEMUA_INDIKATOR = semuaIndikator(INSTRUMEN_AKTIF)
export const SKOR_MAKS_TOTAL = skorMaksTotal(INSTRUMEN_AKTIF)
