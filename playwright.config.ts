import { defineConfig } from '@playwright/test';

// Tests run against your laptop by default. Set BASE_URL to test the live site instead.
const baseURL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    // Browser tests for your stories. CI runs these on every pull request: npm run e2e
    { name: 'chromium', testDir: 'tests/e2e', use: { browserName: 'chromium' } },
    // The accessibility check from session 9. Run it yourself: npm run a11y
    { name: 'a11y', testDir: 'tests/a11y', use: { browserName: 'chromium' } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
