import type { KategoriId } from './config'
import { versiAktif } from './mapper'
import type { DokumenDoc, StatusDokumen } from './model'
import type { ReviewStatus } from './review'

export interface RelasiDokumen {
  supervisiId?: string | null
  guruId?: string | null
  tindakId?: string | null
}

/**
 * Dokumen aktif dengan isi identik (SHA-256 versi aktif) pada relasi yang sama — untuk memperingatkan
 * pengguna sebelum mengunggah berkas yang sama berulang kali. Peringatan, bukan larangan.
 */
export function cariDuplikat(daftar: DokumenDoc[], sha256: string, relasi: RelasiDokumen): DokumenDoc[] {
  return daftar.filter((d) => {
    if (d.status === 'dihapus') return false
    if (versiAktif(d)?.sha256 !== sha256) return false
    return (Object.keys(relasi) as (keyof RelasiDokumen)[]).every((k) => (d[k] ?? null) === (relasi[k] ?? null))
  })
}

export interface FilterDokumen {
  q?: string
  kategori?: KategoriId | ''
  status?: StatusDokumen | ''
  pengunggah?: string
  review?: ReviewStatus | ''
  /** yyyy-mm-dd (UTC), inklusif. */
  dari?: string
  sampai?: string
  supervisiId?: string
  guruId?: string
  tindakId?: string
}

const tanggalUnggah = (d: DokumenDoc) => d.createdAt?.toISOString().slice(0, 10) ?? ''

/** Memfilter lalu mengurutkan (terbaru dulu). Dokumen terhapus hanya tampil bila status "dihapus" dipilih. */
export function filterDokumen(daftar: DokumenDoc[], f: FilterDokumen): DokumenDoc[] {
  const kata = f.q?.trim().toLowerCase()
  return daftar
    .filter((d) => {
      if (f.status ? d.status !== f.status : d.status === 'dihapus') return false
      if (f.kategori && d.kategori !== f.kategori) return false
      if (f.pengunggah && d.createdBy !== f.pengunggah) return false
      if (f.review && d.reviewStatus !== f.review) return false
      if (f.supervisiId && d.supervisiId !== f.supervisiId) return false
      if (f.guruId && d.guruId !== f.guruId) return false
      if (f.tindakId && d.tindakId !== f.tindakId) return false
      const tgl = tanggalUnggah(d)
      if (f.dari && tgl < f.dari) return false
      if (f.sampai && tgl > f.sampai) return false
      if (kata) {
        const nama = versiAktif(d)?.fileName ?? d.pending?.fileName ?? ''
        return [d.judul, nama, d.createdByName].some((v) => v.toLowerCase().includes(kata))
      }
      return true
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) || a.id.localeCompare(b.id))
}

export interface HasilPaginasi<T> {
  baris: T[]
  halaman: number
  totalHalaman: number
  total: number
}

/** Halaman dijepit ke rentang valid sehingga pengguna tidak pernah melihat halaman kosong karena nomor basi. */
export function paginasi<T>(data: T[], halaman: number, ukuran: number): HasilPaginasi<T> {
  const totalHalaman = Math.max(1, Math.ceil(data.length / ukuran))
  const h = Math.min(Math.max(1, Math.trunc(halaman) || 1), totalHalaman)
  return { baris: data.slice((h - 1) * ukuran, h * ukuran), halaman: h, totalHalaman, total: data.length }
}

/** Dokumen dengan unggahan yang terputus (metadata ada, belum final) milik pengguna ini. */
export function tertundaMilik(daftar: DokumenDoc[], uid: string): DokumenDoc[] {
  return daftar.filter((d) => d.pending?.uploadedBy === uid)
}

/** Sudah melewati masa retensi sejak dihapus-lunak: layak diusulkan untuk dihapus permanen. */
export function kedaluwarsa(d: DokumenDoc, sekarang: Date, retensiHari: number): boolean {
  if (d.status !== 'dihapus' || !d.deletedAt) return false
  return sekarang.getTime() - d.deletedAt.getTime() > retensiHari * 24 * 3600 * 1000
}
