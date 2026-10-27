import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageLoader } from '@/components/ui/Spinner'
import { rutePerStatus, type StatusAkses } from './akses'
import { useAuth } from './auth-context'
import { GalatMemuatAkun } from './GalatMemuatAkun'

/**
 * Guard untuk seluruh halaman aplikasi. Hanya MENGARAHKAN pengguna — akses data yang
 * sebenarnya ditegakkan oleh Firestore Rules, bukan oleh komponen ini.
 */
export function RequireAkses() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'memuat') return <FullPageLoader />
  if (status === 'galat') return <GalatMemuatAkun />
  if (status !== 'aktif') return <Navigate to={rutePerStatus(status) ?? '/login'} replace state={{ from: location }} />
  return <Outlet />
}

/** Halaman akun (verifikasi, aktivasi, akses ditolak) hanya untuk status tertentu. */
export function UntukStatus({ status: diharapkan, children }: { status: StatusAkses; children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'memuat') return <FullPageLoader />
  if (status === 'galat') return <GalatMemuatAkun />
  if (status !== diharapkan) return <Navigate to={rutePerStatus(status) ?? '/login'} replace />
  return <>{children}</>
}
