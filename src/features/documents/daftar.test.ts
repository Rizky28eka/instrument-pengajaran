import { describe, expect, it } from 'vitest'
import { cariDuplikat, filterDokumen, kedaluwarsa, paginasi, tertundaMilik } from './daftar'
import { dokumenKeDokumen } from './mapper'

const t = (iso: string) => ({ toDate: () => new Date(iso) })
const berkas = (n: number, sha = 'a'.repeat(64), by = 'u1') => ({
  n,
  storagePath: `sekolah/s1/dokumen/d1/v${n}/3f2c1a9e-8b7d-4c6e-9a10-5d4e3f2a1b0c.pdf`,
  fileName: 'Laporan.pdf',
  mimeType: 'application/pdf',
  size: 100,
  sha256: sha,
  uploadedBy: by,
  uploadedAt: t('2026-10-20T00:00:00Z'),
})

function buat(id: string, u: Record<string, unknown> = {}) {
  return dokumenKeDokumen(id, {
    schoolId: 's1',
    kategori: 'pendukung-supervisi',
    supervisiId: 'sv1',
    guruId: null,
    tindakId: null,
    judul: `Dok ${id}`,
    status: 'tersedia',
    currentVersion: 1,
    versions: [berkas(1)],
    pending: null,
    reviewStatus: null,
    reviewRiwayat: [],
    createdBy: 'u1',
    createdByName: 'Ani',
    createdAt: t('2026-10-20T00:00:00Z'),
    updatedAt: t('2026-10-20T00:00:00Z'),
    deletedAt: null,
    deletedBy: null,
    ...u,
  })
}

describe('cariDuplikat (mencegah berkas sama terkirim berulang)', () => {
  const daftar = [buat('a'), buat('b', { supervisiId: 'sv2' }), buat('c', { versions: [berkas(1, 'b'.repeat(64))] })]

  it('menemukan dokumen dengan isi identik pada relasi yang sama', () => {
    expect(cariDuplikat(daftar, 'a'.repeat(64), { supervisiId: 'sv1' }).map((d) => d.id)).toEqual(['a'])
  })

  it('relasi berbeda bukan duplikat', () => {
    expect(cariDuplikat(daftar, 'a'.repeat(64), { supervisiId: 'sv3' })).toEqual([])
  })

  it('dokumen terhapus-lunak diabaikan', () => {
    const d = [buat('x', { status: 'dihapus' })]
    expect(cariDuplikat(d, 'a'.repeat(64), { supervisiId: 'sv1' })).toEqual([])
  })

  it('hanya versi aktif yang dibandingkan, bukan versi lama', () => {
    const d = [buat('v', { currentVersion: 2, versions: [berkas(1, 'a'.repeat(64)), berkas(2, 'b'.repeat(64))] })]
    expect(cariDuplikat(d, 'a'.repeat(64), { supervisiId: 'sv1' })).toEqual([])
    expect(cariDuplikat(d, 'b'.repeat(64), { supervisiId: 'sv1' })).toHaveLength(1)
  })
})

describe('filterDokumen', () => {
  const daftar = [
    buat('a', { judul: 'RPP Matematika', kategori: 'pendukung-supervisi', createdBy: 'u1', createdByName: 'Ani', createdAt: t('2026-10-10T00:00:00Z') }),
    buat('b', { judul: 'Foto kelas', kategori: 'bukti-pelaksanaan', createdBy: 'u2', createdByName: 'Budi', createdAt: t('2026-10-15T00:00:00Z') }),
    buat('c', { judul: 'Surat tugas', kategori: 'administratif', supervisiId: null, status: 'dihapus', createdAt: t('2026-10-20T00:00:00Z') }),
  ]

  it('tanpa filter: semua yang tidak dihapus, terbaru dulu', () => {
    expect(filterDokumen(daftar, {}).map((d) => d.id)).toEqual(['b', 'a'])
  })

  it('pencarian judul, nama berkas, atau nama pengunggah (tanpa membedakan huruf besar)', () => {
    expect(filterDokumen(daftar, { q: 'MATEMATIKA' }).map((d) => d.id)).toEqual(['a'])
    expect(filterDokumen(daftar, { q: 'budi' }).map((d) => d.id)).toEqual(['b'])
    expect(filterDokumen(daftar, { q: 'laporan.pdf' })).toHaveLength(2)
  })

  it('filter kategori dan pengunggah', () => {
    expect(filterDokumen(daftar, { kategori: 'bukti-pelaksanaan' }).map((d) => d.id)).toEqual(['b'])
    expect(filterDokumen(daftar, { pengunggah: 'u1' }).map((d) => d.id)).toEqual(['a'])
  })

  it('filter rentang tanggal unggah (inklusif)', () => {
    expect(filterDokumen(daftar, { dari: '2026-10-12', sampai: '2026-10-16' }).map((d) => d.id)).toEqual(['b'])
    expect(filterDokumen(daftar, { dari: '2026-10-10', sampai: '2026-10-10' }).map((d) => d.id)).toEqual(['a'])
  })

  it('tempat sampah menampilkan hanya dokumen terhapus', () => {
    expect(filterDokumen(daftar, { status: 'dihapus' }).map((d) => d.id)).toEqual(['c'])
  })

  it('filter relasi', () => {
    expect(filterDokumen(daftar, { supervisiId: 'sv1' }).map((d) => d.id)).toEqual(['b', 'a'])
    expect(filterDokumen(daftar, { supervisiId: 'svLain' })).toEqual([])
  })
})

describe('paginasi', () => {
  const data = Array.from({ length: 25 }, (_, i) => i + 1)

  it('membagi per halaman dan melaporkan total', () => {
    expect(paginasi(data, 1, 10)).toMatchObject({ baris: data.slice(0, 10), total: 25, totalHalaman: 3, halaman: 1 })
    expect(paginasi(data, 3, 10).baris).toEqual([21, 22, 23, 24, 25])
  })

  it('halaman di luar rentang dijepit ke rentang yang valid', () => {
    expect(paginasi(data, 99, 10).halaman).toBe(3)
    expect(paginasi(data, 0, 10).halaman).toBe(1)
    expect(paginasi([], 1, 10)).toMatchObject({ baris: [], total: 0, totalHalaman: 1, halaman: 1 })
  })
})

describe('tertundaMilik (unggahan yang terputus di tengah jalan)', () => {
  it('mengembalikan dokumen dengan unggahan tertunda milik pengguna itu saja', () => {
    const mengunggah = buat('p1', { status: 'mengunggah', currentVersion: 0, versions: [], pending: { ...berkas(1), startedAt: t('2026-10-20T00:00:00Z') } })
    const gantiVersi = buat('p2', { pending: { ...berkas(2), startedAt: t('2026-10-20T00:00:00Z') } })
    const milikLain = buat('p3', { status: 'mengunggah', currentVersion: 0, versions: [], pending: { ...berkas(1, 'a'.repeat(64), 'u2'), startedAt: t('2026-10-20T00:00:00Z') } })
    const normal = buat('n')
    expect(tertundaMilik([mengunggah, gantiVersi, milikLain, normal], 'u1').map((d) => d.id)).toEqual(['p1', 'p2'])
  })
})

describe('kedaluwarsa (retensi setelah dihapus-lunak)', () => {
  const sekarang = new Date('2026-11-30T00:00:00Z')

  it('dokumen terhapus lebih lama dari masa retensi disarankan dihapus permanen', () => {
    const lama = buat('x', { status: 'dihapus', deletedAt: t('2026-10-20T00:00:00Z') })
    const baru = buat('y', { status: 'dihapus', deletedAt: t('2026-11-25T00:00:00Z') })
    expect(kedaluwarsa(lama, sekarang, 30)).toBe(true)
    expect(kedaluwarsa(baru, sekarang, 30)).toBe(false)
  })

  it('dokumen yang tidak dihapus tidak pernah kedaluwarsa', () => {
    expect(kedaluwarsa(buat('z'), sekarang, 30)).toBe(false)
  })
})
