import type { FieldErrors, FieldPath } from 'react-hook-form'
import type { Instrumen } from '@/data/instrumen'
import type { SupervisiFormInput } from '../schema'

export interface Langkah {
  id: string
  judul: string
  fields: FieldPath<SupervisiFormInput>[]
}

export function buatLangkah(instrumen: Instrumen): Langkah[] {
  return [
    { id: 'identitas', judul: 'Identitas', fields: ['guruId', 'identitas'] },
    ...instrumen.aspek.map((a) => ({
      id: a.id,
      judul: a.judul,
      fields: a.indikator.map((i) => `skor.${i.id}` as const),
    })),
    { id: 'catatan', judul: 'Catatan & Simpan', fields: ['catatan'] },
  ]
}

/** Indeks langkah pertama yang memiliki error validasi, atau -1. */
export function langkahDenganError(langkah: Langkah[], instrumen: Instrumen, errors: FieldErrors<SupervisiFormInput>) {
  return langkah.findIndex((l) => {
    if (l.id === 'identitas') return !!errors.identitas || !!errors.guruId
    if (l.id === 'catatan') return !!errors.catatan
    return instrumen.aspek.find((a) => a.id === l.id)!.indikator.some((i) => errors.skor?.[i.id])
  })
}
