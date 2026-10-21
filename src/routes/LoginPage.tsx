import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ClipboardCheck, GraduationCap, LineChart, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { FullPageLoader } from '@/components/ui/Spinner'
import { daftarEmail, kirimResetSandi, masukEmail, masukGoogle, pesanError } from '@/features/auth/actions'
import { rutePerStatus } from '@/features/auth/akses'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

const TAHUN = new Date().getFullYear()

const FITUR = [
  { icon: ClipboardCheck, teks: 'Instrumen 5 aspek dengan skala 1–4 sesuai Kurikulum Merdeka' },
  { icon: LineChart, teks: 'Skor, nilai, dan predikat dihitung otomatis' },
  { icon: ShieldCheck, teks: 'Tersimpan aman di Firebase, dapat diekspor ke Google Sheets' },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  )
}

type Mode = 'masuk' | 'daftar' | 'reset'

export default function LoginPage() {
  const { status } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('masuk')
  const [busy, setBusy] = useState<'email' | 'google' | null>(null)
  const [resetTerkirim, setResetTerkirim] = useState(false)

  if (status === 'memuat') return <FullPageLoader />
  // Sudah masuk: arahkan sesuai status (verifikasi email / aktivasi / dashboard).
  const tujuan = status !== 'anonim' ? rutePerStatus(status, (location.state as { from?: { pathname?: string } } | null)?.from?.pathname) : null
  if (tujuan) return <Navigate to={tujuan} replace />

  function ganti(m: Mode) {
    setMode(m)
    setResetTerkirim(false)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email'))
    const password = String(f.get('password') ?? '')
    setBusy('email')
    try {
      if (mode === 'reset') {
        await kirimResetSandi(email)
        setResetTerkirim(true)
      } else if (mode === 'daftar') await daftarEmail(String(f.get('nama')), email, password)
      else await masukEmail(email, password)
    } catch (err) {
      toast.error(pesanError(err))
    } finally {
      setBusy(null)
    }
  }

  async function onGoogle() {
    setBusy('google')
    try {
      await masukGoogle()
    } catch (err) {
      toast.error(pesanError(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-40 -right-40 size-[32rem] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <GraduationCap className="size-5" />
          </div>
          <span className="font-semibold">Supervisi Akademik</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight">
            Instrumen supervisi akademik guru, kini digital.
          </h1>
          <p className="mt-4 text-brand-200">
            Untuk kepala sekolah dan supervisor akademik SMP — dari perencanaan hingga tindak lanjut pembelajaran.
          </p>
          <ul className="mt-8 space-y-4">
            {FITUR.map(({ icon: Icon, teks }) => (
              <li key={teks} className="flex items-start gap-3 text-sm text-brand-100">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-200" />
                {teks}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-200/70">© {TAHUN} · Kurikulum Merdeka</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="grid size-11 place-items-center rounded-xl bg-brand-600 text-white">
              <GraduationCap className="size-6" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'masuk' ? 'Masuk ke akun Anda' : mode === 'daftar' ? 'Buat akun' : 'Atur ulang kata sandi'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'masuk' && 'Gunakan akun yang sudah diaktifkan oleh admin sekolah.'}
            {mode === 'daftar' && 'Setelah email diverifikasi, Anda memerlukan kode undangan dari admin sekolah untuk mengakses data.'}
            {mode === 'reset' && 'Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.'}
          </p>

          {mode !== 'reset' && (
            <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold" role="tablist" aria-label="Masuk atau daftar">
              {(['masuk', 'daftar'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => ganti(m)}
                  className={cn('rounded-md py-2 capitalize transition', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {resetTerkirim ? (
            <div role="status" className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
              Jika email tersebut terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim. Periksa kotak masuk dan folder spam.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === 'daftar' && (
                <Field label="Nama lengkap" required>
                  {(p) => <Input {...p} name="nama" required autoComplete="name" />}
                </Field>
              )}
              <Field label="Email" required>
                {(p) => <Input {...p} name="email" type="email" required autoComplete="email" />}
              </Field>
              {mode !== 'reset' && (
                <Field label="Kata sandi" required hint={mode === 'daftar' ? 'Minimal 6 karakter.' : undefined}>
                  {(p) => (
                    <Input
                      {...p}
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
                    />
                  )}
                </Field>
              )}
              <Button type="submit" size="lg" className="w-full" loading={busy === 'email'} disabled={!!busy}>
                {mode === 'masuk' ? 'Masuk' : mode === 'daftar' ? 'Daftar' : 'Kirim tautan'}
              </Button>
            </form>
          )}

          {mode === 'masuk' && (
            <button type="button" onClick={() => ganti('reset')} className="mt-4 text-sm font-medium text-brand-700 hover:underline">
              Lupa kata sandi?
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => ganti('masuk')} className="mt-4 text-sm font-medium text-brand-700 hover:underline">
              Kembali ke halaman masuk
            </button>
          )}

          {mode !== 'reset' && (
            <>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            atau
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={onGoogle} loading={busy === 'google'} disabled={!!busy}>
            {busy !== 'google' && <GoogleIcon />}
            Lanjutkan dengan Google
          </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
