import { semuaIndikator } from '@/data/instrumen'
import type { Supervisi } from './api'

/**
 * Pencegahan CSV / formula injection.
 *
 * Excel, LibreOffice, dan Google Sheets menjalankan sel yang diawali `=`, `+`, `-`, `@`
 * (juga yang didahului spasi, tab, atau karakter kontrol). Sel TEKS seperti itu diawali
 * tanda kutip tunggal sehingga dibaca sebagai teks. Angka sungguhan (tipe number) tidak diubah.
 *
 * Keterbatasan: pada impor CSV, sebagian aplikasi (mis. Excel) menampilkan tanda kutip itu
 * secara harfiah. Itu harga yang disengaja agar isian pengguna tidak pernah dieksekusi.
 */
// oxlint-disable-next-line no-control-regex -- karakter kontrol memang yang dicari
const AWAL_BERBAHAYA = /^[\s\u0000-\u001f\u007f\u200b\ufeff]*[=+\-@]/
// Karakter kontrol C0 selain tab, LF, CR.
// oxlint-disable-next-line no-control-regex -- karakter kontrol memang yang dibuang
const KONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

export function amankanTeks(teks: string): string {
  const bersih = teks
    .replace(/\r\n?|\u2028|\u2029/g, '\n') // satukan pemisah baris
    .replace(KONTROL, '')
  return AWAL_BERBAHAYA.test(bersih) ? "'" + bersih : bersih
}

/** Mengubah satu nilai menjadi sel CSV (RFC 4180): kutip bila memuat koma, kutip, atau baris baru. */
export function sel(v: unknown): string {
  if (v == null) return ''
  const s = typeof v === 'number' || typeof v === 'boolean' ? String(v) : amankanTeks(String(v))
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
