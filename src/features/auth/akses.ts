/**
 * Logika murni penentuan status akses pengguna. Tidak menyentuh Firebase sehingga mudah diuji.
 * UI hanya MENGARAHKAN pengguna; penegakan hak akses sebenarnya ada di Firestore Rules.
 */

export type Peran = 'admin' | 'supervisor'

export interface Profil {
  uid: string
  email: string
  nama: string
  schoolId: string
  role: Peran
  status: 'active' | 'disabled'
}

export type StatusAkses =
  | 'memuat'
  | 'anonim'
  | 'belum-verifikasi'
  | 'belum-aktif'
  | 'dinonaktifkan'
  | 'aktif'
  | 'galat'

export interface MasukanStatus {
  authSiap: boolean
  userAda: boolean
  emailTerverifikasi: boolean
  /** undefined = masih memuat, null = tidak ada profil. */
  profil: Profil | null | undefined
  galatProfil: boolean
}

export function tentukanStatusAkses(m: MasukanStatus): StatusAkses {
  if (!m.authSiap) return 'memuat'
  if (!m.userAda) return 'anonim'
  if (!m.emailTerverifikasi) return 'belum-verifikasi'
  if (m.galatProfil) return 'galat'
  if (m.profil === undefined) return 'memuat'
  if (m.profil === null) return 'belum-aktif'
  if (m.profil.status !== 'active') return 'dinonaktifkan'
  return 'aktif'
}

/** Hanya path internal yang diterima sebagai tujuan setelah login (cegah open redirect). */
export function tujuanAman(dari: unknown): string | null {
  if (typeof dari !== 'string') return null
  if (!dari.startsWith('/') || dari.startsWith('//') || dari.includes('\\')) return null
  return dari
}

const RUTE_STATUS: Partial<Record<StatusAkses, string>> = {
  anonim: '/login',
  'belum-verifikasi': '/verifikasi-email',
  'belum-aktif': '/aktivasi',
  dinonaktifkan: '/akses-ditolak',
}

/** Rute yang seharusnya didatangi untuk status tertentu; `null` bila belum bisa diputuskan. */
export function rutePerStatus(status: StatusAkses, dari?: unknown): string | null {
  if (status === 'aktif') return tujuanAman(dari) ?? '/dashboard'
  return RUTE_STATUS[status] ?? null
}

export const adalahAdmin = (p: Profil | null | undefined): p is Profil => p?.role === 'admin'
