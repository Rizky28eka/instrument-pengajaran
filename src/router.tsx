import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { FullPageLoader } from '@/components/ui/Spinner'
import { RequireAkses } from '@/features/auth/RequireAkses'
import { ErrorPage } from '@/routes/ErrorPage'

/** Code-splitting per halaman. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

export const router = createBrowserRouter([
  {
    HydrateFallback: FullPageLoader,
    ErrorBoundary: ErrorPage,
    children: [
      { index: true, lazy: page(() => import('@/routes/LandingPage')) },
      { path: 'login', lazy: page(() => import('@/routes/LoginPage')) },
      { path: 'verifikasi-email', lazy: page(() => import('@/routes/VerifikasiEmailPage')) },
      { path: 'aktivasi', lazy: page(() => import('@/routes/AktivasiPage')) },
      { path: 'akses-ditolak', lazy: page(() => import('@/routes/AksesDitolakPage')) },
      {
        Component: RequireAkses,
        children: [
          {
            Component: AppLayout,
            children: [
              {
                ErrorBoundary: ErrorPage,
                children: [
                  { path: 'dashboard', lazy: page(() => import('@/routes/DashboardPage')) },
                  { path: 'supervisi', lazy: page(() => import('@/routes/SupervisiListPage')) },
                  { path: 'supervisi/baru', lazy: page(() => import('@/routes/SupervisiFormPage')) },
                  { path: 'supervisi/:id', lazy: page(() => import('@/routes/SupervisiDetailPage')) },
                  { path: 'supervisi/:id/edit', lazy: page(() => import('@/routes/SupervisiFormPage')) },
                  { path: 'guru', lazy: page(() => import('@/routes/GuruPage')) },
                  { path: 'guru/:id', lazy: page(() => import('@/routes/GuruDetailPage')) },
                  { path: 'tindak-lanjut', lazy: page(() => import('@/routes/TindakLanjutPage')) },
                  { path: 'pengguna', lazy: page(() => import('@/routes/PenggunaPage')) },
                  { path: 'instrumen', lazy: page(() => import('@/routes/InstrumenPage')) },
                  { path: '*', Component: ErrorPage },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
