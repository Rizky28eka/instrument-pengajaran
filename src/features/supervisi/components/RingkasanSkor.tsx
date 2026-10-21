import { ASPEK } from '@/data/instrumen'
import { PredikatBadge } from '@/components/ui/PredikatBadge'
import { PREDIKAT_STYLE } from '@/components/ui/predikat-style'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Ringkasan } from '@/lib/scoring'
import { cn, formatNilai } from '@/lib/utils'

/** Tabel skor per aspek + total; dipakai di langkah terakhir form dan halaman detail. */
export function TabelRingkasan({ ringkasan }: { ringkasan: Ringkasan }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-2.5">Aspek</th>
            <th className="px-4 py-2.5 text-right">Skor</th>
            <th className="hidden px-4 py-2.5 sm:table-cell print:table-cell">Capaian</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ASPEK.map((a) => {
            const s = ringkasan.perAspek[a.id]
            return (
              <tr key={a.id}>
                <td className="px-4 py-2.5">
                  <span className="mr-2 font-bold text-slate-400">{a.kode}</span>
                  {a.judul}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">
                  {s.total} / {s.maks}
                </td>
                <td className="hidden w-48 px-4 py-2.5 sm:table-cell print:table-cell">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={s.nilai} className="flex-1" />
                    <span className="w-12 text-right text-xs text-slate-500 tabular-nums">{formatNilai(s.nilai)}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold">
          <tr>
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {ringkasan.total} / {ringkasan.maks}
            </td>
            <td className="hidden px-4 py-3 sm:table-cell print:table-cell">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular-nums">Nilai {formatNilai(ringkasan.nilai)}</span>
                <PredikatBadge predikat={ringkasan.predikat} />
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/** Kartu nilai besar dengan predikat. */
export function NilaiAkhir({ ringkasan, className }: { ringkasan: Ringkasan; className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className={cn('text-4xl font-extrabold tracking-tight tabular-nums', PREDIKAT_STYLE[ringkasan.predikat].text)}>
        {formatNilai(ringkasan.nilai)}
      </div>
      <div className="space-y-1">
        <PredikatBadge predikat={ringkasan.predikat} />
        <p className="text-xs text-slate-500 tabular-nums">
          Skor {ringkasan.total} dari {ringkasan.maks}
        </p>
      </div>
    </div>
  )
}
