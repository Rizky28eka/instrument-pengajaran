import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { BookOpen, ClipboardList, FilePlus, FolderOpen, GraduationCap, LayoutDashboard, ListChecks, LogOut, Menu, ShieldCheck, UsersRound, X } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { useKeluar } from '@/features/auth/useKeluar'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/supervisi', label: 'Data Supervisi', icon: ClipboardList, end: true },
  { to: '/supervisi/baru', label: 'Supervisi Baru', icon: FilePlus, end: true },
  { to: '/tindak-lanjut', label: 'Tindak Lanjut', icon: ListChecks, end: true },
  { to: '/dokumen', label: 'Dokumen', icon: FolderOpen, end: true },
  { to: '/guru', label: 'Guru', icon: UsersRound, end: true },
  { to: '/pengguna', label: 'Pengguna', icon: ShieldCheck, end: true, adminSaja: true },
  { to: '/instrumen', label: 'Instrumen', icon: BookOpen, end: true },
]

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <GraduationCap className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-slate-900">Supervisi Akademik</p>
        <p className="text-xs text-slate-500">SMP · Kurikulum Merdeka</p>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate, onKeluar }: { onNavigate?: () => void; onKeluar: () => void }) {
  const { user, profil } = useAuth()
  const nama = profil?.nama || user?.displayName || user?.email || 'Pengguna'

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand />
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.filter((n) => !n.adminSaja || profil?.role === 'admin').map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Icon className="size-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
          {nama.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{nama}</p>
          <p className="truncate text-xs text-slate-500">{profil?.role === 'admin' ? 'Admin sekolah' : 'Supervisor'}</p>
        </div>
        <button
          type="button"
          onClick={onKeluar}
          className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-rose-600"
          title="Keluar"
          aria-label="Keluar"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const { mulaiKeluar, dialog } = useKeluar()
  const { pathname } = useLocation()
  const drawer = useRef<HTMLDialogElement>(null)
  const konten = useRef<HTMLElement>(null)
  const pertama = useRef(true)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    // Setelah berpindah halaman, pindahkan fokus ke konten supaya pembaca layar / keyboard tidak tertinggal di menu.
    if (pertama.current) pertama.current = false
    else konten.current?.focus({ preventScroll: true })
  }, [pathname])

  // <dialog> asli: fokus terkunci di dalamnya, Escape menutup, dan fokus kembali ke tombol menu.
  useEffect(() => {
    const d = drawer.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <div className="min-h-svh lg:pl-64 print:pl-0">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow-lg"
      >
        Lewati ke konten
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block print:hidden">
        <Sidebar onKeluar={() => void mulaiKeluar()} />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Buka menu"
        >
          <Menu className="size-5" />
        </button>
      </header>

      <dialog
        ref={drawer}
        aria-label="Menu navigasi"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === drawer.current) setOpen(false) // klik di area gelap
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-y-auto bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40 lg:hidden"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Tutup menu"
        >
          <X className="size-5" />
        </button>
        <Sidebar onNavigate={() => setOpen(false)} onKeluar={() => void mulaiKeluar()} />
      </dialog>

      <main id="konten" ref={konten} tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
      {dialog}
    </div>
  )
}
