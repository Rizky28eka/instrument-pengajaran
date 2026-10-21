import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const fmtTanggal = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' })

/** Format tanggal ISO (yyyy-mm-dd) ke "21 Oktober 2026". */
export function formatTanggal(iso: string | undefined) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return Number.isNaN(date.getTime()) ? iso : fmtTanggal.format(date)
}

export function hariIniISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export function formatNilai(n: number) {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}
