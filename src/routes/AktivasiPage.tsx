import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { HalamanAkun } from '@/components/layout/HalamanAkun'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { pesanError } from '@/features/auth/actions'
import { useAuth } from '@/features/auth/auth-context'
import { UntukStatus } from '@/features/auth/RequireAkses'
import { aktifkanAkun } from '@/features/auth/undangan'
import { useKeluar } from '@/features/auth/useKeluar'

function Isi() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { mulaiKeluar, dialog } = useKeluar()
  const [memproses, setMemproses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const f = new FormData(e.currentTarget)
    setMemproses(true)
    setGalat(null)
    try {
      await aktifkanAkun(user, String(f.get('kode') ?? ''), String(f.get('nama') ?? ''))
      toast.success('Akun diaktifkan.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setGalat(pesanError(err))
    } finally {
      setMemproses(false)
    }
  }

  return (
    <HalamanAkun
      judul="Aktifkan akun Anda"
      deskripsi="Masukkan kode undangan dari admin sekolah. Tanpa kode ini Anda belum dapat melihat atau mengisi data supervisi."
    >
      <form onSubmit={kirim} className="space-y-4" noValidate>
        <Field label="Kode undangan" required error={galat ?? undefined}>
          {(p) => (
            <Input
              {...p}
              name="kode"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={params.get('kode') ?? ''}
            />
          )}
        </Field>
        <Field label="Nama lengkap" required>
          {(p) => <Input {...p} name="nama" required autoComplete="name" defaultValue={user?.displayName ?? ''} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={memproses}>
          Aktifkan akun
        </Button>
      </form>
      <p className="mt-5 text-sm text-slate-500">
        Masuk sebagai <b className="text-slate-700">{user?.email}</b>.{' '}
        <button type="button" onClick={() => void mulaiKeluar()} className="font-medium text-brand-700 hover:underline">
          Ganti akun
        </button>
      </p>
      {dialog}
    </HalamanAkun>
  )
}

export default function AktivasiPage() {
  return (
    <UntukStatus status="belum-aktif">
      <Isi />
    </UntukStatus>
  )
}
