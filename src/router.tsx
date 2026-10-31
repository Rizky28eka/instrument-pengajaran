import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { FullPageLoader } from '@/components/ui/Spinner'
import { RequireAuth } from '@/features/auth/RequireAuth'
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
      {
        Component: RequireAuth,
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
