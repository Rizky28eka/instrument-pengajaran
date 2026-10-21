/**
 * Status review dokumen (hanya kategori yang `perluReview`). Alur sengaja sederhana:
 * diajukan → disetujui | ditolak | perlu_revisi; perlu_revisi → diajukan (setelah versi baru).
 * Keputusan akhir (disetujui, ditolak) tidak dapat dibuka kembali.
 */
export const REVIEW_STATUS = ['diajukan', 'perlu_revisi', 'disetujui', 'ditolak'] as const
export type ReviewStatus = (typeof REVIEW_STATUS)[number]

const TRANSISI: Record<ReviewStatus, readonly ReviewStatus[]> = {
  diajukan: ['disetujui', 'ditolak', 'perlu_revisi'],
  perlu_revisi: ['diajukan'],
  disetujui: [],
  ditolak: [],
}

export function bolehTransisiReview(dari: ReviewStatus, ke: ReviewStatus): boolean {
  return TRANSISI[dari]?.includes(ke) ?? false
}

/** Menolak atau meminta revisi wajib disertai alasan tertulis. */
export function perluCatatan(ke: ReviewStatus): boolean {
  return ke === 'ditolak' || ke === 'perlu_revisi'
}
