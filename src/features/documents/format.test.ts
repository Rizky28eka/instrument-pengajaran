import { describe, expect, it } from 'vitest'
import { bisaDipratinjau, formatUkuran, labelJenis } from './format'

describe('formatUkuran', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1 KB'],
    [1536, '1,5 KB'],
    [10 * 1024 * 1024, '10 MB'],
    [Math.round(2.34 * 1024 * 1024), '2,3 MB'],
  ])('%d byte → %s', (byte, hasil) => {
    expect(formatUkuran(byte)).toBe(hasil)
  })

  it('nilai tidak valid tidak menghasilkan NaN di layar', () => {
    expect(formatUkuran(Number.NaN)).toBe('—')
    expect(formatUkuran(-5)).toBe('—')
  })
})

describe('bisaDipratinjau', () => {
  it('hanya PDF dan gambar PNG/JPEG yang dirender di browser', () => {
    expect(bisaDipratinjau('application/pdf')).toBe(true)
    expect(bisaDipratinjau('image/png')).toBe(true)
    expect(bisaDipratinjau('image/jpeg')).toBe(true)
  })

  it('dokumen Office, CSV, dan tipe lain tidak pernah dirender (hanya diunduh)', () => {
    for (const m of ['application/msword', 'application/vnd.ms-excel', 'text/csv', 'text/html', 'image/svg+xml', '']) expect(bisaDipratinjau(m)).toBe(false)
  })
})

describe('labelJenis', () => {
  it('memberi label ringkas dari MIME', () => {
    expect(labelJenis('application/pdf')).toBe('PDF')
    expect(labelJenis('image/png')).toBe('Gambar PNG')
    expect(labelJenis('x/unknown')).toBe('Berkas')
  })
})
