import { expect, test } from '@playwright/test'
import { INVITE, masuk, resetData, SANDI, verifikasiEmail } from './helpers'

test.beforeEach(async () => {
  await resetData()
})

test('tamu diarahkan ke login dari semua halaman aplikasi', async ({ page }) => {
  for (const path of ['/dashboard', '/supervisi', '/supervisi/baru', '/guru', '/tindak-lanjut', '/pengguna', '/instrumen']) {
    await page.goto(path)
    await expect(page, path).toHaveURL(/\/login$/)
  }
})

test('kredensial salah menampilkan pesan yang jelas tanpa membocorkan detail', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('sup.a1@contoh.id')
  await page.getByLabel('Kata sandi').fill('salah-sandi')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page.getByText('Email atau kata sandi salah.')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('pendaftaran → verifikasi email → aktivasi undangan → dashboard', async ({ page }) => {
  const email = 'pengguna.baru@contoh.id'
  await page.goto('/login')
  await page.getByRole('tab', { name: 'daftar' }).click()
  await page.getByLabel('Nama lengkap').fill('Pengguna Baru')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill(SANDI)
  await page.getByRole('button', { name: 'Daftar', exact: true }).click()

  // Akun baru belum punya akses apa pun: dibawa ke verifikasi email.
  await expect(page).toHaveURL(/\/verifikasi-email$/)
  await expect(page.getByText(email)).toBeVisible()

  // Belum verifikasi → mencoba membuka halaman lain tetap kembali ke verifikasi.
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/verifikasi-email$/)

  await page.getByRole('button', { name: 'Saya sudah verifikasi' }).click()
  await expect(page.getByText('Email belum terverifikasi')).toBeVisible()

  await verifikasiEmail(email)
  await page.getByRole('button', { name: 'Saya sudah verifikasi' }).click()
  await expect(page).toHaveURL(/\/aktivasi$/)

  // Sudah terverifikasi tetapi tanpa undangan → masih tidak bisa melihat data.
  await page.goto('/supervisi')
  await expect(page).toHaveURL(/\/aktivasi$/)

  await page.getByLabel('Kode undangan').fill('kode-yang-salah')
  await page.getByRole('button', { name: 'Aktifkan akun' }).click()
  await expect(page.getByText('Kode undangan tidak ditemukan')).toBeVisible()

  await page.getByLabel('Kode undangan').fill(`https://contoh.id/aktivasi?kode=${INVITE.ok}`) // tautan lengkap pun diterima
  await page.getByRole('button', { name: 'Aktifkan akun' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('complementary').getByText('Supervisor', { exact: true })).toBeVisible()
})

test('undangan yang sudah dipakai tidak bisa dipakai akun lain', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('tab', { name: 'daftar' }).click()
  await page.getByLabel('Nama lengkap').fill('Orang Kedua')
  await page.getByLabel('Email').fill('kedua@contoh.id')
  await page.getByLabel('Kata sandi').fill(SANDI)
  await page.getByRole('button', { name: 'Daftar', exact: true }).click()
  await expect(page).toHaveURL(/\/verifikasi-email$/) // tunggu email verifikasi benar-benar diminta
  await verifikasiEmail('kedua@contoh.id')
  await page.getByRole('button', { name: 'Saya sudah verifikasi' }).click()
  await expect(page).toHaveURL(/\/aktivasi$/)
  await page.getByLabel('Kode undangan').fill(INVITE.terpakai)
  await page.getByRole('button', { name: 'Aktifkan akun' }).click()
  await expect(page.getByText('sudah dipakai')).toBeVisible()
  await expect(page).toHaveURL(/\/aktivasi$/)
})

test('pengguna yang dinonaktifkan diarahkan ke halaman akses ditolak', async ({ page }) => {
  await masuk(page, 'nonaktifA')
  await expect(page).toHaveURL(/\/akses-ditolak$/)
  await expect(page.getByRole('heading', { name: 'Akses dinonaktifkan' })).toBeVisible()
  await page.goto('/supervisi')
  await expect(page).toHaveURL(/\/akses-ditolak$/)
})

test('pengguna yang email-nya belum terverifikasi tidak masuk ke aplikasi', async ({ page }) => {
  await masuk(page, 'belumVerifikasiA')
  await expect(page).toHaveURL(/\/verifikasi-email$/)
})

test('lupa kata sandi: pesan sama untuk email terdaftar maupun tidak (tanpa membocorkan akun)', async ({ page }) => {
  for (const email of ['sup.a1@contoh.id', 'tidak.ada@contoh.id']) {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Lupa kata sandi?' }).click()
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Kirim tautan' }).click()
    await expect(page.getByRole('status')).toContainText('Jika email tersebut terdaftar')
  }
})

test('pengguna yang sudah aktif membuka /login langsung diarahkan ke dashboard', async ({ page }) => {
  await masuk(page, 'supA1')
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('supervisor biasa tidak melihat menu Pengguna dan dialihkan bila membukanya', async ({ page }) => {
  await masuk(page, 'supA1')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('link', { name: 'Pengguna' })).toHaveCount(0)
  await page.goto('/pengguna')
  await expect(page).toHaveURL(/\/dashboard$/)
})
