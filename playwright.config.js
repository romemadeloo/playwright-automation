import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: '.', // ✅ allow all folders
  timeout: 60000,
  use: {
    headless: process.env.HEADLESS === 'true' || isCI,
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    viewport: null,
    launchOptions: {
      args: ['--start-maximized'],
    },
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  projects: [
    { name: 'chromium', use: { channel: 'chrome' } },
    { name: 'firefox', use: { channel: 'firefox' } },
    { name: 'webkit', use: { channel: 'webkit' } },
  ],
  fullyParallel: true,
  retries: isCI ? 2 : 0,
});
