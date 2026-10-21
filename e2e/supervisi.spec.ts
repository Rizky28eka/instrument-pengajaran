import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { buatSupervisiUI, masukDanTunggu, resetData, tambahGuruUI } from './helpers'

test.beforeEach(async () => {
  await resetData()
})

test('supervisor membuat supervisi lengkap: nilai dihitung, tersimpan, muncul di daftar dan dashboard', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await tambahGuruUI(page, 'Citra Dewi', 'Seni Budaya')
  const id = await buatSupervisiUI(page, { guru: 'Citra Dewi', skor: 3, kekuatan: 'Kelas sangat tertib' })

  // Detail: semua skor 3 dari 4 → nilai 75, predikat Baik, instrumen provisional diperingatkan.
  await expect(page.getByRole('heading', { level: 1, name: 'Citra Dewi' })).toBeVisible()
  await expect(page.getByText('masih sementara dan belum disahkan')).toBeVisible()
  await expect(page.getByText('Skor 126 dari 168')).toBeVisible()
  await expect(page.getByText('Kelas sangat tertib')).toBeVisible()

  await page.goto('/supervisi')
  await expect(page.getByRole('link', { name: 'Citra Dewi' })).toBeVisible()
  await page.getByRole('link', { name: 'Citra Dewi' }).click()
  await expect(page).toHaveURL(new RegExp(`/supervisi/${id}$`))

  await page.goto('/dashboard')
  await expect(page.getByText('Citra Dewi').first()).toBeVisible()
})

test('ekspor CSV menetralkan formula injection dan memuat semua data yang dimuat', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await tambahGuruUI(page, '=1+1', 'Mapel')
  await buatSupervisiUI(page, { guru: '=1+1', skor: 4, kekuatan: '@SUM(1+1)' })
  await page.goto('/supervisi')
  const [unduhan] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Ekspor CSV' }).click()])
  const isi = readFileSync((await unduhan.path())!, 'utf8')
  const baris = isi.replace(/^﻿/, '').split('\r\n')
  const header = baris[0].split(',')
  expect(header).toContain('Nama Guru')
  // Tidak ada sel yang diawali karakter rumus; nilai berbahaya diberi tanda kutip tunggal.
  expect(isi).toContain("'=1+1")
  expect(isi).toContain("'@SUM(1+1)")
  expect(isi).not.toMatch(/(^|,)=1\+1/m)
  expect(isi).not.toMatch(/(^|,)@SUM/m)
})

test('mengubah supervisi: perubahan tersimpan dan meninggalkan halaman diperingatkan', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await tambahGuruUI(page, 'Dedi', 'IPS')
  const id = await buatSupervisiUI(page, { guru: 'Dedi', skor: 3 })

  await page.goto(`/supervisi/${id}/edit`)
  await page.getByLabel('Kelas yang disupervisi').fill('IX A')

  // Meninggalkan halaman dengan perubahan belum tersimpan → dialog konfirmasi; "Tetap di sini" membatalkan.
  await page.getByRole('link', { name: 'Dashboard' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Tinggalkan halaman ini?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Tetap di sini' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`/supervisi/${id}/edit$`))
  await expect(page.getByLabel('Kelas yang disupervisi')).toHaveValue('IX A') // isian tidak hilang

  // Simpan lewat langkah-langkah → tidak ada peringatan setelah berhasil.
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Lanjut', exact: true }).click()
  await page.getByRole('button', { name: 'Simpan Perubahan' }).click()
  await expect(page).toHaveURL(new RegExp(`/supervisi/${id}$`))
  await expect(page.getByText('IX A').first()).toBeVisible()
})

test('benturan dua tab: penyimpanan dengan data usang ditolak dan tidak menimpa perubahan lain', async ({ browser }) => {
  const ctx = await browser.newContext()
  const a = await ctx.newPage()
  await masukDanTunggu(a, 'supA1')
  await tambahGuruUI(a, 'Eko', 'PJOK')
  const id = await buatSupervisiUI(a, { guru: 'Eko', skor: 3 })

  // Tab B memuat dokumen versi 1 lalu menunggu.
  const b = await ctx.newPage()
  await b.goto(`/supervisi/${id}/edit`)
  await b.getByLabel('Kelas yang disupervisi').fill('Dari tab B')

  // Tab A menyimpan lebih dulu.
  await a.goto(`/supervisi/${id}/edit`)
  await a.getByLabel('Kelas yang disupervisi').fill('Dari tab A')
  for (let i = 0; i < 6; i++) await a.getByRole('button', { name: 'Lanjut', exact: true }).click()
  await a.getByRole('button', { name: 'Simpan Perubahan' }).click()
  await expect(a).toHaveURL(new RegExp(`/supervisi/${id}$`))

  // Tab B mencoba menyimpan dari salinan usang → ditolak dengan pesan jelas.
  for (let i = 0; i < 6; i++) await b.getByRole('button', { name: 'Lanjut', exact: true }).click()
  await b.getByRole('button', { name: 'Simpan Perubahan' }).click()
  await expect(b.getByText(/Perubahan ditolak/)).toBeVisible()

  await a.reload()
  await expect(a.getByText('Dari tab A').first()).toBeVisible() // perubahan tab A tidak tertimpa
  await expect(a.getByText('Dari tab B')).toHaveCount(0)
  await ctx.close()
})

test('hapus (soft-delete) dengan konfirmasi; admin memulihkan; supervisor lain tidak melihatnya', async ({ browser }) => {
  const ctxSup = await browser.newContext()
  const sup = await ctxSup.newPage()
  await masukDanTunggu(sup, 'supA1')
  await tambahGuruUI(sup, 'Fajar', 'Matematika')
  const id = await buatSupervisiUI(sup, { guru: 'Fajar', skor: 2 })

  await sup.getByRole('button', { name: 'Hapus' }).click()
  const dialog = sup.getByRole('dialog', { name: 'Hapus data supervisi ini?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Batal' }).click() // batal tidak menghapus
  await expect(sup).toHaveURL(new RegExp(`/supervisi/${id}$`))
  await sup.getByRole('button', { name: 'Hapus' }).click()
  await sup.getByRole('dialog').getByRole('button', { name: 'Hapus', exact: true }).click()
  await expect(sup).toHaveURL(/\/supervisi$/)
  await expect(sup.getByRole('link', { name: 'Fajar' })).toHaveCount(0)

  // Mencoba membuka langsung: supervisor tidak berhak lagi (Rules menolak dokumen terhapus).
  await sup.goto(`/supervisi/${id}`)
  await expect(sup.getByText('Anda tidak memiliki akses')).toBeVisible()
  // Supervisor biasa tidak melihat tempat sampah.
  await sup.goto('/supervisi')
  await expect(sup.getByRole('button', { name: /data yang dihapus/ })).toHaveCount(0)

  // Admin: lihat tempat sampah → pulihkan.
  const ctxAdmin = await browser.newContext()
  const admin = await ctxAdmin.newPage()
  await masukDanTunggu(admin, 'adminA')
  await admin.goto('/supervisi')
  await admin.getByRole('button', { name: /data yang dihapus/ }).click()
  await expect(admin.getByRole('link', { name: 'Fajar' })).toBeVisible()
  await admin.getByRole('button', { name: 'Pulihkan' }).click()
  await expect(admin.getByText('Data dipulihkan.')).toBeVisible()
  await sup.goto('/supervisi')
  await expect(sup.getByRole('link', { name: 'Fajar' })).toBeVisible()
  await ctxSup.close()
  await ctxAdmin.close()
})

test('tindak lanjut: dibuat dari halaman detail, status berubah, terlihat di daftar dan dashboard', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await tambahGuruUI(page, 'Gita', 'Bahasa')
  await buatSupervisiUI(page, { guru: 'Gita', skor: 2 })

  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await page.getByRole('textbox', { name: /^Tindak lanjut/ }).fill('Ikuti pelatihan asesmen formatif')
  await page.getByLabel('Penanggung jawab').fill('Kepala sekolah')
  await page.getByLabel('Tenggat').fill('2020-01-01') // sudah lewat → terlambat
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Ikuti pelatihan asesmen formatif')).toBeVisible()
  await expect(page.getByText(/Terlambat \d+ hari/)).toBeVisible()

  await page.getByRole('button', { name: 'Ubah status' }).click()
  await page.getByLabel('Status baru').selectOption('proses')
  await page.getByLabel('Catatan (opsional)').fill('Sudah dijadwalkan')
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Sedang berjalan')).toBeVisible()

  await page.getByRole('button', { name: 'Riwayat', exact: true }).click()
  await expect(page.getByText('Sudah dijadwalkan')).toBeVisible()

  await page.goto('/tindak-lanjut')
  await expect(page.getByText('Ikuti pelatihan asesmen formatif')).toBeVisible()
  await page.goto('/dashboard')
  await expect(page.getByText('Tindak lanjut').first()).toBeVisible()
})
