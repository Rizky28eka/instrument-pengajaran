import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, Download, FileQuestion, Pencil, Printer, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/button-styles'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { EmptyState } from '@/components/ui/EmptyState'
import { InstrumenNotice } from '@/components/ui/InstrumenNotice'
import { PageLoader } from '@/components/ui/Spinner'
import { SKALA } from '@/data/instrumen'
import { pesanError } from '@/features/auth/actions'
import { useProfilAktif } from '@/features/auth/auth-context'
import { RiwayatPanel } from '@/features/supervisi/components/RiwayatPanel'
import { NilaiAkhir, TabelRingkasan } from '@/features/supervisi/components/RingkasanSkor'
import { downloadCsv } from '@/features/supervisi/csv'
import { useHapusSupervisi, usePulihkanSupervisi, useSupervisi } from '@/features/supervisi/queries'
import { cn, formatTanggal } from '@/lib/utils'

const LABEL_SKOR = Object.fromEntries(SKALA.map((s) => [s.nilai, s.label])) as Record<number, string>
const WARNA_SKOR: Record<number, string> = {
  4: 'bg-emerald-50 text-emerald-700',
  3: 'bg-sky-50 text-sky-700',
  2: 'bg-amber-50 text-amber-800',
  1: 'bg-rose-50 text-rose-700',
}

export default function SupervisiDetailPage() {
  const { id = '' } = useParams()
  const profil = useProfilAktif()
  const navigate = useNavigate()
  const { data, isPending, isError, error, refetch } = useSupervisi(id)
  const hapus = useHapusSupervisi()
  const pulihkan = usePulihkanSupervisi()
  const [konfirmasi, setKonfirmasi] = useState(false)

  if (isPending) return <PageLoader />
  if (isError) return <Card><PanelGalat error={error} onCoba={() => void refetch()} /></Card>
  if (!data)
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Data supervisi tidak ditemukan"
          description="Data mungkin sudah dihapus."
          action={<Link to="/supervisi" className={buttonClass({ variant: 'secondary' })}>Kembali ke daftar</Link>}
        />
      </Card>
    )

  const { identitas: i, ringkasan, catatan } = data
  const admin = profil.role === 'admin'
  const boleh = data.createdBy === profil.uid || admin
  const terhapus = !!data.deletedAt

  async function onHapus() {
    try {
      await hapus.mutateAsync(data!)
      toast.success('Data supervisi dihapus. Admin sekolah dapat memulihkannya.')
      navigate('/supervisi', { replace: true })
    } catch (e) {
      toast.error(pesanError(e))
      setKonfirmasi(false)
    }
  }

  async function onPulihkan() {
    try {
      await pulihkan.mutateAsync(data!)
      toast.success('Data dipulihkan.')
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  const identitasRows: [string, string][] = [
    ['Nama sekolah', i.namaSekolah],
    ['Nama guru', i.namaGuru],
    ['Mata pelajaran', i.mataPelajaran],
    ['Kelas', i.kelas],
    ['Supervisor', i.namaSupervisor],
    ['Tanggal', formatTanggal(i.tanggal)],
    ['Kurikulum', i.kurikulum === 'Lainnya' ? (i.kurikulumLainnya ?? 'Lainnya') : i.kurikulum],
    ['Model pembelajaran', i.modelPembelajaran],
    ['Instrumen', `${data.instrumen.nama}, versi ${data.instrumen.versi}`],
  ]

  return (
    <>
      <Link to="/supervisi" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 print:hidden">
        <ChevronLeft className="size-4" /> Data Supervisi
      </Link>

      <p className="hidden text-center text-sm font-bold tracking-wide uppercase print:block">
        Instrumen Supervisi Akademik Guru
      </p>

      <PageHeader
        title={data.guruNama}
        description={`${i.mataPelajaran} · Kelas ${i.kelas} · ${formatTanggal(i.tanggal)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => downloadCsv(`supervisi-${i.namaGuru}-${i.tanggal}.csv`, [data])}>
              <Download /> CSV
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer /> Cetak
            </Button>
            {terhapus && admin && (
              <Button variant="secondary" onClick={onPulihkan} loading={pulihkan.isPending}>
                <Undo2 /> Pulihkan
              </Button>
            )}
            {!terhapus && boleh && (
              <>
                <Link to={`/supervisi/${id}/edit`} className={buttonClass({ variant: 'secondary' })}>
                  <Pencil /> Ubah
                </Link>
                <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setKonfirmasi(true)}>
                  <Trash2 /> Hapus
                </Button>
              </>
            )}
          </>
        }
      />

      <ConfirmDialog
        open={konfirmasi}
        judul="Hapus data supervisi ini?"
        labelYa="Hapus"
        varian="danger"
        memproses={hapus.isPending}
        onYa={() => void onHapus()}
        onBatal={() => setKonfirmasi(false)}
      >
        <p>
          Supervisi <b>{data.guruNama}</b> tanggal {formatTanggal(i.tanggal)} akan disembunyikan dari daftar. Admin sekolah masih dapat
          memulihkannya.
        </p>
      </ConfirmDialog>

      <div className="space-y-6">
        {terhapus && (
          <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 print:hidden">
            Data ini telah dihapus{data.deletedAt ? ` pada ${formatTanggal(data.deletedAt.toISOString().slice(0, 10))}` : ''} dan hanya terlihat oleh admin sekolah.
          </p>
        )}
        {!data.snapshotSah && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
            Data instrumen pada dokumen ini rusak, sehingga nilai dihitung ulang dengan instrumen standar dan mungkin tidak sesuai
            aslinya. Hubungi admin sekolah.
          </p>
        )}
        <InstrumenNotice instrumen={data.instrumen} />
        <div className="grid gap-6 lg:grid-cols-3 print:grid-cols-3">
          <Card className="lg:col-span-2 print:col-span-2">
            <CardHeader title="Identitas" />
            <dl className="grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
              {identitasRows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="flex flex-col justify-center p-5">
            <p className="mb-2 text-sm font-medium text-slate-500">Nilai akhir</p>
            <NilaiAkhir ringkasan={ringkasan} />
          </Card>
        </div>

        <Card>
          <CardHeader title="Rekapitulasi skor" />
          <div className="p-5">
            <TabelRingkasan ringkasan={ringkasan} instrumen={data.instrumen} />
          </div>
        </Card>

        {data.instrumen.aspek.map((a) => (
          <Card key={a.id} className="break-inside-avoid-page">
            <CardHeader
              title={`${a.kode}. ${a.judul}`}
              action={
                <span className="text-sm font-semibold text-slate-600 tabular-nums">
                  {ringkasan.perAspek[a.id].total} / {a.skorMaks}
                </span>
              }
            />
            <div className="p-5">
              {a.kelompok.map((k, gi) => (
                <div key={gi} className="mb-4 last:mb-0">
                  {k.judul && <h3 className="mb-2 text-xs font-bold tracking-wider text-brand-700 uppercase">{k.judul}</h3>}
                  <ul className="divide-y divide-slate-100">
                    {k.indikator.map((ind) => {
                      const v = data.skor[ind.id]
                      return (
                        <li key={ind.id} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                          <span className="flex gap-3">
                            <span className="w-7 shrink-0 font-semibold text-slate-400">{ind.id}</span>
                            <span className="text-slate-700">{ind.teks}</span>
                          </span>
                          <span
                            className={cn('shrink-0 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap', v ? WARNA_SKOR[v] : 'bg-slate-100 text-slate-400')}
                            title={v ? LABEL_SKOR[v] : 'Belum dinilai'}
                          >
                            {v ?? '–'}
                            <span className="ml-1 hidden font-medium sm:inline print:inline">{v ? LABEL_SKOR[v] : ''}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              {data.catatanAspek[a.id] && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-700">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Catatan</span>
                  {data.catatanAspek[a.id]}
                </p>
              )}
            </div>
          </Card>
        ))}

        <Card className="break-inside-avoid-page">
          <CardHeader title="Catatan & tindak lanjut" />
          <dl className="grid gap-5 p-5 text-sm md:grid-cols-3 print:grid-cols-1">
            {(
              [
                ['Kekuatan', catatan.kekuatan],
                ['Area perbaikan', catatan.perbaikan],
                ['Rekomendasi tindak lanjut', catatan.rekomendasi],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="mb-1 text-xs font-semibold text-slate-500">{k}</dt>
                <dd className="whitespace-pre-line text-slate-800">{v || <span className="text-slate-400">—</span>}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <RiwayatPanel id={id} />

        <div className="hidden grid-cols-2 gap-8 pt-8 text-center text-sm print:grid">
          {[
            ['Guru yang disupervisi', i.namaGuru],
            ['Supervisor', i.namaSupervisor],
          ].map(([peran, nama]) => (
            <div key={peran}>
              <p>{peran}</p>
              <div className="h-20" />
              <p className="font-semibold underline">{nama}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
