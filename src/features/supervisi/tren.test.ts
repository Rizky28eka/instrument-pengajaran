import { describe, expect, it } from 'vitest'
import { INSTRUMEN_AKTIF } from '@/data/instrumen'
import { hitungTren } from './tren'

const s = (id: string, tanggal: string, nilai: number, versi = INSTRUMEN_AKTIF.versi) =>
  ({
    id,
    identitas: { tanggal },
    ringkasan: { nilai },
    instrumen: { ...INSTRUMEN_AKTIF, versi },
  }) as unknown as Parameters<typeof hitungTren>[0][number]

describe('hitungTren', () => {
  it('mengurutkan kronologis dan menghitung selisih terhadap supervisi sebelumnya', () => {
    const t = hitungTren([s('c', '2026-12-01', 90), s('a', '2026-03-01', 60), s('b', '2026-08-01', 72.5)])
    expect(t.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(t.map((x) => x.selisih)).toEqual([null, 12.5, 17.5])
  })

  it('selisih dikosongkan bila versi instrumen berbeda (tidak sebanding)', () => {
    const t = hitungTren([s('a', '2026-03-01', 60, 'v1'), s('b', '2026-08-01', 80, 'v2'), s('c', '2026-09-01', 85, 'v2')])
    expect(t.map((x) => x.selisih)).toEqual([null, null, 5])
  })

  it('tanggal sama diurutkan stabil menurut id; daftar kosong aman', () => {
    expect(hitungTren([s('b', '2026-01-01', 1), s('a', '2026-01-01', 2)]).map((x) => x.id)).toEqual(['a', 'b'])
    expect(hitungTren([])).toEqual([])
  })

  it('tidak mengubah array asli', () => {
    const a = [s('b', '2026-02-01', 1), s('a', '2026-01-01', 2)]
    hitungTren(a)
    expect(a[0].id).toBe('b')
  })

  it('pembulatan selisih dua desimal tanpa galat floating point', () => {
    expect(hitungTren([s('a', '2026-01-01', 0.1), s('b', '2026-02-01', 0.3)])[1].selisih).toBe(0.2)
  })
})
