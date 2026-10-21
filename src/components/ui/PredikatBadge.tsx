import type { Predikat } from '@/lib/scoring'
import { cn } from '@/lib/utils'

export const PREDIKAT_STYLE: Record<Predikat, { badge: string; bar: string; text: string }> = {
  'Sangat Baik': { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', bar: 'bg-emerald-500', text: 'text-emerald-600' },
  Baik: { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', bar: 'bg-sky-500', text: 'text-sky-600' },
  Cukup: { badge: 'bg-amber-50 text-amber-800 ring-amber-600/20', bar: 'bg-amber-500', text: 'text-amber-600' },
  'Perlu Perbaikan': { badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', bar: 'bg-rose-500', text: 'text-rose-600' },
}

export function PredikatBadge({ predikat, className }: { predikat: Predikat; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        PREDIKAT_STYLE[predikat].badge,
        className,
      )}
    >
      {predikat}
    </span>
  )
}
