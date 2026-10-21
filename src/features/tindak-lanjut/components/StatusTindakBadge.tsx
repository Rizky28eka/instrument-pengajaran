import { cn } from '@/lib/utils'
import { LABEL_STATUS, type StatusTindak } from '../logic'

const GAYA: Record<StatusTindak, string> = {
  belum: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  proses: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  dibatalkan: 'bg-zinc-100 text-zinc-500 ring-zinc-500/20 line-through',
}

export function StatusTindakBadge({ status, className }: { status: StatusTindak; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', GAYA[status], className)}>
      {LABEL_STATUS[status]}
    </span>
  )
}
