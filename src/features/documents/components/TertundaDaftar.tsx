import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { pesanError } from '@/features/auth/actions'
import { ACCEPT_ATTR } from '../config'
import { formatUkuran } from '../format'
import type { DokumenDoc } from '../model'
import { useAksiDokumen, useDokumenService } from '../queries'
import type { UnggahSiap } from '../service'
import { BarisTugas } from './BarisTugas'

/**
 * Unggahan milik pengguna yang terputus di tengah jalan (halaman ditutup, jaringan hilang, dll.).
 * Metadata sudah ada tetapi belum final. Pilihan: selesaikan (bila berkas sudah ada di penyimpanan),
 * lanjutkan dengan memilih ulang berkas yang SAMA, atau buang.
 */
export function TertundaDaftar({ dokumen, schoolId }: { dokumen: DokumenDoc[]; schoolId: string }) {
  if (dokumen.length === 0) return null
  return (
    <section aria-label="Unggahan belum selesai" className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <TriangleAlert className="size-4" aria-hidden /> Unggahan belum selesai ({dokumen.length})
      </p>
      <p className="mt-0.5 text-xs text-amber-900/80">Unggahan ini terputus sebelum selesai. Selesaikan atau buang agar tidak menumpuk.</p>
      <ul className="mt-3 space-y-2">
        {dokumen.map((d) => (
          <ItemTertunda key={d.id} dok={d} schoolId={schoolId} />
        ))}
      </ul>
    </section>
  )
}

function ItemTertunda({ dok, schoolId }: { dok: DokumenDoc; schoolId: string }) {
  const svc = useDokumenService()
  const aksi = useAksiDokumen(schoolId)
  const [objekAda, setObjekAda] = useState<boolean | null>(null)
  const [lanjut, setLanjut] = useState<UnggahSiap | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const pending = dok.pending

  useEffect(() => {
    let batal = false
    svc
      .statusTertunda(dok)
      .then((s) => !batal && setObjekAda(s.objekAda))
      .catch(() => !batal && setObjekAda(false))
    return () => {
      batal = true
    }
  }, [svc, dok])

  const segarkan = useCallback(() => void aksi.segarkan(), [aksi])

  if (!pending) return null

  async function selesaikan() {
    try {
      await aksi.selesaikanTertunda.mutateAsync(dok)
      toast.success('Unggahan diselesaikan.')
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  async function buang() {
    try {
      await aksi.buangTertunda.mutateAsync(dok)
      toast.success('Unggahan dibuang.')
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  function pilihBerkas(f: File | undefined) {
    if (!f) return
    const siap = svc.siapkanLanjutkan(dok, f)
    setLanjut(siap)
    void siap.tugas.jalankan()
  }

  return (
    <li className="rounded-lg bg-white p-3 ring-1 ring-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{pending.fileName}</p>
          <p className="text-xs text-slate-500">
            {formatUkuran(pending.size)} · versi {pending.n}
            {objekAda === null ? ' · memeriksa…' : objekAda ? ' · berkas sudah ada di penyimpanan' : ' · berkas belum terunggah'}
          </p>
        </div>
        {!lanjut && (
          <div className="flex flex-wrap gap-1">
            {objekAda ? (
              <Button size="sm" onClick={() => void selesaikan()} loading={aksi.selesaikanTertunda.isPending}>
                Selesaikan
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled={objekAda === null} onClick={() => input.current?.click()}>
                Pilih berkas yang sama
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => void buang()} loading={aksi.buangTertunda.isPending}>
              Buang
            </Button>
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        aria-label={`Pilih ulang berkas ${pending.fileName}`}
        onChange={(e) => {
          pilihBerkas(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {lanjut && (
        <ul className="mt-2">
          <BarisTugas nama={pending.fileName} ukuran={pending.size} tipe={pending.mimeType} tugas={lanjut.tugas} onBerhasil={segarkan} onLepas={() => setLanjut(null)} />
        </ul>
      )}
    </li>
  )
}
