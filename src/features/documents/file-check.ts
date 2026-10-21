import { DOKUMEN, JENIS_BERKAS, type Ekstensi } from './config'

/**
 * Pemeriksaan berkas di klien: ekstensi, ukuran, dan tanda tangan isi (magic bytes).
 *
 * BATASAN YANG DIAKUI: klien yang dimodifikasi dapat melewati pemeriksaan ini. Pertahanan sisi
 * server hanyalah Storage Rules (path, ukuran, contentType, kepemilikan). Lolos pemeriksaan ini
 * TIDAK berarti berkas bebas malware — untuk dokumen berisiko tinggi gunakan pemindaian antivirus
 * di backend tepercaya (lihat docs/ARSITEKTUR-DOKUMEN.md). Berkas tidak pernah dieksekusi atau
 * di-render sebagai HTML oleh aplikasi.
 */

export type KodeTolak =
  | 'kosong'
  | 'terlalu-besar'
  | 'ekstensi-tidak-didukung'
  | 'tanda-tangan-tidak-cocok'
  | 'berisi-makro'
  | 'bukan-teks'
  | 'arsip-rusak'

export type HasilPeriksa =
  | { ok: true; ext: Ekstensi; mime: string; ukuran: number; sha256: string }
  | { ok: false; kode: KodeTolak; pesan: string }

const PESAN: Record<KodeTolak, string> = {
  kosong: 'Berkas kosong.',
  'terlalu-besar': 'Ukuran berkas melebihi batas.',
  'ekstensi-tidak-didukung': 'Jenis berkas tidak didukung.',
  'tanda-tangan-tidak-cocok': 'Isi berkas tidak sesuai dengan ekstensinya.',
  'berisi-makro': 'Berkas berisi makro dan tidak diizinkan.',
  'bukan-teks': 'Berkas CSV harus berupa teks UTF-8.',
  'arsip-rusak': 'Struktur berkas rusak atau tidak aman.',
}

const tolak = (kode: KodeTolak): HasilPeriksa => ({ ok: false, kode, pesan: PESAN[kode] })

const SIG = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff],
  ole2: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  zip: [0x50, 0x4b, 0x03, 0x04],
}

const mulaiDengan = (b: Uint8Array, sig: number[]) => b.length >= sig.length && sig.every((v, i) => b[i] === v)

function ekstensiDari(nama: string): Ekstensi | null {
  const e = nama.trim().match(/\.([A-Za-z0-9]+)$/)?.[1].toLowerCase()
  return e && Object.hasOwn(JENIS_BERKAS, e) ? (e as Ekstensi) : null
}

const EOCD_SIG = 0x06054b50
const CD_SIG = 0x02014b50
const EOCD_MIN = 22
const MAKS_KOMENTAR = 0xffff
const MAKS_DIREKTORI_PUSAT = 4 * 1024 * 1024

/**
 * Membaca nama entri dari direktori pusat ZIP tanpa mengekstrak/mendekompresi apa pun.
 * Mengembalikan null bila bukan ZIP yang dapat dibaca (termasuk ZIP64 — tidak relevan untuk batas 10 MB).
 */
export async function bacaNamaEntriZip(blob: Blob): Promise<string[] | null> {
  const panjangEkor = Math.min(blob.size, EOCD_MIN + MAKS_KOMENTAR)
  if (panjangEkor < EOCD_MIN) return null
  const ekor = new Uint8Array(await blob.slice(blob.size - panjangEkor).arrayBuffer())
  const ev = new DataView(ekor.buffer)

  // Cari EOCD dari belakang. EOCD sah harus berakhir tepat di akhir berkas (panjang komentar
  // cocok), sehingga tanda tangan palsu di dalam komentar tidak dipakai.
  let e = -1
  for (let i = ekor.length - EOCD_MIN; i >= 0; i--) {
    if (ev.getUint32(i, true) === EOCD_SIG && i + EOCD_MIN + ev.getUint16(i + 20, true) === ekor.length) {
      e = i
      break
    }
  }
  if (e < 0) return null

  const total = ev.getUint16(e + 10, true)
  const ukuranPusat = ev.getUint32(e + 12, true)
  const offsetPusat = ev.getUint32(e + 16, true)
  if (total === 0xffff || ukuranPusat === 0xffffffff || offsetPusat === 0xffffffff) return null
  if (ukuranPusat > MAKS_DIREKTORI_PUSAT || offsetPusat + ukuranPusat > blob.size) return null

  const pusat = new Uint8Array(await blob.slice(offsetPusat, offsetPusat + ukuranPusat).arrayBuffer())
  const pv = new DataView(pusat.buffer)
  const dec = new TextDecoder('utf-8')
  const nama: string[] = []
  let pos = 0
  for (let i = 0; i < total; i++) {
    if (pos + 46 > pusat.length || pv.getUint32(pos, true) !== CD_SIG) return null
    const n = pv.getUint16(pos + 28, true)
    const extra = pv.getUint16(pos + 30, true)
    const komentar = pv.getUint16(pos + 32, true)
    if (pos + 46 + n > pusat.length) return null
    nama.push(dec.decode(pusat.subarray(pos + 46, pos + 46 + n)))
    pos += 46 + n + extra + komentar
  }
  return nama
}

const adaMakro = (nama: string[]) => nama.some((n) => /(^|\/)vbaproject\.bin$/i.test(n))
const namaMencurigakan = (n: string) => n.startsWith('/') || n.includes('\\') || n.split('/').includes('..')

/** Memeriksa berkas OOXML (docx/xlsx). Mengembalikan kode tolak, atau null bila lolos. */
async function periksaOoxml(file: File, ext: 'docx' | 'xlsx'): Promise<KodeTolak | null> {
  const nama = await bacaNamaEntriZip(file)
  if (!nama) return 'arsip-rusak'
  if (nama.some(namaMencurigakan)) return 'arsip-rusak'
  if (adaMakro(nama)) return 'berisi-makro'
  const bagianWajib = ext === 'docx' ? 'word/document.xml' : 'xl/workbook.xml'
  if (!nama.includes('[Content_Types].xml') || !nama.includes(bagianWajib)) return 'tanda-tangan-tidak-cocok'
  return null
}

function periksaTeks(kepala: Uint8Array): KodeTolak | null {
  if (kepala.includes(0)) return 'bukan-teks'
  try {
    // stream: true agar karakter multibyte yang terpotong di batas potongan tidak dianggap rusak.
    new TextDecoder('utf-8', { fatal: true }).decode(kepala, { stream: true })
    return null
  } catch {
    return 'bukan-teks'
  }
}

/** SHA-256 heksadesimal. Dipakai untuk mendeteksi duplikat dan memverifikasi integritas unduhan. */
export async function sha256Hex(data: Blob | Uint8Array): Promise<string> {
  const isi = data instanceof Blob ? await data.arrayBuffer() : data.slice().buffer
  const hash = await crypto.subtle.digest('SHA-256', isi)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function periksaBerkas(file: File, batas: number = DOKUMEN.maksUkuranByte): Promise<HasilPeriksa> {
  if (file.size === 0) return tolak('kosong')
  if (file.size > batas) return tolak('terlalu-besar')

  const ext = ekstensiDari(file.name)
  if (!ext) return tolak('ekstensi-tidak-didukung')

  const kepala = new Uint8Array(await file.slice(0, 65536).arrayBuffer())
  let kode: KodeTolak | null = null

  switch (ext) {
    case 'pdf':
      if (!mulaiDengan(kepala, SIG.pdf)) kode = 'tanda-tangan-tidak-cocok'
      break
    case 'png':
      if (!mulaiDengan(kepala, SIG.png)) kode = 'tanda-tangan-tidak-cocok'
      break
    case 'jpg':
    case 'jpeg':
      if (!mulaiDengan(kepala, SIG.jpeg)) kode = 'tanda-tangan-tidak-cocok'
      break
    case 'doc':
    case 'xls':
      // OLE2 tidak dapat diperiksa lebih jauh di klien; makro VBA di format lama tidak terdeteksi.
      if (!mulaiDengan(kepala, SIG.ole2)) kode = 'tanda-tangan-tidak-cocok'
      break
    case 'docx':
    case 'xlsx':
      kode = mulaiDengan(kepala, SIG.zip) ? await periksaOoxml(file, ext) : 'tanda-tangan-tidak-cocok'
      break
    case 'csv':
      kode = periksaTeks(kepala)
      break
  }
  if (kode) return tolak(kode)

  return { ok: true, ext, mime: JENIS_BERKAS[ext].mime, ukuran: file.size, sha256: await sha256Hex(file) }
}
