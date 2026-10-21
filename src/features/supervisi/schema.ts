import { z } from 'zod'
import { semuaIndikator, SKOR_MAKS_INDIKATOR, SKOR_MIN, type Instrumen } from '@/data/instrumen'

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

const catatanSchema = z.object({
  kekuatan: z.string().trim(),
  perbaikan: z.string().trim(),
  rekomendasi: z.string().trim(),
})

/** Skema form dibentuk dari instrumen yang dipakai dokumen (bukan selalu instrumen aktif). */
export function buatSupervisiSchema(instrumen: Instrumen): z.ZodType<SupervisiFormValues, SupervisiFormInput> {
  const skor = z.object(
    Object.fromEntries(
      semuaIndikator(instrumen).map((i) => [
        i.id,
        z.number({ error: `Pilih skor ${SKOR_MIN}–${SKOR_MAKS_INDIKATOR}` }).int().min(SKOR_MIN).max(SKOR_MAKS_INDIKATOR),
      ]),
    ),
  )
  // Bentuk `skor` bergantung pada instrumen (kunci dinamis), jadi tipe diberikan eksplisit.
  return z.object({
    identitas: identitasSchema,
    skor,
    catatanAspek: z.record(z.string(), z.string().trim()),
    catatan: catatanSchema,
  }) as unknown as z.ZodType<SupervisiFormValues, SupervisiFormInput>
}

export type Identitas = z.output<typeof identitasSchema>

export interface SupervisiFormValues {
  identitas: Identitas
  skor: Record<string, number>
  catatanAspek: Record<string, string>
  catatan: z.output<typeof catatanSchema>
}

export interface SupervisiFormInput {
  identitas: z.input<typeof identitasSchema>
  skor: Record<string, number | undefined>
  catatanAspek: Record<string, string>
  catatan: z.input<typeof catatanSchema>
}
