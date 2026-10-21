import { bolehUlangi, keadaanAwal, unggahReducer, type TahapGagal, type UnggahEvent, type UnggahState } from './upload-state'

export type HasilValidasi = { ok: true } | { ok: false; pesan: string }

/**
 * Tahap-tahap satu unggahan. Implementasi nyata ada di `service.ts` (Firestore + Storage); tes
 * memakai tahap palsu. Urutan yang dijaga TugasUnggah — metadata DULU (status `mengunggah`), baru
 * berkas, baru finalisasi — membuat tidak ada berkas tanpa metadata dan metadata yang menunjuk
 * berkas hilang selalu terlihat sebagai unggahan "tertunda" yang dapat direkonsiliasi.
 */
export interface TahapUnggah {
  validasi(): Promise<HasilValidasi>
  /** Idempoten: aman dipanggil ulang setelah hasil yang tidak diketahui (mis. koneksi putus saat respons). */
  simpanMetadata(): Promise<void>
  /** Idempoten: bila berkas sudah ada di Storage dengan ukuran yang sama, tidak mengunggah lagi. */
  kirimBerkas(onProgres: (fraksi: number) => void, sinyal: AbortSignal): Promise<void>
  /** Idempoten: bila versi sudah tercatat, tidak menambah versi kedua. */
  finalisasi(): Promise<void>
  /** Membuang sisa unggahan yang belum final (berkas bila ada, lalu metadata/pending). Tidak boleh melempar. */
  bersihkan(): Promise<void>
}

export interface OpsiTugas {
  /** Menerjemahkan galat menjadi pesan untuk pengguna. */
  pesanGalat?: (e: unknown) => string
}

/**
 * Menjalankan satu unggahan sebagai mesin status. Mencegah pengiriman ganda (jalankan/ulangi yang
 * bersamaan memakai satu eksekusi), mengulang HANYA tahap yang gagal, dan mendukung pembatalan.
 */
export class TugasUnggah {
  private _state: UnggahState = keadaanAwal
  private pelanggan = new Set<(s: UnggahState) => void>()
  private berjalan: Promise<void> | null = null
  private abort = new AbortController()

  constructor(
    private readonly tahap: TahapUnggah,
    private readonly opsi: OpsiTugas = {},
  ) {}

  get state(): UnggahState {
    return this._state
  }

  subscribe(fn: (s: UnggahState) => void): () => void {
    this.pelanggan.add(fn)
    return () => void this.pelanggan.delete(fn)
  }

  jalankan(): Promise<void> {
    if (this.berjalan) return this.berjalan
    if (this._state.status !== 'menunggu') return Promise.resolve()
    return this.eksekusi(async () => {
      this.kirim({ type: 'mulai' })
      await this.lanjut()
    })
  }

  ulangi(): Promise<void> {
    if (this.berjalan) return this.berjalan
    if (!bolehUlangi(this._state)) return Promise.resolve()
    return this.eksekusi(async () => {
      this.kirim({ type: 'ulangi' })
      await this.lanjut()
    })
  }

  /** Membatalkan unggahan yang berjalan/gagal lalu membersihkan sisanya. Tidak berpengaruh setelah berhasil. */
  async batal(): Promise<void> {
    const sebelum = this._state.status
    this.kirim({ type: 'batal' })
    if (this._state.status !== 'dibatalkan') return
    this.abort.abort()
    try {
      await this.berjalan
    } catch {
      /* galat tahap yang dibatalkan tidak relevan */
    }
    // Belum ada apa pun yang dibuat sebelum metadata tersimpan.
    if (sebelum === 'menunggu' || sebelum === 'memvalidasi') return
    try {
      await this.tahap.bersihkan()
    } catch {
      /* pembersihan best-effort; sisa unggahan tertunda dapat dibuang dari daftar dokumen */
    }
  }

  private eksekusi(fn: () => Promise<void>): Promise<void> {
    this.berjalan = fn().finally(() => {
      this.berjalan = null
    })
    return this.berjalan
  }

  private kirim(e: UnggahEvent) {
    const baru = unggahReducer(this._state, e)
    if (baru === this._state) return
    this._state = baru
    for (const fn of this.pelanggan) fn(baru)
  }

  private gagal(tahap: Exclude<TahapGagal, 'validasi'>, e: unknown) {
    const pesan = this.opsi.pesanGalat?.(e) ?? (e instanceof Error ? e.message : String(e))
    this.kirim({ type: 'gagal', tahap, pesan })
  }

  /** Menjalankan tahap sesuai status sekarang sampai selesai, gagal, atau dibatalkan. */
  private async lanjut() {
    for (;;) {
      switch (this._state.status) {
        case 'memvalidasi': {
          const hasil = await this.tahap.validasi()
          if (!hasil.ok) return this.kirim({ type: 'ditolak', pesan: hasil.pesan })
          this.kirim({ type: 'valid' })
          break
        }
        case 'menyimpan-metadata':
          try {
            await this.tahap.simpanMetadata()
          } catch (e) {
            return this.gagal('metadata', e)
          }
          this.kirim({ type: 'metadata-tersimpan' })
          break
        case 'mengunggah':
          this.abort = new AbortController()
          try {
            await this.tahap.kirimBerkas((fraksi) => this.kirim({ type: 'progres', fraksi }), this.abort.signal)
          } catch (e) {
            // Dibatalkan pengguna: status sudah 'dibatalkan', pembersihan dilakukan oleh batal().
            if (this._state.status !== 'mengunggah') return
            return this.gagal('unggah', e)
          }
          this.kirim({ type: 'unggah-selesai' })
          break
        case 'menyelesaikan':
          try {
            await this.tahap.finalisasi()
          } catch (e) {
            return this.gagal('finalisasi', e)
          }
          this.kirim({ type: 'selesai' })
          break
        default:
          return
      }
    }
  }
}
