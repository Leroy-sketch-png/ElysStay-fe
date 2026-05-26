import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Visual regression: consistent viewport for reproducible snapshots
    viewport: { width: 1280, height: 900 },
    // Disable CSS animations so snapshots don't capture mid-animation frames
    launchOptions: {
      args: ['--force-prefers-reduced-motion'],
    },
  },
  // Visual regression snapshot settings
  snapshotPathTemplate: '{testDir}/{testFileDir}/__snapshots__/{testFileName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Allow minor anti-aliasing differences across platforms
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
