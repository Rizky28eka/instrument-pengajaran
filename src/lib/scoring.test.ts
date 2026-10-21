import { describe, expect, it } from 'vitest'
import { SEMUA_INDIKATOR, SKOR_MAKS_TOTAL } from '@/data/instrumen'
import { hitungRingkasan, predikatDari } from './scoring'

const semua = (n: number) => Object.fromEntries(SEMUA_INDIKATOR.map((i) => [i.id, n]))

describe('predikatDari', () => {
  it.each([
    [100, 'Sangat Baik'],
    [86, 'Sangat Baik'],
    [85.99, 'Baik'],
    [71, 'Baik'],
    [70.99, 'Cukup'],
    [56, 'Cukup'],
    [55.99, 'Perlu Perbaikan'],
    [0, 'Perlu Perbaikan'],
  ])('nilai %s → %s', (nilai, predikat) => {
    expect(predikatDari(nilai)).toBe(predikat)
  })
})

describe('hitungRingkasan', () => {
  it('semua skor 4 → nilai 100, Sangat Baik', () => {
    const r = hitungRingkasan(semua(4))
    expect(r.total).toBe(SKOR_MAKS_TOTAL)
    expect(r.nilai).toBe(100)
    expect(r.predikat).toBe('Sangat Baik')
    expect(r.terisi).toBe(r.jumlah)
  })

  it('semua skor 1 → nilai 25, Perlu Perbaikan', () => {
    const r = hitungRingkasan(semua(1))
    expect(r.nilai).toBe(25)
    expect(r.predikat).toBe('Perlu Perbaikan')
  })

  it('belum diisi sama sekali → nol, terisi 0', () => {
    const r = hitungRingkasan({})
    expect(r.total).toBe(0)
    expect(r.terisi).toBe(0)
  })

  it('menghitung per aspek', () => {
    const r = hitungRingkasan({ A1: 4, A2: 3, A3: 2, A4: 1, A5: 4, A6: 4 })
    expect(r.perAspek.A).toMatchObject({ total: 18, maks: 24, nilai: 75, terisi: 6 })
    expect(r.perAspek.B.terisi).toBe(0)
  })
})
