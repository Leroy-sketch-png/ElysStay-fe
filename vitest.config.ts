import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'tests/bdd/**', 'node_modules'],
    css: false,
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
    },
  },
})
