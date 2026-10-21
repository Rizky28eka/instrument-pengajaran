import { TriangleAlert } from 'lucide-react'
import { semuaIndikator, type Instrumen } from '@/data/instrumen'
import { indikatorBelumTerkonfirmasi } from '@/data/konfirmasi'
import { cn } from '@/lib/utils'

/** Peringatan bahwa instrumen belum disahkan; tidak tampil untuk instrumen berstatus resmi. */
export function InstrumenNotice({ instrumen, className }: { instrumen: Instrumen; className?: string }) {
  if (instrumen.status === 'resmi') return null
  const rancangan = indikatorBelumTerkonfirmasi(instrumen).length
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
        {rancangan > 0 && (
          <>
            {' '}
            <b>
              {rancangan} dari {semuaIndikator(instrumen).length} indikator
            </b>{' '}
            masih rancangan awal yang belum dikonfirmasi dengan dokumen sumber.
          </>
        )}
      </span>
    </p>
  )
}
