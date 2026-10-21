import { describe, expect, it } from 'vitest'
import { buatPathObjek, namaTampilan, parsePathObjek } from './storage-path'

describe('namaTampilan', () => {
  it('membuang komponen direktori (path traversal) dan hanya menyisakan nama berkas', () => {
    expect(namaTampilan('../../etc/passwd.pdf')).toBe('passwd.pdf')
    expect(namaTampilan('a/b/../c.pdf')).toBe('c.pdf')
    expect(namaTampilan('C:\\Users\\guru\\RPP Kelas 8.docx')).toBe('RPP Kelas 8.docx')
  })

  it('membuang karakter kendali dan pengubah arah teks (RTL override)', () => {
    expect(namaTampilan('abc\u202Egpj.exe')).toBe('abcgpj.exe')
    expect(namaTampilan('a\u0000b\u0007c.pdf')).toBe('abc.pdf')
    expect(namaTampilan('a\u200Bb\uFEFFc.pdf')).toBe('abc.pdf')
  })

  it('merapikan spasi dan titik di awal', () => {
    expect(namaTampilan('  laporan   akhir  .pdf ')).toBe('laporan akhir .pdf')
    expect(namaTampilan('.htaccess')).toBe('htaccess')
  })

  it('memotong nama panjang tetapi mempertahankan ekstensi', () => {
    const hasil = namaTampilan(`${'a'.repeat(300)}.pdf`)
    expect(hasil.length).toBeLessThanOrEqual(120)
    expect(hasil.endsWith('.pdf')).toBe(true)
  })

  it('menormalkan Unicode ke NFC', () => {
    expect(namaTampilan('e\u0301.pdf')).toBe('\u00e9.pdf')
  })

  it('nama kosong atau hanya simbol jatuh ke nilai bawaan', () => {
    expect(namaTampilan('')).toBe('berkas')
    expect(namaTampilan('///')).toBe('berkas')
    expect(namaTampilan('\u202E\u200B')).toBe('berkas')
  })
})

describe('buatPathObjek', () => {
  const uuid = '3f2c1a9e-8b7d-4c6e-9a10-5d4e3f2a1b0c'

  it('menyusun path terkunci pada sekolah, dokumen, dan versi', () => {
    expect(buatPathObjek({ schoolId: 'sekolahA', docId: 'dok123', versi: 2, ext: 'pdf', uuid })).toBe(
      `sekolah/sekolahA/dokumen/dok123/v2/${uuid}.pdf`,
    )
  })

  it('nama objek acak: tidak memuat nama berkas asli, dan berbeda tiap panggilan', () => {
    const a = buatPathObjek({ schoolId: 's1', docId: 'd1', versi: 1, ext: 'png' })
    const b = buatPathObjek({ schoolId: 's1', docId: 'd1', versi: 1, ext: 'png' })
    expect(a).not.toBe(b)
    expect(a).toMatch(/^sekolah\/s1\/dokumen\/d1\/v1\/[0-9a-f-]{36}\.png$/)
  })

  it.each(['', '../x', 'a/b', 'a b', 'x'.repeat(65), 'a.b'])('menolak ID tidak aman: %j', (id) => {
    expect(() => buatPathObjek({ schoolId: id, docId: 'd1', versi: 1, ext: 'pdf' })).toThrow()
    expect(() => buatPathObjek({ schoolId: 's1', docId: id, versi: 1, ext: 'pdf' })).toThrow()
  })

  it.each([0, -1, 1.5, Number.NaN])('menolak nomor versi %s', (versi) => {
    expect(() => buatPathObjek({ schoolId: 's1', docId: 'd1', versi, ext: 'pdf' })).toThrow()
  })

  it('menolak ekstensi di luar daftar', () => {
    expect(() => buatPathObjek({ schoolId: 's1', docId: 'd1', versi: 1, ext: 'exe' as never })).toThrow()
  })
})

describe('parsePathObjek', () => {
  it('membalik path yang dibuat buatPathObjek', () => {
    const path = buatPathObjek({ schoolId: 's1', docId: 'd1', versi: 3, ext: 'xlsx' })
    expect(parsePathObjek(path)).toMatchObject({ schoolId: 's1', docId: 'd1', versi: 3, ext: 'xlsx' })
  })

  it.each(['sekolah/s1/dokumen/d1/v1/../../x.pdf', 'sekolah/s1/dokumen/d1/v0/a.pdf', 'lain/s1/dokumen/d1/v1/a.pdf', 'sekolah/s1/dokumen/d1/v1/a.exe', ''])(
    'menolak path tidak sah: %j',
    (p) => {
      expect(parsePathObjek(p)).toBeNull()
    },
  )
})
