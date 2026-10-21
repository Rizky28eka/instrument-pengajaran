import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { HalamanAkun } from '@/components/layout/HalamanAkun'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { pesanError } from '@/features/auth/actions'
import { useAuth } from '@/features/auth/auth-context'
import { UntukStatus } from '@/features/auth/RequireAkses'
import { aktifkanAkun, normalisasiKode } from '@/features/auth/undangan'
import { useKeluar } from '@/features/auth/useKeluar'

function Isi() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { mulaiKeluar, dialog } = useKeluar()
  const [memproses, setMemproses] = useState(false)
  const [galat, setGalat] = useState<{ kode?: string; nama?: string; umum?: string }>({})

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const f = new FormData(e.currentTarget)
    const kode = String(f.get('kode') ?? '')
    const nama = String(f.get('nama') ?? '')
    // Validasi isian dulu agar pesan menempel pada kolom yang bermasalah.
    const lokal: typeof galat = {}
    if (!normalisasiKode(kode)) lokal.kode = 'Masukkan kode undangan.'
    if (!nama.trim()) lokal.nama = 'Masukkan nama lengkap.'
    setGalat(lokal)
    if (lokal.kode || lokal.nama) return

    setMemproses(true)
    try {
      await aktifkanAkun(user, kode, nama)
      toast.success('Akun diaktifkan.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      // Galat dari server hampir selalu soal kode undangan (tidak ada / terpakai / kedaluwarsa).
      setGalat({ kode: pesanError(err) })
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
        <Field label="Kode undangan" required error={galat.kode}>
          {(p) => (
            <Input
              {...p}
              name="kode"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={params.get('kode') ?? ''}
            />
          )}
        </Field>
        <Field label="Nama lengkap" required error={galat.nama}>
          {(p) => <Input {...p} name="nama" autoComplete="name" defaultValue={user?.displayName ?? ''} />}
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
