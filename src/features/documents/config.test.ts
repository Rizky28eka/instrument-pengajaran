import { describe, expect, it } from 'vitest'
import { ACCEPT_ATTR, DOKUMEN, JENIS_BERKAS, KATEGORI, MIME_DIIZINKAN, kategoriById } from './config'

describe('konfigurasi dokumen', () => {
  it('batas default masuk akal dan terdokumentasi', () => {
    expect(DOKUMEN.maksUkuranByte).toBe(10 * 1024 * 1024)
    expect(DOKUMEN.maksFilePerBatch).toBe(5)
    expect(DOKUMEN.maksVersi).toBe(20)
    expect(DOKUMEN.retensiHariSetelahHapus).toBe(30)
  })

  it('mendukung tepat jenis berkas yang diminta', () => {
    expect(Object.keys(JENIS_BERKAS).sort()).toEqual(['csv', 'doc', 'docx', 'jpeg', 'jpg', 'pdf', 'png', 'xls', 'xlsx'])
  })

  it('jpg dan jpeg memakai MIME yang sama; MIME_DIIZINKAN tanpa duplikat', () => {
    expect(JENIS_BERKAS.jpg.mime).toBe(JENIS_BERKAS.jpeg.mime)
    expect(new Set(MIME_DIIZINKAN).size).toBe(MIME_DIIZINKAN.length)
    expect(MIME_DIIZINKAN).toHaveLength(8)
  })

  it('atribut accept memuat setiap ekstensi', () => {
    for (const ext of Object.keys(JENIS_BERKAS)) expect(ACCEPT_ATTR).toContain(`.${ext}`)
  })

  it('kategori punya id unik dan hanya pengajuan guru yang membutuhkan review', () => {
    const ids = KATEGORI.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(KATEGORI.filter((k) => k.perluReview).map((k) => k.id)).toEqual(['pengajuan-guru'])
  })

  it('relasi wajib per kategori sesuai kebutuhan bisnis', () => {
    expect(kategoriById('pendukung-supervisi')?.relasiWajib).toBe('supervisi')
    expect(kategoriById('bukti-pelaksanaan')?.relasiWajib).toBe('supervisi')
    expect(kategoriById('lampiran-rekomendasi')?.relasiWajib).toBe('supervisi')
    expect(kategoriById('tindak-lanjut')?.relasiWajib).toBe('tindakLanjut')
    expect(kategoriById('pengajuan-guru')?.relasiWajib).toBe('guru')
    expect(kategoriById('template')?.relasiWajib).toBeNull()
    expect(kategoriById('administratif')?.relasiWajib).toBeNull()
    expect(kategoriById('tidak-ada')).toBeUndefined()
  })
})
