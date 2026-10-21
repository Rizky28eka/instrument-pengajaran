import { describe, expect, it } from 'vitest'
import { normalisasiKode, periksaUndangan, type Undangan } from './undangan'

const sekarang = new Date('2026-10-21T10:00:00Z')
const undangan = (p: Partial<Undangan> = {}): Undangan => ({
  id: 'abc', schoolId: 's1', role: 'supervisor', email: null, expiresAt: new Date('2026-10-28T10:00:00Z'), terpakai: false, ...p,
})

describe('periksaUndangan', () => {
  it('valid', () => {
    expect(periksaUndangan(undangan(), 'a@b.id', sekarang)).toEqual({ ok: true })
  })
  it('terpakai ditolak lebih dulu', () => {
    expect(periksaUndangan(undangan({ terpakai: true }), 'a@b.id', sekarang)).toEqual({ ok: false, alasan: 'terpakai' })
  })
  it('kedaluwarsa, termasuk tepat pada batas waktu', () => {
    expect(periksaUndangan(undangan({ expiresAt: new Date('2026-10-21T09:59:59Z') }), 'a@b.id', sekarang)).toEqual({ ok: false, alasan: 'kedaluwarsa' })
    expect(periksaUndangan(undangan({ expiresAt: sekarang }), 'a@b.id', sekarang)).toEqual({ ok: false, alasan: 'kedaluwarsa' })
  })
  it('terikat email: cocok tanpa membedakan huruf besar/kecil, berbeda ditolak', () => {
    expect(periksaUndangan(undangan({ email: 'Guru@Contoh.id' }), 'guru@contoh.id', sekarang)).toEqual({ ok: true })
    expect(periksaUndangan(undangan({ email: 'guru@contoh.id' }), 'lain@contoh.id', sekarang)).toEqual({ ok: false, alasan: 'email-berbeda' })
  })
})

describe('normalisasiKode', () => {
  it.each([
    ['abc123', 'abc123'],
    ['  abc123  ', 'abc123'],
    ['abc 123\n', 'abc123'],
    ['https://contoh.id/aktivasi?kode=abc123', 'abc123'],
    ['https://contoh.id/aktivasi?kode=abc123&x=1', 'abc123'],
    ['', ''],
    ['   ', ''],
  ])('%j → %j', (masuk, keluar) => {
    expect(normalisasiKode(masuk)).toBe(keluar)
  })
})
