import {
  INSTRUMEN_AKTIF,
  SKOR_MAKS_INDIKATOR,
  SKOR_MIN,
  skorMaksTotal,
  type AmbangPredikat,
  type Instrumen,
  type Predikat,
} from '@/data/instrumen'

export type { Predikat }

export const PREDIKAT: Predikat[] = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Perbaikan']

/** Ambang predikat instrumen aktif — untuk antarmuka yang menjelaskan konversi nilai. */
export const BATAS_PREDIKAT: AmbangPredikat[] = INSTRUMEN_AKTIF.ambang

const bulat2 = (n: number) => Math.round(n * 100) / 100

/** Skor valid: bilangan bulat pada skala instrumen. */
export const skorValid = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= SKOR_MIN && v <= SKOR_MAKS_INDIKATOR

/**
 * Predikat dari total/maks dengan perbandingan bilangan bulat, bukan dari nilai yang
 * sudah dibulatkan — 85,996 tidak boleh naik ke "86" hanya karena pembulatan.
 */
export function predikatDariSkor(total: number, maks: number, ambang: AmbangPredikat[] = INSTRUMEN_AKTIF.ambang): Predikat {
  const urut = [...ambang].sort((a, b) => b.min - a.min)
  if (maks <= 0) return urut[urut.length - 1].predikat
  return (urut.find((b) => total * 100 >= b.min * maks) ?? urut[urut.length - 1]).predikat
}

/** Predikat dari nilai 0–100 yang sudah jadi (mis. rata-rata di dashboard). */
export function predikatDari(nilai: number, ambang: AmbangPredikat[] = INSTRUMEN_AKTIF.ambang): Predikat {
  const urut = [...ambang].sort((a, b) => b.min - a.min)
  return (urut.find((b) => nilai >= b.min) ?? urut[urut.length - 1]).predikat
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

/** Hanya skor valid yang dihitung; nilai di luar skala atau bukan angka diabaikan. */
export function hitungRingkasan(skor: Partial<Record<string, number>>, instrumen: Instrumen = INSTRUMEN_AKTIF): Ringkasan {
  const perAspek: Record<string, SkorAspek> = {}
  let total = 0
  let terisi = 0
  let jumlah = 0

  for (const aspek of instrumen.aspek) {
    let t = 0
    let n = 0
    for (const ind of aspek.indikator) {
      const v = skor[ind.id]
      if (skorValid(v)) {
        t += v
        n++
      }
    }
    perAspek[aspek.id] = {
      total: t,
      maks: aspek.skorMaks,
      nilai: aspek.skorMaks ? bulat2((t / aspek.skorMaks) * 100) : 0,
      terisi: n,
      jumlah: aspek.indikator.length,
    }
    total += t
    terisi += n
    jumlah += aspek.indikator.length
  }

  const maks = skorMaksTotal(instrumen)
  return {
    total,
    maks,
    nilai: maks ? bulat2((total / maks) * 100) : 0,
    predikat: predikatDariSkor(total, maks, instrumen.ambang),
    terisi,
    jumlah,
    perAspek,
  }
}
