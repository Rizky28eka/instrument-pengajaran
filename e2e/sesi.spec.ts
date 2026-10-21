import { expect, test, type Page } from '@playwright/test'
import { keluarUI, masukDanTunggu, resetData, SV_A1_ID } from './helpers'

test.beforeEach(async () => {
  await resetData()
})

const kunciDraf = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('draf-supervisi:')))

test('draf tersimpan otomatis, dipulihkan setelah muat ulang, dan dapat dibuang', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.goto('/supervisi/baru')
  await page.getByLabel('Kelas yang disupervisi').fill('Kelas Draf 7C')
  await expect.poll(() => kunciDraf(page)).toHaveLength(1)

  await page.reload()
  await expect(page.getByText('Draf sebelumnya dipulihkan')).toBeVisible()
  await expect(page.getByLabel('Kelas yang disupervisi')).toHaveValue('Kelas Draf 7C')

  await page.getByRole('button', { name: 'Mulai dari awal' }).click()
  await expect(page.getByLabel('Kelas yang disupervisi')).toHaveValue('')
})

test('draf rusak di penyimpanan diabaikan tanpa membuat halaman gagal', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.evaluate(() => localStorage.setItem('draf-supervisi:supA1', '{rusak'))
  await page.goto('/supervisi/baru')
  await expect(page.getByRole('heading', { level: 1, name: 'Supervisi Baru' })).toBeVisible()
  await expect(page.getByText('Draf sebelumnya dipulihkan')).toHaveCount(0)
})

test('keluar tanpa draf: langsung ke login dan sesi bersih', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.goto('/supervisi')
  await expect(page.getByRole('link', { name: 'Budi' })).toBeVisible() // data sekolah A termuat
  await keluarUI(page)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('keluar dengan draf: diminta konfirmasi; batal mempertahankan, lanjut menghapus draf', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.goto('/supervisi/baru')
  await page.getByLabel('Kelas yang disupervisi').fill('Rahasia 9Z')
  await expect.poll(() => kunciDraf(page)).toHaveLength(1)

  await page.getByRole('button', { name: 'Keluar' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Keluar dari akun?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Draf supervisi yang belum disimpan')
  await dialog.getByRole('button', { name: 'Batal' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/supervisi\/baru$/)
  expect(await kunciDraf(page)).toHaveLength(1) // batal → draf tetap ada

  await page.getByRole('button', { name: 'Keluar' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  // Halaman dimuat ulang setelah pembersihan; ulangi pembacaan sampai konteks stabil.
  await expect.poll(() => kunciDraf(page).catch(() => ['belum-stabil']), { timeout: 10_000 }).toHaveLength(0) // isian tidak tertinggal
})

test('pergantian pengguna di perangkat yang sama: tidak ada data sekolah sebelumnya yang terbawa', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.goto('/supervisi')
  await expect(page.getByRole('link', { name: 'Budi' })).toBeVisible()
  await keluarUI(page)

  await masukDanTunggu(page, 'supB')
  await page.goto('/supervisi')
  await expect(page.getByRole('link', { name: 'Sari' })).toBeVisible() // sekolah B
  await expect(page.getByRole('link', { name: 'Budi' })).toHaveCount(0) // sekolah A tidak terlihat

  // Mencoba membuka dokumen sekolah A langsung → ditolak, bukan "tidak ditemukan".
  await page.goto(`/supervisi/${SV_A1_ID}`)
  await expect(page.getByText('Anda tidak memiliki akses')).toBeVisible()
  await expect(page.getByText('Budi')).toHaveCount(0)

  // Guru dan tindak lanjut sekolah A pun tidak muncul.
  await page.goto('/guru')
  await expect(page.getByText('Sari')).toBeVisible()
  await expect(page.getByText('Budi')).toHaveCount(0)
  await page.goto('/tindak-lanjut')
  await expect(page.getByText('Ikuti pelatihan asesmen')).toHaveCount(0)
})

test('draf milik pengguna lain di perangkat yang sama tidak dibaca', async ({ browser }) => {
  // Meniru sisa draf A1 di perangkat (mis. tab ditutup tanpa keluar), lalu B masuk di perangkat itu.
  const draf = JSON.stringify({
    v: 1, uid: 'supA1', schoolId: 'sekolah-a', savedAt: Date.now(),
    data: { guruId: '', identitas: { mataPelajaran: 'RAHASIA-A1', kelas: 'Draf milik A1', namaSupervisor: 'x', tanggal: '2026-10-21', kurikulum: 'Kurikulum Merdeka', modelPembelajaran: 'Tatap Muka' }, skor: {}, catatanAspek: {}, catatan: { kekuatan: '', perbaikan: '', rekomendasi: '' } },
  })
  const ctx = await browser.newContext()
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['draf-supervisi:supA1', draf])
  const b = await ctx.newPage()
  await masukDanTunggu(b, 'supB')
  await b.goto('/supervisi/baru')
  await expect(b.getByLabel('Kelas yang disupervisi')).toHaveValue('')
  await expect(b.getByText('Draf sebelumnya dipulihkan')).toHaveCount(0)
  await expect(b.getByText('RAHASIA-A1')).toHaveCount(0)
  await ctx.close()
})
