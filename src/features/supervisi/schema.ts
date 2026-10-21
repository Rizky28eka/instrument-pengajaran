import { z } from 'zod'
import { SEMUA_INDIKATOR } from '@/data/instrumen'

export const KURIKULUM = ['Kurikulum Merdeka', 'Kurikulum 2013', 'Lainnya'] as const
export const MODEL_PEMBELAJARAN = ['Tatap Muka', 'Daring', 'Blended Learning'] as const

const wajib = (label: string) => z.string().trim().min(1, `${label} wajib diisi`)

export const identitasSchema = z
  .object({
    namaSekolah: wajib('Nama sekolah'),
    namaGuru: wajib('Nama guru'),
    mataPelajaran: wajib('Mata pelajaran'),
    kelas: wajib('Kelas'),
    namaSupervisor: wajib('Nama supervisor'),
    tanggal: wajib('Tanggal'),
    kurikulum: z.enum(KURIKULUM),
    kurikulumLainnya: z.string().trim().optional(),
    modelPembelajaran: z.enum(MODEL_PEMBELAJARAN),
  })
  .refine((d) => d.kurikulum !== 'Lainnya' || !!d.kurikulumLainnya, {
    path: ['kurikulumLainnya'],
    message: 'Sebutkan kurikulum yang diterapkan',
  })

const skorSchema = z.object(
  Object.fromEntries(
    SEMUA_INDIKATOR.map((i) => [i.id, z.number({ error: 'Pilih skor 1–4' }).int().min(1).max(4)]),
  ),
)

export const supervisiSchema = z.object({
  identitas: identitasSchema,
  skor: skorSchema,
  catatanAspek: z.record(z.string(), z.string().trim()),
  catatan: z.object({
    kekuatan: z.string().trim(),
    perbaikan: z.string().trim(),
    rekomendasi: z.string().trim(),
  }),
})

export type SupervisiFormInput = z.input<typeof supervisiSchema>
export type SupervisiFormValues = z.output<typeof supervisiSchema>
export type Identitas = SupervisiFormValues['identitas']
