import { describe, expect, it } from 'vitest'
import { bolehTransisiReview, perluCatatan, REVIEW_STATUS, type ReviewStatus } from './review'

const SAH: [ReviewStatus, ReviewStatus][] = [
  ['diajukan', 'disetujui'],
  ['diajukan', 'ditolak'],
  ['diajukan', 'perlu_revisi'],
  ['perlu_revisi', 'diajukan'],
]

describe('transisi review dokumen', () => {
  it.each(SAH)('%s → %s diizinkan', (dari, ke) => {
    expect(bolehTransisiReview(dari, ke)).toBe(true)
  })

  it('semua pasangan lain ditolak, termasuk keluar dari keputusan akhir', () => {
    const sah = new Set(SAH.map(([a, b]) => `${a}>${b}`))
    for (const dari of REVIEW_STATUS)
      for (const ke of REVIEW_STATUS) {
        if (sah.has(`${dari}>${ke}`)) continue
        expect(bolehTransisiReview(dari, ke), `${dari} → ${ke}`).toBe(false)
      }
  })
})

describe('perluCatatan', () => {
  it('alasan wajib untuk menolak atau meminta revisi, tidak untuk menyetujui/mengajukan', () => {
    expect(perluCatatan('ditolak')).toBe(true)
    expect(perluCatatan('perlu_revisi')).toBe(true)
    expect(perluCatatan('disetujui')).toBe(false)
    expect(perluCatatan('diajukan')).toBe(false)
  })
})
