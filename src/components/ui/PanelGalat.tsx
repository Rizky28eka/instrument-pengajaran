import { CloudOff, ShieldAlert } from 'lucide-react'
import { jenisGalat, pesanGalatData } from '@/lib/galat'
import { Button } from './Button'
import { cn } from '@/lib/utils'

/** Tampilan galat pengambilan data. Tidak pernah dikira "data kosong" dan tidak membocorkan detail internal. */
export function PanelGalat({ error, onCoba, className }: { error: unknown; onCoba?: () => void; className?: string }) {
  const p = pesanGalatData(error)
  const Ikon = jenisGalat(error) === 'izin' ? ShieldAlert : CloudOff
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="grid size-12 place-items-center rounded-full bg-rose-50 text-rose-600">
        <Ikon className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{p.judul}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{p.isi}</p>
      {p.dapatDicoba && onCoba && (
        <Button variant="secondary" className="mt-5" onClick={onCoba}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}
