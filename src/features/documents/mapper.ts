import { keDate, type Waktu } from '@/lib/waktu'
import { KATEGORI_ID, type KategoriId } from './config'
import { STATUS_DOKUMEN, type DokumenDoc, type EntriKeputusan, type PendingBerkas, type RincianBerkas, type StatusDokumen, type VersiBerkas } from './model'
import { REVIEW_STATUS, type ReviewStatus } from './review'

type Mentah = Record<string, any>

const str = (v: unknown, bawaan = ''): string => (typeof v === 'string' ? v : bawaan)
const strAtauNull = (v: unknown): string | null => (typeof v === 'string' ? v : null)

function rincian(v: Mentah | null | undefined): RincianBerkas | null {
  if (!v || typeof v !== 'object') return null
  if (typeof v.n !== 'number' || typeof v.size !== 'number') return null
  if (![v.storagePath, v.fileName, v.mimeType, v.sha256, v.uploadedBy].every((x) => typeof x === 'string')) return null
  return { n: v.n, storagePath: v.storagePath, fileName: v.fileName, mimeType: v.mimeType, size: v.size, sha256: v.sha256, uploadedBy: v.uploadedBy }
}

function versi(v: Mentah): VersiBerkas | null {
  const r = rincian(v)
  return r ? { ...r, uploadedAt: keDate(v.uploadedAt as Waktu) } : null
}

function pending(v: Mentah | null | undefined): PendingBerkas | null {
  const r = rincian(v)
  return r ? { ...r, startedAt: keDate(v?.startedAt as Waktu) } : null
}

function keputusan(v: unknown): EntriKeputusan | null {
  if (!v || typeof v !== 'object') return null
  const e = v as Mentah
  if (typeof e.status !== 'string' || typeof e.oleh !== 'string') return null
  return { status: e.status, oleh: e.oleh, nama: str(e.nama), catatan: str(e.catatan), at: keDate(e.at as Waktu) }
}

const daftar = <T>(v: unknown, peta: (x: Mentah) => T | null): T[] =>
  Array.isArray(v) ? v.flatMap((x) => (x && typeof x === 'object' ? [peta(x as Mentah)].filter((y): y is T => y !== null) : [])) : []

/**
 * Murni. Nilai tak dikenal jatuh ke bawaan yang hati-hati: status tak dikenal ≠ "tersedia" (tidak
 * boleh diunduh), kategori tak dikenal menjadi "administratif".
 */
export function dokumenKeDokumen(id: string, d: Mentah): DokumenDoc {
  return {
    id,
    schoolId: str(d.schoolId),
    kategori: (KATEGORI_ID as readonly unknown[]).includes(d.kategori) ? (d.kategori as KategoriId) : 'administratif',
    supervisiId: strAtauNull(d.supervisiId),
    guruId: strAtauNull(d.guruId),
    tindakId: strAtauNull(d.tindakId),
    judul: str(d.judul),
    status: (STATUS_DOKUMEN as readonly unknown[]).includes(d.status) ? (d.status as StatusDokumen) : 'mengunggah',
    currentVersion: typeof d.currentVersion === 'number' ? d.currentVersion : 0,
    versions: daftar(d.versions, versi),
    pending: pending(d.pending),
    reviewStatus: (REVIEW_STATUS as readonly unknown[]).includes(d.reviewStatus) ? (d.reviewStatus as ReviewStatus) : null,
    reviewRiwayat: daftar(d.reviewRiwayat, keputusan),
    createdBy: str(d.createdBy),
    createdByName: str(d.createdByName),
    createdAt: keDate(d.createdAt as Waktu),
    updatedAt: keDate(d.updatedAt as Waktu),
    deletedAt: keDate(d.deletedAt as Waktu),
    deletedBy: strAtauNull(d.deletedBy),
  }
}

/** Versi yang sedang berlaku (null bila belum ada versi final). */
export function versiAktif(d: DokumenDoc): VersiBerkas | null {
  return d.versions.find((v) => v.n === d.currentVersion) ?? null
}
