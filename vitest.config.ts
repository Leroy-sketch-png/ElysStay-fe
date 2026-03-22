import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'tests/bdd/**', 'node_modules'],
    pool: 'threads',
    fileParallelism: false,
    testTimeout: 15000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/components/**'],
      exclude: ['src/**/*.d.ts', 'src/types/**', 'src/**/*.config.*'],
    },
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:5027/api/v1',
      NEXT_PUBLIC_KEYCLOAK_URL: 'http://localhost:8080',
      NEXT_PUBLIC_KEYCLOAK_REALM: 'elysstay',
      NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: 'elysstay-fe',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './tests'),
    },
  },
})
