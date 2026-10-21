/**
 * Logika murni tindak lanjut supervisi. Aturan transisi di sini HARUS sama dengan `validTransisi`
 * di firestore.rules — Rules adalah yang berwenang; berkas ini hanya menyajikan pilihan yang sah di UI.
 */

export const STATUS = ['belum', 'proses', 'selesai', 'dibatalkan'] as const
export type StatusTindak = (typeof STATUS)[number]

export const LABEL_STATUS: Record<StatusTindak, string> = {
  belum: 'Belum dimulai',
  proses: 'Sedang berjalan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

const TRANSISI: Record<StatusTindak, StatusTindak[]> = {
  belum: ['proses', 'selesai', 'dibatalkan'],
  proses: ['belum', 'selesai', 'dibatalkan'],
  selesai: ['proses'],
  dibatalkan: ['belum'],
}

/** Status yang boleh dituju dari status saat ini (selain tetap di status yang sama). */
export const transisiTersedia = (dari: StatusTindak): StatusTindak[] => TRANSISI[dari]

export const transisiSah = (dari: StatusTindak, ke: StatusTindak): boolean => dari === ke || TRANSISI[dari].includes(ke)

export interface TindakLanjut {
  id: string
  schoolId: string
  supervisiId: string
  guruId: string
  guruNama: string
  deskripsi: string
  status: StatusTindak
  penanggungJawab: string
  /** yyyy-mm-dd atau null. */
  tenggat: string | null
  selesaiAt: Date | null
  createdBy: string
  createdAt: Date | null
  updatedAt: Date | null
  updatedBy: string
  rev: number
}

export const aktif = (t: Pick<TindakLanjut, 'status'>) => t.status === 'belum' || t.status === 'proses'

/** Terlambat: masih aktif dan tenggatnya sudah lewat (membandingkan tanggal kalender, bukan jam). */
export function terlambat(t: Pick<TindakLanjut, 'status' | 'tenggat'>, hariIni: string): boolean {
  return aktif(t) && !!t.tenggat && t.tenggat < hariIni
}

/** Selisih hari kalender tenggat − hariIni (negatif = lewat). null bila tanpa tenggat. */
export function sisaHari(tenggat: string | null, hariIni: string): number | null {
  if (!tenggat) return null
  const ke = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((ke(tenggat) - ke(hariIni)) / 86_400_000)
}

export interface RingkasanTindak {
  total: number
  perStatus: Record<StatusTindak, number>
  aktif: number
  terlambat: number
}

export function ringkasTindakLanjut(daftar: Pick<TindakLanjut, 'status' | 'tenggat'>[], hariIni: string): RingkasanTindak {
  const perStatus: Record<StatusTindak, number> = { belum: 0, proses: 0, selesai: 0, dibatalkan: 0 }
  let jumlahTerlambat = 0
  for (const t of daftar) {
    perStatus[t.status]++
    if (terlambat(t, hariIni)) jumlahTerlambat++
  }
  return { total: daftar.length, perStatus, aktif: perStatus.belum + perStatus.proses, terlambat: jumlahTerlambat }
}

export interface FilterTindak {
  status?: StatusTindak | 'aktif' | ''
  /** Batas tenggat (inklusif), yyyy-mm-dd. */
  dari?: string
  sampai?: string
  hanyaTerlambat?: boolean
}

export function saringTindakLanjut<T extends Pick<TindakLanjut, 'status' | 'tenggat'>>(daftar: T[], f: FilterTindak, hariIni: string): T[] {
  return daftar.filter((t) => {
    if (f.status === 'aktif' && !aktif(t)) return false
    if (f.status && f.status !== 'aktif' && t.status !== f.status) return false
    if (f.hanyaTerlambat && !terlambat(t, hariIni)) return false
    // Rentang periode berlaku pada tenggat; tanpa tenggat tidak ikut saat rentang diisi.
    if (f.dari || f.sampai) {
      if (!t.tenggat) return false
      if (f.dari && t.tenggat < f.dari) return false
      if (f.sampai && t.tenggat > f.sampai) return false
    }
    return true
  })
}

/** Urutan tampil: yang terlambat dulu, lalu aktif menurut tenggat terdekat, lalu selesai/dibatalkan. */
export function urutkanTindakLanjut<T extends Pick<TindakLanjut, 'status' | 'tenggat'>>(daftar: T[], hariIni: string): T[] {
  const peringkat = (t: T) => (terlambat(t, hariIni) ? 0 : aktif(t) ? 1 : 2)
  return [...daftar].sort((a, b) => {
    const p = peringkat(a) - peringkat(b)
    if (p) return p
    if (a.tenggat === b.tenggat) return 0
    if (!a.tenggat) return 1
    if (!b.tenggat) return -1
    return a.tenggat < b.tenggat ? -1 : 1
  })
}
