import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CalendarDays, ClipboardList, FilePlus, TrendingUp, TriangleAlert, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { buttonClass } from '@/components/ui/button-styles'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PredikatBadge } from '@/components/ui/PredikatBadge'
import { PREDIKAT_STYLE } from '@/components/ui/predikat-style'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PageLoader } from '@/components/ui/Spinner'
import { ASPEK } from '@/data/instrumen'
import { useAuth } from '@/features/auth/auth-context'
import { PanelGalat } from '@/components/ui/PanelGalat'
import type { Supervisi } from '@/features/supervisi/api'
import { BATAS_TERBARU } from '@/features/supervisi/api'
import { useSupervisiTerbaru } from '@/features/supervisi/queries'
import { ringkasTindakLanjut } from '@/features/tindak-lanjut/logic'
import { useTindakLanjutSekolah } from '@/features/tindak-lanjut/queries'
import { PREDIKAT, predikatDari } from '@/lib/scoring'
import { cn, formatNilai, formatTanggal, hariIniISO } from '@/lib/utils'

function rataRata(ns: number[]) {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0
}

function hitungStatistik(data: Supervisi[]) {
  const bulanIni = hariIniISO().slice(0, 7)
  return {
    total: data.length,
    // Dihitung dari ID guru (master data), bukan dari nama yang diketik.
    guru: new Set(data.map((d) => d.guruId)).size,
    rata: rataRata(data.map((d) => d.ringkasan.nilai)),
    bulanIni: data.filter((d) => d.identitas.tanggal.startsWith(bulanIni)).length,
    // Aspek dicocokkan lewat id; dokumen dari versi instrumen lain yang tak memuat aspek itu dilewati.
    perAspek: ASPEK.map((a) => ({
      aspek: a,
      nilai: rataRata(data.flatMap((d) => (d.ringkasan.perAspek[a.id] ? [d.ringkasan.perAspek[a.id].nilai] : []))),
    })),
    distribusi: PREDIKAT.map((p) => ({ predikat: p, jumlah: data.filter((d) => d.ringkasan.predikat === p).length })),
    perluPendampingan: data.filter((d) => d.ringkasan.predikat === 'Cukup' || d.ringkasan.predikat === 'Perlu Perbaikan'),
  }
}

function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}

export default function DashboardPage() {
  const { profil } = useAuth()
  const terbaru = useSupervisiTerbaru()
  const data = useMemo(() => terbaru.data?.item ?? [], [terbaru.data])
  const s = useMemo(() => hitungStatistik(data), [data])
  const tindak = useTindakLanjutSekolah()
  const ringkasTindak = useMemo(() => (tindak.data ? ringkasTindakLanjut(tindak.data.item, hariIniISO()) : null), [tindak.data])
  const sapaan = profil?.nama?.split(' ')[0]

  const tombolBaru = (
    <Link to="/supervisi/baru" className={buttonClass()}>
      <FilePlus /> Supervisi Baru
    </Link>
  )

  if (terbaru.isPending) return <PageLoader />
  if (terbaru.isError)
    return (
      <>
        <PageHeader title="Dashboard" description="Ringkasan hasil supervisi akademik guru." />
        <Card>
          <PanelGalat error={terbaru.error} onCoba={() => void terbaru.refetch()} />
        </Card>
      </>
    )

  return (
    <>
      <PageHeader
        title={sapaan ? `Halo, ${sapaan} 👋` : 'Dashboard'}
        description="Ringkasan hasil supervisi akademik guru."
        actions={tombolBaru}
      />

      {terbaru.data?.terpotong && (
        <p role="note" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Statistik dihitung dari {BATAS_TERBARU} supervisi terbaru.
        </p>
      )}
      {data.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Belum ada data supervisi"
            description="Mulai supervisi pertama Anda. Hasilnya akan langsung terekap di dashboard ini."
            action={tombolBaru}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ClipboardList} label="Total supervisi" value={String(s.total)} />
            <StatCard icon={Users} label="Guru disupervisi" value={String(s.guru)} />
            <StatCard
              icon={TrendingUp}
              label="Rata-rata nilai"
              value={formatNilai(Math.round(s.rata * 10) / 10)}
              hint={predikatDari(s.rata)}
            />
            <StatCard icon={CalendarDays} label="Bulan ini" value={String(s.bulanIni)} hint="supervisi dilaksanakan" />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Capaian rata-rata per aspek" description="Persentase skor terhadap skor maksimal." />
              <ul className="space-y-4 p-5">
                {s.perAspek.map(({ aspek, nilai }) => (
                  <li key={aspek.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span className="truncate text-slate-700">
                        <b className="mr-1.5 text-slate-400">{aspek.kode}</b>
                        {aspek.judul}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">{formatNilai(Math.round(nilai * 10) / 10)}%</span>
                    </div>
                    <ProgressBar value={nilai} className="h-2.5" barClassName={PREDIKAT_STYLE[predikatDari(nilai)].bar} />
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Distribusi predikat" />
              <div className="p-5">
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {s.distribusi.map(
                    (d) =>
                      d.jumlah > 0 && (
                        <div
                          key={d.predikat}
                          className={PREDIKAT_STYLE[d.predikat].bar}
                          style={{ width: `${(d.jumlah / s.total) * 100}%` }}
                          title={`${d.predikat}: ${d.jumlah}`}
                        />
                      ),
                  )}
                </div>
                <ul className="mt-5 space-y-3">
                  {s.distribusi.map((d) => (
                    <li key={d.predikat} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span className={cn('size-2.5 rounded-full', PREDIKAT_STYLE[d.predikat].bar)} />
                        {d.predikat}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {d.jumlah}
                        <span className="ml-1.5 font-normal text-slate-400">
                          ({Math.round((d.jumlah / s.total) * 100)}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Supervisi terbaru"
                action={
                  <Link to="/supervisi" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    Lihat semua <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <ul className="divide-y divide-slate-100">
                {data.slice(0, 5).map((d) => (
                  <li key={d.id}>
                    <Link to={`/supervisi/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{d.guruNama}</p>
                        <p className="truncate text-xs text-slate-500">
                          {d.identitas.mataPelajaran} · Kelas {d.identitas.kelas} · {formatTanggal(d.identitas.tanggal)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-semibold tabular-nums">{formatNilai(d.ringkasan.nilai)}</span>
                        <PredikatBadge predikat={d.ringkasan.predikat} className="hidden sm:inline-flex" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Perlu pendampingan" description="Predikat Cukup atau Perlu Perbaikan." />
              {s.perluPendampingan.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Tidak ada guru yang perlu pendampingan khusus. 🎉</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {s.perluPendampingan.slice(0, 6).map((d) => (
                    <li key={d.id}>
                      <Link to={`/supervisi/${d.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                        <TriangleAlert className={cn('size-4 shrink-0', PREDIKAT_STYLE[d.ringkasan.predikat].text)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{d.guruNama}</p>
                          <p className="truncate text-xs text-slate-500">{d.identitas.mataPelajaran}</p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{formatNilai(d.ringkasan.nilai)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Tindak lanjut"
              description="Rencana pendampingan dari hasil supervisi."
              action={
                <Link to="/tindak-lanjut" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                  Kelola <ArrowRight className="size-4" />
                </Link>
              }
            />
            {tindak.isError ? (
              <p role="alert" className="px-5 py-6 text-sm text-slate-500">
                Ringkasan tindak lanjut belum dapat dimuat.{' '}
                <button type="button" className="font-semibold text-brand-700 underline" onClick={() => void tindak.refetch()}>Coba lagi</button>
              </p>
            ) : !ringkasTindak ? (
              <p className="px-5 py-6 text-sm text-slate-500">Memuat…</p>
            ) : ringkasTindak.total === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">Belum ada tindak lanjut. Buat dari halaman detail supervisi.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                {[
                  ['Masih berjalan', ringkasTindak.aktif, false],
                  ['Terlambat', ringkasTindak.terlambat, true],
                  ['Selesai', ringkasTindak.perStatus.selesai, false],
                  ['Total', ringkasTindak.total, false],
                ].map(([label, nilai, peringatan]) => (
                  <div key={String(label)}>
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className={cn('mt-1 text-2xl font-bold tabular-nums', peringatan && Number(nilai) > 0 ? 'text-rose-700' : 'text-slate-900')}>{nilai}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
