/**
 * Mesin status satu unggahan. Murni (tanpa efek samping) agar urutan, kegagalan, dan percobaan
 * ulang dapat diuji tanpa jaringan. Orkestrasi nyata ada di `service.ts`.
 *
 * Tahap: validasi → metadata awal (status `mengunggah`) → unggah ke Storage → finalisasi metadata.
 * Kegagalan mengulang HANYA tahap yang gagal: unggah yang sudah selesai tidak diulang bila
 * hanya finalisasi yang gagal.
 */
export type UnggahStatus =
  | 'menunggu'
  | 'memvalidasi'
  | 'menyimpan-metadata'
  | 'mengunggah'
  | 'menyelesaikan'
  | 'berhasil'
  | 'gagal'
  | 'dibatalkan'

export type TahapGagal = 'validasi' | 'metadata' | 'unggah' | 'finalisasi'

export interface UnggahState {
  status: UnggahStatus
  /** 0..1, tidak pernah mundur selama satu percobaan. */
  progres: number
  percobaan: number
  tahapGagal?: TahapGagal
  pesan?: string
}

export type UnggahEvent =
  | { type: 'mulai' }
  | { type: 'valid' }
  | { type: 'ditolak'; pesan: string }
  | { type: 'metadata-tersimpan' }
  | { type: 'progres'; fraksi: number }
  | { type: 'unggah-selesai' }
  | { type: 'selesai' }
  | { type: 'gagal'; tahap: Exclude<TahapGagal, 'validasi'>; pesan: string }
  | { type: 'batal' }
  | { type: 'ulangi' }

export const keadaanAwal: UnggahState = { status: 'menunggu', progres: 0, percobaan: 0 }

const STATUS_TAHAP: Record<Exclude<TahapGagal, 'validasi'>, UnggahStatus> = {
  metadata: 'menyimpan-metadata',
  unggah: 'mengunggah',
  finalisasi: 'menyelesaikan',
}

const BISA_DIBATALKAN: UnggahStatus[] = ['menunggu', 'memvalidasi', 'menyimpan-metadata', 'mengunggah', 'gagal']

export function bolehUlangi(s: UnggahState): boolean {
  return s.status === 'gagal' && !!s.tahapGagal && s.tahapGagal !== 'validasi'
}

export function unggahReducer(s: UnggahState, e: UnggahEvent): UnggahState {
  switch (e.type) {
    case 'mulai':
      return s.status === 'menunggu' ? { ...s, status: 'memvalidasi' } : s
    case 'valid':
      return s.status === 'memvalidasi' ? { ...s, status: 'menyimpan-metadata' } : s
    case 'ditolak':
      return s.status === 'memvalidasi' ? { ...s, status: 'gagal', tahapGagal: 'validasi', pesan: e.pesan } : s
    case 'metadata-tersimpan':
      return s.status === 'menyimpan-metadata' ? { ...s, status: 'mengunggah' } : s
    case 'progres': {
      if (s.status !== 'mengunggah') return s
      const fraksi = Math.min(1, Math.max(0, Number.isFinite(e.fraksi) ? e.fraksi : 0))
      return fraksi > s.progres ? { ...s, progres: fraksi } : s
    }
    case 'unggah-selesai':
      return s.status === 'mengunggah' ? { ...s, status: 'menyelesaikan', progres: 1 } : s
    case 'selesai':
      return s.status === 'menyelesaikan' ? { ...s, status: 'berhasil', progres: 1 } : s
    case 'gagal':
      return s.status === STATUS_TAHAP[e.tahap] ? { ...s, status: 'gagal', tahapGagal: e.tahap, pesan: e.pesan } : s
    case 'batal':
      return BISA_DIBATALKAN.includes(s.status) ? { ...s, status: 'dibatalkan' } : s
    case 'ulangi': {
      if (!bolehUlangi(s)) return s
      const tahap = s.tahapGagal as Exclude<TahapGagal, 'validasi'>
      return {
        status: STATUS_TAHAP[tahap],
        progres: tahap === 'unggah' ? 0 : s.progres,
        percobaan: s.percobaan + 1,
      }
    }
  }
}
