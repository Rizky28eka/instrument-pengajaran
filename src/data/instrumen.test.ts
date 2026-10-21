import { describe, expect, it } from 'vitest'
import { ASPEK, SEMUA_INDIKATOR, SKOR_MAKS_TOTAL } from './instrumen'

const aspek = (kode: string) => ASPEK.find((a) => a.kode === kode)!

describe('master instrumen', () => {
  it('aspek A: 6 indikator, skor maksimal 24', () => {
    expect(aspek('A').indikator).toHaveLength(6)
    expect(aspek('A').skorMaks).toBe(24)
  })

  it('aspek B: 20 indikator (4 pendahuluan, 11 inti, 5 penutup), skor maksimal 80', () => {
    const b = aspek('B')
    expect(b.kelompok.map((k) => k.indikator.length)).toEqual([4, 11, 5])
    expect(b.indikator).toHaveLength(20)
    expect(b.skorMaks).toBe(80)
  })

  it('aspek C memuat 6 indikator', () => {
    expect(aspek('C').indikator).toHaveLength(6)
  })

  it('id indikator unik dan total skor maksimal konsisten', () => {
    const ids = SEMUA_INDIKATOR.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(SKOR_MAKS_TOTAL).toBe(SEMUA_INDIKATOR.length * 4)
  })
})
