import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { buttonClass } from '@/components/ui/button-styles'

export function ErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (!notFound) console.error(error)

  return (
    <div className="grid min-h-[60svh] place-items-center px-4 text-center">
      <div>
        <p className="text-5xl font-extrabold text-brand-600">{notFound ? '404' : 'Ups!'}</p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {notFound ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan tak terduga'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {notFound ? 'Alamat yang Anda tuju tidak tersedia.' : 'Coba muat ulang halaman ini.'}
        </p>
        <Link to="/dashboard" className={buttonClass({}, 'mt-6')}>
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  )
}
