/**
 * Manajemen data sesi di perangkat: draf lokal dan pembersihan saat keluar.
 * Semua fungsi menerima dependensi (storage, klien) agar dapat diuji tanpa browser/Firebase.
 *
 * Prinsip: hanya data MILIK APLIKASI ini yang disentuh (kunci berawalan `draf-supervisi:`,
 * cache TanStack Query, cache Firestore project ini). Penyimpanan situs lain/lokal lain tidak dihapus.
 */

export const PREFIKS_DRAF = 'draf-supervisi:'
export const TTL_DRAF_MS = 7 * 24 * 60 * 60 * 1000
const VERSI_DRAF = 1

export interface PenyimpananMini {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface BungkusDraf<T> {
  v: number
  uid: string
  schoolId: string
  savedAt: number
  data: T
}

export const kunciDraf = (uid: string) => `${PREFIKS_DRAF}${uid}`

/** Menyimpan draf. Mengembalikan false bila penyimpanan penuh / diblokir (tidak melempar). */
export function simpanDraf<T>(s: PenyimpananMini, uid: string, schoolId: string, data: T, sekarang = Date.now()): boolean {
  try {
    const bungkus: BungkusDraf<T> = { v: VERSI_DRAF, uid, schoolId, savedAt: sekarang, data }
    s.setItem(kunciDraf(uid), JSON.stringify(bungkus))
    return true
  } catch {
    return false
  }
}

/** Membaca draf milik uid + sekolah yang sama dan belum kedaluwarsa; selain itu dibuang. */
export function bacaDraf<T>(s: PenyimpananMini, uid: string, schoolId: string, sekarang = Date.now()): T | null {
  const kunci = kunciDraf(uid)
  try {
    const mentah = s.getItem(kunci)
    if (!mentah) return null
    const b = JSON.parse(mentah) as Partial<BungkusDraf<T>>
    const sah =
      b && b.v === VERSI_DRAF && b.uid === uid && b.schoolId === schoolId && typeof b.savedAt === 'number' &&
      sekarang - b.savedAt <= TTL_DRAF_MS && b.data !== undefined
    if (!sah) {
      s.removeItem(kunci)
      return null
    }
    return b.data as T
  } catch {
    try {
      s.removeItem(kunci)
    } catch {
      /* diabaikan */
    }
    return null
  }
}

export function adaDraf(s: PenyimpananMini, uid: string): boolean {
  try {
    return s.getItem(kunciDraf(uid)) !== null
  } catch {
    return false
  }
}

export function hapusDraf(s: PenyimpananMini, uid: string): void {
  try {
    s.removeItem(kunciDraf(uid))
  } catch {
    /* diabaikan */
  }
}

/** Menghapus draf kedaluwarsa atau rusak milik siapa pun; draf yang masih berlaku dibiarkan. */
export function bersihkanDrafKedaluwarsa(s: PenyimpananMini, sekarang = Date.now()): number {
  const hapus: string[] = []
  try {
    for (let i = 0; i < s.length; i++) {
      const kunci = s.key(i)
      if (!kunci?.startsWith(PREFIKS_DRAF)) continue
      try {
        const b = JSON.parse(s.getItem(kunci) ?? 'null') as Partial<BungkusDraf<unknown>> | null
        if (!b || b.v !== VERSI_DRAF || typeof b.savedAt !== 'number' || sekarang - b.savedAt > TTL_DRAF_MS) hapus.push(kunci)
      } catch {
        hapus.push(kunci)
      }
    }
    hapus.forEach((k) => s.removeItem(k))
  } catch {
    /* diabaikan */
  }
  return hapus.length
}

// ------------------------------------------------------------------ alur keluar

export interface DepKeluar {
  storage: PenyimpananMini
  queryClient: { clear(): void }
  signOut(): Promise<void>
  /** true bila semua tulisan Firestore sudah tersinkron dalam batas waktu. */
  tulisanTersinkron(batasMs: number): Promise<boolean>
  hentikanDanBersihkanCacheFirestore(): Promise<void>
  /** Pindah halaman penuh agar seluruh state memori ikut hilang. */
  keHalaman(path: string): void
}

export interface PemeriksaanKeluar {
  adaDraf: boolean
  tulisanTertunda: boolean
}

export async function periksaSebelumKeluar(dep: DepKeluar, uid: string): Promise<PemeriksaanKeluar> {
  return { adaDraf: adaDraf(dep.storage, uid), tulisanTertunda: !(await dep.tulisanTersinkron(2500)) }
}

/**
 * Keluar dan membersihkan jejak pengguna di perangkat ini. Urutan penting: sinkronkan dulu,
 * lalu keluar, bersihkan cache, hapus draf (hanya bila diminta), dan muat ulang halaman.
 * Jika ada langkah yang gagal, langkah berikutnya tetap dijalankan agar sesi tidak tersisa.
 */
export async function keluarBersih(dep: DepKeluar, opsi: { uid?: string; hapusDraf: boolean }): Promise<void> {
  const langkah: (() => Promise<void> | void)[] = [
    () => dep.signOut(),
    () => dep.queryClient.clear(),
    () => {
      if (opsi.hapusDraf && opsi.uid) hapusDraf(dep.storage, opsi.uid)
    },
    () => dep.hentikanDanBersihkanCacheFirestore(),
  ]
  for (const jalankan of langkah) {
    try {
      await jalankan()
    } catch (e) {
      console.error('Langkah pembersihan sesi gagal', e)
    }
  }
  dep.keHalaman('/login')
}
