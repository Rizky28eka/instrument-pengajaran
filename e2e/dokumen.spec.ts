import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { keluarUI, masukDanTunggu, resetData, SV_A1_ID } from './helpers'

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n')
const PNG_BERPURA_PURA_PDF = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])

test.beforeEach(async () => {
  await resetData()
})

async function unggah(page: import('@playwright/test').Page, nama: string, isi: Buffer) {
  await page.getByLabel('Pilih berkas untuk diunggah').setInputFiles({ name: nama, mimeType: 'application/pdf', buffer: isi })
}

test('mengunggah dokumen pendukung: berhasil, tampil di daftar, dan unduhannya identik dengan aslinya', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.goto(`/supervisi/${SV_A1_ID}`)

  await unggah(page, 'RPP Kelas 8.pdf', PDF)
  await expect(page.getByText('Berhasil diunggah')).toBeVisible()
  await expect(page.getByRole('button', { name: 'RPP Kelas 8.pdf', exact: true })).toBeVisible()

  const [unduhan] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Unduh RPP Kelas 8.pdf' }).click()])
  expect(readFileSync((await unduhan.path())!)).toEqual(PDF)
})

test('berkas yang isinya tidak sesuai ekstensi ditolak sebelum diunggah dan tidak masuk daftar', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.goto(`/supervisi/${SV_A1_ID}`)

  await unggah(page, 'palsu.pdf', PNG_BERPURA_PURA_PDF)
  await expect(page.getByRole('alert').filter({ hasText: 'Isi berkas tidak sesuai dengan ekstensinya' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'palsu.pdf', exact: true })).toHaveCount(0)
})

test('dokumen terisolasi per sekolah: supervisor sekolah lain tidak melihatnya, rekan sesekolah melihatnya', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.goto(`/supervisi/${SV_A1_ID}`)
  await unggah(page, 'Rahasia sekolah A.pdf', PDF)
  await expect(page.getByText('Berhasil diunggah')).toBeVisible()
  await keluarUI(page)

  await masukDanTunggu(page, 'supB')
  await page.goto('/dokumen')
  await expect(page.getByText('Belum ada dokumen')).toBeVisible()
  await expect(page.getByText('Rahasia sekolah A.pdf')).toHaveCount(0)
  await keluarUI(page)

  await masukDanTunggu(page, 'supA2')
  await page.goto('/dokumen')
  await expect(page.getByRole('button', { name: 'Rahasia sekolah A.pdf', exact: true })).toBeVisible()
})

test('hapus-lunak oleh pembuat lalu dipulihkan oleh admin sekolah', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await page.goto(`/supervisi/${SV_A1_ID}`)
  await unggah(page, 'Bukti kelas.pdf', PDF)
  await expect(page.getByText('Berhasil diunggah')).toBeVisible()

  await page.getByRole('button', { name: 'Detail' }).first().click()
  await page.getByRole('button', { name: 'Pindahkan ke sampah' }).click()
  await page.getByRole('button', { name: 'Ya, pindahkan' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Bukti kelas.pdf', exact: true })).toHaveCount(0)
  await keluarUI(page)

  await masukDanTunggu(page, 'adminA')
  await page.goto('/dokumen?tab=sampah')
  await page.getByRole('button', { name: 'Bukti kelas.pdf', exact: true }).click()
  await page.getByRole('button', { name: 'Pulihkan' }).click()
  await page.keyboard.press('Escape')
  await page.goto('/dokumen')
  await expect(page.getByRole('button', { name: 'Bukti kelas.pdf', exact: true })).toBeVisible()
})
