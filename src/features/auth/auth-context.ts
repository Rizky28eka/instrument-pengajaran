import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { Profil, StatusAkses } from './akses'

export interface AuthState {
  user: User | null
  /** undefined = memuat, null = belum punya profil (belum menebus undangan). */
  profil: Profil | null | undefined
  status: StatusAkses
  /** Kode galat Firestore saat status `galat` (mis. `permission-denied`); hanya untuk memilih petunjuk, bukan untuk ditampilkan mentah. */
  kodeGalat?: string
  /** Memuat ulang status akun (mis. setelah verifikasi email) dan menyegarkan token. */
  muatUlang: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  user: null,
  profil: undefined,
  status: 'memuat',
  muatUlang: async () => {},
})

export const useAuth = () => useContext(AuthContext)

/** Hanya untuk komponen di balik guard `RequireAkses`; melempar bila dipakai di luar itu. */
export function useProfilAktif(): Profil {
  const { profil, status } = useAuth()
  if (status !== 'aktif' || !profil) throw new Error('useProfilAktif dipakai tanpa akses aktif')
  return profil
}
