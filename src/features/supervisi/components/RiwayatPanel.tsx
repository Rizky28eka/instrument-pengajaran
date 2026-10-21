import { useState } from 'react'
import { History } from 'lucide-react'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { Spinner } from '@/components/ui/Spinner'
import { formatNilai } from '@/lib/utils'
import { useRiwayatSupervisi } from '../queries'

const LABEL_AKSI = { buat: 'Dibuat', ubah: 'Diubah', hapus: 'Dihapus', pulihkan: 'Dipulihkan' } as const
const FORMAT = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

/** Jejak perubahan (append-only di Firestore Rules). Dimuat hanya saat panel dibuka. */
export function RiwayatPanel({ id }: { id: string }) {
  const [buka, setBuka] = useState(false)
  const riwayat = useRiwayatSupervisi(buka ? id : undefined)

  return (
    <details className="group print:hidden" onToggle={(e) => setBuka(e.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
        <History className="size-4" aria-hidden /> Riwayat perubahan
      </summary>
      <div className="mt-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        {!buka || riwayat.isPending ? (
          <Spinner className="mx-auto" />
        ) : riwayat.isError ? (
          <PanelGalat error={riwayat.error} onCoba={() => void riwayat.refetch()} className="py-4" />
        ) : (
          <ol className="space-y-3">
            {riwayat.data.map((r) => (
              <li key={r.rev} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                <span>
                  <b>{LABEL_AKSI[r.aksi] ?? r.aksi}</b> oleh {r.olehNama || 'pengguna'}
                  {r.nilai != null && <span className="text-slate-500"> · nilai {formatNilai(r.nilai)}</span>}
                </span>
                <time className="text-xs text-slate-500">{r.waktu ? FORMAT.format(r.waktu) : '-'}</time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  )
}
