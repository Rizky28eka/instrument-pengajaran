import { hidrasiInstrumen, INSTRUMEN_LEGACY, type Instrumen, type InstrumenSnapshot } from '@/data/instrumen'
import { hitungRingkasan, type Ringkasan } from '@/lib/scoring'
import type { Identitas, SupervisiFormValues } from './schema'

export interface Supervisi {
  id: string
  identitas: Identitas
  skor: Record<string, number>
  catatanAspek: Record<string, string>
  catatan: SupervisiFormValues['catatan']
  /** Instrumen yang berlaku saat dokumen dibuat (snapshot), bukan instrumen aktif sekarang. */
  instrumen: Instrumen
  ringkasan: Ringkasan
  createdBy: string
  createdByName: string
  createdAt: Date | null
  updatedAt: Date | null
}

type Waktu = { toDate?: () => Date } | null | undefined
const keDate = (t: Waktu) => t?.toDate?.() ?? null

/** Dokumen tanpa snapshot (dibuat sebelum versioning) dibaca memakai instrumen legacy. */
export function instrumenDari(d: Record<string, unknown>): Instrumen {
  const snapshot = d.instrumen as InstrumenSnapshot | undefined
  return snapshot?.aspek ? hidrasiInstrumen(snapshot) : INSTRUMEN_LEGACY
}

/** Memetakan data dokumen Firestore ke model aplikasi. Murni — tidak menyentuh Firebase. */
export function dokumenKeSupervisi(id: string, d: Record<string, any>): Supervisi {
  const skor = (d.skor ?? {}) as Record<string, number>
  const instrumen = instrumenDari(d)
  return {
    id,
    identitas: d.identitas,
    skor,
    catatanAspek: d.catatanAspek ?? {},
    catatan: { kekuatan: '', perbaikan: '', rekomendasi: '', ...d.catatan },
    instrumen,
    // Dihitung ulang dari snapshot instrumen dokumen itu sendiri, bukan instrumen aktif.
    ringkasan: hitungRingkasan(skor, instrumen),
    createdBy: d.createdBy,
    createdByName: d.createdByName ?? '',
    createdAt: keDate(d.createdAt),
    updatedAt: keDate(d.updatedAt),
  }
}
