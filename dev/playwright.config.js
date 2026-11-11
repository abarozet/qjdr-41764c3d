// End-to-end tests, system Google Chrome (headless). Run from dev/:  npx playwright test
//
// - desktop-file: the desktop "double-click" mode, page opened over file://
//   (app.spec.js, dossier.spec.js);
// - tablet-portrait / tablet-landscape / phone: Android emulation (user agent,
//   touch, viewport, device pixel ratio) over http, the app being served under
//   a sub-path like GitHub Pages (tools/serve.mjs, started by `webServer`):
//   mobile.spec.js (service worker + offline, touch UI, layout, screenshots).
const { defineConfig } = require('@playwright/test');

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/qjdr/`;
const CHROME = '131.0.0.0';
const ANDROID_TABLET_UA = `Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME} Safari/537.36`;
const ANDROID_PHONE_UA = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME} Mobile Safari/537.36`;

const android = (viewport, ua, scale) => ({
  channel: 'chrome', headless: true, baseURL: BASE_URL,
  viewport, screen: viewport, userAgent: ua, deviceScaleFactor: scale,
  isMobile: true, hasTouch: true, acceptDownloads: true, locale: 'fr-FR'
});

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 90000,
  reporter: 'list',
  webServer: {
    command: `node tools/serve.mjs --port ${PORT} --base /qjdr/ --test-hooks`,
    url: BASE_URL,
    reuseExistingServer: false,
    stdout: 'ignore'
  },
  projects: [
    {
      name: 'desktop-file',
      testMatch: /(app|dossier)\.spec\.js/,
      use: { channel: 'chrome', headless: true, viewport: { width: 1280, height: 900 }, acceptDownloads: true, locale: 'fr-FR' }
    },
    { name: 'tablet-portrait', testMatch: /mobile\.spec\.js/, use: android({ width: 800, height: 1280 }, ANDROID_TABLET_UA, 2) },
    { name: 'tablet-landscape', testMatch: /mobile\.spec\.js/, use: android({ width: 1280, height: 800 }, ANDROID_TABLET_UA, 2) },
    { name: 'phone', testMatch: /mobile\.spec\.js/, use: android({ width: 412, height: 915 }, ANDROID_PHONE_UA, 2.625) }
  ]
});
