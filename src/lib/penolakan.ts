import { PesanAplikasi } from '@/features/auth/actions'

/**
 * Penulisan data selalu melalui Rules. `permission-denied` pada UPDATE hampir selalu berarti
 * salinan data pengguna sudah usang (revisi sudah naik) atau hak tidak cukup; keduanya dijelaskan
 * dengan satu pesan yang tidak membocorkan detail aturan.
 */
export function terjemahkanPenolakan(e: unknown): never {
  if ((e as { code?: string } | null)?.code === 'permission-denied') {
    throw new PesanAplikasi(
      'Perubahan ditolak. Data mungkin sudah diubah oleh pengguna lain atau Anda tidak berhak mengubahnya. Muat ulang halaman lalu coba lagi.',
    )
  }
  throw e
}
