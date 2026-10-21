import { expect, test } from '@playwright/test'
import { masukDanTunggu, resetData } from './helpers'

test.beforeAll(async () => {
  await resetData()
})

test('infrastruktur: landing page tampil dan tamu diarahkan ke login dari halaman terlindungi', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Lembar supervisi guru')
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('infrastruktur: pengguna berprofil dapat masuk ke dashboard', async ({ page }) => {
  await masukDanTunggu(page, 'supA1')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
