import { Link } from 'react-router'
import { useFormContext, useWatch } from 'react-hook-form'
import { Field, Input, Select } from '@/components/ui/Field'
import { useGuruList } from '@/features/guru/queries'
import { useSekolah } from '@/features/sekolah/queries'
import { cn } from '@/lib/utils'
import { KURIKULUM, MODEL_PEMBELAJARAN, type SupervisiFormInput } from '../schema'

/** `guruTetap`: pada mode ubah, guru tidak dapat diganti (identitas dokumen dikunci oleh Rules). */
export function IdentitasStep({ guruTetap }: { guruTetap?: { id: string; nama: string } }) {
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<SupervisiFormInput>()
  const e = errors.identitas
  const kurikulum = useWatch({ control, name: 'identitas.kurikulum' })
  const model = useWatch({ control, name: 'identitas.modelPembelajaran' })
  const { data: sekolah } = useSekolah()
  const guru = useGuruList()
  const daftar = (guru.data ?? []).filter((g) => g.aktif)

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Sekolah" className="sm:col-span-2" hint="Sesuai sekolah akun Anda; tidak dapat diubah.">
        {(p) => <Input {...p} value={sekolah?.nama ?? 'Memuat…'} readOnly className="bg-slate-50" />}
      </Field>

      <Field label="Guru yang disupervisi" required error={errors.guruId?.message}>
        {(p) =>
          guruTetap ? (
            <Input {...p} value={guruTetap.nama} readOnly className="bg-slate-50" />
          ) : (
            <Select
              {...p}
              {...register('guruId', {
                onChange: (ev) => {
                  const g = daftar.find((x) => x.id === ev.target.value)
                  // Mata pelajaran terisi otomatis dari data master, tetapi tetap dapat diubah.
                  if (g?.mapel && !getValues('identitas.mataPelajaran')) setValue('identitas.mataPelajaran', g.mapel)
                },
              })}
              disabled={guru.isPending}
            >
              <option value="">{guru.isPending ? 'Memuat daftar guru…' : 'Pilih guru…'}</option>
              {daftar.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                </option>
              ))}
            </Select>
          )
        }
      </Field>
      <Field label="Mata pelajaran" required error={e?.mataPelajaran?.message}>
        {(p) => <Input {...p} placeholder="mis. Matematika" {...register('identitas.mataPelajaran')} />}
      </Field>

      {!guruTetap && !guru.isPending && !guru.isError && daftar.length === 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200 sm:col-span-2">
          Belum ada guru aktif. <Link to="/guru" className="font-semibold underline">Tambahkan guru</Link> terlebih dahulu.
        </p>
      )}
      {guru.isError && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200 sm:col-span-2">
          Daftar guru gagal dimuat.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void guru.refetch()}>
            Coba lagi
          </button>
        </p>
      )}

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
