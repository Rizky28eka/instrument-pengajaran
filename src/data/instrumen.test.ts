import { describe, expect, it } from 'vitest'
import {
  ambilSnapshot,
  ASPEK,
  hidrasiInstrumen,
  INSTRUMEN_AKTIF,
  INSTRUMEN_LEGACY,
  INSTRUMEN_TERDAFTAR,
  SEMUA_INDIKATOR,
  SKOR_MAKS_TOTAL,
} from './instrumen'

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

describe('versioning instrumen', () => {
  it('instrumen aktif terdaftar dengan versi yang sama', () => {
    expect(INSTRUMEN_TERDAFTAR[INSTRUMEN_AKTIF.versi]).toBe(INSTRUMEN_AKTIF)
  })

  it('instrumen v1 ditandai provisional dan tidak diklaim resmi', () => {
    expect(INSTRUMEN_AKTIF.status).toBe('provisional')
  })

  it('dokumen legacy memakai isi yang sama dengan v1', () => {
    expect(INSTRUMEN_LEGACY.aspek).toEqual(INSTRUMEN_TERDAFTAR['1-provisional'].aspek)
  })

  it('snapshot → hidrasi menghasilkan instrumen yang setara', () => {
    const lagi = hidrasiInstrumen(JSON.parse(JSON.stringify(ambilSnapshot(INSTRUMEN_AKTIF))))
    expect(lagi).toEqual(INSTRUMEN_AKTIF)
  })

  it('snapshot hanya memuat field yang boleh disimpan (tanpa field turunan)', () => {
    const s = ambilSnapshot(INSTRUMEN_AKTIF)
    expect(Object.keys(s).sort()).toEqual(['ambang', 'aspek', 'nama', 'status', 'versi'])
    expect(Object.keys(s.aspek[0]).sort()).toEqual(['deskripsi', 'id', 'judul', 'kelompok', 'kode'])
  })

  it('ambang pada snapshot terurut menurun setelah hidrasi', () => {
    const s = ambilSnapshot(INSTRUMEN_AKTIF)
    s.ambang.reverse()
    const mins = hidrasiInstrumen(s).ambang.map((a) => a.min)
    expect(mins).toEqual([...mins].sort((a, b) => b - a))
  })
})
