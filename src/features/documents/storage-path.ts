import { DOKUMEN, JENIS_BERKAS, type Ekstensi } from './config'

/** Karakter kendali, pemformat tak terlihat, dan pengubah arah teks (RTL override, isolat bidi). */
function karakterTerlarang(kode: number): boolean {
  return (
    kode <= 0x1f ||
    (kode >= 0x7f && kode <= 0x9f) ||
    (kode >= 0x200b && kode <= 0x200f) ||
    (kode >= 0x202a && kode <= 0x202e) ||
    (kode >= 0x2060 && kode <= 0x2069) ||
    kode === 0xfeff
  )
}

/**
 * Nama berkas untuk TAMPILAN saja. Tidak pernah dipakai sebagai path penyimpanan: nama objek di
 * Storage selalu acak (lihat `buatPathObjek`).
 */
export function namaTampilan(nama: string): string {
  const bersih = [...nama.normalize('NFC')].filter((c) => !karakterTerlarang(c.codePointAt(0)!)).join('')
  let n = (bersih.split(/[\\/]+/).pop() ?? '').replace(/\s+/g, ' ').trim().replace(/^\.+/, '')
  if (!n) return 'berkas'

  if (n.length > DOKUMEN.maksNamaTampilan) {
    const ext = n.match(/\.[A-Za-z0-9]{1,8}$/)?.[0] ?? ''
    let pangkal = n.slice(0, DOKUMEN.maksNamaTampilan - ext.length)
    // Jangan memotong di tengah pasangan surrogate.
    if (/[\ud800-\udbff]$/.test(pangkal)) pangkal = pangkal.slice(0, -1)
    n = pangkal + ext
  }
  return n
}

const ID_AMAN = /^[A-Za-z0-9_-]{1,64}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export interface BahanPath {
  schoolId: string
  docId: string
  versi: number
  ext: Ekstensi
  /** Hanya untuk tes; bawaan `crypto.randomUUID()`. */
  uuid?: string
}

/** `sekolah/{schoolId}/dokumen/{docId}/v{versi}/{uuid}.{ext}` — terkunci ke sekolah, dokumen, dan versi. */
export function buatPathObjek({ schoolId, docId, versi, ext, uuid = crypto.randomUUID() }: BahanPath): string {
  if (!ID_AMAN.test(schoolId)) throw new Error('schoolId tidak aman untuk path penyimpanan.')
  if (!ID_AMAN.test(docId)) throw new Error('docId tidak aman untuk path penyimpanan.')
  if (!Number.isInteger(versi) || versi < 1 || versi > DOKUMEN.maksVersi) throw new Error('Nomor versi tidak valid.')
  if (!Object.hasOwn(JENIS_BERKAS, ext)) throw new Error('Ekstensi tidak diizinkan.')
  if (!UUID.test(uuid)) throw new Error('Nama objek harus berupa UUID.')
  return `sekolah/${schoolId}/dokumen/${docId}/v${versi}/${uuid}.${ext}`
}

const POLA_PATH = /^sekolah\/([A-Za-z0-9_-]{1,64})\/dokumen\/([A-Za-z0-9_-]{1,64})\/v([1-9][0-9]{0,2})\/([0-9a-f-]{36})\.([a-z]+)$/

export interface PathObjek {
  schoolId: string
  docId: string
  versi: number
  nama: string
  ext: Ekstensi
}

export function parsePathObjek(path: string): PathObjek | null {
  const m = path.match(POLA_PATH)
  if (!m || !UUID.test(m[4]) || !Object.hasOwn(JENIS_BERKAS, m[5])) return null
  return { schoolId: m[1], docId: m[2], versi: Number(m[3]), nama: m[4], ext: m[5] as Ekstensi }
}
