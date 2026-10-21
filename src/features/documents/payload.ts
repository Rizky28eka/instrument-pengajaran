import { arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore'
import { entriKeputusan, type Pelaku } from '@/lib/riwayat'
import { kategoriById, type KategoriId } from './config'
import type { RelasiDokumen } from './daftar'
import type { DokumenDoc, PendingBerkas, RincianBerkas } from './model'
import type { ReviewStatus } from './review'

/**
 * Pembangun isi dokumen `documents` untuk Firestore. Murni (selain penanda server) agar bentuk yang
 * dikirim aplikasi dapat diuji langsung terhadap firestore.rules di emulator.
 */
export type PelakuDokumen = Pelaku

const tanpaWaktuMulai = (p: PendingBerkas): RincianBerkas => {
  const { startedAt: _startedAt, ...rincian } = p
  return rincian
}

/** Dokumen baru: status `mengunggah`, belum ada versi, rincian berkas dicadangkan di `pending`. */
export function isiDokumenBaru(o: { schoolId: string; kategori: KategoriId; relasi: RelasiDokumen; judul: string; pengguna: PelakuDokumen; rincian: RincianBerkas }) {
  const perluReview = kategoriById(o.kategori)?.perluReview === true
  return {
    schoolId: o.schoolId,
    kategori: o.kategori,
    supervisiId: o.relasi.supervisiId ?? null,
    guruId: o.relasi.guruId ?? null,
    tindakId: o.relasi.tindakId ?? null,
    judul: o.judul,
    status: 'mengunggah' as const,
    currentVersion: 0,
    versions: [] as unknown[],
    pending: { ...o.rincian, startedAt: Timestamp.now() },
    reviewStatus: perluReview ? ('diajukan' as const) : null,
    reviewRiwayat: perluReview ? [entriKeputusan('diajukan', o.pengguna)] : [],
    createdBy: o.pengguna.uid,
    createdByName: o.pengguna.nama.slice(0, 100),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
    deletedBy: null,
  }
}

/** Memulai versi berikutnya pada dokumen yang sudah tersedia. */
export function isiMulaiVersi(rincian: RincianBerkas) {
  return { pending: { ...rincian, startedAt: Timestamp.now() }, updatedAt: serverTimestamp() }
}

/**
 * Menambah tepat satu versi dari `pending` lalu mengosongkannya. Pada dokumen "perlu revisi",
 * versi baru otomatis mengajukan ulang dan tercatat di riwayat review.
 */
export function isiFinalisasi(dok: DokumenDoc, pengguna: PelakuDokumen) {
  if (!dok.pending) throw new Error('Tidak ada unggahan tertunda untuk difinalisasi.')
  const rincian = tanpaWaktuMulai(dok.pending)
  return {
    status: 'tersedia' as const,
    currentVersion: rincian.n,
    versions: arrayUnion({ ...rincian, uploadedAt: Timestamp.now() }),
    pending: null,
    ...(dok.reviewStatus === 'perlu_revisi'
      ? { reviewStatus: 'diajukan' as const, reviewRiwayat: arrayUnion(entriKeputusan('diajukan', pengguna)) }
      : {}),
    updatedAt: serverTimestamp(),
  }
}

export const isiBatalkanPending = () => ({ pending: null, updatedAt: serverTimestamp() })

export const isiUbahJudul = (judul: string) => ({ judul, updatedAt: serverTimestamp() })

export const isiHapusLunak = (pengguna: PelakuDokumen) => ({
  status: 'dihapus' as const,
  deletedAt: serverTimestamp(),
  deletedBy: pengguna.uid,
  updatedAt: serverTimestamp(),
})

export const isiPulihkan = () => ({ status: 'tersedia' as const, deletedAt: null, deletedBy: null, updatedAt: serverTimestamp() })

export function isiKeputusanReview(ke: ReviewStatus, catatan: string, pengguna: PelakuDokumen) {
  return { reviewStatus: ke, reviewRiwayat: arrayUnion(entriKeputusan(ke, pengguna, catatan.trim())), updatedAt: serverTimestamp() }
}
