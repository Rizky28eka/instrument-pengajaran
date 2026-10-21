/**
 * Konfigurasi dokumen — SATU sumber untuk validator, atribut `accept`, UI, dan tes konsistensi
 * terhadap storage.rules / firestore.rules (nilai yang sama ditulis di Rules; tes memastikan
 * keduanya tidak berbeda). Mengubah batas berarti mengubah Rules dan men-deploy-nya.
 */

export const JENIS_BERKAS = {
  pdf: { mime: 'application/pdf', label: 'PDF' },
  doc: { mime: 'application/msword', label: 'Word (DOC)' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word (DOCX)' },
  xls: { mime: 'application/vnd.ms-excel', label: 'Excel (XLS)' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel (XLSX)' },
  csv: { mime: 'text/csv', label: 'CSV' },
  jpg: { mime: 'image/jpeg', label: 'Gambar JPG' },
  jpeg: { mime: 'image/jpeg', label: 'Gambar JPEG' },
  png: { mime: 'image/png', label: 'Gambar PNG' },
} as const

export type Ekstensi = keyof typeof JENIS_BERKAS

export const EKSTENSI = Object.keys(JENIS_BERKAS) as Ekstensi[]

export const MIME_DIIZINKAN: string[] = [...new Set(Object.values(JENIS_BERKAS).map((j) => j.mime))]

/** Untuk `<input type="file" accept>`. Hanya petunjuk UI — keamanan ada di validator dan Rules. */
export const ACCEPT_ATTR = EKSTENSI.map((e) => `.${e}`).join(',')

export const DOKUMEN = {
  /** Ditegakkan Storage Rules (`maksUkuran()`), validator klien, dan UI. */
  maksUkuranByte: 10 * 1024 * 1024,
  /** Jumlah berkas dalam satu kali pilih/seret (UI). */
  maksFilePerBatch: 5,
  /** Jumlah dokumen aktif per entitas induk (UI; Rules tidak dapat menghitung koleksi). */
  maksDokumenPerRelasi: 30,
  /** Jumlah versi per dokumen. Ditegakkan firestore.rules. */
  maksVersi: 20,
  /** Lama dokumen terhapus-lunak disimpan sebelum disarankan dihapus permanen. */
  retensiHariSetelahHapus: 30,
  maksNamaTampilan: 120,
} as const

export type RelasiWajib = 'supervisi' | 'tindakLanjut' | 'guru' | null

export const KATEGORI_ID = [
  'pendukung-supervisi',
  'bukti-pelaksanaan',
  'lampiran-rekomendasi',
  'tindak-lanjut',
  'template',
  'administratif',
  'pengajuan-guru',
] as const
export type KategoriId = (typeof KATEGORI_ID)[number]

export interface Kategori {
  id: KategoriId
  label: string
  /** Entitas yang wajib dirujuk; Rules memeriksa bahwa entitas itu ada dan se-sekolah. */
  relasiWajib: RelasiWajib
  /** Masuk antrean review (alur diajukan → disetujui/ditolak/perlu revisi). */
  perluReview: boolean
}

export const KATEGORI: readonly Kategori[] = [
  { id: 'pendukung-supervisi', label: 'Dokumen pendukung supervisi', relasiWajib: 'supervisi', perluReview: false },
  { id: 'bukti-pelaksanaan', label: 'Bukti kegiatan / pelaksanaan', relasiWajib: 'supervisi', perluReview: false },
  { id: 'lampiran-rekomendasi', label: 'Lampiran rekomendasi', relasiWajib: 'supervisi', perluReview: false },
  { id: 'tindak-lanjut', label: 'Dokumen tindak lanjut', relasiWajib: 'tindakLanjut', perluReview: false },
  { id: 'template', label: 'Template / formulir', relasiWajib: null, perluReview: false },
  { id: 'administratif', label: 'Dokumen administratif', relasiWajib: null, perluReview: false },
  { id: 'pengajuan-guru', label: 'Pengajuan dokumen guru (untuk direview)', relasiWajib: 'guru', perluReview: true },
]

export const kategoriById = (id: string): Kategori | undefined => KATEGORI.find((k) => k.id === id)
