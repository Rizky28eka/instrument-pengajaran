import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ClipboardList, Download, FilePlus, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Field'
import { PredikatBadge } from '@/components/ui/PredikatBadge'
import { PageLoader } from '@/components/ui/Spinner'
import { downloadCsv } from '@/features/supervisi/csv'
import { useSupervisiList } from '@/features/supervisi/queries'
import { PREDIKAT } from '@/lib/scoring'
import { formatNilai, formatTanggal, hariIniISO } from '@/lib/utils'

export default function SupervisiListPage() {
  const { data = [], isPending, isError, refetch } = useSupervisiList()
  const navigate = useNavigate()
  // Filter disimpan di URL agar bisa dibagikan / tetap saat tombol kembali.
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const predikat = params.get('predikat') ?? ''

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

  const rows = useMemo(() => {
    const kata = q.trim().toLowerCase()
    return data.filter((d) => {
      if (predikat && d.ringkasan.predikat !== predikat) return false
      if (!kata) return true
      const i = d.identitas
      return [i.namaGuru, i.mataPelajaran, i.kelas, i.namaSupervisor, i.namaSekolah].some((v) => v.toLowerCase().includes(kata))
    })
  }, [data, q, predikat])

  return (
    <>
      <PageHeader
        title="Data Supervisi"
        description="Seluruh hasil supervisi akademik yang tersimpan."
        actions={
          <>
            <Button variant="secondary" disabled={!rows.length} onClick={() => downloadCsv(`supervisi-${hariIniISO()}.csv`, rows)}>
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

        {isPending ? (
          <PageLoader />
        ) : isError ? (
          <EmptyState
            icon={ClipboardList}
            title="Gagal memuat data"
            description="Periksa koneksi internet atau izin akses Firestore."
            action={<Button variant="secondary" onClick={() => refetch()}>Coba lagi</Button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={data.length ? 'Tidak ada hasil' : 'Belum ada data supervisi'}
            description={data.length ? 'Coba ubah kata kunci atau filter.' : 'Data akan muncul setelah supervisi pertama disimpan.'}
          />
        ) : (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/supervisi/${d.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link to={`/supervisi/${d.id}`} className="font-medium text-slate-900 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
                        {d.identitas.namaGuru}
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
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              Menampilkan {rows.length} dari {data.length} supervisi
            </p>
          </div>
        )}
      </Card>
    </>
  )
}
