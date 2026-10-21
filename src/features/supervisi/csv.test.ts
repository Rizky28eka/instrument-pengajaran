import { describe, expect, it } from 'vitest'
import { SEMUA_INDIKATOR } from '@/data/instrumen'
import { hitungRingkasan } from '@/lib/scoring'
import type { Supervisi } from './api'
import { toCsv } from './csv'

function contoh(catatan: string): Supervisi {
  const skor = Object.fromEntries(SEMUA_INDIKATOR.map((i) => [i.id, 3]))
  return {
    id: 'x',
    identitas: {
      namaSekolah: 'SMP "Harapan", Bangsa',
      namaGuru: 'Budi',
      mataPelajaran: 'IPA',
      kelas: 'VII A',
      namaSupervisor: 'Siti',
      tanggal: '2026-10-21',
      kurikulum: 'Kurikulum Merdeka',
      modelPembelajaran: 'Tatap Muka',
    },
    skor,
    catatanAspek: {},
    catatan: { kekuatan: catatan, perbaikan: '', rekomendasi: '' },
    ringkasan: hitungRingkasan(skor),
    createdBy: 'u',
    createdByName: 'u',
    createdAt: null,
    updatedAt: null,
  }
}

describe('toCsv', () => {
  it('satu header + satu baris per supervisi, kolom sejajar', () => {
    const data = contoh('baik')
    data.identitas.namaSekolah = 'SMP Harapan' // tanpa koma agar split sederhana valid
    const baris = toCsv([data]).split('\r\n')
    expect(baris).toHaveLength(2)
    expect(baris[0].split(',')).toHaveLength(baris[1].split(',').length)
  })

  it('meng-escape koma, kutip, dan baris baru', () => {
    const csv = toCsv([contoh('baris1\nbaris2')])
    expect(csv).toContain('"SMP ""Harapan"", Bangsa"')
    expect(csv).toContain('"baris1\nbaris2"')
  })
})
