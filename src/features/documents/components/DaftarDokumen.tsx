import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Eye, FileImage, FileSpreadsheet, FileText, Info } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { pesanError } from '@/features/auth/actions'
import { formatTanggal } from '@/lib/utils'
import { kategoriById } from '../config'
import { bisaDipratinjau, formatUkuran, labelJenis } from '../format'
import { LABEL_REVIEW, NADA_REVIEW } from '../labels'
import { versiAktif } from '../mapper'
import type { DokumenDoc } from '../model'
import { useDokumenService } from '../queries'
import { simpanBlob } from '../simpan-lokal'

function Ikon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage className="size-5" />
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') return <FileSpreadsheet className="size-5" />
  return <FileText className="size-5" />
}

interface Props {
  dokumen: DokumenDoc[]
  onDetail: (d: DokumenDoc) => void
  onPratinjau: (d: DokumenDoc) => void
  /** Tampilan ringkas untuk panel di dalam halaman lain. */
  kompak?: boolean
}

/** Daftar dokumen: nama, ukuran, jenis, pengunggah, tanggal, status; aksi pratinjau/unduh/detail. */
export function DaftarDokumen({ dokumen, onDetail, onPratinjau, kompak = false }: Props) {
  const svc = useDokumenService()
  const [mengunduh, setMengunduh] = useState<string | null>(null)

  async function unduh(d: DokumenDoc) {
    setMengunduh(d.id)
    try {
      const { blob, nama } = await svc.unduh(d)
      simpanBlob(blob, nama)
    } catch (e) {
      toast.error(pesanError(e))
    } finally {
      setMengunduh(null)
    }
  }

  return (
    <ul className="divide-y divide-slate-100">
      {dokumen.map((d) => {
        const v = versiAktif(d)
        const berkas = v ?? d.pending
        return (
          <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Ikon mime={berkas?.mimeType ?? ''} />
            </span>
            <div className="min-w-0 flex-1 basis-56">
              <button type="button" onClick={() => onDetail(d)} className="block max-w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-brand-700">
                {d.judul}
              </button>
              <p className="truncate text-xs text-slate-500">
                {berkas ? `${labelJenis(berkas.mimeType)} · ${formatUkuran(berkas.size)}` : '—'}
                {v && d.currentVersion > 1 && ` · versi ${d.currentVersion}`}
                {` · ${d.createdByName || 'pengunggah'} · ${d.createdAt ? formatTanggal(d.createdAt.toISOString().slice(0, 10)) : '—'}`}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {!kompak && <Badge>{kategoriById(d.kategori)?.label ?? d.kategori}</Badge>}
                {d.reviewStatus && <Badge nada={NADA_REVIEW[d.reviewStatus]}>{LABEL_REVIEW[d.reviewStatus]}</Badge>}
                {d.status === 'mengunggah' && <Badge nada="kuning">Unggahan belum selesai</Badge>}
                {d.pending && d.status === 'tersedia' && <Badge nada="kuning">Versi baru belum selesai</Badge>}
                {d.status === 'dihapus' && <Badge nada="merah">Di tempat sampah</Badge>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {v && d.status === 'tersedia' && bisaDipratinjau(v.mimeType) && (
                <Button size="sm" variant="ghost" onClick={() => onPratinjau(d)} aria-label={`Pratinjau ${d.judul}`} title="Pratinjau">
                  <Eye />
                </Button>
              )}
              {v && d.status === 'tersedia' && (
                <Button size="sm" variant="ghost" onClick={() => void unduh(d)} loading={mengunduh === d.id} aria-label={`Unduh ${d.judul}`} title="Unduh">
                  <Download />
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => onDetail(d)}>
                <Info /> Detail
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
