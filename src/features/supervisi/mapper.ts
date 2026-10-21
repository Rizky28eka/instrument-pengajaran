import { hidrasiInstrumen, INSTRUMEN_LEGACY, snapshotValid, type Instrumen } from '@/data/instrumen'
import { hitungRingkasan, type Ringkasan } from '@/lib/scoring'
import type { Identitas, SupervisiFormValues } from './schema'

export interface Supervisi {
  id: string
  schoolId: string
  guruId: string
  guruNama: string
  identitas: Identitas
  skor: Record<string, number>
  catatanAspek: Record<string, string>
  catatan: SupervisiFormValues['catatan']
  /** Instrumen yang berlaku saat dokumen dibuat (snapshot), bukan instrumen aktif sekarang. */
  instrumen: Instrumen
  /** false bila dokumen membawa snapshot yang rusak; hasil lalu dihitung dengan instrumen standar. */
  snapshotSah: boolean
  ringkasan: Ringkasan
  /** Nomor revisi; dipakai untuk mencegah penimpaan perubahan orang lain (lost update). */
  rev: number
  createdBy: string
  createdByName: string
  createdAt: Date | null
  updatedAt: Date | null
  updatedBy: string
  deletedAt: Date | null
  deletedBy: string | null
}

type Waktu = { toDate?: () => Date } | null | undefined
const keDate = (t: Waktu) => t?.toDate?.() ?? null

/**
 * - tanpa snapshot (dibuat sebelum versioning) → instrumen legacy;
 * - snapshot sah → dipakai apa adanya;
 * - snapshot ada tetapi rusak → instrumen legacy + `sah: false` (tidak melempar).
 */
export function instrumenDari(d: Record<string, unknown>): { instrumen: Instrumen; sah: boolean } {
  if (d.instrumen === undefined || d.instrumen === null) return { instrumen: INSTRUMEN_LEGACY, sah: true }
  if (snapshotValid(d.instrumen)) return { instrumen: hidrasiInstrumen(d.instrumen), sah: true }
  return { instrumen: INSTRUMEN_LEGACY, sah: false }
}

/** Memetakan data dokumen Firestore ke model aplikasi. Murni — tidak menyentuh Firebase. */
export function dokumenKeSupervisi(id: string, d: Record<string, any>): Supervisi {
  const skor = (d.skor ?? {}) as Record<string, number>
  const { instrumen, sah } = instrumenDari(d)
  return {
    id,
    schoolId: d.schoolId ?? '',
    guruId: d.guruId ?? '',
    guruNama: d.guruNama ?? d.identitas?.namaGuru ?? '',
    identitas: d.identitas,
    skor,
    catatanAspek: d.catatanAspek ?? {},
    catatan: { kekuatan: '', perbaikan: '', rekomendasi: '', ...d.catatan },
    instrumen,
    snapshotSah: sah,
    // Dihitung ulang dari snapshot instrumen dokumen itu sendiri, bukan instrumen aktif.
    ringkasan: hitungRingkasan(skor, instrumen),
    rev: typeof d.rev === 'number' ? d.rev : 0,
    createdBy: d.createdBy,
    createdByName: d.createdByName ?? '',
    createdAt: keDate(d.createdAt),
    updatedAt: keDate(d.updatedAt),
    updatedBy: d.updatedBy ?? d.createdBy ?? '',
    deletedAt: keDate(d.deletedAt),
    deletedBy: d.deletedBy ?? null,
  }
}

/** Nilai awal form dari dokumen yang sudah ada (mode ubah). */
export function supervisiKeFormInput(s: Supervisi) {
  const { namaSekolah: _s, namaGuru: _g, ...identitas } = s.identitas
  return { guruId: s.guruId, identitas, skor: s.skor, catatanAspek: s.catatanAspek, catatan: s.catatan }
}
