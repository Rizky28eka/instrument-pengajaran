import { useFormContext, useWatch } from 'react-hook-form'
import { Field, Input, Select } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { KURIKULUM, MODEL_PEMBELAJARAN, type SupervisiFormInput } from '../schema'

export function IdentitasStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<SupervisiFormInput>()
  const e = errors.identitas
  const kurikulum = useWatch({ control, name: 'identitas.kurikulum' })
  const model = useWatch({ control, name: 'identitas.modelPembelajaran' })

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Nama sekolah" required error={e?.namaSekolah?.message} className="sm:col-span-2">
        {(p) => <Input {...p} placeholder="SMP Negeri 1 ..." {...register('identitas.namaSekolah')} />}
      </Field>
      <Field label="Nama guru yang disupervisi" required error={e?.namaGuru?.message}>
        {(p) => <Input {...p} autoComplete="off" {...register('identitas.namaGuru')} />}
      </Field>
      <Field label="Mata pelajaran" required error={e?.mataPelajaran?.message}>
        {(p) => <Input {...p} placeholder="mis. Matematika" {...register('identitas.mataPelajaran')} />}
      </Field>
      <Field label="Kelas yang disupervisi" required error={e?.kelas?.message}>
        {(p) => <Input {...p} placeholder="mis. VIII B" {...register('identitas.kelas')} />}
      </Field>
      <Field label="Tanggal pelaksanaan" required error={e?.tanggal?.message}>
        {(p) => <Input {...p} type="date" {...register('identitas.tanggal')} />}
      </Field>
      <Field label="Nama supervisor" required error={e?.namaSupervisor?.message} className="sm:col-span-2">
        {(p) => <Input {...p} {...register('identitas.namaSupervisor')} />}
      </Field>

      <Field label="Kurikulum yang diterapkan" required error={e?.kurikulum?.message}>
        {(p) => (
          <Select {...p} {...register('identitas.kurikulum')}>
            {KURIKULUM.map((k) => (
              <option key={k} value={k}>
                {k === 'Lainnya' ? 'Kurikulum lainnya' : k}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {kurikulum === 'Lainnya' ? (
        <Field label="Sebutkan kurikulum" required error={e?.kurikulumLainnya?.message}>
          {(p) => <Input {...p} {...register('identitas.kurikulumLainnya')} />}
        </Field>
      ) : (
        <div className="hidden sm:block" />
      )}

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium text-slate-700">
          Model pelaksanaan pembelajaran<span className="ml-0.5 text-rose-500">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODEL_PEMBELAJARAN.map((m) => (
            <label
              key={m}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium ring-1 ring-inset transition',
                model === m ? 'bg-brand-50 text-brand-800 ring-2 ring-brand-500' : 'ring-slate-300 hover:bg-slate-50',
              )}
            >
              <input type="radio" value={m} className="accent-brand-600" {...register('identitas.modelPembelajaran')} />
              {m}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
