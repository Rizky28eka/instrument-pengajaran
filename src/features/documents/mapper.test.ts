import { describe, expect, it } from 'vitest'
import { dokumenKeDokumen, versiAktif } from './mapper'

const t = (iso: string) => ({ toDate: () => new Date(iso) })
const rincian = (n: number) => ({
  n,
  storagePath: `sekolah/s1/dokumen/d1/v${n}/3f2c1a9e-8b7d-4c6e-9a10-5d4e3f2a1b0c.pdf`,
  fileName: 'Laporan.pdf',
  mimeType: 'application/pdf',
  size: 2048,
  sha256: 'a'.repeat(64),
  uploadedBy: 'u1',
})

const dasar = {
  schoolId: 's1',
  kategori: 'pendukung-supervisi',
  supervisiId: 'sv1',
  guruId: null,
  tindakId: null,
  judul: 'Laporan.pdf',
  status: 'tersedia',
  currentVersion: 2,
  versions: [{ ...rincian(1), uploadedAt: t('2026-10-20T00:00:00Z') }, { ...rincian(2), uploadedAt: t('2026-10-21T00:00:00Z') }],
  pending: null,
  reviewStatus: null,
  reviewRiwayat: [],
  createdBy: 'u1',
  createdByName: 'Ani',
  createdAt: t('2026-10-20T00:00:00Z'),
  updatedAt: t('2026-10-21T00:00:00Z'),
  deletedAt: null,
  deletedBy: null,
}

describe('dokumenKeDokumen', () => {
  it('memetakan metadata dokumen beserta riwayat versi dan tanggalnya', () => {
    const d = dokumenKeDokumen('d1', dasar)
    expect(d).toMatchObject({ id: 'd1', schoolId: 's1', kategori: 'pendukung-supervisi', supervisiId: 'sv1', status: 'tersedia', currentVersion: 2 })
    expect(d.versions).toHaveLength(2)
    expect(d.versions[1].uploadedAt).toEqual(new Date('2026-10-21T00:00:00Z'))
    expect(d.pending).toBeNull()
  })

  it('versiAktif mengembalikan versi yang sedang berlaku, bukan sekadar yang terakhir ditulis', () => {
    const d = dokumenKeDokumen('d1', { ...dasar, currentVersion: 1 })
    expect(versiAktif(d)?.n).toBe(1)
  })

  it('dokumen yang baru mulai diunggah belum punya versi aktif tetapi punya pending', () => {
    const d = dokumenKeDokumen('d1', { ...dasar, status: 'mengunggah', currentVersion: 0, versions: [], pending: { ...rincian(1), startedAt: t('2026-10-21T00:00:00Z') } })
    expect(versiAktif(d)).toBeNull()
    expect(d.pending).toMatchObject({ n: 1, size: 2048 })
    expect(d.pending?.startedAt).toEqual(new Date('2026-10-21T00:00:00Z'))
  })

  it('status atau kategori tak dikenal diperlakukan hati-hati (tidak dianggap tersedia)', () => {
    expect(dokumenKeDokumen('d1', { ...dasar, status: 'aneh' }).status).toBe('mengunggah')
    expect(dokumenKeDokumen('d1', { ...dasar, kategori: 'rahasia' }).kategori).toBe('administratif')
  })

  it('metadata terhapus-lunak membawa penanda siapa dan kapan', () => {
    const d = dokumenKeDokumen('d1', { ...dasar, status: 'dihapus', deletedAt: t('2026-10-22T00:00:00Z'), deletedBy: 'u2' })
    expect(d).toMatchObject({ status: 'dihapus', deletedBy: 'u2' })
    expect(d.deletedAt).toEqual(new Date('2026-10-22T00:00:00Z'))
  })

  it('entri versi atau riwayat review yang rusak dibuang, bukan membuat pemetaan gagal', () => {
    const d = dokumenKeDokumen('d1', { ...dasar, versions: [null, { n: 'x' }, { ...rincian(1), uploadedAt: null }], reviewStatus: 'disetujui', reviewRiwayat: [{ status: 'disetujui', oleh: 'u2', catatan: 'ok', at: t('2026-10-22T00:00:00Z') }, 7] })
    expect(d.versions).toHaveLength(1)
    expect(d.reviewStatus).toBe('disetujui')
    expect(d.reviewRiwayat).toHaveLength(1)
  })

  it('field hilang → bawaan aman', () => {
    const d = dokumenKeDokumen('d1', {})
    expect(d).toMatchObject({ schoolId: '', status: 'mengunggah', currentVersion: 0, versions: [], pending: null, reviewStatus: null })
  })
})
