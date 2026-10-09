import { defineConfig, devices } from '@playwright/test'

const BASE_URL = 'http://localhost:4173/shorashim/'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  projects: [{ name: 'iphone', use: { ...devices['iPhone 13'] } }],
  webServer: {
    command: 'pnpm preview --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
