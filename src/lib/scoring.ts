import { ASPEK, SKOR_MAKS_TOTAL } from '@/data/instrumen'

export type Predikat = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Perbaikan'

export const PREDIKAT: Predikat[] = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Perbaikan']

/** Batas bawah nilai (0–100) untuk tiap predikat. */
export const BATAS_PREDIKAT: { predikat: Predikat; min: number }[] = [
  { predikat: 'Sangat Baik', min: 86 },
  { predikat: 'Baik', min: 71 },
  { predikat: 'Cukup', min: 56 },
  { predikat: 'Perlu Perbaikan', min: 0 },
]

export function predikatDari(nilai: number): Predikat {
  return BATAS_PREDIKAT.find((b) => nilai >= b.min)!.predikat
}

export interface SkorAspek {
  total: number
  maks: number
  nilai: number
  terisi: number
  jumlah: number
}

export interface Ringkasan {
  total: number
  maks: number
  nilai: number
  predikat: Predikat
  terisi: number
  jumlah: number
  perAspek: Record<string, SkorAspek>
}

const bulat = (n: number) => Math.round(n * 100) / 100

export function hitungRingkasan(skor: Partial<Record<string, number>>): Ringkasan {
  const perAspek: Record<string, SkorAspek> = {}
  let total = 0
  let terisi = 0
  let jumlah = 0

  for (const aspek of ASPEK) {
    let t = 0
    let n = 0
    for (const ind of aspek.indikator) {
      const v = skor[ind.id]
      if (typeof v === 'number') {
        t += v
        n++
      }
    }
    perAspek[aspek.id] = {
      total: t,
      maks: aspek.skorMaks,
      nilai: bulat((t / aspek.skorMaks) * 100),
      terisi: n,
      jumlah: aspek.indikator.length,
    }
    total += t
    terisi += n
    jumlah += aspek.indikator.length
  }

  const nilai = bulat((total / SKOR_MAKS_TOTAL) * 100)
  return { total, maks: SKOR_MAKS_TOTAL, nilai, predikat: predikatDari(nilai), terisi, jumlah, perAspek }
}
