import { describe, expect, it } from 'vitest'
import {
  aktif,
  ringkasTindakLanjut,
  saringTindakLanjut,
  sisaHari,
  STATUS,
  terlambat,
  transisiSah,
  transisiTersedia,
  urutkanTindakLanjut,
  type StatusTindak,
} from './logic'

const t = (status: StatusTindak, tenggat: string | null) => ({ status, tenggat })
const HARI = '2026-10-21'

describe('transisi status (harus selaras dengan firestore.rules validTransisi)', () => {
  it.each([
    ['belum', 'proses', true],
    ['belum', 'selesai', true],
    ['belum', 'dibatalkan', true],
    ['proses', 'belum', true],
    ['proses', 'selesai', true],
    ['selesai', 'proses', true],
    ['selesai', 'belum', false],
    ['selesai', 'dibatalkan', false],
    ['dibatalkan', 'belum', true],
    ['dibatalkan', 'proses', false],
    ['dibatalkan', 'selesai', false],
    ['belum', 'belum', true],
  ] as const)('%s → %s: %s', (dari, ke, sah) => {
    expect(transisiSah(dari, ke)).toBe(sah)
  })

  it('pilihan di UI persis sama dengan transisi sah', () => {
    for (const dari of STATUS) {
      const tersedia = new Set(transisiTersedia(dari))
      for (const ke of STATUS) expect(tersedia.has(ke)).toBe(ke !== dari && transisiSah(dari, ke))
    }
  })
})

describe('terlambat / sisaHari', () => {
  it('terlambat hanya bila aktif dan tenggat sebelum hari ini', () => {
    expect(terlambat(t('belum', '2026-10-20'), HARI)).toBe(true)
    expect(terlambat(t('proses', '2026-10-20'), HARI)).toBe(true)
    expect(terlambat(t('belum', HARI), HARI)).toBe(false) // jatuh tempo hari ini belum terlambat
    expect(terlambat(t('belum', '2026-10-22'), HARI)).toBe(false)
    expect(terlambat(t('selesai', '2026-01-01'), HARI)).toBe(false)
    expect(terlambat(t('dibatalkan', '2026-01-01'), HARI)).toBe(false)
    expect(terlambat(t('belum', null), HARI)).toBe(false)
  })

  it('sisaHari menghitung hari kalender termasuk lintas bulan/tahun', () => {
    expect(sisaHari('2026-10-24', HARI)).toBe(3)
    expect(sisaHari('2026-10-21', HARI)).toBe(0)
    expect(sisaHari('2026-10-19', HARI)).toBe(-2)
    expect(sisaHari('2027-01-01', '2026-12-31')).toBe(1)
    expect(sisaHari(null, HARI)).toBeNull()
  })

  it('aktif = belum atau proses', () => {
    expect(STATUS.filter((s) => aktif({ status: s }))).toEqual(['belum', 'proses'])
  })
})

describe('ringkasTindakLanjut', () => {
  it('menghitung per status, aktif, dan terlambat', () => {
    const r = ringkasTindakLanjut(
      [t('belum', '2026-10-01'), t('proses', '2026-12-01'), t('selesai', '2026-01-01'), t('dibatalkan', null), t('proses', '2026-10-20')],
      HARI,
    )
    expect(r).toEqual({ total: 5, perStatus: { belum: 1, proses: 2, selesai: 1, dibatalkan: 1 }, aktif: 3, terlambat: 2 })
  })

  it('daftar kosong', () => {
    expect(ringkasTindakLanjut([], HARI)).toEqual({ total: 0, perStatus: { belum: 0, proses: 0, selesai: 0, dibatalkan: 0 }, aktif: 0, terlambat: 0 })
  })
})

describe('saringTindakLanjut', () => {
  const data = [t('belum', '2026-10-01'), t('proses', '2026-11-15'), t('selesai', '2026-10-30'), t('belum', null)]

  it('tanpa filter mengembalikan semuanya', () => {
    expect(saringTindakLanjut(data, {}, HARI)).toHaveLength(4)
  })
  it('status tertentu dan "aktif"', () => {
    expect(saringTindakLanjut(data, { status: 'selesai' }, HARI)).toHaveLength(1)
    expect(saringTindakLanjut(data, { status: 'aktif' }, HARI)).toHaveLength(3)
  })
  it('hanya terlambat', () => {
    expect(saringTindakLanjut(data, { hanyaTerlambat: true }, HARI)).toEqual([t('belum', '2026-10-01')])
  })
  it('periode berlaku pada tenggat dan bersifat inklusif; tanpa tenggat tidak ikut', () => {
    expect(saringTindakLanjut(data, { dari: '2026-10-30', sampai: '2026-11-15' }, HARI)).toHaveLength(2)
    expect(saringTindakLanjut(data, { dari: '2026-10-31' }, HARI)).toEqual([t('proses', '2026-11-15')])
    expect(saringTindakLanjut(data, { sampai: '2026-10-01' }, HARI)).toEqual([t('belum', '2026-10-01')])
  })
})

describe('urutkanTindakLanjut', () => {
  it('terlambat dulu, lalu aktif menurut tenggat, tanpa tenggat di akhir kelompok, lalu selesai', () => {
    const urut = urutkanTindakLanjut(
      [t('selesai', '2026-10-25'), t('belum', null), t('proses', '2026-12-01'), t('belum', '2026-10-10'), t('proses', '2026-10-30')],
      HARI,
    )
    expect(urut).toEqual([
      t('belum', '2026-10-10'), // terlambat
      t('proses', '2026-10-30'),
      t('proses', '2026-12-01'),
      t('belum', null),
      t('selesai', '2026-10-25'),
    ])
  })

  it('tidak mengubah array asli', () => {
    const a = [t('selesai', null), t('belum', '2026-10-01')]
    urutkanTindakLanjut(a, HARI)
    expect(a[0].status).toBe('selesai')
  })
})
