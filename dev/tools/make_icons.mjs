// =============================================================================
//  Renders the web-app icons (QuestionnaireJDR/app/icons/*.png) from the app
//  logo (the multicoloured d20 of the header, on the royal-violet "game box"
//  background), with the system Google Chrome. The "20" is set in the vendored
//  Fredoka font (app/vendor/fonts), loaded from disk: no network.
//
//      node dev/tools/make_icons.mjs
//
//  Only needed when the logo or the colours change; the PNGs are committed.
//  Afterwards run `node dev/tools/build_pwa.mjs` (new precache version).
// =============================================================================
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = join(ROOT, 'QuestionnaireJDR');
const OUT = join(APP, 'app', 'icons');
mkdirSync(OUT, { recursive: true });
const FONT = readFileSync(join(APP, 'app', 'vendor', 'fonts', 'fredoka-700.woff2')).toString('base64');

// Colours of app/css/app.css (--brand-deep, --brand) and the six attente hues of the default config.
const DEEP = '#2e2276', BRAND = '#5a3fd8', MID = '#4129b0';

// The d20 face, drawn in a 40×40 box (same geometry as the header logo in index.html).
const d20 = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 40})">
  <g stroke="#fff" stroke-width="1.4" stroke-linejoin="round">
    <path d="M20 2.5 5 11.2l15-.7z" fill="#56B4E9"/><path d="M20 2.5l15 8.7-15-.7z" fill="#CC79A7"/>
    <path d="M5 11.2l5.6 15.2 9.4-15.9z" fill="#0072B2"/><path d="M35 11.2l-5.6 15.2-9.4-15.9z" fill="#D55E00"/>
    <path d="M5 11.2v17.6l5.6-2.4z" fill="#009E73"/><path d="M35 11.2v17.6l-5.6-2.4z" fill="#E69F00"/>
    <path d="M5 28.8l15 8.7-9.4-11.1zM35 28.8l-15 8.7 9.4-11.1z" fill="#3B2A9E"/>
    <path d="M10.6 26.4h18.8L20 37.5z" fill="#7B5CF0"/><path d="M20 10.5l9.4 15.9H10.6z" fill="#fff"/>
  </g>
  <text x="20" y="23.6" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="8.2" fill="${DEEP}">20</text></g>`;

const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${DEEP}"/><stop offset=".5" stop-color="${MID}"/><stop offset="1" stop-color="${BRAND}"/></linearGradient>
  <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#0a0532" flood-opacity=".45"/></filter></defs>`;
const shine = `<circle cx="86" cy="2" r="34" fill="#fff" fill-opacity=".12"/>`;

// "any": rounded game-box tile on a transparent background, d20 slightly tilted.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${defs}
  <clipPath id="c"><rect x="4" y="4" width="92" height="92" rx="24"/></clipPath>
  <g clip-path="url(#c)"><rect width="100" height="100" fill="url(#g)"/>${shine}</g>
  <g filter="url(#s)" transform="rotate(-8 50 50)">${d20(16, 16, 68)}</g></svg>`;
// "maskable" / apple-touch: full-bleed background, d20 inside the 80 % safe zone.
const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${defs}
  <rect width="100" height="100" fill="url(#g)"/>${shine}
  <g filter="url(#s)" transform="rotate(-8 50 50)">${d20(24, 24, 52)}</g></svg>`;

const ICONS = [
  ['icon-192.png', 192, anySvg],
  ['icon-512.png', 512, anySvg],
  ['icon-maskable-192.png', 192, fullSvg],
  ['icon-maskable-512.png', 512, fullSvg],
  ['apple-touch-icon.png', 180, fullSvg]
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [name, size, svg] of ICONS) {
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: size, height: size } });
  await page.setContent(`<html><head><style>@font-face{font-family:Fredoka;font-weight:700;src:url(data:font/woff2;base64,${FONT}) format('woff2')}</style></head>` +
    `<body style="margin:0;background:transparent;overflow:hidden">${svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('  ' + name);
}
await browser.close();
console.log('Icônes écrites dans ' + OUT);
