import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ClipboardList, Download, FilePlus, Search, Trash2, Undo2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Field'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { PredikatBadge } from '@/components/ui/PredikatBadge'
import { PageLoader } from '@/components/ui/Spinner'
import { pesanError } from '@/features/auth/actions'
import { useProfilAktif } from '@/features/auth/auth-context'
import type { Supervisi } from '@/features/supervisi/api'
import { BATAS_EKSPOR } from '@/features/supervisi/api'
import { downloadCsv } from '@/features/supervisi/csv'
import { useAmbilUntukEkspor, usePulihkanSupervisi, useSupervisiDihapus, useSupervisiHalaman } from '@/features/supervisi/queries'
import { PREDIKAT } from '@/lib/scoring'
import { cn, formatNilai, formatTanggal, hariIniISO } from '@/lib/utils'

function Tabel({ rows, aksi }: { rows: Supervisi[]; aksi?: (d: Supervisi) => React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Guru</th>
            <th className="hidden px-4 py-3 md:table-cell">Kelas</th>
            <th className="hidden px-4 py-3 lg:table-cell">Supervisor</th>
            <th className="hidden px-4 py-3 sm:table-cell">Tanggal</th>
            <th className="px-4 py-3 text-right">Nilai</th>
            <th className="hidden px-4 py-3 sm:table-cell">Predikat</th>
            {aksi && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((d) => (
            <tr
              key={d.id}
              onClick={() => navigate(`/supervisi/${d.id}`)}
              className={cn('cursor-pointer transition-colors hover:bg-slate-50', d.deletedAt && 'text-slate-500')}
            >
              <td className="px-4 py-3">
                <Link to={`/supervisi/${d.id}`} className="font-medium text-slate-900 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
                  {d.guruNama}
                </Link>
                <p className="text-xs text-slate-500">{d.identitas.mataPelajaran}</p>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">{d.identitas.kelas}</td>
              <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{d.identitas.namaSupervisor}</td>
              <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 sm:table-cell">{formatTanggal(d.identitas.tanggal)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNilai(d.ringkasan.nilai)}</td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <PredikatBadge predikat={d.ringkasan.predikat} />
              </td>
              {aksi && <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>{aksi(d)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SupervisiListPage() {
  const { role } = useProfilAktif()
  const admin = role === 'admin'
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const predikat = params.get('predikat') ?? ''
  const [sampah, setSampah] = useState(false)

  const halaman = useSupervisiHalaman()
  const dihapus = useSupervisiDihapus(sampah)
  const ekspor = useAmbilUntukEkspor()
  const pulihkan = usePulihkanSupervisi()

  function setParam(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const data = useMemo(() => halaman.data?.pages.flatMap((p) => p.item) ?? [], [halaman.data])
  const rows = useMemo(() => {
    const kata = q.trim().toLowerCase()
    return data.filter((d) => {
      if (predikat && d.ringkasan.predikat !== predikat) return false
      if (!kata) return true
      const i = d.identitas
      return [d.guruNama, i.mataPelajaran, i.kelas, i.namaSupervisor].some((v) => v.toLowerCase().includes(kata))
    })
  }, [data, q, predikat])

  async function eksporSemua() {
    try {
      const { item, terpotong } = await ekspor.mutateAsync()
      downloadCsv(`supervisi-${hariIniISO()}.csv`, item)
      if (terpotong) toast.info(`Ekspor dibatasi ${BATAS_EKSPOR} supervisi terbaru.`)
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  async function pulihkanItem(d: Supervisi) {
    try {
      await pulihkan.mutateAsync(d)
      toast.success('Data dipulihkan.')
    } catch (e) {
      toast.error(pesanError(e))
    }
  }

  const adaLagi = halaman.hasNextPage

  return (
    <>
      <PageHeader
        title="Data Supervisi"
        description="Seluruh hasil supervisi akademik di sekolah Anda."
        actions={
          <>
            <Button variant="secondary" loading={ekspor.isPending} onClick={eksporSemua}>
              <Download /> Ekspor CSV
            </Button>
            <Link to="/supervisi/baru" className={buttonClass()}>
              <FilePlus /> Supervisi Baru
            </Link>
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Cari guru, mapel, kelas, supervisor…"
              className="pl-9"
              aria-label="Cari"
            />
          </div>
          <Select value={predikat} onChange={(e) => setParam('predikat', e.target.value)} className="sm:w-52" aria-label="Filter predikat">
            <option value="">Semua predikat</option>
            {PREDIKAT.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </div>

        {halaman.isPending ? (
          <PageLoader />
        ) : halaman.isError ? (
          <PanelGalat error={halaman.error} onCoba={() => void halaman.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={data.length ? 'Tidak ada hasil' : 'Belum ada data supervisi'}
            description={
              data.length
                ? adaLagi
                  ? 'Tidak ada yang cocok pada data yang sudah dimuat. Muat lebih banyak untuk mencari lebih jauh.'
                  : 'Coba ubah kata kunci atau filter.'
                : 'Data akan muncul setelah supervisi pertama disimpan.'
            }
          />
        ) : (
          <Tabel rows={rows} />
        )}

        {halaman.data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>
              Menampilkan {rows.length} dari {data.length} yang dimuat{adaLagi ? ' (masih ada data lainnya)' : ''}
            </span>
            {adaLagi && (
              <Button size="sm" variant="secondary" loading={halaman.isFetchingNextPage} onClick={() => void halaman.fetchNextPage()}>
                Muat lebih banyak
              </Button>
            )}
          </div>
        )}
        {halaman.isFetchNextPageError && <PanelGalat error={halaman.error} onCoba={() => void halaman.fetchNextPage()} className="py-6" />}
      </Card>

      {admin && (
        <section className="mt-8">
          <button
            type="button"
            aria-expanded={sampah}
            onClick={() => setSampah((s) => !s)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <Trash2 className="size-4" /> {sampah ? 'Sembunyikan' : 'Tampilkan'} data yang dihapus
          </button>
          {sampah && (
            <Card className="mt-3">
              {dihapus.isPending ? (
                <PageLoader />
              ) : dihapus.isError ? (
                <PanelGalat error={dihapus.error} onCoba={() => void dihapus.refetch()} />
              ) : dihapus.data.length === 0 ? (
                <EmptyState icon={Trash2} title="Tidak ada data terhapus" />
              ) : (
                <Tabel
                  rows={dihapus.data}
                  aksi={(d) => (
                    <Button size="sm" variant="secondary" loading={pulihkan.isPending && pulihkan.variables?.id === d.id} onClick={() => void pulihkanItem(d)}>
                      <Undo2 /> Pulihkan
                    </Button>
                  )}
                />
              )}
            </Card>
          )}
        </section>
      )}
    </>
  )
}
