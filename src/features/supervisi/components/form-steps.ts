import type { FieldErrors, FieldPath } from 'react-hook-form'
import { ASPEK } from '@/data/instrumen'
import type { SupervisiFormInput } from '../schema'

export interface Langkah {
  id: string
  judul: string
  fields: FieldPath<SupervisiFormInput>[]
}

export const LANGKAH: Langkah[] = [
  { id: 'identitas', judul: 'Identitas', fields: ['identitas'] },
  ...ASPEK.map((a) => ({
    id: a.id,
    judul: a.judul,
    fields: a.indikator.map((i) => `skor.${i.id}` as const),
  })),
  { id: 'catatan', judul: 'Catatan & Simpan', fields: ['catatan'] },
]

/** Indeks langkah pertama yang memiliki error validasi, atau -1. */
export function langkahDenganError(errors: FieldErrors<SupervisiFormInput>) {
  return LANGKAH.findIndex((l) => {
    if (l.id === 'identitas') return !!errors.identitas
    if (l.id === 'catatan') return !!errors.catatan
    return ASPEK.find((a) => a.id === l.id)!.indikator.some((i) => errors.skor?.[i.id])
  })
}
