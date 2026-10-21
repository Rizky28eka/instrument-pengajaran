import { PageHeader } from '@/components/layout/PageHeader'
import { InstrumenNotice } from '@/components/ui/InstrumenNotice'
import { Card, CardHeader } from '@/components/ui/Card'
import { PredikatBadge } from '@/components/ui/PredikatBadge'
import { ASPEK, INSTRUMEN_AKTIF, SEMUA_INDIKATOR, SKALA, SKOR_MAKS_TOTAL } from '@/data/instrumen'
import { BATAS_PREDIKAT } from '@/lib/scoring'

export default function InstrumenPage() {
  return (
    <>
      <PageHeader
        title="Instrumen Supervisi"
        description={`SMP · Kurikulum Merdeka · ${ASPEK.length} aspek, ${SEMUA_INDIKATOR.length} indikator, skor maksimal ${SKOR_MAKS_TOTAL}.`}
      />

      <InstrumenNotice instrumen={INSTRUMEN_AKTIF} className="mb-6" />

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Skala penilaian" description="Berdasarkan pengamatan dan bukti yang relevan." />
          <ul className="divide-y divide-slate-100">
            {SKALA.map((s) => (
              <li key={s.nilai} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="grid size-7 place-items-center rounded-md bg-slate-100 font-bold">{s.nilai}</span>
                {s.label}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Konversi nilai" description="Nilai = total skor ÷ skor maksimal × 100." />
          <ul className="divide-y divide-slate-100">
            {BATAS_PREDIKAT.map((b, idx) => {
              const atas = idx === 0 ? 100 : BATAS_PREDIKAT[idx - 1].min - 1
              return (
                <li key={b.predikat} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="tabular-nums">
                    {b.min} – {atas}
                  </span>
                  <PredikatBadge predikat={b.predikat} />
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="space-y-6">
        {ASPEK.map((a) => (
          <Card key={a.id}>
            <CardHeader
              title={`${a.kode}. ${a.judul}`}
              description={a.deskripsi}
              action={
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {a.indikator.length} indikator · maks {a.skorMaks}
                </span>
              }
            />
            <div className="p-5">
              {a.kelompok.map((k, gi) => (
                <div key={gi} className="mb-4 last:mb-0">
                  {k.judul && <h3 className="mb-2 text-xs font-bold tracking-wider text-brand-700 uppercase">{k.judul}</h3>}
                  <ol className="space-y-2">
                    {k.indikator.map((ind) => (
                      <li key={ind.id} className="flex gap-3 text-sm">
                        <span className="w-7 shrink-0 font-semibold text-slate-400">{ind.id}</span>
                        <span className="text-slate-700">{ind.teks}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
