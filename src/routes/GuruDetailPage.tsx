import { Link, useParams } from 'react-router'
import { ArrowDown, ArrowUp, ChevronLeft, ClipboardList, Minus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { PredikatBadge } from '@/components/ui/PredikatBadge'
import { PageLoader } from '@/components/ui/Spinner'
import { useGuruList } from '@/features/guru/queries'
import { useSupervisiPerGuru } from '@/features/supervisi/queries'
import { hitungTren } from '@/features/supervisi/tren'
import { cn, formatNilai, formatTanggal } from '@/lib/utils'

export default function GuruDetailPage() {
  const { id = '' } = useParams()
  const daftar = useGuruList()
  const riwayat = useSupervisiPerGuru(id)
  const guru = daftar.data?.find((g) => g.id === id)

  if (daftar.isPending || riwayat.isPending) return <PageLoader />
  if (daftar.isError) return <Card><PanelGalat error={daftar.error} onCoba={() => void daftar.refetch()} /></Card>
  if (!guru)
    return (
      <Card>
        <EmptyState icon={ClipboardList} title="Guru tidak ditemukan" action={<Link to="/guru" className="font-semibold text-brand-700 underline">Kembali ke daftar guru</Link>} />
      </Card>
    )
  if (riwayat.isError) return <Card><PanelGalat error={riwayat.error} onCoba={() => void riwayat.refetch()} /></Card>

  const tren = hitungTren(riwayat.data)
  const terbaru = [...riwayat.data] // sudah terbaru → terlama dari query
  const selisihDari = new Map(tren.map((t) => [t.id, t.selisih]))

  return (
    <>
      <Link to="/guru" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ChevronLeft className="size-4" /> Guru
      </Link>
      <PageHeader title={guru.nama} description={`${guru.mapel || 'Mata pelajaran belum diisi'}${guru.aktif ? '' : ' · nonaktif'}`} />

      <Card>
        <CardHeader title="Riwayat supervisi" description="Nilai dibandingkan dengan supervisi sebelumnya hanya bila memakai versi instrumen yang sama." />
        {terbaru.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Belum pernah disupervisi" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {terbaru.map((s) => {
              const selisih = selisihDari.get(s.id) ?? null
              const Ikon = selisih === null || selisih === 0 ? Minus : selisih > 0 ? ArrowUp : ArrowDown
              return (
                <li key={s.id}>
                  <Link to={`/supervisi/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{formatTanggal(s.identitas.tanggal)}</p>
                      <p className="text-xs text-slate-500">
                        {s.identitas.mataPelajaran} · Kelas {s.identitas.kelas}
                        {s.guruNama !== guru.nama && <> · tercatat sebagai “{s.guruNama}”</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selisih !== null && (
                        <span
                          className={cn('inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums', selisih > 0 ? 'text-emerald-700' : selisih < 0 ? 'text-rose-700' : 'text-slate-500')}
                          title="Selisih dari supervisi sebelumnya"
                        >
                          <Ikon className="size-3.5" aria-hidden />
                          <span className="sr-only">{selisih > 0 ? 'Naik' : selisih < 0 ? 'Turun' : 'Tetap'}</span>
                          {formatNilai(Math.abs(selisih))}
                        </span>
                      )}
                      <span className="font-semibold tabular-nums">{formatNilai(s.ringkasan.nilai)}</span>
                      <PredikatBadge predikat={s.ringkasan.predikat} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
