import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { buatAkun, masuk, masukDanTunggu, resetData, SV_A1_ID } from './helpers'

// BELUM DIJALANKAN: spesifikasi ini ditulis tetapi belum pernah dieksekusi, jadi dilewati sampai diverifikasi.
// Hapus baris `test.fixme` di bawah lalu jalankan `npm run test:e2e` dan perbaiki pelanggaran yang dilaporkan.
test.fixme(true, 'Belum diverifikasi — lihat komentar di atas')

const TAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Gagal bila ada pelanggaran WCAG A/AA; pesan memuat aturan dan elemen yang bermasalah. */
async function periksa(page: Page, nama: string) {
  const hasil = await new AxeBuilder({ page }).withTags(TAG).analyze()
  const ringkas = hasil.violations.map((v) => `${v.id} [${v.impact}] ${v.help}\n   ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join('\n   ')}`)
  expect(ringkas, `Pelanggaran aksesibilitas pada ${nama}`).toEqual([])
}

test.beforeEach(async () => {
  await resetData()
})

test.describe('halaman publik', () => {
  test('landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await periksa(page, 'landing')
  })

  test('login dan daftar', async ({ page }) => {
    await page.goto('/login')
    await periksa(page, 'login')
    await page.getByRole('tab', { name: 'daftar' }).click()
    await periksa(page, 'daftar')
    await page.getByRole('tab', { name: 'masuk' }).click()
    await page.getByRole('button', { name: 'Lupa kata sandi?' }).click()
    await periksa(page, 'reset sandi')
  })

  test('verifikasi email dan aktivasi', async ({ page }) => {
    await buatAkun({ email: 'a11y@contoh.id', verified: false })
    await masuk(page, { email: 'a11y@contoh.id' })
    await expect(page).toHaveURL(/\/verifikasi-email$/)
    await periksa(page, 'verifikasi email')

    await buatAkun({ email: 'a11y2@contoh.id', verified: true })
    const p2 = await page.context().newPage()
    await masuk(p2, { email: 'a11y2@contoh.id' })
    await expect(p2).toHaveURL(/\/aktivasi$/)
    await periksa(p2, 'aktivasi')
  })

  test('akses ditolak', async ({ page }) => {
    await masuk(page, 'nonaktifA')
    await expect(page).toHaveURL(/\/akses-ditolak$/)
    await periksa(page, 'akses ditolak')
  })
})

test.describe('halaman aplikasi (supervisor)', () => {
  test.beforeEach(async ({ page }) => {
    await masukDanTunggu(page, 'supA1')
  })

  for (const [nama, path] of [
    ['dashboard', '/dashboard'],
    ['daftar supervisi', '/supervisi'],
    ['detail supervisi', `/supervisi/${SV_A1_ID}`],
    ['tindak lanjut', '/tindak-lanjut'],
    ['guru', '/guru'],
    ['instrumen', '/instrumen'],
  ] as const) {
    test(nama, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.waitForLoadState('networkidle')
      await periksa(page, nama)
    })
  }

  test('form supervisi: identitas, aspek, catatan, dan validasi galat', async ({ page }) => {
    await page.goto('/supervisi/baru')
    await periksa(page, 'form — identitas')
    // Memicu galat validasi lalu memeriksa lagi (pesan galat ikut diperiksa).
    await page.getByRole('button', { name: 'Lanjut', exact: true }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    await periksa(page, 'form — identitas dengan galat')

    await page.getByLabel('Guru yang disupervisi').selectOption({ label: 'Budi' })
    await page.getByLabel('Kelas yang disupervisi').fill('VII A')
    await page.getByRole('button', { name: 'Lanjut', exact: true }).click()
    await periksa(page, 'form — aspek A')
  })

  test('dialog konfirmasi', async ({ page }) => {
    await page.goto(`/supervisi/${SV_A1_ID}`)
    await page.getByRole('button', { name: 'Hapus' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await periksa(page, 'dialog hapus')
  })
})

test('halaman admin: pengguna', async ({ page }) => {
  await masukDanTunggu(page, 'adminA')
  await page.goto('/pengguna')
  await expect(page.getByRole('heading', { level: 1, name: 'Pengguna' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await periksa(page, 'pengguna')
})

test('tampilan mobile: dashboard dan landing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/')
  await periksa(page, 'landing (mobile)')
  await masukDanTunggu(page, 'supA1')
  await page.waitForLoadState('networkidle')
  await periksa(page, 'dashboard (mobile)')
})
