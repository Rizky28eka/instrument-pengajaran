import { semuaIndikator } from '@/data/instrumen'
import type { Supervisi } from './api'

const sel = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s
}

/** Satu baris per supervisi — format siap diimpor ke Google Sheets / Excel. */
export function toCsv(rows: Supervisi[]) {
  // Kolom indikator/aspek adalah gabungan seluruh versi instrumen yang muncul pada baris-baris ini.
  const idIndikator: string[] = []
  const kodeAspek: string[] = []
  for (const r of rows) {
    for (const i of semuaIndikator(r.instrumen)) if (!idIndikator.includes(i.id)) idIndikator.push(i.id)
    for (const a of r.instrumen.aspek) if (!kodeAspek.includes(a.kode)) kodeAspek.push(a.kode)
  }

  const header = [
    'Tanggal',
    'Nama Sekolah',
    'Nama Guru',
    'Mata Pelajaran',
    'Kelas',
    'Supervisor',
    'Kurikulum',
    'Model Pembelajaran',
    'Versi Instrumen',
    'Status Instrumen',
    ...idIndikator,
    ...kodeAspek.map((k) => 'Total ' + k),
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
      r.instrumen.versi,
      r.instrumen.status,
      ...idIndikator.map((id) => r.skor[id] ?? ''),
      ...kodeAspek.map((k) => r.ringkasan.perAspek[k]?.total ?? ''),
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
  const blob = new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
