import { expect, type Page } from '@playwright/test'
import { INVITE, PENGGUNA, isiDataAwal, siapkanEnv, ambilEnv } from '../tests/rules/helpers'

export const PROJECT = 'demo-instrumen'
export const SANDI = 'Uji-12345' // akun uji di emulator lokal saja
const AUTH = 'http://127.0.0.1:9099'
const FS = 'http://127.0.0.1:8080'

/** Mengosongkan emulator lalu memuat data dasar (2 sekolah, pengguna, guru, undangan). */
export async function resetData() {
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' })
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
  const env = await siapkanEnv()
  await isiDataAwal()
  // Akun Auth untuk setiap pengguna berprofil. localId = uid profil agar keduanya tertaut.
  for (const p of Object.values(PENGGUNA)) {
    await buatAkun({ localId: p.uid, email: p.email, verified: p.uid !== 'belumVerifikasiA' })
  }
  await env.cleanup()
}

export async function buatAkun(a: { localId?: string; email: string; verified: boolean; sandi?: string }) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ localId: a.localId, email: a.email, password: a.sandi ?? SANDI, emailVerified: a.verified }),
  })
  if (!r.ok) throw new Error(`buatAkun gagal: ${await r.text()}`)
}

/** Meniru pengguna membuka tautan verifikasi di email (emulator menyimpan kode di endpoint khusus). */
export async function verifikasiEmail(email: string) {
  const r = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)
  const { oobCodes } = (await r.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] }
  const kode = [...oobCodes].reverse().find((c) => c.email === email && c.requestType === 'VERIFY_EMAIL')
  if (!kode) throw new Error('Email verifikasi tidak ditemukan di emulator')
  await fetch(kode.oobLink)
}

export async function masuk(page: Page, nama: keyof typeof PENGGUNA | { email: string }) {
  const email = typeof nama === 'string' ? PENGGUNA[nama].email : nama.email
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill(SANDI)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
}

export async function masukDanTunggu(page: Page, nama: keyof typeof PENGGUNA) {
  await masuk(page, nama)
  await expect(page).toHaveURL(/\/dashboard$/)
}

export { INVITE, PENGGUNA, ambilEnv }

/** Menambah guru lewat halaman Guru. */
export async function tambahGuruUI(page: Page, nama: string, mapel = 'IPA') {
  await page.goto('/guru')
  await page.getByRole('button', { name: 'Tambah guru' }).click()
  await page.getByLabel('Nama guru').fill(nama)
  await page.getByLabel('Mata pelajaran').fill(mapel)
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await expect(page.getByText(nama, { exact: true })).toBeVisible()
}

/** Mengisi seluruh form supervisi lewat UI dan menyimpannya. Mengembalikan id dari URL detail. */
export async function buatSupervisiUI(page: Page, o: { guru: string; skor?: number; kelas?: string; kekuatan?: string }) {
  await page.goto('/supervisi/baru')
  // Mulai bersih (mengabaikan draf dari tes sebelumnya).
  const mulaiBaru = page.getByRole('button', { name: 'Mulai dari awal' })
  if (await mulaiBaru.isVisible().catch(() => false)) await mulaiBaru.click()

  await page.getByLabel('Guru yang disupervisi').selectOption({ label: o.guru })
  await page.getByLabel('Kelas yang disupervisi').fill(o.kelas ?? 'VIII B')
  await page.getByRole('button', { name: 'Lanjut', exact: true }).click()

  // Lima aspek: pilih skor yang sama untuk semua indikator pada setiap langkah.
  for (let langkah = 0; langkah < 5; langkah++) {
    const grup = page.getByRole('radiogroup')
    const n = await grup.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) await grup.nth(i).getByRole('radio', { name: new RegExp(`^${o.skor ?? 3} —`) }).click()
    await page.getByRole('button', { name: 'Lanjut', exact: true }).click()
  }

  if (o.kekuatan) await page.getByLabel('Kekuatan guru').fill(o.kekuatan)
  await page.getByRole('button', { name: 'Simpan Supervisi' }).click()
  // `baru` bukan ID: tunggu sampai benar-benar berpindah ke halaman detail.
  await expect(page).toHaveURL(/\/supervisi\/(?!baru$)[A-Za-z0-9]+$/)
  return page.url().split('/').pop()!
}

export { SV_A1 as SV_A1_ID } from '../tests/rules/helpers'

/**
 * Keluar lewat UI. Aplikasi membersihkan sesi lalu memuat ulang halaman; tunggu muat ulang itu
 * selesai agar navigasi berikutnya dalam tes tidak menabraknya.
 */
export async function keluarUI(page: Page) {
  await page.getByRole('button', { name: 'Keluar' }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await page.waitForEvent('load', { timeout: 4000 }).catch(() => {}) // sudah selesai = tidak ada event baru
}
