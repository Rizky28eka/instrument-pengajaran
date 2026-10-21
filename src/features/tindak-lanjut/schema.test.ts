import { describe, expect, it } from 'vitest'
import { dokumenKeTindak } from './mapper'
import { catatanSchema, tindakFormSchema } from './schema'

describe('tindakFormSchema', () => {
  const ok = { deskripsi: '  Observasi ulang ', penanggungJawab: ' Kepsek ', tenggat: '2026-12-01' }

  it('menerima dan merapikan isian valid', () => {
    expect(tindakFormSchema.parse(ok)).toEqual({ deskripsi: 'Observasi ulang', penanggungJawab: 'Kepsek', tenggat: '2026-12-01' })
  })
  it('tenggat kosong menjadi null (opsional)', () => {
    expect(tindakFormSchema.parse({ ...ok, tenggat: '' }).tenggat).toBeNull()
    expect(tindakFormSchema.parse({ ...ok, tenggat: undefined }).tenggat).toBeNull()
  })
  it.each([
    ['deskripsi kosong', { deskripsi: '   ' }],
    ['deskripsi terlalu panjang', { deskripsi: 'x'.repeat(2001) }],
    ['penanggung jawab terlalu panjang', { penanggungJawab: 'x'.repeat(121) }],
    ['format tanggal salah', { tenggat: '01/12/2026' }],
    ['tanggal tidak ada di kalender', { tenggat: '2026-02-31' }],
    ['bulan 13', { tenggat: '2026-13-01' }],
  ])('menolak: %s', (_n, patch) => {
    expect(tindakFormSchema.safeParse({ ...ok, ...patch }).success).toBe(false)
  })
  it('menerima 29 Februari hanya di tahun kabisat', () => {
    expect(tindakFormSchema.safeParse({ ...ok, tenggat: '2028-02-29' }).success).toBe(true)
    expect(tindakFormSchema.safeParse({ ...ok, tenggat: '2027-02-29' }).success).toBe(false)
  })
  it('catatan wajib dan dibatasi', () => {
    expect(catatanSchema.safeParse('  ').success).toBe(false)
    expect(catatanSchema.safeParse('x'.repeat(2001)).success).toBe(false)
    expect(catatanSchema.parse('  siap ')).toBe('siap')
  })
})

describe('dokumenKeTindak', () => {
  it('memetakan semua field', () => {
    const waktu = new Date('2026-10-21T00:00:00Z')
    const t = dokumenKeTindak('t1', {
      schoolId: 's', supervisiId: 'v', guruId: 'g', guruNama: 'Budi', deskripsi: 'D', status: 'proses', penanggungJawab: 'PJ',
      tenggat: '2026-12-01', selesaiAt: null, createdBy: 'u', createdAt: { toDate: () => waktu }, updatedAt: { toDate: () => waktu }, updatedBy: 'u2', rev: 3,
    })
    expect(t).toMatchObject({ id: 't1', status: 'proses', tenggat: '2026-12-01', rev: 3, updatedBy: 'u2', selesaiAt: null })
    expect(t.createdAt).toEqual(waktu)
  })
  it('status tak dikenal dan field hilang tidak melempar', () => {
    const t = dokumenKeTindak('t2', { status: 'ngambang' })
    expect(t).toMatchObject({ status: 'belum', tenggat: null, deskripsi: '', rev: 0 })
  })
})
