import { DOKUMEN } from './config'
import type { DokumenDoc } from './model'
import { bolehTransisiReview, REVIEW_STATUS, type ReviewStatus } from './review'

/**
 * Izin aksi dokumen untuk UI — cermin aturan di firestore.rules. Hanya menentukan tombol mana yang
 * tampil; yang menegakkan tetap Rules (aksi yang disembunyikan di sini tetap ditolak bila dipaksa).
 *
 * Seluruh pengguna aktif sekolah membaca semua dokumen sekolahnya. Mengganti versi hanya untuk
 * pembuat; mengubah judul, menghapus-lunak, memulihkan, dan menghapus permanen untuk pembuat
 * ATAU admin sekolah (sama seperti supervisi).
 */
export interface PelakuIzin {
  uid: string
  admin: boolean
}

const pembuat = (p: PelakuIzin, d: DokumenDoc) => d.createdBy === p.uid
const pembuatAtauAdmin = (p: PelakuIzin, d: DokumenDoc) => pembuat(p, d) || p.admin

export function bolehGantiVersi(p: PelakuIzin, d: DokumenDoc): boolean {
  return (
    pembuat(p, d) &&
    d.status === 'tersedia' &&
    d.pending === null &&
    d.reviewStatus !== 'disetujui' &&
    d.reviewStatus !== 'ditolak' &&
    d.currentVersion < DOKUMEN.maksVersi
  )
}

export const bolehUbahJudul = (p: PelakuIzin, d: DokumenDoc) => pembuatAtauAdmin(p, d) && d.status === 'tersedia'

export const bolehHapusLunak = (p: PelakuIzin, d: DokumenDoc) => pembuatAtauAdmin(p, d) && d.status === 'tersedia' && d.pending === null

export const bolehPulihkan = (p: PelakuIzin, d: DokumenDoc) => pembuatAtauAdmin(p, d) && d.status === 'dihapus' && d.versions.length > 0

export const bolehHapusPermanen = (p: PelakuIzin, d: DokumenDoc) => pembuatAtauAdmin(p, d) && d.status === 'dihapus'

/** Keputusan review yang sah dari status sekarang (kosong bila tidak ada alur review atau sudah final). */
export function keputusanTersedia(d: DokumenDoc): ReviewStatus[] {
  if (d.status !== 'tersedia' || d.pending !== null || d.reviewStatus === null) return []
  const dari = d.reviewStatus
  return REVIEW_STATUS.filter((ke) => bolehTransisiReview(dari, ke))
}
