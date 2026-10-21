import { semuaIndikator, type Indikator, type Instrumen } from './instrumen-types'

/**
 * Indikator yang BELUM dikonfirmasi dengan dokumen sumber, per versi instrumen.
 *
 * Dokumen sumber berhenti pada indikator C3, jadi C4–C6 serta seluruh aspek D dan E adalah rancangan awal.
 * Daftar ini sengaja TERPISAH dari berkas instrumen: berkas versi lama tidak boleh diubah (AGENTS.md) dan
 * snapshot yang tersimpan di dokumen supervisi tidak berubah. Pencocokan lewat versi + ID indikator, sehingga
 * dokumen lama pun ikut ditandai. Penanda tidak memengaruhi skor, nilai, maupun predikat — hanya agar tidak ada
 * indikator yang tampak resmi padahal belum. Melengkapi instrumen = berkas versi baru (tanpa entri di sini).
 */
const BELUM_TERKONFIRMASI: Readonly<Record<string, ReadonlySet<string>>> = {
  '1-provisional': new Set(['C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'D5', 'E1', 'E2', 'E3', 'E4', 'E5']),
}

export const belumTerkonfirmasi = (versi: string, indikatorId: string): boolean => BELUM_TERKONFIRMASI[versi]?.has(indikatorId) ?? false

export const indikatorBelumTerkonfirmasi = (i: Instrumen): Indikator[] => semuaIndikator(i).filter((x) => belumTerkonfirmasi(i.versi, x.id))
