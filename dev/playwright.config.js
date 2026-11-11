// End-to-end tests: drive the system Google Chrome (headless) over file://.
// Run from dev/:  npx playwright test
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 90000,
  reporter: 'list',
  use: {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
    locale: 'fr-FR'
  }
});
