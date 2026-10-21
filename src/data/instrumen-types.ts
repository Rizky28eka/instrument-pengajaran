/**
 * Tipe instrumen supervisi. Konfigurasi instrumen (isi, skala, ambang predikat)
 * dipisahkan dari logika perhitungan di `src/lib/scoring.ts`.
 */

export type Predikat = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Perbaikan'

export interface Indikator {
  id: string
  teks: string
}

export interface KelompokIndikator {
  judul?: string
  indikator: Indikator[]
}

export interface Aspek {
  id: string
  kode: string
  judul: string
  deskripsi: string
  kelompok: KelompokIndikator[]
  /** Turunan dari `kelompok`; selalu dihitung ulang saat instrumen dibentuk. */
  indikator: Indikator[]
  skorMaks: number
}

export interface AmbangPredikat {
  predikat: Predikat
  /** Batas bawah nilai (0–100), inklusif. Urutkan dari tertinggi ke terendah. */
  min: number
}

/**
 * - `provisional`: isi / ambang belum disahkan, hasil hanya untuk uji coba atau pilot.
 * - `resmi`: telah disahkan oleh pemilik instrumen.
 */
export type StatusInstrumen = 'provisional' | 'resmi'

export interface Instrumen {
  versi: string
  nama: string
  status: StatusInstrumen
  aspek: Aspek[]
  ambang: AmbangPredikat[]
}

/** Bentuk instrumen yang disimpan di dokumen supervisi (tanpa field turunan). */
export interface InstrumenSnapshot {
  versi: string
  nama: string
  status: StatusInstrumen
  ambang: AmbangPredikat[]
  aspek: {
    id: string
    kode: string
    judul: string
    deskripsi: string
    kelompok: KelompokIndikator[]
  }[]
}

export const SKOR_MIN = 1
export const SKOR_MAKS_INDIKATOR = 4

export const SKALA = [
  { nilai: 4, label: 'Sangat Baik' },
  { nilai: 3, label: 'Baik' },
  { nilai: 2, label: 'Cukup' },
  { nilai: 1, label: 'Perlu Perbaikan' },
] as const

export function bentukAspek(
  a: Pick<Aspek, 'id' | 'kode' | 'judul' | 'deskripsi' | 'kelompok'>,
): Aspek {
  const indikator = a.kelompok.flatMap((k) => k.indikator)
  return { ...a, indikator, skorMaks: indikator.length * SKOR_MAKS_INDIKATOR }
}

/** Menghidrasi snapshot dari Firestore menjadi `Instrumen` utuh (field turunan dihitung ulang). */
export function hidrasiInstrumen(s: InstrumenSnapshot): Instrumen {
  return {
    versi: s.versi,
    nama: s.nama,
    status: s.status,
    ambang: [...s.ambang].sort((a, b) => b.min - a.min),
    aspek: s.aspek.map(bentukAspek),
  }
}

export function ambilSnapshot(i: Instrumen): InstrumenSnapshot {
  return {
    versi: i.versi,
    nama: i.nama,
    status: i.status,
    ambang: i.ambang.map(({ predikat, min }) => ({ predikat, min })),
    aspek: i.aspek.map(({ id, kode, judul, deskripsi, kelompok }) => ({
      id,
      kode,
      judul,
      deskripsi,
      kelompok: kelompok.map((k) => ({
        ...(k.judul ? { judul: k.judul } : {}),
        indikator: k.indikator.map(({ id: iid, teks }) => ({ id: iid, teks })),
      })),
    })),
  }
}

export const semuaIndikator = (i: Instrumen): Indikator[] => i.aspek.flatMap((a) => a.indikator)
export const skorMaksTotal = (i: Instrumen): number => i.aspek.reduce((s, a) => s + a.skorMaks, 0)
