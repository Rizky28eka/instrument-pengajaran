import { describe, expect, it } from 'vitest'
import { INSTRUMEN_AKTIF, INSTRUMEN_TERDAFTAR, SEMUA_INDIKATOR, SKOR_MAKS_TOTAL, semuaIndikator } from './instrumen'
import { belumTerkonfirmasi, indikatorBelumTerkonfirmasi } from './konfirmasi'

const idBelum = (i = INSTRUMEN_AKTIF) => indikatorBelumTerkonfirmasi(i).map((x) => x.id)

describe('indikator belum terkonfirmasi (jangan mengarang indikator)', () => {
  it('tepat 13 indikator rancangan awal: C4–C6, D1–D5, E1–E5', () => {
    expect(idBelum()).toEqual(['C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'D5', 'E1', 'E2', 'E3', 'E4', 'E5'])
  })

  it('29 indikator lainnya (A1–A6, B1–B20, C1–C3) bersumber dari dokumen dan tidak ditandai', () => {
    const terkonfirmasi = SEMUA_INDIKATOR.filter((i) => !belumTerkonfirmasi(INSTRUMEN_AKTIF.versi, i.id)).map((i) => i.id)
    expect(terkonfirmasi).toHaveLength(29)
    expect(terkonfirmasi.slice(0, 6)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'])
    expect(terkonfirmasi.slice(-3)).toEqual(['C1', 'C2', 'C3'])
  })

  it('penanda tidak mengubah jumlah indikator atau skor maksimal (formula nilai tetap)', () => {
    expect(SEMUA_INDIKATOR).toHaveLength(42)
    expect(SKOR_MAKS_TOTAL).toBe(168)
  })

  it('ambang predikat tidak berubah', () => {
    expect(INSTRUMEN_AKTIF.ambang.map((a) => [a.predikat, a.min])).toEqual([
      ['Sangat Baik', 86],
      ['Baik', 71],
      ['Cukup', 56],
      ['Perlu Perbaikan', 0],
    ])
  })

  it('berkas instrumen versi lama tidak dimodifikasi: indikatornya tidak membawa penanda apa pun', () => {
    for (const i of semuaIndikator(INSTRUMEN_AKTIF)) expect(Object.keys(i).sort()).toEqual(['id', 'teks'])
  })

  it('setiap ID dalam daftar benar-benar ada pada instrumen versi yang sama (tidak ada penanda yatim)', () => {
    for (const [versi, instrumen] of Object.entries(INSTRUMEN_TERDAFTAR)) {
      const ada = new Set(semuaIndikator(instrumen).map((x) => x.id))
      for (const i of semuaIndikator(instrumen)) if (belumTerkonfirmasi(versi, i.id)) expect(ada.has(i.id)).toBe(true)
    }
  })

  it('versi yang tidak dikenal tidak ditebak: tidak ada indikator yang ditandai', () => {
    expect(belumTerkonfirmasi('versi-asing-9', 'D1')).toBe(false)
    expect(idBelum({ ...INSTRUMEN_AKTIF, versi: 'versi-asing-9' })).toEqual([])
  })

  it('snapshot di dokumen lama tetap ditandai karena pencocokannya lewat versi + ID, bukan isi snapshot', () => {
    expect(belumTerkonfirmasi('1-provisional', 'E5')).toBe(true)
    expect(belumTerkonfirmasi('1-provisional', 'A1')).toBe(false)
  })
})
