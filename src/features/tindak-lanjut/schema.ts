import { z } from 'zod'

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid')
  .refine((v) => {
    const [y, m, d] = v.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d // menolak 2026-02-31
  }, 'Tanggal tidak ada di kalender')

export const tindakFormSchema = z.object({
  deskripsi: z.string().trim().min(1, 'Tindak lanjut wajib diisi').max(2000, 'Maksimal 2000 karakter'),
  penanggungJawab: z.string().trim().max(120, 'Maksimal 120 karakter'),
  tenggat: z.preprocess((v) => (v === '' || v === undefined ? null : v), tanggal.nullable()),
})

export type TindakForm = z.output<typeof tindakFormSchema>

export const catatanSchema = z.string().trim().min(1, 'Catatan wajib diisi').max(2000, 'Maksimal 2000 karakter')
