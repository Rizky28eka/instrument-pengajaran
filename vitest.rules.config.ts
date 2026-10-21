import { defineConfig } from 'vitest/config'

/** Tes Firestore Rules. Wajib dijalankan di dalam emulator: `npm run test:rules`. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    // Satu emulator bersama: file tes dijalankan berurutan agar data tidak saling menimpa.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
