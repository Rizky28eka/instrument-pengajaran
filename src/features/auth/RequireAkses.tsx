import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/Button'
import { FullPageLoader } from '@/components/ui/Spinner'
import { rutePerStatus, type StatusAkses } from './akses'
import { useAuth } from './auth-context'

function GalatMemuatAkun() {
  return (
    <div className="grid min-h-svh place-items-center px-4 text-center">
      <div className="max-w-sm">
        <h1 className="text-lg font-bold text-slate-900">Akun tidak dapat dimuat</h1>
        <p className="mt-2 text-sm text-slate-600">Periksa koneksi internet Anda, lalu muat ulang halaman. Data Anda tidak hilang.</p>
        <Button className="mt-5" onClick={() => window.location.reload()}>
          Muat ulang
        </Button>
      </div>
    </div>
  )
}

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
