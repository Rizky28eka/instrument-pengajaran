import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Tes yang membutuhkan emulator Firestore: aturan keamanan (tests/rules) dan integrasi
 * layer data aplikasi terhadap aturan itu (tests/integration). Jalankan: `npm run test:rules`.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    setupFiles: ['tests/integration/mock-firebase.ts'],
    include: ['tests/rules/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // Satu emulator bersama: file tes dijalankan berurutan agar data tidak saling menimpa.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
