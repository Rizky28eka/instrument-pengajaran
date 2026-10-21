import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

/** Tes unit: cepat, tanpa emulator. Tes Rules dan E2E dijalankan lewat skrip terpisah. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      // Modul yang mengimpor `@/lib/firebase` (mis. undangan.test.ts) menginisialisasi Auth, yang gagal tanpa API key.
      // Nilai dummy ini membuat tes unit hijau di checkout bersih/CI tanpa `.env.local`; tidak ada panggilan jaringan.
      env: {
        VITE_FIREBASE_API_KEY: 'dummy-test-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'demo-instrumen.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'demo-instrumen',
        VITE_FIREBASE_STORAGE_BUCKET: 'demo-instrumen.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '0',
        VITE_FIREBASE_APP_ID: '1:0:web:test',
      },
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['node_modules/**', 'tests/**', 'e2e/**'],
    },
  }),
)
