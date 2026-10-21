import { describe, expect, it } from 'vitest'
import { INSTRUMEN_AKTIF, semuaIndikator } from '@/data/instrumen'
import { hitungRingkasan } from '@/lib/scoring'
import type { Supervisi } from './api'
import { amankanTeks, sel, toCsv } from './csv'

/** Pengurai CSV RFC 4180 minimal untuk memverifikasi bentuk keluaran (bukan untuk produksi). */
function parseCsv(csv: string): string[][] {
  const baris: string[][] = []
  let rec: string[] = []
  let cur = ''
  let kutip = false
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]
    if (kutip) {
      if (c === '"' && csv[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') kutip = false
      else cur += c
    } else if (c === '"') kutip = true
    else if (c === ',') {
      rec.push(cur)
      cur = ''
    } else if (c === '\r' && csv[i + 1] === '\n') {
      rec.push(cur)
      baris.push(rec)
      rec = []
      cur = ''
      i++
    } else cur += c
  }
  rec.push(cur)
  baris.push(rec)
  return baris
}

function contoh(sebagian: { namaGuru?: string; namaSekolah?: string; kekuatan?: string } = {}): Supervisi {
  const skor = Object.fromEntries(semuaIndikator(INSTRUMEN_AKTIF).map((i) => [i.id, 3]))
  return {
    id: 'x',
    schoolId: 's1',
    guruId: 'g1',
    guruNama: sebagian.namaGuru ?? 'Budi',
    rev: 1,
    updatedBy: 'u',
    deletedAt: null,
    deletedBy: null,
    identitas: {
      namaSekolah: sebagian.namaSekolah ?? 'SMP Harapan',
      namaGuru: sebagian.namaGuru ?? 'Budi',
      mataPelajaran: 'IPA',
      kelas: 'VII A',
      namaSupervisor: 'Siti',
      tanggal: '2026-10-21',
      kurikulum: 'Kurikulum Merdeka',
      modelPembelajaran: 'Tatap Muka',
    },
    skor,
    catatanAspek: {},
    catatan: { kekuatan: sebagian.kekuatan ?? '', perbaikan: '', rekomendasi: '' },
    instrumen: INSTRUMEN_AKTIF,
    snapshotSah: true,
    ringkasan: hitungRingkasan(skor, INSTRUMEN_AKTIF),
    createdBy: 'u',
    createdByName: 'u',
    createdAt: null,
    updatedAt: null,
  }
}

describe('amankanTeks — formula injection', () => {
  it.each([
    ['=1+1', "'=1+1"],
    ['+62812', "'+62812"],
    ['-5', "'-5"],
    ['@SUM(A1:A9)', "'@SUM(A1:A9)"],
    ['=HYPERLINK("http://jahat.example","klik")', `'=HYPERLINK("http://jahat.example","klik")`],
    ['\t=1+1', "'\t=1+1"],
    [' =1+1', "' =1+1"],
    ['   @x', "'   @x"],
    ['\n=1+1', "'\n=1+1"],
    ['\r=1+1', "'\n=1+1"],
    ['\u0000=1+1', "'=1+1"],
    ['​=1+1', "'​=1+1"],
  ])('menetralkan %j', (masuk, keluar) => {
    expect(amankanTeks(masuk)).toBe(keluar)
  })

  it.each(['Budi Santoso', 'Bu Ratna, S.Pd.', 'a=b', 'IPA - Kelas 7', 'Kelas 7 + 8', 'email@contoh.id', '', 'Siti "Sari" Dewi', '日本語', 'ÅÄÖ é ñ'])(
    'tidak mengubah teks normal %j',
    (teks) => {
      expect(amankanTeks(teks)).toBe(teks)
    },
  )

  it('membuang karakter kontrol tetapi mempertahankan baris baru', () => {
    expect(amankanTeks('a\u0007b\nc')).toBe('ab\nc')
  })
})

describe('sel — escaping CSV', () => {
  it('angka tidak diberi kutip pengaman, termasuk negatif', () => {
    expect(sel(-5)).toBe('-5')
    expect(sel(83.33)).toBe('83.33')
    expect(sel(0)).toBe('0')
  })

  it('null dan undefined menjadi sel kosong', () => {
    expect(sel(null)).toBe('')
    expect(sel(undefined)).toBe('')
  })

  it('meng-escape koma, kutip ganda, dan baris baru', () => {
    expect(sel('a,b')).toBe('"a,b"')
    expect(sel('ia berkata "halo"')).toBe('"ia berkata ""halo"""')
    expect(sel('baris1\nbaris2')).toBe('"baris1\nbaris2"')
  })

  it('kombinasi: rumus yang juga memuat koma dan kutip tetap aman', () => {
    expect(sel('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`)
  })
})

describe('toCsv', () => {
  it('satu header + satu baris per supervisi, kolom sejajar', () => {
    const baris = parseCsv(toCsv([contoh(), contoh({ namaGuru: 'Siti' })]))
    expect(baris).toHaveLength(3)
    expect(new Set(baris.map((b) => b.length)).size).toBe(1)
  })

  it('kolom tetap sejajar untuk isian yang berisi koma, kutip, dan baris baru', () => {
    const csv = toCsv([contoh({ namaSekolah: 'SMP "Harapan", Bangsa', kekuatan: 'baris1\nbaris2, "ok"' })])
    const baris = parseCsv(csv)
    expect(baris).toHaveLength(2)
    expect(baris[0].length).toBe(baris[1].length)
    const kolom = (nama: string) => baris[1][baris[0].indexOf(nama)]
    expect(kolom('Nama Sekolah')).toBe('SMP "Harapan", Bangsa')
    expect(kolom('Kekuatan')).toBe('baris1\nbaris2, "ok"')
  })

  it('isian berbahaya pada sel mana pun tidak diawali karakter rumus setelah di-parse', () => {
    const csv = toCsv([contoh({ namaGuru: '=cmd|\' /C calc\'!A0', namaSekolah: '+1+1', kekuatan: '@SUM(1)' })])
    const [header, data] = parseCsv(csv)
    for (const nama of ['Nama Guru', 'Nama Sekolah', 'Kekuatan']) {
      const nilai = data[header.indexOf(nama)]
      expect(nilai.startsWith("'")).toBe(true)
      expect(/^[=+\-@]/.test(nilai)).toBe(false)
    }
  })

  it('nilai numerik skor tetap angka murni', () => {
    const [header, data] = parseCsv(toCsv([contoh()]))
    expect(data[header.indexOf('B4')]).toBe('3')
    expect(data[header.indexOf('Nilai')]).toBe('75')
  })

  it('menyertakan versi dan status instrumen', () => {
    const [header, data] = parseCsv(toCsv([contoh()]))
    expect(data[header.indexOf('Versi Instrumen')]).toBe(INSTRUMEN_AKTIF.versi)
    expect(data[header.indexOf('Status Instrumen')]).toBe('provisional')
  })
})
