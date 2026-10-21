import type { KategoriId } from './config'
import type { ReviewStatus } from './review'

export const STATUS_DOKUMEN = ['mengunggah', 'tersedia', 'dihapus'] as const
export type StatusDokumen = (typeof STATUS_DOKUMEN)[number]

/** Rincian satu berkas. `storagePath` adalah path acak di Storage; nama asli hanya `fileName` (tampilan). */
export interface RincianBerkas {
  n: number
  storagePath: string
  fileName: string
  mimeType: string
  size: number
  sha256: string
  uploadedBy: string
}

export interface VersiBerkas extends RincianBerkas {
  uploadedAt: Date | null
}

/** Unggahan yang sedang/tertunda berjalan (metadata sudah ada, finalisasi belum). */
export interface PendingBerkas extends RincianBerkas {
  startedAt: Date | null
}

export interface EntriKeputusan {
  status: string
  oleh: string
  /** Nama tampilan pelaku saat itu (snapshot). Identitas sebenarnya adalah `oleh`. */
  nama: string
  catatan: string
  at: Date | null
}

/**
 * Sumber data utama metadata dokumen: koleksi `documents` (satu dokumen per berkas, riwayat versi di
 * dalamnya). Tidak ada salinan metadata di koleksi lain; entitas lain hanya merujuk lewat ID.
 */
export interface DokumenDoc {
  id: string
  schoolId: string
  kategori: KategoriId
  supervisiId: string | null
  guruId: string | null
  tindakId: string | null
  judul: string
  status: StatusDokumen
  currentVersion: number
  versions: VersiBerkas[]
  pending: PendingBerkas | null
  reviewStatus: ReviewStatus | null
  reviewRiwayat: EntriKeputusan[]
  createdBy: string
  createdByName: string
  createdAt: Date | null
  updatedAt: Date | null
  deletedAt: Date | null
  deletedBy: string | null
}
