import { Controller, useFormContext } from 'react-hook-form'
import { SKALA, type Aspek } from '@/data/instrumen'
import { belumTerkonfirmasi } from '@/data/konfirmasi'
import { Badge } from '@/components/ui/Badge'
import { Field, Textarea } from '@/components/ui/Field'
import { ScoreInput } from '@/components/ui/ScoreInput'
import { cn } from '@/lib/utils'
import type { SupervisiFormInput } from '../schema'

export function SkalaLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200/70">
      {SKALA.map((s) => (
        <span key={s.nilai}>
          <b className="text-slate-900">{s.nilai}</b> = {s.label}
        </span>
      ))}
    </div>
  )
}

export function AspekStep({ aspek, versi }: { aspek: Aspek; /** Versi instrumen yang dipakai dokumen ini (untuk penanda indikator rancangan). */ versi: string }) {
  const { control, register } = useFormContext<SupervisiFormInput>()

  return (
    <div className="space-y-6">
      <SkalaLegend />

      {aspek.kelompok.map((k, gi) => (
        <section key={gi}>
          {k.judul && (
            <h3 className="mb-2 text-xs font-bold tracking-wider text-brand-700 uppercase">{k.judul}</h3>
          )}
          <ol className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {k.indikator.map((ind) => (
              <Controller
                key={ind.id}
                control={control}
                name={`skor.${ind.id}`}
                render={({ field, fieldState }) => (
                  <li
                    className={cn(
                      'flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between',
                      fieldState.error && 'bg-rose-50/60',
                    )}
                  >
                    <div className="flex gap-3">
                      <span className="mt-0.5 grid h-6 min-w-8 place-items-center rounded-md bg-slate-100 px-1.5 text-xs font-bold text-slate-600">
                        {ind.id}
                      </span>
                      <div>
                        <p id={`ind-${ind.id}`} className="text-sm leading-relaxed text-slate-800">{ind.teks}</p>
                        {belumTerkonfirmasi(versi, ind.id) && (
                          <Badge nada="kuning" className="mt-1">
                            Rancangan awal · belum terkonfirmasi
                          </Badge>
                        )}
                        {fieldState.error && (
                          <p className="mt-1 text-xs font-medium text-rose-600">{fieldState.error.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 self-end sm:self-auto">
                      <ScoreInput
                        label={`Skor ${ind.id}`}
                        labelledBy={`ind-${ind.id}`}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        invalid={!!fieldState.error}
                      />
                    </div>
                  </li>
                )}
              />
            ))}
          </ol>
        </section>
      ))}

      <Field label={`Catatan / bukti pengamatan — ${aspek.judul}`} hint="Opsional. Tuliskan temuan atau bukti yang mendukung penilaian.">
        {(p) => <Textarea {...p} rows={3} {...register(`catatanAspek.${aspek.id}`)} />}
      </Field>
    </div>
  )
}
