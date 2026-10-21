import { useFormContext, useWatch } from 'react-hook-form'
import { Field, Textarea } from '@/components/ui/Field'
import { hitungRingkasan } from '@/lib/scoring'
import type { SupervisiFormInput } from '../schema'
import { NilaiAkhir, TabelRingkasan } from './RingkasanSkor'

export function CatatanStep() {
  const { control, register } = useFormContext<SupervisiFormInput>()
  const skor = useWatch({ control, name: 'skor' })
  const ringkasan = hitungRingkasan(skor ?? {})

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
        <NilaiAkhir ringkasan={ringkasan} />
        {ringkasan.terisi < ringkasan.jumlah && (
          <p className="text-sm font-medium text-amber-700">
            {ringkasan.jumlah - ringkasan.terisi} indikator belum dinilai
          </p>
        )}
      </div>

      <TabelRingkasan ringkasan={ringkasan} />

      <div className="grid gap-5">
        <Field label="Kekuatan guru" hint="Hal-hal yang sudah berjalan sangat baik.">
          {(p) => <Textarea {...p} {...register('catatan.kekuatan')} />}
        </Field>
        <Field label="Area yang perlu diperbaiki">
          {(p) => <Textarea {...p} {...register('catatan.perbaikan')} />}
        </Field>
        <Field label="Rekomendasi tindak lanjut" hint="mis. coaching, pelatihan, observasi ulang, KKG/MGMP.">
          {(p) => <Textarea {...p} {...register('catatan.rekomendasi')} />}
        </Field>
      </div>
    </div>
  )
}
