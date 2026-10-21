import { TriangleAlert } from 'lucide-react'
import type { Instrumen } from '@/data/instrumen'
import { cn } from '@/lib/utils'

/** Peringatan bahwa instrumen belum disahkan; tidak tampil untuk instrumen berstatus resmi. */
export function InstrumenNotice({ instrumen, className }: { instrumen: Instrumen; className?: string }) {
  if (instrumen.status === 'resmi') return null
  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200 print:ring-amber-400',
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Instrumen versi <b>{instrumen.versi}</b> masih sementara dan belum disahkan. Hasilnya belum dapat dipakai sebagai penilaian
        resmi.
      </span>
    </p>
  )
}
