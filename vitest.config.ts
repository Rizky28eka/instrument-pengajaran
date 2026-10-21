import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

/** Tes unit: cepat, tanpa emulator. Tes Rules dan E2E dijalankan lewat skrip terpisah. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['node_modules/**', 'tests/**', 'e2e/**'],
    },
  }),
)
