import { ASPEK, SEMUA_INDIKATOR } from '@/data/instrumen'
import type { Supervisi } from './api'

const sel = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s
}

/** Satu baris per supervisi — format siap diimpor ke Google Sheets / Excel. */
export function toCsv(rows: Supervisi[]) {
  const header = [
    'Tanggal',
    'Nama Sekolah',
    'Nama Guru',
    'Mata Pelajaran',
    'Kelas',
    'Supervisor',
    'Kurikulum',
    'Model Pembelajaran',
    ...SEMUA_INDIKATOR.map((i) => i.id),
    ...ASPEK.map((a) => 'Total ' + a.kode),
    'Total Skor',
    'Skor Maksimal',
    'Nilai',
    'Predikat',
    'Kekuatan',
    'Area Perbaikan',
    'Rekomendasi Tindak Lanjut',
  ]

  const body = rows.map((r) => {
    const i = r.identitas
    return [
      i.tanggal,
      i.namaSekolah,
      i.namaGuru,
      i.mataPelajaran,
      i.kelas,
      i.namaSupervisor,
      i.kurikulum === 'Lainnya' ? i.kurikulumLainnya : i.kurikulum,
      i.modelPembelajaran,
      ...SEMUA_INDIKATOR.map((ind) => r.skor[ind.id] ?? ''),
      ...ASPEK.map((a) => r.ringkasan.perAspek[a.id]?.total ?? 0),
      r.ringkasan.total,
      r.ringkasan.maks,
      r.ringkasan.nilai,
      r.ringkasan.predikat,
      r.catatan.kekuatan,
      r.catatan.perbaikan,
      r.catatan.rekomendasi,
    ]
  })

  return [header, ...body].map((row) => row.map(sel).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: Supervisi[]) {
  // BOM agar Excel membaca UTF-8 dengan benar.
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
