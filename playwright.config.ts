import { defineConfig } from '@playwright/test'

const PORT = 5188

/**
 * E2E terhadap Firebase Emulator (Auth + Firestore) dan aplikasi dalam mode `e2e`.
 * Jalankan: `npm run test:e2e` (emulator dinyalakan otomatis). Memakai Google Chrome yang
 * sudah terpasang (`channel: 'chrome'`), sehingga tidak ada unduhan browser tambahan.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1, // satu emulator bersama
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx vite --mode e2e --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
