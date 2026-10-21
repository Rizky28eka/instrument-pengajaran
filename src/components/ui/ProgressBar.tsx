import { cn } from '@/lib/utils'

export function ProgressBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className={cn('h-full rounded-full bg-brand-600 transition-[width] duration-500 print:bg-slate-600', barClassName)}
        style={{ width: `${v}%` }}
      />
    </div>
  )
}
