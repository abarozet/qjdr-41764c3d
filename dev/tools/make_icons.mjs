// =============================================================================
//  Renders the web-app icons (QuestionnaireJDR/app/icons/*.png) from the app
//  logo (the five-pip die of the header), with the system Google Chrome.
//
//      node dev/tools/make_icons.mjs
//
//  Only needed when the logo or the colours change; the PNGs are committed.
//  Afterwards run `node dev/tools/build_pwa.mjs` (new precache version).
// =============================================================================
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'QuestionnaireJDR', 'app', 'icons');
mkdirSync(OUT, { recursive: true });

// Colours of app/css/app.css (--accent, --brass, --paper).
const ACCENT = '#8e3b1f', BRASS = '#b0842f', PIP = '#f6efe3';

function pips(cx, cy, d, r) {
  return [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]]
    .map(([x, y]) => `<circle cx="${cx + x * d}" cy="${cy + y * d}" r="${r}" fill="${PIP}"/>`).join('');
}

// "any": the logo itself, rounded die on a transparent background.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="5" y="5" width="90" height="90" rx="21" fill="${ACCENT}" stroke="${BRASS}" stroke-width="4"/>
  ${pips(50, 50, 20, 8.5)}</svg>`;
// "maskable" / apple-touch: full-bleed background, die face inside the 80 % safe zone.
const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${ACCENT}"/>
  <rect x="20" y="20" width="60" height="60" rx="13" fill="none" stroke="${BRASS}" stroke-width="3"/>
  ${pips(50, 50, 15, 6.5)}</svg>`;

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
  await page.setContent(`<html><body style="margin:0;background:transparent;overflow:hidden">${svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
  await page.screenshot({ path: join(OUT, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('  ' + name);
}
await browser.close();
console.log('Icônes écrites dans ' + OUT);
