import { useEffect, useRef, useState } from 'react'
import { CircleCheck, RotateCw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import { formatUkuran } from '../format'
import { LABEL_UNGGAH, UNGGAH_BERJALAN } from '../labels'
import { useTugasUnggah } from '../queries'
import { bolehUlangi } from '../upload-state'
import type { TugasUnggah } from '../upload-task'

interface Props {
  nama: string
  ukuran: number
  tipe: string
  tugas: TugasUnggah
  /** true = jangan mulai otomatis; pengguna harus mengonfirmasi (mis. berkas identik sudah ada). */
  perluKonfirmasi?: boolean
  /** Peringatan di bawah baris saat menunggu konfirmasi. */
  pesanKonfirmasi?: string
  onAktif?: (berjalan: boolean) => void
  /** Dipanggil tepat sekali saat unggahan berhasil. */
  onBerhasil?: () => void
  onLepas: () => void
}

/** Satu baris unggahan: nama, ukuran, tipe, progres, status, dan tombol batal / coba lagi. */
export function BarisTugas({ nama, ukuran, tipe, tugas, perluKonfirmasi = false, pesanKonfirmasi, onAktif, onBerhasil, onLepas }: Props) {
  const s = useTugasUnggah(tugas)
  const [menunggu, setMenunggu] = useState(perluKonfirmasi)
  const berjalan = UNGGAH_BERJALAN.includes(s.status)

  useEffect(() => {
    onAktif?.(berjalan)
    return () => onAktif?.(false)
  }, [berjalan, onAktif])

  // Dilaporkan tepat sekali; tanpa penjaga ini, identitas `onBerhasil` yang berubah tiap render
  // akan memicu efek (dan pemuatan ulang daftar) berulang-ulang.
  const sudahDilaporkan = useRef(false)
  useEffect(() => {
    if (s.status === 'berhasil' && !sudahDilaporkan.current) {
      sudahDilaporkan.current = true
      onBerhasil?.()
    }
  }, [s.status, onBerhasil])

  return (
    <li className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{nama}</p>
          <p className="text-xs text-slate-500">
            {formatUkuran(ukuran)} · {tipe || 'tipe tidak dilaporkan'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {menunggu && s.status === 'menunggu' ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setMenunggu(false)
                  void tugas.jalankan()
                }}
              >
                Tetap unggah
              </Button>
              <Button size="sm" variant="ghost" onClick={onLepas}>
                Lewati
              </Button>
            </>
          ) : berjalan ? (
            <Button size="sm" variant="ghost" onClick={() => void tugas.batal()}>
              <X /> Batal
            </Button>
          ) : s.status === 'gagal' ? (
            <>
              {bolehUlangi(s) && (
                <Button size="sm" variant="secondary" onClick={() => void tugas.ulangi()}>
                  <RotateCw /> Coba lagi
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => void tugas.batal().then(onLepas)}>
                Buang
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={onLepas} aria-label="Tutup">
              <X />
            </Button>
          )}
        </div>
      </div>

      {menunggu && s.status === 'menunggu' && pesanKonfirmasi && (
        <p role="note" className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 ring-1 ring-amber-200">
          {pesanKonfirmasi}
        </p>
      )}

      {(berjalan || s.status === 'berhasil') && <ProgressBar value={s.progres * 100} className="mt-2 h-1.5" />}
      <p
        className={cn(
          'mt-1.5 flex items-center gap-1.5 text-xs',
          s.status === 'gagal' ? 'font-medium text-rose-700' : s.status === 'berhasil' ? 'font-medium text-emerald-700' : 'text-slate-500',
        )}
        role={s.status === 'gagal' ? 'alert' : undefined}
      >
        {s.status === 'berhasil' && <CircleCheck className="size-3.5" aria-hidden />}
        {s.status === 'gagal' ? `Gagal: ${s.pesan ?? 'terjadi kesalahan'}` : LABEL_UNGGAH[s.status]}
        {s.percobaan > 0 && s.status !== 'berhasil' && ` (percobaan ${s.percobaan + 1})`}
      </p>
    </li>
  )
}
