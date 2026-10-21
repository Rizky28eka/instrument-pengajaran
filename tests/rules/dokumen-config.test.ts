import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DOKUMEN, EKSTENSI, KATEGORI, MIME_DIIZINKAN } from '@/features/documents/config'

/**
 * config.ts adalah satu-satunya sumber batas untuk validator dan UI, tetapi Rules tidak dapat
 * mengimpornya. Tes ini membaca berkas Rules apa adanya dan memastikan nilainya tidak berbeda.
 */
const firestoreRules = readFileSync('firestore.rules', 'utf8')
const storageRules = readFileSync('storage.rules', 'utf8')

/** Mengambil isi kurung kurawal fungsi Rules bernama `nama`. */
function badanFungsi(rules: string, nama: string): string {
  const mulai = rules.indexOf(`function ${nama}(`)
  if (mulai < 0) throw new Error(`fungsi ${nama} tidak ditemukan di Rules`)
  const buka = rules.indexOf('{', mulai)
  const tutup = rules.indexOf('\n    }', buka)
  return rules.slice(buka + 1, tutup)
}

const angka = (teks: string) => Number(teks.match(/return\s+(\d+)\s*;/)?.[1])
const kutipan = (teks: string) => [...teks.matchAll(/'([^']+)'/g)].map((m) => m[1])
const urut = (a: string[]) => [...a].sort()

describe('konsistensi config.ts ↔ Rules', () => {
  it('batas ukuran berkas sama di config, firestore.rules, dan storage.rules', () => {
    expect(angka(badanFungsi(firestoreRules, 'maksUkuran'))).toBe(DOKUMEN.maksUkuranByte)
    expect(angka(badanFungsi(storageRules, 'maksUkuran'))).toBe(DOKUMEN.maksUkuranByte)
  })

  it('batas jumlah versi sama di config dan firestore.rules', () => {
    expect(angka(badanFungsi(firestoreRules, 'maksVersi'))).toBe(DOKUMEN.maksVersi)
  })

  it('daftar MIME yang diizinkan sama persis', () => {
    expect(urut(kutipan(badanFungsi(firestoreRules, 'mimeDiizinkan')))).toEqual(urut(MIME_DIIZINKAN))
  })

  it('setiap ekstensi di config punya pasangan MIME di aturan ekstensi↔MIME, dan sebaliknya', () => {
    const pola = kutipan(badanFungsi(firestoreRules, 'berkasValid')).find((s) => s.includes('(pdf|'))
    const daftar = pola?.match(/\[\.\]\(([a-z|]+)\)/)?.[1].split('|') ?? []
    expect(urut(daftar)).toEqual(urut([...EKSTENSI]))
  })

  it('kategori yang diterima Rules sama dengan kategori di config', () => {
    const kunci = firestoreRules.match(/request\.resource\.data\.kategori in \[([^\]]+)\]/)?.[1] ?? ''
    expect(urut(kutipan(kunci))).toEqual(urut(KATEGORI.map((k) => k.id)))
  })

  it('hanya kategori pengajuan-guru yang punya alur review di Rules, sama seperti config', () => {
    const awal = badanFungsi(firestoreRules, 'reviewAwalValid')
    const denganReview = new Set(kutipan(awal).filter((s) => KATEGORI.some((k) => k.id === s)))
    expect([...denganReview]).toEqual(KATEGORI.filter((k) => k.perluReview).map((k) => k.id))
  })
})
