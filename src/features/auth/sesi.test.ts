import { describe, expect, it, vi } from 'vitest'
import {
  adaDraf,
  bacaDraf,
  bersihkanDrafKedaluwarsa,
  hapusDraf,
  keluarBersih,
  kunciDraf,
  periksaSebelumKeluar,
  simpanDraf,
  TTL_DRAF_MS,
  type DepKeluar,
  type PenyimpananMini,
} from './sesi'

class MemStorage implements PenyimpananMini {
  private d = new Map<string, string>()
  get length() { return this.d.size }
  key(i: number) { return [...this.d.keys()][i] ?? null }
  getItem(k: string) { return this.d.get(k) ?? null }
  setItem(k: string, v: string) { this.d.set(k, v) }
  removeItem(k: string) { this.d.delete(k) }
}

describe('draf lokal', () => {
  it('menyimpan dan membaca kembali untuk uid + sekolah yang sama', () => {
    const s = new MemStorage()
    expect(simpanDraf(s, 'u1', 'sA', { a: 1 }, 1000)).toBe(true)
    expect(bacaDraf(s, 'u1', 'sA', 2000)).toEqual({ a: 1 })
  })

  it('tidak dapat dibaca oleh pengguna lain di perangkat yang sama', () => {
    const s = new MemStorage()
    simpanDraf(s, 'u1', 'sA', { rahasia: 'nama guru' })
    expect(bacaDraf(s, 'u2', 'sA')).toBeNull()
    // Draf u1 tidak ikut terhapus oleh upaya baca u2.
    expect(adaDraf(s, 'u1')).toBe(true)
  })

  it('dibuang bila sekolah berbeda dari saat disimpan', () => {
    const s = new MemStorage()
    simpanDraf(s, 'u1', 'sA', { a: 1 })
    expect(bacaDraf(s, 'u1', 'sB')).toBeNull()
    expect(adaDraf(s, 'u1')).toBe(false)
  })

  it('kedaluwarsa setelah TTL', () => {
    const s = new MemStorage()
    simpanDraf(s, 'u1', 'sA', { a: 1 }, 0)
    expect(bacaDraf(s, 'u1', 'sA', TTL_DRAF_MS)).toEqual({ a: 1 })
    expect(bacaDraf(s, 'u1', 'sA', TTL_DRAF_MS + 1)).toBeNull()
    expect(adaDraf(s, 'u1')).toBe(false)
  })

  it('isi rusak atau format lama dibuang tanpa melempar', () => {
    const s = new MemStorage()
    s.setItem(kunciDraf('u1'), '{bukan json')
    expect(bacaDraf(s, 'u1', 'sA')).toBeNull()
    s.setItem(kunciDraf('u1'), JSON.stringify({ identitas: {} }))
    expect(bacaDraf(s, 'u1', 'sA')).toBeNull()
    expect(adaDraf(s, 'u1')).toBe(false)
  })

  it('penyimpanan penuh tidak melempar', () => {
    const penuh: PenyimpananMini = { ...new MemStorage(), length: 0, key: () => null, getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('QuotaExceeded') } }
    expect(simpanDraf(penuh, 'u1', 'sA', {})).toBe(false)
  })

  it('pembersihan kedaluwarsa hanya menghapus draf basi atau rusak, bukan data lain atau draf aktif', () => {
    const s = new MemStorage()
    simpanDraf(s, 'lama', 'sA', {}, 0)
    simpanDraf(s, 'baru', 'sA', {}, TTL_DRAF_MS)
    s.setItem(kunciDraf('rusak'), 'xx')
    s.setItem('preferensi-lain', 'jangan-dihapus')
    const n = bersihkanDrafKedaluwarsa(s, TTL_DRAF_MS + 10)
    expect(n).toBe(2)
    expect(adaDraf(s, 'baru')).toBe(true)
    expect(s.getItem('preferensi-lain')).toBe('jangan-dihapus')
  })

  it('hapusDraf hanya menghapus milik uid itu', () => {
    const s = new MemStorage()
    simpanDraf(s, 'u1', 'sA', {})
    simpanDraf(s, 'u2', 'sA', {})
    hapusDraf(s, 'u1')
    expect(adaDraf(s, 'u1')).toBe(false)
    expect(adaDraf(s, 'u2')).toBe(true)
  })
})

function bikinDep(ubah: Partial<DepKeluar> = {}) {
  const urutan: string[] = []
  const storage = new MemStorage()
  const dep: DepKeluar = {
    storage,
    queryClient: { clear: () => void urutan.push('clear-query') },
    signOut: async () => void urutan.push('signOut'),
    tulisanTersinkron: async () => true,
    hentikanDanBersihkanCacheFirestore: async () => void urutan.push('cache-firestore'),
    keHalaman: (p) => void urutan.push(`ke:${p}`),
    ...ubah,
  }
  return { dep, urutan, storage }
}

describe('periksaSebelumKeluar', () => {
  it('melaporkan draf dan tulisan tertunda', async () => {
    const { dep, storage } = bikinDep({ tulisanTersinkron: async () => false })
    simpanDraf(storage, 'u1', 'sA', { a: 1 })
    expect(await periksaSebelumKeluar(dep, 'u1')).toEqual({ adaDraf: true, tulisanTertunda: true })
  })

  it('bersih bila tidak ada apa-apa', async () => {
    const { dep } = bikinDep()
    expect(await periksaSebelumKeluar(dep, 'u1')).toEqual({ adaDraf: false, tulisanTertunda: false })
  })
})

describe('keluarBersih', () => {
  it('keluar, membersihkan cache query dan Firestore, lalu pindah ke /login', async () => {
    const { dep, urutan } = bikinDep()
    await keluarBersih(dep, { uid: 'u1', hapusDraf: false })
    expect(urutan).toEqual(['signOut', 'clear-query', 'cache-firestore', 'ke:/login'])
  })

  it('hapus draf hanya bila diminta, dan hanya milik uid itu', async () => {
    const a = bikinDep()
    simpanDraf(a.storage, 'u1', 'sA', {})
    simpanDraf(a.storage, 'u2', 'sA', {})
    await keluarBersih(a.dep, { uid: 'u1', hapusDraf: false })
    expect(adaDraf(a.storage, 'u1')).toBe(true)

    await keluarBersih(a.dep, { uid: 'u1', hapusDraf: true })
    expect(adaDraf(a.storage, 'u1')).toBe(false)
    expect(adaDraf(a.storage, 'u2')).toBe(true)
  })

  it('satu langkah gagal tidak menghentikan pembersihan lainnya', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { dep, urutan } = bikinDep({ signOut: async () => { throw new Error('jaringan') } })
    await keluarBersih(dep, { uid: 'u1', hapusDraf: false })
    expect(urutan).toEqual(['clear-query', 'cache-firestore', 'ke:/login'])
    err.mockRestore()
  })
})
