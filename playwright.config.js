import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './singaprinting/test',
  timeout: 60000,
  use: {
    headless: isCI,
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    viewport: null, // allow full screen
    launchOptions: {
      args: ['--start-maximized'],
    },
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  projects: [
    {
      name: 'chromium',
      use: { channel: 'chrome' }, // no device profile, no conflict
    },
    {
      name: 'firefox',
      use: { channel: 'firefox' },
    },
    {
      name: 'webkit',
      use: { channel: 'webkit' },
    },
  ],

  fullyParallel: true,
  retries: isCI ? 2 : 0,
});
