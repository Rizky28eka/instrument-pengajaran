import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const NADA = {
  netral: 'bg-slate-100 text-slate-700',
  hijau: 'bg-emerald-50 text-emerald-700',
  kuning: 'bg-amber-50 text-amber-800',
  merah: 'bg-rose-50 text-rose-700',
  biru: 'bg-sky-50 text-sky-700',
} as const

export type NadaBadge = keyof typeof NADA

export function Badge({ nada = 'netral', className, children }: { nada?: NadaBadge; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap', NADA[nada], className)}>
      {children}
    </span>
  )
}
