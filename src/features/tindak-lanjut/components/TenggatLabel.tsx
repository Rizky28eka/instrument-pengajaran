import { cn, formatTanggal, hariIniISO } from '@/lib/utils'
import { sisaHari, terlambat, type TindakLanjut } from '../logic'

/** Tenggat dengan penanda terlambat / segera jatuh tempo (tidak hanya mengandalkan warna). */
export function TenggatLabel({ t }: { t: Pick<TindakLanjut, 'status' | 'tenggat'> }) {
  if (!t.tenggat) return <span className="text-slate-400">Tanpa tenggat</span>
  const hariIni = hariIniISO()
  const lewat = terlambat(t, hariIni)
  const sisa = sisaHari(t.tenggat, hariIni)
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-1.5', lewat && 'font-semibold text-rose-700')}>
      <time dateTime={t.tenggat}>{formatTanggal(t.tenggat)}</time>
      {lewat && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-xs ring-1 ring-rose-200">Terlambat {Math.abs(sisa ?? 0)} hari</span>}
      {!lewat && (t.status === 'belum' || t.status === 'proses') && sisa !== null && sisa >= 0 && sisa <= 3 && (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 ring-1 ring-amber-200">{sisa === 0 ? 'Hari ini' : `${sisa} hari lagi`}</span>
      )}
    </span>
  )
}
