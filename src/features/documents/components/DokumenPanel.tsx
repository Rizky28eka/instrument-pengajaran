import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { useProfilAktif } from '@/features/auth/auth-context'
import { useSekolah } from '@/features/sekolah/queries'
import type { KategoriId } from '../config'
import { filterDokumen, tertundaMilik, type RelasiDokumen } from '../daftar'
import { useAksiDokumen, useDokumenSekolah } from '../queries'
import { DaftarDokumen } from './DaftarDokumen'
import { DetailDokumenDialog } from './DetailDokumenDialog'
import { PratinjauDialog } from './PratinjauDialog'
import { TertundaDaftar } from './TertundaDaftar'
import { UnggahBerkas } from './UnggahBerkas'

interface Props {
  schoolId: string
  /** Entitas induk: dokumen dilampirkan dan difilter berdasarkan ID ini. */
  relasi: RelasiDokumen
  kategori: KategoriId[]
  judul: string
  deskripsi?: string
  bolehUnggah?: boolean
}

/** Panel dokumen yang ditanam di halaman detail supervisi / tindak lanjut. */
export function DokumenPanel({ schoolId, relasi, kategori, judul, deskripsi, bolehUnggah = true }: Props) {
  const profil = useProfilAktif()
  const { data: sekolah } = useSekolah()
  const { data = [], isPending, isError } = useDokumenSekolah(schoolId)
  const aksi = useAksiDokumen(schoolId)
  const [detail, setDetail] = useState<string | null>(null)
  const [pratinjau, setPratinjau] = useState<{ dokId: string; versi: number } | null>(null)

  const filter = { supervisiId: relasi.supervisiId ?? undefined, tindakId: relasi.tindakId ?? undefined, guruId: relasi.guruId ?? undefined }
  const terkait = filterDokumen(data, filter)
  const tersedia = terkait.filter((d) => d.status === 'tersedia')
  const tertunda = tertundaMilik(terkait, profil.uid)
  // "Pengajuan dokumen guru" hanya tersedia bila sekolah mengaktifkan fiturnya.
  const kategoriBoleh = kategori.filter((k) => k !== 'pengajuan-guru' || sekolah?.pengirimanDokumenGuru)
  const dokPratinjau = pratinjau ? data.find((d) => d.id === pratinjau.dokId) : undefined

  return (
    <>
      <Card className="print:hidden">
        <CardHeader title={judul} description={deskripsi} />
        <div className="space-y-4 p-5">
          {bolehUnggah && kategoriBoleh.length > 0 && (
            <UnggahBerkas schoolId={schoolId} kategori={kategoriBoleh} relasi={relasi} daftarAda={terkait} onSelesai={() => void aksi.segarkan()} />
          )}
          <TertundaDaftar dokumen={tertunda} schoolId={schoolId} />
          {isPending ? (
            <PageLoader />
          ) : isError ? (
            <p role="alert" className="text-sm text-rose-700">
              Gagal memuat dokumen. Periksa koneksi atau izin akses.
            </p>
          ) : tersedia.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <FolderOpen className="size-4" aria-hidden /> Belum ada dokumen terlampir.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
              <DaftarDokumen kompak dokumen={tersedia} onDetail={(d) => setDetail(d.id)} onPratinjau={(d) => setPratinjau({ dokId: d.id, versi: d.currentVersion })} />
            </div>
          )}
        </div>
      </Card>

      {detail && (
        <DetailDokumenDialog
          dokId={detail}
          schoolId={schoolId}
          onTutup={() => setDetail(null)}
          onPratinjau={(d, versi) => setPratinjau({ dokId: d.id, versi })}
        />
      )}
      {pratinjau && dokPratinjau && <PratinjauDialog dok={dokPratinjau} versi={pratinjau.versi} onTutup={() => setPratinjau(null)} />}
    </>
  )
}
