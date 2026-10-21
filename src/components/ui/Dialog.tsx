import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Dialog modal sederhana: Esc menutup, klik latar menutup, fokus dipindahkan ke dalam dialog. */
export function Dialog({
  judul,
  deskripsi,
  onTutup,
  lebar = 'md',
  children,
}: {
  judul: ReactNode
  deskripsi?: ReactNode
  onTutup: () => void
  lebar?: 'md' | 'lg' | 'xl'
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sebelumnya = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onTutup()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      sebelumnya?.focus?.()
    }
  }, [onTutup])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={typeof judul === 'string' ? judul : undefined}>
      <div className="absolute inset-0 bg-slate-900/40 animate-fade-in" onClick={onTutup} />
      <div
        ref={panel}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90svh] w-full flex-col rounded-2xl bg-white shadow-xl outline-none animate-fade-in',
          lebar === 'md' && 'max-w-lg',
          lebar === 'lg' && 'max-w-2xl',
          lebar === 'xl' && 'max-w-5xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900">{judul}</h2>
            {deskripsi && <p className="mt-0.5 text-sm text-slate-500">{deskripsi}</p>}
          </div>
          <button type="button" onClick={onTutup} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
