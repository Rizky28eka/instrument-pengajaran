import { Timestamp } from 'firebase/firestore'

export interface Pelaku {
  uid: string
  nama: string
}

/**
 * Entri riwayat keputusan (review dokumen, status tindak lanjut). Nama adalah snapshot untuk tampilan;
 * identitas sebenarnya `oleh`. Waktu dari jam klien karena array tidak boleh memuat serverTimestamp —
 * Rules membatasi selisihnya dari waktu server; waktu otoritatif tetap `updatedAt` dokumen induk.
 */
export const entriKeputusan = (status: string, pelaku: Pelaku, catatan = '') => ({
  status,
  oleh: pelaku.uid,
  nama: pelaku.nama.slice(0, 100),
  catatan,
  at: Timestamp.now(),
})
