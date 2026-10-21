import type { ReactNode } from 'react'
import { GraduationCap } from 'lucide-react'

/** Kerangka halaman akun (verifikasi, aktivasi, akses ditolak). */
export function HalamanAkun({ judul, deskripsi, children }: { judul: string; deskripsi?: ReactNode; children: ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-semibold text-slate-900">Supervisi Akademik</span>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-slate-200/80 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{judul}</h1>
          {deskripsi && <p className="mt-2 text-sm leading-relaxed text-slate-600">{deskripsi}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
