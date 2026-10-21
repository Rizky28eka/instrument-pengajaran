import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { PageLoader } from '@/components/ui/Spinner'
import { pesanError } from '@/features/auth/actions'
import type { Guru } from '@/features/guru/api'
import { useGuruList, useTambahGuru, useUbahGuru } from '@/features/guru/queries'
import { cn } from '@/lib/utils'

function FormGuru({ awal, onSelesai }: { awal: Guru | null; onSelesai: () => void }) {
  const tambah = useTambahGuru()
  const ubah = useUbahGuru()
  const [galat, setGalat] = useState<string | null>(null)
  const memproses = tambah.isPending || ubah.isPending

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const nama = String(f.get('nama') ?? '').trim()
    const mapel = String(f.get('mapel') ?? '').trim()
    if (!nama) return setGalat('Nama guru wajib diisi.')
    if (nama.length > 120 || mapel.length > 120) return setGalat('Maksimal 120 karakter.')
    setGalat(null)
    try {
      if (awal) await ubah.mutateAsync({ id: awal.id, nama, mapel, aktif: awal.aktif })
      else await tambah.mutateAsync({ nama, mapel })
      toast.success(awal ? 'Data guru diperbarui.' : 'Guru ditambahkan.')
      onSelesai()
    } catch (err) {
      toast.error(pesanError(err))
    }
  }

  return (
    <form onSubmit={kirim} noValidate className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Nama guru" required error={galat ?? undefined}>
        {(p) => <Input {...p} name="nama" defaultValue={awal?.nama} autoComplete="off" maxLength={120} autoFocus />}
      </Field>
      <Field label="Mata pelajaran" hint="Opsional; mengisi otomatis saat supervisi.">
        {(p) => <Input {...p} name="mapel" defaultValue={awal?.mapel} maxLength={120} />}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={memproses}>
          {awal ? 'Simpan' : 'Tambah'}
        </Button>
        <Button variant="ghost" onClick={onSelesai} disabled={memproses}>
          Batal
        </Button>
      </div>
    </form>
  )
}

export default function GuruPage() {
  const guru = useGuruList()
  const ubah = useUbahGuru()
  const [form, setForm] = useState<{ awal: Guru | null } | null>(null)

  async function alihkan(g: Guru) {
    try {
      await ubah.mutateAsync({ id: g.id, nama: g.nama, mapel: g.mapel, aktif: !g.aktif })
      toast.success(g.aktif ? 'Guru dinonaktifkan. Riwayat supervisi tetap tersimpan.' : 'Guru diaktifkan kembali.')
    } catch (err) {
      toast.error(pesanError(err))
    }
  }

  return (
    <>
      <PageHeader
        title="Guru"
        description="Daftar guru di sekolah Anda. Guru tidak dihapus, hanya dinonaktifkan, supaya riwayat supervisinya tetap utuh."
        actions={
          <Button onClick={() => setForm({ awal: null })}>
            <Plus /> Tambah guru
          </Button>
        }
      />
      <Card>
        {form && <FormGuru key={form.awal?.id ?? 'baru'} awal={form.awal} onSelesai={() => setForm(null)} />}
        <CardHeader title="Daftar guru" className="sr-only" />
        {guru.isPending ? (
          <PageLoader />
        ) : guru.isError ? (
          <PanelGalat error={guru.error} onCoba={() => void guru.refetch()} />
        ) : guru.data.length === 0 ? (
          <EmptyState icon={UserRound} title="Belum ada guru" description="Tambahkan guru agar dapat dipilih saat membuat supervisi." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {guru.data.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className={cn('min-w-0', !g.aktif && 'text-slate-400')}>
                  <p className="truncate font-medium text-slate-900">{g.nama}</p>
                  <p className="text-xs text-slate-500">{g.mapel || 'Mata pelajaran belum diisi'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', g.aktif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {g.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => setForm({ awal: g })} aria-label={`Ubah ${g.nama}`}>
                    <Pencil /> Ubah
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void alihkan(g)} disabled={ubah.isPending}>
                    {g.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
