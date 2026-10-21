import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'

interface Props {
  open: boolean
  judul: string
  children: ReactNode
  labelYa: string
  labelBatal?: string
  /** `danger` untuk tindakan yang menghapus / tidak dapat dibatalkan. */
  varian?: 'danger' | 'primary'
  memproses?: boolean
  onYa: () => void
  onBatal: () => void
}

/**
 * Dialog konfirmasi memakai elemen <dialog> bawaan: fokus terkunci di dalam dialog,
 * Escape menutup, dan fokus dikembalikan ke pemicu — tanpa pustaka tambahan.
 */
export function ConfirmDialog({ open, judul, children, labelYa, labelBatal = 'Batal', varian = 'primary', memproses, onYa, onBatal }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const idJudul = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={idJudul}
      onCancel={(e) => {
        e.preventDefault() // kendalikan penutupan lewat state
        if (!memproses) onBatal()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !memproses) onBatal()
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-6">
        <h2 id={idJudul} className="text-lg font-bold text-slate-900">
          {judul}
        </h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onBatal} disabled={memproses}>
            {labelBatal}
          </Button>
          <Button variant={varian === 'danger' ? 'danger' : 'primary'} onClick={onYa} loading={memproses}>
            {labelYa}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
