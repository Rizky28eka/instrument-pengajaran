import { useRef } from 'react'
import { SKALA } from '@/data/instrumen'
import { cn } from '@/lib/utils'

const ACTIVE: Record<number, string> = {
  4: 'bg-emerald-600 text-white ring-emerald-600',
  3: 'bg-sky-600 text-white ring-sky-600',
  2: 'bg-amber-500 text-white ring-amber-500',
  1: 'bg-rose-600 text-white ring-rose-600',
}

interface Props {
  value: number | undefined
  onChange: (v: number) => void
  onBlur?: () => void
  invalid?: boolean
  /** Nama grup untuk pembaca layar; dipakai bila tidak ada elemen label (`labelledBy`). */
  label: string
  /** ID elemen yang memuat teks indikator, agar grup dibacakan bersama teksnya. */
  labelledBy?: string
}

/** Skala 1–4 sebagai radio group bersegmen, dapat dioperasikan dengan keyboard. */
export function ScoreInput({ value, onChange, onBlur, invalid, label, labelledBy }: Props) {
  const urut = [...SKALA].reverse()
  const grup = useRef<HTMLDivElement>(null)

  function pilih(nilai: number) {
    onChange(nilai)
    // Fokus mengikuti pilihan (pola radio group WAI-ARIA), sehingga panah berikutnya bekerja dari bulatan baru.
    grup.current?.querySelectorAll<HTMLButtonElement>('[role=radio]')[nilai - 1]?.focus()
  }

  return (
    <div
      ref={grup}
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-invalid={invalid}
      onBlur={onBlur}
      className={cn('inline-flex rounded-lg p-0.5 ring-1 ring-inset', invalid ? 'ring-rose-300 bg-rose-50' : 'ring-slate-200 bg-slate-50')}
      onKeyDown={(e) => {
        const cur = value ?? 0
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') pilih(Math.min(4, cur + 1))
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') pilih(Math.max(1, cur - 1))
        else if (['1', '2', '3', '4'].includes(e.key)) pilih(Number(e.key))
        else return
        e.preventDefault()
      }}
    >
      {urut.map((s) => {
        const checked = value === s.nilai
        return (
          <button
            key={s.nilai}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${s.nilai} — ${s.label}`}
            title={`${s.nilai} — ${s.label}`}
            tabIndex={checked || (value == null && s.nilai === 1) ? 0 : -1}
            onClick={() => pilih(s.nilai)}
            className={cn(
              'size-9 rounded-md text-sm font-bold transition-all sm:size-10',
              checked ? cn('shadow-sm ring-1', ACTIVE[s.nilai]) : 'text-slate-500 hover:bg-white hover:text-slate-900',
            )}
          >
            {s.nilai}
          </button>
        )
      })}
    </div>
  )
}
