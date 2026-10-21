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

const NAMA_PREDIKAT: ReadonlySet<string> = new Set(['Sangat Baik', 'Baik', 'Cukup', 'Perlu Perbaikan'])
const adaTeks = (v: unknown, maks = 1000): v is string => typeof v === 'string' && v.length > 0 && v.length <= maks

/**
 * Memvalidasi snapshot yang dibaca dari Firestore. Data itu tidak dipercaya: pengguna sah di
 * sekolah yang sama dapat menulis bentuk apa pun, dan satu dokumen rusak tidak boleh membuat
 * halaman daftar atau perhitungan skor gagal.
 */
export function snapshotValid(s: unknown): s is InstrumenSnapshot {
  const x = s as Partial<InstrumenSnapshot> | null
  if (!x || typeof x !== 'object') return false
  if (!adaTeks(x.versi, 60) || typeof x.nama !== 'string' || (x.status !== 'provisional' && x.status !== 'resmi')) return false
  if (!Array.isArray(x.ambang) || x.ambang.length < 1 || x.ambang.length > 10) return false
  if (!x.ambang.every((a) => a && NAMA_PREDIKAT.has(a.predikat) && Number.isFinite(a.min) && a.min >= 0 && a.min <= 100)) return false
  if (!Array.isArray(x.aspek) || x.aspek.length < 1 || x.aspek.length > 20) return false

  const ids = new Set<string>()
  for (const a of x.aspek) {
    if (!a || !adaTeks(a.id, 20) || !adaTeks(a.kode, 20) || !adaTeks(a.judul, 200) || typeof a.deskripsi !== 'string') return false
    if (!Array.isArray(a.kelompok) || a.kelompok.length < 1) return false
    for (const k of a.kelompok) {
      if (!k || !Array.isArray(k.indikator) || k.indikator.length < 1) return false
      for (const i of k.indikator) {
        if (!i || !adaTeks(i.id, 20) || !adaTeks(i.teks) || ids.has(i.id)) return false
        ids.add(i.id)
      }
    }
  }
  return ids.size <= 120
}
