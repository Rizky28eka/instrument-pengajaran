import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { pesanError } from '@/features/auth/actions'
import { bisaDipratinjau, formatUkuran } from '../format'
import type { DokumenDoc } from '../model'
import { useDokumenService } from '../queries'
import { simpanBlob } from '../simpan-lokal'

type Hasil = { url: string; blob: Blob; nama: string } | { galat: string } | null

/**
 * Pratinjau PDF/gambar dari Blob hasil unduhan terautentikasi (bukan URL publik). URL objek hanya
 * hidup selama dialog terbuka lalu dilepas. Tipe lain tidak pernah dirender.
 */
export function PratinjauDialog({ dok, versi, onTutup }: { dok: DokumenDoc; versi: number; onTutup: () => void }) {
  const svc = useDokumenService()
  const [hasil, setHasil] = useState<Hasil>(null)
  const v = dok.versions.find((x) => x.n === versi)

  useEffect(() => {
    let batal = false
    let url: string | null = null
    svc
      .unduh(dok, versi)
      .then(({ blob, nama }) => {
        if (batal) return
        url = URL.createObjectURL(blob)
        setHasil({ url, blob, nama })
      })
      .catch((e) => {
        if (!batal) setHasil({ galat: pesanError(e) })
      })
    return () => {
      batal = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [svc, dok, versi])

  return (
    <Dialog judul={v?.fileName ?? dok.judul} deskripsi={v ? `Versi ${v.n} · ${formatUkuran(v.size)}` : undefined} onTutup={onTutup} lebar="xl">
      {!hasil ? (
        <div className="grid min-h-64 place-items-center">
          <Spinner />
        </div>
      ) : 'galat' in hasil ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {hasil.galat}
        </p>
      ) : (
        <div className="space-y-3">
          {bisaDipratinjau(hasil.blob.type) ? (
            hasil.blob.type === 'application/pdf' ? (
              <iframe src={hasil.url} title={`Pratinjau ${hasil.nama}`} className="h-[70svh] w-full rounded-lg ring-1 ring-slate-200" />
            ) : (
              <img src={hasil.url} alt={`Pratinjau ${hasil.nama}`} className="mx-auto max-h-[70svh] max-w-full rounded-lg ring-1 ring-slate-200" />
            )
          ) : (
            <p className="text-sm text-slate-600">Jenis berkas ini tidak ditampilkan di aplikasi. Unduh untuk membukanya.</p>
          )}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => simpanBlob(hasil.blob, hasil.nama)}>
              <Download /> Unduh
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
