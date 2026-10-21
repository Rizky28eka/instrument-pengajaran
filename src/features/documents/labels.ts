import type { NadaBadge } from '@/components/ui/Badge'
import type { UnggahStatus } from './upload-state'
import type { StatusDokumen } from './model'
import type { ReviewStatus } from './review'

export const LABEL_REVIEW: Record<ReviewStatus, string> = {
  diajukan: 'Diajukan',
  perlu_revisi: 'Perlu revisi',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
}

export const NADA_REVIEW: Record<ReviewStatus, NadaBadge> = {
  diajukan: 'biru',
  perlu_revisi: 'kuning',
  disetujui: 'hijau',
  ditolak: 'merah',
}

/** Teks tombol keputusan review. */
export const LABEL_KEPUTUSAN: Record<ReviewStatus, string> = {
  disetujui: 'Setujui',
  ditolak: 'Tolak',
  perlu_revisi: 'Minta revisi',
  diajukan: 'Ajukan kembali',
}

export const LABEL_STATUS_DOKUMEN: Record<StatusDokumen, string> = {
  mengunggah: 'Unggahan belum selesai',
  tersedia: 'Tersedia',
  dihapus: 'Di tempat sampah',
}

export const LABEL_UNGGAH: Record<UnggahStatus, string> = {
  menunggu: 'Menunggu',
  memvalidasi: 'Memeriksa berkas…',
  'menyimpan-metadata': 'Menyiapkan…',
  mengunggah: 'Mengunggah…',
  menyelesaikan: 'Menyelesaikan…',
  berhasil: 'Berhasil diunggah',
  gagal: 'Gagal',
  dibatalkan: 'Dibatalkan',
}

export const UNGGAH_BERJALAN: UnggahStatus[] = ['memvalidasi', 'menyimpan-metadata', 'mengunggah', 'menyelesaikan']
