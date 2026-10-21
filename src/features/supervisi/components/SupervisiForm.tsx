import { useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch, type Control } from 'react-hook-form'
import { useBlocker } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import type { Instrumen } from '@/data/instrumen'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InstrumenNotice } from '@/components/ui/InstrumenNotice'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { hitungRingkasan } from '@/lib/scoring'
import { cn, formatNilai } from '@/lib/utils'
import { buatSupervisiSchema, type SupervisiFormInput, type SupervisiFormValues } from '../schema'
import { AspekStep } from './AspekStep'
import { CatatanStep } from './CatatanStep'
import { IdentitasStep } from './IdentitasStep'
import { buatLangkah, langkahDenganError, type Langkah } from './form-steps'

interface Props {
  /** Instrumen yang dipakai dokumen ini (aktif untuk data baru, snapshot untuk data lama). */
  instrumen: Instrumen
  defaultValues: SupervisiFormInput
  onSubmit: (values: SupervisiFormValues) => Promise<void>
  submitLabel: string
  /** Dipanggil setiap isian berubah — dipakai halaman "baru" untuk menyimpan draf lokal. */
  onDraf?: (values: SupervisiFormInput) => void
  /** Mode ubah: guru dikunci dan meninggalkan halaman dengan perubahan belum tersimpan diperingatkan. */
  guruTetap?: { id: string; nama: string }
  peringatiPerubahan?: boolean
}

export function SupervisiForm({ instrumen, defaultValues, onSubmit, submitLabel, onDraf, guruTetap, peringatiPerubahan }: Props) {
  const schema = useMemo(() => buatSupervisiSchema(instrumen), [instrumen])
  const daftarLangkah = useMemo(() => buatLangkah(instrumen), [instrumen])
  const form = useForm<SupervisiFormInput, unknown, SupervisiFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  })
  const [step, setStep] = useState(0)
  const langkah = daftarLangkah[step]
  const terakhir = step === daftarLangkah.length - 1

  useEffect(() => {
    if (!onDraf) return
    return form.subscribe({ formState: { values: true }, callback: ({ values }) => onDraf(values as SupervisiFormInput) })
  }, [form, onDraf])

  // Peringatan perubahan belum tersimpan (hanya mode ubah): navigasi dalam aplikasi dan tutup tab.
  const { isDirty } = form.formState
  const [selesai, setSelesai] = useState(false)
  const perluPeringatan = !!peringatiPerubahan && isDirty && !selesai
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => !!peringatiPerubahan && isDirty && currentLocation.pathname !== nextLocation.pathname,
  )
  // Setelah berhasil menyimpan, navigasi yang sempat tertahan diteruskan tanpa bertanya.
  useEffect(() => {
    if (selesai && blocker.state === 'blocked') blocker.proceed()
  }, [selesai, blocker])
  useEffect(() => {
    if (!perluPeringatan) return
    const cegah = (ev: BeforeUnloadEvent) => ev.preventDefault()
    window.addEventListener('beforeunload', cegah)
    return () => window.removeEventListener('beforeunload', cegah)
  }, [perluPeringatan])

  function pindah(i: number) {
    setStep(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function lanjut() {
    const ok = await form.trigger(langkah.fields, { shouldFocus: true })
    if (ok) pindah(step + 1)
    else toast.error('Masih ada isian yang belum lengkap pada langkah ini.')
  }

  const submit = form.handleSubmit(
    async (values) => {
      await onSubmit(values)
      setSelesai(true) // sudah tersimpan: navigasi setelah ini tidak perlu diperingatkan
    },
    (errors) => {
      const i = langkahDenganError(daftarLangkah, instrumen, errors)
      if (i >= 0) pindah(i)
      toast.error('Periksa kembali isian yang belum lengkap.')
    },
  )

  const aspek = instrumen.aspek.find((a) => a.id === langkah.id)

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold text-brand-600">
              Langkah {step + 1} dari {daftarLangkah.length}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">
              {aspek ? `${aspek.kode}. ${aspek.judul}` : langkah.judul}
            </h2>
            {aspek && <p className="text-sm text-slate-500">{aspek.deskripsi}</p>}
            <InstrumenNotice instrumen={instrumen} className="mt-3" />
            <ProgressBar value={((step + 1) / daftarLangkah.length) * 100} className="mt-3 h-1.5 lg:hidden" />
          </div>

          <div key={langkah.id} className="animate-fade-in px-5 py-6 sm:px-6">
            {langkah.id === 'identitas' && <IdentitasStep guruTetap={guruTetap} />}
            {aspek && <AspekStep aspek={aspek} />}
            {langkah.id === 'catatan' && <CatatanStep instrumen={instrumen} />}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
            <Button variant="secondary" onClick={() => pindah(step - 1)} disabled={step === 0}>
              <ChevronLeft /> Kembali
            </Button>
            {terakhir ? (
              <Button type="submit" loading={form.formState.isSubmitting}>
                <Save /> {submitLabel}
              </Button>
            ) : (
              <Button onClick={lanjut}>
                Lanjut <ChevronRight />
              </Button>
            )}
          </div>
        </Card>

        <ConfirmDialog
          open={blocker.state === 'blocked' && !selesai}
          judul="Tinggalkan halaman ini?"
          labelYa="Tinggalkan, buang perubahan"
          varian="danger"
          labelBatal="Tetap di sini"
          onYa={() => blocker.state === 'blocked' && blocker.proceed()}
          onBatal={() => blocker.state === 'blocked' && blocker.reset()}
        >
          <p>Perubahan yang belum disimpan akan hilang.</p>
        </ConfirmDialog>

        <PanelLangkah control={form.control} instrumen={instrumen} daftarLangkah={daftarLangkah} step={step} onPilih={pindah} />
      </form>
    </FormProvider>
  )
}

function PanelLangkah({
  control,
  instrumen,
  daftarLangkah,
  step,
  onPilih,
}: {
  control: Control<SupervisiFormInput, unknown, SupervisiFormValues>
  instrumen: Instrumen
  daftarLangkah: Langkah[]
  step: number
  onPilih: (i: number) => void
}) {
  const skor = useWatch({ control, name: 'skor' })
  const r = hitungRingkasan(skor ?? {}, instrumen)

  return (
    <Card className="p-4 lg:sticky lg:top-6">
      <div className="mb-4 rounded-xl bg-brand-950 p-4 text-white">
        <p className="text-xs font-medium text-brand-200">Nilai sementara</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatNilai(r.nilai)}</p>
        <p className="mt-1 text-xs text-brand-200">
          {r.predikat} · {r.terisi}/{r.jumlah} indikator
        </p>
        <ProgressBar value={(r.terisi / r.jumlah) * 100} className="mt-3 h-1.5 bg-white/15" barClassName="bg-white" />
      </div>

      <ol className="space-y-1">
        {daftarLangkah.map((l, i) => {
          const pa = r.perAspek[l.id]
          const selesai = pa ? pa.terisi === pa.jumlah : i < step
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onPilih(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  i === step ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                    selesai ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {selesai ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{l.judul}</span>
                {pa && (
                  <span className="text-xs text-slate-400 tabular-nums">
                    {pa.terisi}/{pa.jumlah}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
