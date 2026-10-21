import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ListChecks, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { Spinner } from '@/components/ui/Spinner'
import { pesanError } from '@/features/auth/actions'
import { cn } from '@/lib/utils'
import type { SupervisiRujukan } from '../api'
import { LABEL_STATUS, transisiTersedia, type TindakLanjut } from '../logic'
import { useBuatTindak, useRiwayatTindak, useTindakLanjutSupervisi, useUbahTindak } from '../queries'
import { catatanSchema, tindakFormSchema } from '../schema'
import { StatusTindakBadge } from './StatusTindakBadge'
import { TenggatLabel } from './TenggatLabel'

const FORMAT = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

function FormIsi({ awal, memproses, onSimpan, onBatal }: {
  awal?: { deskripsi: string; penanggungJawab: string; tenggat: string | null }
  memproses: boolean
  onSimpan: (v: ReturnType<typeof tindakFormSchema.parse>) => void
  onBatal: () => void
}) {
  const [galat, setGalat] = useState<Record<string, string>>({})
  function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const hasil = tindakFormSchema.safeParse({ deskripsi: f.get('deskripsi'), penanggungJawab: f.get('penanggungJawab'), tenggat: f.get('tenggat') })
    if (!hasil.success) {
      setGalat(Object.fromEntries(hasil.error.issues.map((i) => [String(i.path[0]), i.message])))
      return
    }
    setGalat({})
    onSimpan(hasil.data)
  }
  return (
    <form onSubmit={kirim} noValidate className="grid gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70 sm:grid-cols-2">
      <Field label="Tindak lanjut" required error={galat.deskripsi} className="sm:col-span-2">
        {(p) => <Textarea {...p} name="deskripsi" rows={2} defaultValue={awal?.deskripsi} maxLength={2000} autoFocus />}
      </Field>
      <Field label="Penanggung jawab" error={galat.penanggungJawab}>
        {(p) => <Input {...p} name="penanggungJawab" defaultValue={awal?.penanggungJawab} maxLength={120} />}
      </Field>
      <Field label="Tenggat" error={galat.tenggat}>
        {(p) => <Input {...p} name="tenggat" type="date" defaultValue={awal?.tenggat ?? ''} />}
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" loading={memproses}>Simpan</Button>
        <Button size="sm" variant="ghost" onClick={onBatal} disabled={memproses}>Batal</Button>
      </div>
    </form>
  )
}

function RiwayatItem({ id }: { id: string }) {
  const r = useRiwayatTindak(id, true)
  if (r.isPending) return <Spinner className="mx-auto my-3 size-5" />
  if (r.isError) return <PanelGalat error={r.error} onCoba={() => void r.refetch()} className="py-4" />
  return (
    <ol className="space-y-2 text-sm">
      {r.data.map((x) => (
        <li key={x.rev} className="flex flex-wrap items-baseline justify-between gap-x-4">
          <span>
            <b>{x.aksi === 'buat' ? 'Dibuat' : x.aksi === 'status' ? 'Status diubah' : x.aksi === 'ubah' ? 'Isi diubah' : 'Catatan'}</b> oleh {x.olehNama}
            {x.dari && x.ke && <span className="text-slate-500"> · {LABEL_STATUS[x.dari]} → {LABEL_STATUS[x.ke]}</span>}
            {x.catatan && <span className="mt-0.5 block whitespace-pre-line text-slate-600">“{x.catatan}”</span>}
          </span>
          <time className="text-xs text-slate-500">{x.waktu ? FORMAT.format(x.waktu) : '-'}</time>
        </li>
      ))}
    </ol>
  )
}

function Item({ t }: { t: TindakLanjut }) {
  const ubah = useUbahTindak()
  const [mode, setMode] = useState<'isi' | 'status' | 'catatan' | null>(null)
  const [riwayat, setRiwayat] = useState(false)
  const [galatCatatan, setGalatCatatan] = useState<string | undefined>()

  async function jalankan(perubahan: Parameters<typeof ubah.mutateAsync>[0]['perubahan'], pesan: string) {
    try {
      await ubah.mutateAsync({ awal: t, perubahan })
      toast.success(pesan)
      setMode(null)
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  function kirimStatus(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const catatan = String(f.get('catatan') ?? '').trim()
    if (catatan && !catatanSchema.safeParse(catatan).success) return setGalatCatatan('Maksimal 2000 karakter')
    setGalatCatatan(undefined)
    void jalankan({ status: f.get('status') as TindakLanjut['status'], catatan: catatan || undefined }, 'Status diperbarui.')
  }

  function kirimCatatan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const h = catatanSchema.safeParse(new FormData(e.currentTarget).get('catatan'))
    if (!h.success) return setGalatCatatan(h.error.issues[0].message)
    setGalatCatatan(undefined)
    void jalankan({ catatan: h.data }, 'Catatan ditambahkan.')
  }

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className={cn('max-w-prose text-sm leading-relaxed whitespace-pre-line text-slate-800', t.status === 'dibatalkan' && 'text-slate-400 line-through')}>{t.deskripsi}</p>
        <StatusTindakBadge status={t.status} />
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        <div className="flex gap-1.5"><dt>Penanggung jawab:</dt><dd className="text-slate-700">{t.penanggungJawab || '—'}</dd></div>
        <div className="flex gap-1.5"><dt>Tenggat:</dt><dd className="text-slate-700"><TenggatLabel t={t} /></dd></div>
      </dl>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="secondary" onClick={() => setMode(mode === 'status' ? null : 'status')} aria-expanded={mode === 'status'}>Ubah status</Button>
        <Button size="sm" variant="secondary" onClick={() => setMode(mode === 'catatan' ? null : 'catatan')} aria-expanded={mode === 'catatan'}>Tambah catatan</Button>
        <Button size="sm" variant="ghost" onClick={() => setMode(mode === 'isi' ? null : 'isi')} aria-expanded={mode === 'isi'}>Ubah isi</Button>
        <Button size="sm" variant="ghost" onClick={() => setRiwayat((r) => !r)} aria-expanded={riwayat}>
          Riwayat <ChevronDown className={cn('transition-transform', riwayat && 'rotate-180')} />
        </Button>
      </div>

      {mode === 'status' && (
        <form onSubmit={kirimStatus} noValidate className="grid gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
          <Field label="Status baru">
            {(p) => (
              <Select {...p} name="status" defaultValue={transisiTersedia(t.status)[0]}>
                {transisiTersedia(t.status).map((s) => <option key={s} value={s}>{LABEL_STATUS[s]}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Catatan (opsional)" error={galatCatatan}>{(p) => <Input {...p} name="catatan" maxLength={2000} />}</Field>
          <div className="flex gap-2"><Button type="submit" size="sm" loading={ubah.isPending}>Simpan</Button><Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={ubah.isPending}>Batal</Button></div>
        </form>
      )}
      {mode === 'catatan' && (
        <form onSubmit={kirimCatatan} noValidate className="grid gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Catatan progres" required error={galatCatatan}>{(p) => <Textarea {...p} name="catatan" rows={2} maxLength={2000} autoFocus />}</Field>
          <div className="flex gap-2"><Button type="submit" size="sm" loading={ubah.isPending}>Simpan</Button><Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={ubah.isPending}>Batal</Button></div>
        </form>
      )}
      {mode === 'isi' && (
        <FormIsi awal={t} memproses={ubah.isPending} onBatal={() => setMode(null)} onSimpan={(isi) => void jalankan({ isi }, 'Tindak lanjut diperbarui.')} />
      )}
      {riwayat && <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 print:hidden"><RiwayatItem id={t.id} /></div>}
    </li>
  )
}

export function TindakLanjutPanel({ rujukan, boleh }: { rujukan: SupervisiRujukan; boleh: boolean }) {
  const daftar = useTindakLanjutSupervisi(rujukan.id)
  const buat = useBuatTindak(rujukan)
  const [form, setForm] = useState(false)

  async function simpan(isi: ReturnType<typeof tindakFormSchema.parse>) {
    try {
      await buat.mutateAsync(isi)
      toast.success('Tindak lanjut ditambahkan.')
      setForm(false)
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  return (
    <Card className="print:hidden">
      <CardHeader
        title="Tindak lanjut"
        description="Rencana pendampingan atau perbaikan dari hasil supervisi ini. Tidak memengaruhi skor."
        action={boleh && !form ? <Button size="sm" onClick={() => setForm(true)}><Plus /> Tambah</Button> : undefined}
      />
      {form && <div className="border-b border-slate-100 p-5"><FormIsi memproses={buat.isPending} onBatal={() => setForm(false)} onSimpan={(i) => void simpan(i)} /></div>}
      {daftar.isPending ? (
        <div className="grid place-items-center py-8"><Spinner /></div>
      ) : daftar.isError ? (
        <PanelGalat error={daftar.error} onCoba={() => void daftar.refetch()} className="py-8" />
      ) : daftar.data.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center text-sm text-slate-500">
          <ListChecks className="mb-2 size-6 text-slate-300" aria-hidden />
          Belum ada tindak lanjut untuk supervisi ini.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {[...daftar.data].sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)).map((t) => <Item key={t.id} t={t} />)}
        </ul>
      )}
    </Card>
  )
}
