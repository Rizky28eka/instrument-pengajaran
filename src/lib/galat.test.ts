import { describe, expect, it } from 'vitest'
import { jenisGalat, pesanGalatData } from './galat'

const galat = (code: string, message = '') => Object.assign(new Error(message), { code })

describe('jenisGalat', () => {
  it.each([
    [galat('permission-denied'), 'izin'],
    [galat('unauthenticated'), 'sesi'],
    [galat('unavailable'), 'jaringan'],
    [galat('deadline-exceeded'), 'jaringan'],
    [galat('failed-precondition', 'The query requires an index. You can create it here: https://console...'), 'indeks'],
    [galat('failed-precondition', 'sesuatu lain'), 'lainnya'],
    [galat('not-found'), 'lainnya'],
    [new Error('apa saja'), 'lainnya'],
    [null, 'lainnya'],
    ['teks', 'lainnya'],
  ])('%#', (e, jenis) => {
    expect(jenisGalat(e)).toBe(jenis)
  })
})

describe('pesanGalatData', () => {
  it('tidak pernah memuat pesan mentah / tautan konsol dari galat asli', () => {
    const p = pesanGalatData(galat('failed-precondition', 'requires an index https://console.firebase.google.com/secret'))
    expect(JSON.stringify(p)).not.toContain('console.firebase')
  })

  it('jaringan dapat dicoba lagi, izin tidak', () => {
    expect(pesanGalatData(galat('unavailable')).dapatDicoba).toBe(true)
    expect(pesanGalatData(galat('permission-denied')).dapatDicoba).toBe(false)
  })

  it('menegaskan bahwa data tidak hilang saat jaringan bermasalah', () => {
    expect(pesanGalatData(galat('unavailable')).isi).toMatch(/tidak berarti data hilang|bukan berarti data hilang/)
  })
})
