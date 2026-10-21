import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ListChecks } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { PanelGalat } from '@/components/ui/PanelGalat'
import { PageLoader } from '@/components/ui/Spinner'
import { BATAS_TINDAK } from '@/features/tindak-lanjut/api'
import { StatusTindakBadge } from '@/features/tindak-lanjut/components/StatusTindakBadge'
import { TenggatLabel } from '@/features/tindak-lanjut/components/TenggatLabel'
import {
  LABEL_STATUS,
  ringkasTindakLanjut,
  saringTindakLanjut,
  STATUS,
  urutkanTindakLanjut,
  type FilterTindak,
} from '@/features/tindak-lanjut/logic'
import { useTindakLanjutSekolah } from '@/features/tindak-lanjut/queries'
import { cn, hariIniISO } from '@/lib/utils'

function Ringkas({ label, nilai, peringatan }: { label: string; nilai: number; peringatan?: boolean }) {
  return (
    <Card className={cn('p-4', peringatan && nilai > 0 && 'ring-rose-200')}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', peringatan && nilai > 0 ? 'text-rose-700' : 'text-slate-900')}>{nilai}</p>
    </Card>
  )
}

export default function TindakLanjutPage() {
  const q = useTindakLanjutSekolah()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as FilterTindak['status']) || 'aktif'
  const dari = params.get('dari') || undefined
  const sampai = params.get('sampai') || undefined
  const hanyaTerlambat = params.get('terlambat') === '1'
  const hariIni = hariIniISO()

  function set(key: string, value: string) {
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

  const semua = useMemo(() => q.data?.item ?? [], [q.data])
  const ringkas = useMemo(() => ringkasTindakLanjut(semua, hariIni), [semua, hariIni])
  const tampil = useMemo(
    () => urutkanTindakLanjut(saringTindakLanjut(semua, { status, dari, sampai, hanyaTerlambat }, hariIni), hariIni),
    [semua, status, dari, sampai, hanyaTerlambat, hariIni],
  )
  const rentangTerbalik = !!dari && !!sampai && dari > sampai

  return (
    <>
      <PageHeader title="Tindak Lanjut" description="Pantau rencana pendampingan dari seluruh supervisi di sekolah Anda." />

      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <Card><PanelGalat error={q.error} onCoba={() => void q.refetch()} /></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Ringkas label="Masih berjalan" nilai={ringkas.aktif} />
            <Ringkas label="Terlambat" nilai={ringkas.terlambat} peringatan />
            <Ringkas label="Selesai" nilai={ringkas.perStatus.selesai} />
            <Ringkas label="Total" nilai={ringkas.total} />
          </div>
          {q.data.terpotong && (
            <p role="note" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
              Menampilkan {BATAS_TINDAK} tindak lanjut pertama.
            </p>
          )}

          <Card>
            <div className="grid gap-4 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[12rem_10rem_10rem_auto] lg:items-end">
              <Field label="Status">
                {(p) => (
                  <Select {...p} value={status} onChange={(e) => set('status', e.target.value === 'aktif' ? '' : e.target.value)}>
                    <option value="aktif">Masih berjalan</option>
                    <option value="">Semua status</option>
                    {STATUS.map((s) => <option key={s} value={s}>{LABEL_STATUS[s]}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Tenggat dari" error={rentangTerbalik ? 'Tanggal awal setelah tanggal akhir' : undefined}>
                {(p) => <Input {...p} type="date" value={dari ?? ''} onChange={(e) => set('dari', e.target.value)} />}
              </Field>
              <Field label="Tenggat sampai">
                {(p) => <Input {...p} type="date" value={sampai ?? ''} onChange={(e) => set('sampai', e.target.value)} />}
              </Field>
              <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-slate-700">
                <input type="checkbox" className="size-4 accent-brand-600" checked={hanyaTerlambat} onChange={(e) => set('terlambat', e.target.checked ? '1' : '')} />
                Hanya yang terlambat
              </label>
            </div>

            {tampil.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title={semua.length ? 'Tidak ada yang cocok' : 'Belum ada tindak lanjut'}
                description={semua.length ? 'Ubah filter untuk melihat yang lain.' : 'Tindak lanjut dibuat dari halaman detail supervisi.'}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {tampil.map((t) => (
                  <li key={t.id}>
                    <Link to={`/supervisi/${t.supervisiId}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{t.guruNama}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{t.deskripsi}</p>
                        <p className="mt-1 text-xs text-slate-500">Penanggung jawab: {t.penanggungJawab || '—'}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                        <StatusTindakBadge status={t.status} />
                        <span className="text-xs text-slate-600"><TenggatLabel t={t} /></span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
