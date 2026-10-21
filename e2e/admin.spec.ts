import { expect, test } from '@playwright/test'
import { buatAkun, masukDanTunggu, masuk, resetData, SANDI, verifikasiEmail } from './helpers'

test.beforeEach(async () => {
  await resetData()
})

test('admin membuat undangan, pengguna baru memakainya lewat tautan, lalu admin menonaktifkannya (efek langsung)', async ({ browser }) => {
  const ctxAdmin = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const admin = await ctxAdmin.newPage()
  await masukDanTunggu(admin, 'adminA')
  await admin.getByRole('link', { name: 'Pengguna' }).click()
  await expect(admin.getByRole('heading', { level: 1, name: 'Pengguna' })).toBeVisible()

  await admin.getByRole('button', { name: 'Buat undangan' }).click()
  await admin.getByLabel('Email (opsional)').fill('undangan.baru@contoh.id')
  await admin.getByRole('button', { name: 'Buat & salin tautan' }).click()
  await expect(admin.getByText('Undangan dibuat.')).toBeVisible()
  const tautan = await admin.evaluate(() => navigator.clipboard.readText())
  expect(tautan).toMatch(/\/aktivasi\?kode=[0-9a-f]{32}$/)
  await expect(admin.getByText('Supervisor · undangan.baru@contoh.id')).toBeVisible()

  // Pengguna baru: daftar, verifikasi, buka tautan undangan.
  const ctxBaru = await browser.newContext()
  const baru = await ctxBaru.newPage()
  await baru.goto('/login')
  await baru.getByRole('tab', { name: 'daftar' }).click()
  await baru.getByLabel('Nama lengkap').fill('Undangan Baru')
  await baru.getByLabel('Email').fill('undangan.baru@contoh.id')
  await baru.getByLabel('Kata sandi').fill(SANDI)
  await baru.getByRole('button', { name: 'Daftar', exact: true }).click()
  await expect(baru).toHaveURL(/\/verifikasi-email$/)
  await verifikasiEmail('undangan.baru@contoh.id')
  await baru.getByRole('button', { name: 'Saya sudah verifikasi' }).click()
  await expect(baru).toHaveURL(/\/aktivasi$/)
  await baru.goto(new URL(tautan).pathname + new URL(tautan).search)
  await expect(baru.getByLabel('Kode undangan')).toHaveValue(/[0-9a-f]{32}/) // kode terisi dari tautan
  await baru.getByRole('button', { name: 'Aktifkan akun' }).click()
  await expect(baru).toHaveURL(/\/dashboard$/)
  await baru.goto('/guru')
  await expect(baru.getByText('Budi')).toBeVisible()

  // Admin melihatnya sebagai anggota, lalu menonaktifkan.
  await admin.reload()
  await expect(admin.getByText('Undangan Baru')).toBeVisible()
  await admin.getByRole('listitem').filter({ hasText: 'Undangan Baru' }).getByRole('button', { name: 'Nonaktifkan' }).click()
  await admin.getByRole('dialog', { name: 'Nonaktifkan pengguna ini?' }).getByRole('button', { name: 'Nonaktifkan' }).click()
  await expect(admin.getByText('Pengguna dinonaktifkan.')).toBeVisible()

  // Sesi pengguna itu yang sedang terbuka langsung kehilangan akses (profil dipantau real-time).
  await expect(baru).toHaveURL(/\/akses-ditolak$/, { timeout: 15_000 })
  await ctxAdmin.close()
  await ctxBaru.close()
})

test('undangan yang dicabut tidak dapat dipakai lagi', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const admin = await ctx.newPage()
  await masukDanTunggu(admin, 'adminA')
  await admin.goto('/pengguna')
  await admin.getByRole('button', { name: 'Buat undangan' }).click()
  await admin.getByRole('button', { name: 'Buat & salin tautan' }).click()
  const tautan = await admin.evaluate(() => navigator.clipboard.readText())
  const kode = new URL(tautan).searchParams.get('kode')!

  await admin.getByRole('button', { name: 'Cabut' }).first().click()
  await admin.getByRole('dialog', { name: 'Cabut undangan ini?' }).getByRole('button', { name: 'Cabut' }).click()
  await expect(admin.getByText('Undangan dicabut.')).toBeVisible()

  await buatAkun({ email: 'terlambat@contoh.id', verified: true })
  const orang = await (await browser.newContext()).newPage()
  await masuk(orang, { email: 'terlambat@contoh.id' })
  await expect(orang).toHaveURL(/\/aktivasi$/)
  await orang.getByLabel('Kode undangan').fill(kode)
  await orang.getByLabel('Nama lengkap').fill('Orang Terlambat')
  await orang.getByRole('button', { name: 'Aktifkan akun' }).click()
  await expect(orang.getByText('Kode undangan tidak ditemukan')).toBeVisible()
  await ctx.close()
})
