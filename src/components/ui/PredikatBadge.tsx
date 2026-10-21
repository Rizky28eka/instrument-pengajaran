import type { Predikat } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import { PREDIKAT_STYLE } from './predikat-style'

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
