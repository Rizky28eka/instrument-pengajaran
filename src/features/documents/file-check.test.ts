import { describe, expect, it } from 'vitest'
import { buatZip } from './__testing__/buat-zip'
import { bacaNamaEntriZip, periksaBerkas } from './file-check'

const enc = new TextEncoder()
const bytes = (...n: number[]) => new Uint8Array(n)
type Bita = Uint8Array<ArrayBuffer>
const gabung = (...p: Uint8Array[]): Bita => {
  const out = new Uint8Array(p.reduce((s, x) => s + x.length, 0))
  let o = 0
  for (const x of p) {
    out.set(x, o)
    o += x.length
  }
  return out
}
const berkas = (nama: string, isi: Bita | string) => new File([typeof isi === 'string' ? enc.encode(isi) : isi], nama)

const PDF = enc.encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF')
const PNG = gabung(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), new Uint8Array(32))
const JPG = gabung(bytes(0xff, 0xd8, 0xff, 0xe0), new Uint8Array(32))
const OLE2 = gabung(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), new Uint8Array(64))
const DOCX = buatZip(['[Content_Types].xml', '_rels/.rels', 'word/document.xml'])
const XLSX = buatZip(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml'])

const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

describe('periksaBerkas: berkas sah', () => {
  it('PDF diterima dengan MIME terverifikasi dan sidik jari SHA-256', async () => {
    const r = await periksaBerkas(berkas('Laporan.pdf', PDF))
    expect(r).toMatchObject({ ok: true, ext: 'pdf', mime: MIME.pdf, ukuran: PDF.length })
    expect(r.ok && r.sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it.each([
    ['foto.png', PNG, 'image/png'],
    ['foto.jpg', JPG, 'image/jpeg'],
    ['foto.jpeg', JPG, 'image/jpeg'],
    ['lama.doc', OLE2, 'application/msword'],
    ['lama.xls', OLE2, 'application/vnd.ms-excel'],
  ])('%s diterima', async (nama, isi, mime) => {
    expect(await periksaBerkas(berkas(nama, isi))).toMatchObject({ ok: true, mime })
  })

  it('DOCX dan XLSX diterima bila struktur OOXML sesuai ekstensi', async () => {
    expect(await periksaBerkas(berkas('a.docx', DOCX))).toMatchObject({ ok: true, ext: 'docx', mime: MIME.docx })
    expect(await periksaBerkas(berkas('a.xlsx', XLSX))).toMatchObject({ ok: true, ext: 'xlsx', mime: MIME.xlsx })
  })

  it('CSV UTF-8 (dengan BOM dan huruf non-ASCII) diterima', async () => {
    const isi = '﻿nama,mapel\nBudi Santoso,Matematika\nSiti Aisyah,Bahasa Indonesia – Kelas VIII\n'
    expect(await periksaBerkas(berkas('guru.csv', isi))).toMatchObject({ ok: true, ext: 'csv', mime: 'text/csv' })
  })

  it('ekstensi huruf besar dinormalisasi', async () => {
    expect(await periksaBerkas(berkas('LAPORAN.PDF', PDF))).toMatchObject({ ok: true, ext: 'pdf' })
  })

  it('berkas persis sebesar batas diterima', async () => {
    const isi = gabung(enc.encode('%PDF-'), new Uint8Array(5))
    expect(await periksaBerkas(berkas('a.pdf', isi), 10)).toMatchObject({ ok: true })
  })

  it('isi yang sama menghasilkan hash sama, isi berbeda hash berbeda', async () => {
    const a = await periksaBerkas(berkas('a.pdf', PDF))
    const b = await periksaBerkas(berkas('nama-lain.pdf', PDF))
    const c = await periksaBerkas(berkas('a.pdf', gabung(PDF, enc.encode(' '))))
    expect(a.ok && b.ok && c.ok).toBe(true)
    if (a.ok && b.ok && c.ok) {
      expect(a.sha256).toBe(b.sha256)
      expect(a.sha256).not.toBe(c.sha256)
    }
  })
})

describe('periksaBerkas: berkas ditolak', () => {
  it('berkas kosong', async () => {
    expect(await periksaBerkas(berkas('a.pdf', new Uint8Array(0)))).toMatchObject({ ok: false, kode: 'kosong' })
  })

  it('melebihi batas ukuran', async () => {
    expect(await periksaBerkas(berkas('a.pdf', PDF), PDF.length - 1)).toMatchObject({ ok: false, kode: 'terlalu-besar' })
  })

  it.each(['virus.exe', 'situs.html', 'gambar.svg', 'skrip.js', 'makro.docm', 'makro.xlsm', 'arsip.zip', 'README', '.pdf.', 'foto.png.exe'])(
    'ekstensi tidak didukung: %s',
    async (nama) => {
      expect(await periksaBerkas(berkas(nama, PDF))).toMatchObject({ ok: false, kode: 'ekstensi-tidak-didukung' })
    },
  )

  it('PDF palsu: ekstensi pdf tetapi isi PNG', async () => {
    expect(await periksaBerkas(berkas('palsu.pdf', PNG))).toMatchObject({ ok: false, kode: 'tanda-tangan-tidak-cocok' })
  })

  it('PNG palsu: SVG berisi skrip', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    expect(await periksaBerkas(berkas('x.png', svg))).toMatchObject({ ok: false, kode: 'tanda-tangan-tidak-cocok' })
  })

  it('program Windows disamarkan sebagai PDF', async () => {
    const mz = gabung(enc.encode('MZ'), new Uint8Array(64))
    expect(await periksaBerkas(berkas('x.pdf', mz))).toMatchObject({ ok: false, kode: 'tanda-tangan-tidak-cocok' })
  })

  it('XLSX yang diganti namanya menjadi DOCX', async () => {
    expect(await periksaBerkas(berkas('x.docx', XLSX))).toMatchObject({ ok: false, kode: 'tanda-tangan-tidak-cocok' })
  })

  it('DOCX dan XLSX yang membawa vbaProject.bin (makro) ditolak', async () => {
    const docm = buatZip(['[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin'])
    const xlsm = buatZip(['[Content_Types].xml', 'xl/workbook.xml', 'xl/VBAProject.bin'])
    expect(await periksaBerkas(berkas('a.docx', docm))).toMatchObject({ ok: false, kode: 'berisi-makro' })
    expect(await periksaBerkas(berkas('a.xlsx', xlsm))).toMatchObject({ ok: false, kode: 'berisi-makro' })
  })

  it('arsip dengan nama entri menyusup keluar direktori (zip-slip) ditolak', async () => {
    const z = buatZip(['[Content_Types].xml', 'word/document.xml', '../../evil.sh'])
    expect(await periksaBerkas(berkas('a.docx', z))).toMatchObject({ ok: false, kode: 'arsip-rusak' })
  })

  it('arsip terpotong tanpa direktori pusat', async () => {
    const potong = DOCX.slice(0, DOCX.length - 30)
    expect(await periksaBerkas(berkas('a.docx', potong))).toMatchObject({ ok: false, kode: 'arsip-rusak' })
  })

  it('CSV biner (mengandung byte NUL)', async () => {
    const isi = gabung(enc.encode('a,b\n1,2'), bytes(0), enc.encode('3'))
    expect(await periksaBerkas(berkas('x.csv', isi))).toMatchObject({ ok: false, kode: 'bukan-teks' })
  })

  it('CSV dengan UTF-8 tidak valid', async () => {
    expect(await periksaBerkas(berkas('x.csv', bytes(0x61, 0x2c, 0xff, 0xfe, 0xc3, 0x28)))).toMatchObject({
      ok: false,
      kode: 'bukan-teks',
    })
  })
})

describe('bacaNamaEntriZip', () => {
  it('membaca nama entri dari direktori pusat', async () => {
    expect(await bacaNamaEntriZip(new Blob([DOCX]))).toEqual(['[Content_Types].xml', '_rels/.rels', 'word/document.xml'])
  })

  it('tetap menemukan direktori pusat bila arsip memiliki komentar panjang', async () => {
    const z = buatZip(['word/document.xml', '[Content_Types].xml'], { komentar: new Uint8Array(5000).fill(0x41) })
    expect(await bacaNamaEntriZip(new Blob([z]))).toEqual(['word/document.xml', '[Content_Types].xml'])
  })

  it('mengembalikan null untuk berkas yang bukan ZIP', async () => {
    expect(await bacaNamaEntriZip(new Blob([PDF]))).toBeNull()
  })
})
