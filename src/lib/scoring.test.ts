import { describe, expect, it } from 'vitest'
import { bentukAspek, INSTRUMEN_AKTIF, semuaIndikator, skorMaksTotal, type Instrumen } from '@/data/instrumen'
import { hitungRingkasan, predikatDari, predikatDariSkor, skorValid } from './scoring'

const indikator = semuaIndikator(INSTRUMEN_AKTIF)
const semua = (n: number) => Object.fromEntries(indikator.map((i) => [i.id, n]))

/** Instrumen kecil agar kasus batas mudah dihitung tangan: 3 indikator, maks 12. */
const MINI: Instrumen = {
  versi: 'tes-mini',
  nama: 'Mini',
  status: 'provisional',
  ambang: [
    { predikat: 'Sangat Baik', min: 90 },
    { predikat: 'Baik', min: 70 },
    { predikat: 'Cukup', min: 50 },
    { predikat: 'Perlu Perbaikan', min: 0 },
  ],
  aspek: [
    bentukAspek({
      id: 'X',
      kode: 'X',
      judul: 'X',
      deskripsi: '',
      kelompok: [{ indikator: ['X1', 'X2', 'X3'].map((id) => ({ id, teks: id })) }],
    }),
  ],
}

describe('predikatDari (nilai jadi)', () => {
  it.each([
    [100, 'Sangat Baik'],
    [86, 'Sangat Baik'],
    [85.99, 'Baik'],
    [71, 'Baik'],
    [70.99, 'Cukup'],
    [56, 'Cukup'],
    [55.99, 'Perlu Perbaikan'],
    [0, 'Perlu Perbaikan'],
  ])('nilai %s → %s (ambang instrumen aktif)', (nilai, predikat) => {
    expect(predikatDari(nilai)).toBe(predikat)
  })

  it('memakai ambang yang diberikan, bukan ambang tetap', () => {
    expect(predikatDari(80, MINI.ambang)).toBe('Baik')
    expect(predikatDari(95, MINI.ambang)).toBe('Sangat Baik')
  })
})

describe('predikatDariSkor (rasio eksak)', () => {
  it('tepat di ambang masuk predikat atas', () => {
    expect(predikatDariSkor(9, 10, [{ predikat: 'Sangat Baik', min: 90 }, { predikat: 'Perlu Perbaikan', min: 0 }])).toBe('Sangat Baik')
  })

  it('pembulatan tidak menaikkan predikat', () => {
    // 8,9999 / 10 → nilai dibulatkan 90 tetapi rasio eksak < 90 persen
    const ambang = [{ predikat: 'Sangat Baik' as const, min: 90 }, { predikat: 'Perlu Perbaikan' as const, min: 0 }]
    expect(predikatDariSkor(8999, 10000, ambang)).toBe('Perlu Perbaikan')
  })

  it('maks nol tidak membagi dengan nol', () => {
    expect(predikatDariSkor(0, 0, MINI.ambang)).toBe('Perlu Perbaikan')
  })
})

describe('hitungRingkasan', () => {
  it('semua skor 4 → nilai 100, Sangat Baik', () => {
    const r = hitungRingkasan(semua(4))
    expect(r.total).toBe(skorMaksTotal(INSTRUMEN_AKTIF))
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

  it('mengabaikan skor di luar skala, pecahan, dan non-angka', () => {
    const r = hitungRingkasan({ A1: 5, A2: 0, A3: 2.5, A4: NaN, A5: 4, A6: '3' as unknown as number })
    expect(r.perAspek.A).toMatchObject({ total: 4, terisi: 1 })
  })

  it('mengabaikan id yang tidak ada di instrumen', () => {
    const r = hitungRingkasan({ ZZ9: 4 })
    expect(r.total).toBe(0)
  })

  it('memakai instrumen yang diberikan (kompatibilitas data historis)', () => {
    const r = hitungRingkasan({ X1: 4, X2: 4, X3: 3 }, MINI)
    expect(r).toMatchObject({ total: 11, maks: 12, nilai: 91.67, predikat: 'Sangat Baik' })
    // instrumen aktif tidak ikut berubah
    expect(hitungRingkasan({ X1: 4 }).total).toBe(0)
  })

  it('pembulatan nilai dua desimal', () => {
    expect(hitungRingkasan({ X1: 1, X2: 1, X3: 1 }, MINI).nilai).toBe(25)
    expect(hitungRingkasan({ X1: 4, X2: 3, X3: 3 }, MINI).nilai).toBe(83.33)
  })
})

describe('skorValid', () => {
  it.each([1, 2, 3, 4])('%s valid', (v) => expect(skorValid(v)).toBe(true))
  it.each([0, 5, -1, 2.5, NaN, Infinity, '3', null, undefined])('%s tidak valid', (v) => expect(skorValid(v)).toBe(false))
})
