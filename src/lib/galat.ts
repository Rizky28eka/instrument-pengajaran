/**
 * Klasifikasi galat pengambilan data supaya UI tidak menyamakan "gagal memuat" dengan
 * "data kosong" atau "tidak ditemukan". Pesannya tidak pernah memuat detail internal.
 */
export type JenisGalat = 'izin' | 'jaringan' | 'sesi' | 'indeks' | 'lainnya'

export function jenisGalat(e: unknown): JenisGalat {
  const kode = (e as { code?: unknown } | null)?.code
  const pesan = String((e as { message?: unknown } | null)?.message ?? '')
  if (kode === 'permission-denied') return 'izin'
  if (kode === 'unauthenticated') return 'sesi'
  if (kode === 'unavailable' || kode === 'deadline-exceeded' || kode === 'auth/network-request-failed') return 'jaringan'
  if (kode === 'failed-precondition' && /index/i.test(pesan)) return 'indeks'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'jaringan'
  return 'lainnya'
}

export interface PesanGalat {
  judul: string
  isi: string
  /** Apakah mencoba lagi masuk akal (jaringan / sementara)? */
  dapatDicoba: boolean
}

export function pesanGalatData(e: unknown): PesanGalat {
  switch (jenisGalat(e)) {
    case 'izin':
      return {
        judul: 'Anda tidak memiliki akses',
        isi: 'Akun Anda tidak berhak membuka data ini. Hubungi admin sekolah bila seharusnya bisa.',
        dapatDicoba: false,
      }
    case 'sesi':
      return { judul: 'Sesi berakhir', isi: 'Silakan masuk kembali untuk melanjutkan.', dapatDicoba: false }
    case 'jaringan':
      return {
        judul: 'Tidak dapat terhubung ke server',
        isi: 'Periksa koneksi internet Anda. Data Anda aman; ini bukan berarti data hilang.',
        dapatDicoba: true,
      }
    case 'indeks':
      return {
        judul: 'Konfigurasi basis data belum lengkap',
        isi: 'Indeks Firestore belum dipasang. Hubungi pengelola aplikasi (lihat docs/OPERASIONAL.md).',
        dapatDicoba: false,
      }
    default:
      return { judul: 'Data gagal dimuat', isi: 'Terjadi kesalahan tak terduga. Coba lagi beberapa saat.', dapatDicoba: true }
  }
}
