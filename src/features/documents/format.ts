import { JENIS_BERKAS } from './config'

const angka = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 })

export function formatUkuran(byte: number): string {
  if (!Number.isFinite(byte) || byte < 0) return '—'
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${angka(byte / 1024)} KB`
  return `${angka(byte / (1024 * 1024))} MB`
}

const DAPAT_DIRENDER = new Set(['application/pdf', 'image/png', 'image/jpeg'])

/**
 * Hanya PDF dan gambar raster yang ditampilkan di browser. Dokumen Office dan CSV tidak pernah
 * dirender (tidak ada eksekusi makro/rumus); SVG dan HTML tidak termasuk tipe yang diizinkan.
 */
export const bisaDipratinjau = (mime: string): boolean => DAPAT_DIRENDER.has(mime)

export function labelJenis(mime: string): string {
  return Object.values(JENIS_BERKAS).find((j) => j.mime === mime)?.label ?? 'Berkas'
}
