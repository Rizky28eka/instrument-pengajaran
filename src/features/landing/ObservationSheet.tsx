import { useId, useState } from 'react'
import { SEMUA_INDIKATOR, SKALA, SKOR_MAKS_INDIKATOR } from '@/data/instrumen'
import { predikatDari } from '@/lib/scoring'
import { cn, formatNilai } from '@/lib/utils'

/** Tiga indikator nyata dari aspek Pelaksanaan Pembelajaran (pendahuluan, inti, penutup). */
const ID_CONTOH = ['B4', 'B8', 'B18']
const INDIKATOR = ID_CONTOH.map((id) => SEMUA_INDIKATOR.find((i) => i.id === id)).filter(
  (i): i is NonNullable<typeof i> => !!i,
)
const AWAL: Record<string, number> = { B4: 3, B8: 3, B18: 4 }

const LABEL_SKOR = Object.fromEntries(SKALA.map((s) => [s.nilai, s.label])) as Record<number, string>

function Bubble({
  nilai,
  checked,
  focusable,
  onSelect,
  nama,
}: {
  nilai: number
  checked: boolean
  focusable: boolean
  onSelect: () => void
  nama: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={`${nama}: skor ${nilai}, ${LABEL_SKOR[nilai]}`}
      tabIndex={focusable ? 0 : -1}
      onClick={onSelect}
      className={cn(
        'grid size-9 place-items-center rounded-full border-[1.5px] text-sm font-semibold transition-colors',
        checked
          ? 'border-ink bg-ink text-white'
          : 'border-ink/55 bg-white/60 text-ink/70 hover:border-ink hover:bg-white hover:text-ink',
      )}
    >
      {nilai}
    </button>
  )
}

function BarisIndikator({
  id,
  teks,
  nilai,
  onChange,
}: {
  id: string
  teks: string
  nilai: number
  onChange: (v: number) => void
}) {
  const labelId = useId()
  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <p id={labelId} className="text-[15px] leading-snug text-ink">
        <span className="mr-2 font-semibold text-ink/65">{id}</span>
        {teks}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex gap-2"
        onKeyDown={(e) => {
          const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
          if (!step) return
          e.preventDefault()
          const next = Math.min(4, Math.max(1, nilai + step))
          onChange(next)
          // Pindahkan fokus ke bulatan yang baru terpilih.
          const radios = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]')
          radios[next - 1]?.focus()
        }}
      >
        {[1, 2, 3, 4].map((n) => (
          <Bubble key={n} nilai={n} checked={nilai === n} focusable={nilai === n} onSelect={() => onChange(n)} nama={id} />
        ))}
      </div>
    </li>
  )
}

/** Lembar observasi contoh: pengunjung dapat mengubah skor dan melihat nilai berubah. */
export function ObservationSheet() {
  const [skor, setSkor] = useState(AWAL)
  const total = INDIKATOR.reduce((s, i) => s + (skor[i.id] ?? 0), 0)
  const maks = INDIKATOR.length * SKOR_MAKS_INDIKATOR
  const nilai = Math.round((total / maks) * 10000) / 100
  const predikat = predikatDari(nilai)

  return (
    <figure className="m-0">
      <div className="relative overflow-hidden rounded-md bg-white shadow-[0_1px_0_rgba(18,35,63,0.06),0_24px_48px_-24px_rgba(18,35,63,0.28)] ring-1 ring-ink/10">
        {/* garis margin merah + lubang binder */}
        <div aria-hidden className="absolute inset-y-0 left-10 w-px bg-margin/45 sm:left-14" />
        <div aria-hidden className="absolute top-8 left-3 size-3.5 rounded-full bg-brand-700 shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] sm:left-4" />
        <div aria-hidden className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 rounded-full bg-brand-700 shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] sm:left-4" />
        <div aria-hidden className="absolute bottom-8 left-3 size-3.5 rounded-full bg-brand-700 shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] sm:left-4" />

        <div className="py-6 pr-5 pl-14 sm:py-7 sm:pr-7 sm:pl-20">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink/15 pb-4">
            <p className="font-display text-lg font-bold text-ink">Lembar observasi kelas</p>
            <p className="font-hand text-[17px] leading-none text-brand-700" aria-label="Contoh pengisian">
              IPA, kelas VIII B
            </p>
          </div>

          <div className="mt-3 hidden justify-end gap-2 text-[11px] text-ink/70 sm:flex" aria-hidden>
            <span className="w-[2.25rem] text-center">kurang</span>
            <span className="w-[2.25rem]" />
            <span className="w-[2.25rem]" />
            <span className="w-[2.25rem] text-center">baik sekali</span>
          </div>

          <ul className="divide-y divide-ink/10">
            {INDIKATOR.map((i) => (
              <BarisIndikator
                key={i.id}
                id={i.id}
                teks={i.teks}
                nilai={skor[i.id] ?? 0}
                onChange={(v) => setSkor((s) => ({ ...s, [i.id]: v }))}
              />
            ))}
          </ul>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink pt-5" aria-live="polite">
            <div>
              <p className="text-sm text-ink/70">Nilai</p>
              <p className="font-display text-5xl leading-none font-extrabold tracking-tight text-ink tabular-nums">
                <span className="bg-[linear-gradient(transparent_58%,var(--color-marker)_58%,var(--color-marker)_92%,transparent_92%)] px-1">
                  {formatNilai(nilai)}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-ink/70 tabular-nums">
                Skor {total} dari {maks}
              </p>
            </div>
            <p
              className="-rotate-3 rounded-[52%_48%_55%_45%/58%_47%_53%_42%] border-2 border-margin px-6 py-2 font-hand text-3xl leading-tight font-bold text-margin motion-safe:animate-stamp"
              key={predikat}
            >
              {predikat}
            </p>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 max-w-md text-sm text-ink/70">
        Coba klik bulatannya. Ini 3 dari {SEMUA_INDIKATOR.length} indikator di instrumen; skor di sini tidak disimpan.
      </figcaption>
    </figure>
  )
}
