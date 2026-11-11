// Web version on Android (tablet portrait / landscape, phone): run by the
// tablet-* and phone projects of playwright.config.js, over http, the app
// served under /qjdr/ like a GitHub Pages project site.
// File System Access is removed (as on Android Chrome) before each test.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

const SHOTS = path.join(__dirname, '..', 'screenshots', 'tablet');
fs.mkdirSync(SHOTS, { recursive: true });
const SW_TEXT = fs.readFileSync(path.join(__dirname, '..', '..', 'QuestionnaireJDR', 'sw.js'), 'utf8');

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    // Android Chrome has no File System Access API.
    try { delete Window.prototype.showDirectoryPicker; } catch (e) { /* ignore */ }
    try { delete window.showDirectoryPicker; } catch (e) { /* ignore */ }
  });
});

// Playwright (1.49, Chromium) drops touch emulation after a fullPage screenshot
// (`pointer: coarse` stops matching): switch it back on through CDP.
// (The CDP session is kept open: detaching it would undo its emulation settings.)
const cdpSessions = new WeakMap();
async function restoreTouch(page) {
  if (!cdpSessions.has(page)) cdpSessions.set(page, await page.context().newCDPSession(page));
  await cdpSessions.get(page).send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
}
async function shot(page, testInfo, name, opts) {
  await page.screenshot({ path: path.join(SHOTS, `${testInfo.project.name}-${name}.png`), ...(opts || {}) });
  if (opts && opts.fullPage) await restoreTouch(page);
}

/** No horizontal page scroll (the page, and the report shown in an iframe). */
// With isMobile, Chrome widens the layout viewport to fit too-wide content
// (innerWidth grows too): compare with the device width, not innerWidth.
async function expectNoHorizontalOverflow(page, where) {
  const width = test.info().project.use.viewport.width;
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(m.sw, `horizontal overflow of the page (${where})`).toBeLessThanOrEqual(width + 1);
  expect(m.w, `layout viewport widened by too-wide content (${where})`).toBeLessThanOrEqual(width + 1);
  for (const sel of ['[data-testid=frame-individuel]', '[data-testid=frame-global]']) {
    const el = page.locator(sel);
    if (!(await el.count()) || !(await el.isVisible())) continue;
    const f = await el.evaluate((fr) => ({ sw: fr.contentDocument.documentElement.scrollWidth, w: fr.contentDocument.documentElement.clientWidth }));
    expect(f.sw, `horizontal overflow inside ${sel} (${where})`).toBeLessThanOrEqual(f.w + 1);
  }
}

async function swReady(page) {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
}

async function loadExample(page) {
  await page.getByTestId('btn-exemple').click();
  await expect(page.getByTestId('nb-repondants')).toHaveText('30');
}

test('service worker : installation, puis application utilisable hors connexion', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByTestId('config-banner')).toHaveAttribute('data-state', 'defaut');
  await swReady(page);
  const version = SW_TEXT.match(/var VERSION = "([0-9a-f]+)"/)[1];
  const cache = await page.evaluate(async () => {
    const keys = await caches.keys();
    const c = await caches.open(keys.find((k) => k.startsWith('qjdr-')));
    return { keys, n: (await c.keys()).length };
  });
  expect(cache.keys).toContain('qjdr-' + version);
  expect(cache.n).toBeGreaterThanOrEqual((SW_TEXT.match(/^  "/gm) || []).length);

  await context.setOffline(true);
  const res = await page.reload();
  expect(res.fromServiceWorker()).toBe(true);
  await expect(page.getByTestId('config-banner')).toHaveAttribute('data-state', 'defaut');
  await loadExample(page);
  await page.locator('.tab[data-tab=individuels]').click();
  await expect(page.frameLocator('[data-testid=frame-individuel]').locator('.r-name')).toHaveText('Répondant 1');
  await page.locator('.tab[data-tab=global]').click();
  await expect(page.frameLocator('[data-testid=frame-global]').locator('table.sortable tbody tr')).toHaveCount(30);
  // the user guide (and its images) offline, at its own URL
  const guide = await context.newPage();
  await guide.goto('documentation/guide.html');
  await expect(guide.locator('h1').first()).toBeVisible();
  const broken = await guide.evaluate(() => Promise.all(Array.from(document.images).map((i) => i.decode().then(() => null, () => i.getAttribute('src')))));
  expect(broken.filter(Boolean)).toEqual([]);
  // the desktop entry point is cached too
  await guide.goto('Questionnaire%20JDR.html');
  await expect(guide.getByTestId('config-banner')).toBeVisible();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test('mise à jour : « Nouvelle version disponible » puis « Recharger »', async ({ page, context }) => {
  await page.goto('./');
  await swReady(page);
  // A new version is "deployed" for this browser context only (serve.mjs --test-hooks).
  await context.addCookies([{ name: 'qjdr_sw_version', value: 'e2e000000000', url: page.url() }]);
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  const toastEl = page.getByTestId('toast-maj');
  await expect(toastEl).toBeVisible({ timeout: 15000 });
  await expect(toastEl).toContainText('Nouvelle version disponible');
  await shot(page, test.info(), 'maj-toast');
  await Promise.all([page.waitForEvent('load'), page.getByTestId('btn-recharger-maj').click()]);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('qjdr-')))).toEqual(['qjdr-e2e000000000']); // old cache removed
  await expect(page.getByTestId('config-banner')).toBeVisible();
});

test('interface tactile : pas de dossier ni de glisser-déposer, sélecteurs de fichiers permissifs', async ({ page }, testInfo) => {
  await page.goto('./');
  expect(await page.evaluate(() => typeof window.showDirectoryPicker)).toBe('undefined');
  expect(await page.evaluate(() => window.QJ.util.env.mobile)).toBe(true);
  // Données: "choose a file" wording, no drop zone
  await expect(page.getByTestId('dropzone')).toContainText('Choisissez le fichier des réponses');
  await expect(page.getByTestId('dropzone')).not.toContainText('Déposez');
  await expect(page.getByTestId('steps-reponses')).toContainText('Google Sheets');
  const accept = await page.getByTestId('input-csv').getAttribute('accept');
  for (const t of ['.csv', '.xlsx', '.zip', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'text/comma-separated-values', 'application/octet-stream']) {
    expect(accept.split(',')).toContain(t);
  }
  await shot(page, testInfo, '01-accueil');
  await expectNoHorizontalOverflow(page, 'accueil');

  // Configuration > Ouvrir / Enregistrer: only the ZIP / files path
  await page.locator('.tab[data-tab=config]').click();
  await page.getByTestId('cfg-nav-fichiers').click();
  await expect(page.getByTestId('config-howto-mobile')).toBeVisible();
  await expect(page.getByTestId('config-fs-actions')).toHaveCount(0);
  await expect(page.getByTestId('btn-config-open-dir')).toHaveCount(0);
  await expect(page.getByTestId('config-dropzone')).toHaveCount(0);
  await expect(page.locator('#panel-config')).not.toContainText('Choisir le dossier');
  const cfgAccept = await page.getByTestId('input-config-files').getAttribute('accept');
  for (const t of ['.zip', '.yaml', 'application/zip']) expect(cfgAccept.split(',')).toContain(t);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-config-zip').click()]);
  expect(dl.suggestedFilename()).toBe('configuration.zip');
  // reload it through « Ouvrir des fichiers »
  await page.getByTestId('input-config-files').setInputFiles(await dl.path().then((p) => ({ name: 'configuration.zip', mimeType: 'application/zip', buffer: fs.readFileSync(p) })));
  await expect(page.getByTestId('config-banner')).toHaveAttribute('data-state', 'fichiers');
  await expectNoHorizontalOverflow(page, 'config fichiers');

  // Touch targets and font sizes (no zoom on focus)
  const small = await page.evaluate(() => Array.from(document.querySelectorAll('button, .btn, input:not([type=file]):not([type=checkbox]):not([type=radio]):not(.visually-hidden), select, textarea'))
    .filter((el) => el.offsetParent !== null)
    .map((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { t: (el.textContent || el.getAttribute('aria-label') || el.type || '').trim().slice(0, 30), h: r.height, w: r.width, fs: parseFloat(cs.fontSize), tag: el.tagName }; })
    .filter((x) => x.h < 40 || (x.w < 40 && x.tag !== 'INPUT') || (/INPUT|SELECT|TEXTAREA/.test(x.tag) && x.fs < 16)));
  expect(small).toEqual([]);
  await shot(page, testInfo, '07-config-fichiers', { fullPage: true }); // last: a fullPage shot disturbs the emulation
});

test('parcours tablette : exemple, rapports, configuration, sans défilement horizontal', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await loadExample(page);
  await shot(page, testInfo, '02-donnees');
  await expectNoHorizontalOverflow(page, 'données');

  // Rapports individuels
  await page.locator('.tab[data-tab=individuels]').click();
  const fi = page.frameLocator('[data-testid=frame-individuel]');
  await expect(fi.locator('.r-name')).toHaveText('Répondant 1');
  const narrow = await page.evaluate(() => window.matchMedia('(max-width: 960px)').matches);
  if (narrow) {
    // the list is folded: open it, pick a player, it folds back
    await expect(page.getByTestId('liste-repondants')).toBeHidden();
    await page.getByTestId('btn-liste-repondants').click();
    await expect(page.getByTestId('liste-repondants')).toBeVisible();
    await shot(page, testInfo, '03b-liste-ouverte');
  }
  await page.getByTestId('liste-repondants').locator('button').nth(2).click();
  await expect(fi.locator('.r-name')).toHaveText('Répondant 3');
  if (narrow) await expect(page.getByTestId('liste-repondants')).toBeHidden();
  await page.locator('button[aria-label="Répondant suivant"]').click();
  await expect(fi.locator('.r-name')).toHaveText('Répondant 4');
  await page.waitForTimeout(300);
  await shot(page, testInfo, '03-individuel');
  await expectNoHorizontalOverflow(page, 'rapport individuel');

  // Rapport global
  await page.locator('.tab[data-tab=global]').click();
  const fg = page.frameLocator('[data-testid=frame-global]');
  await expect(fg.locator('table.sortable tbody tr')).toHaveCount(30);
  await page.waitForTimeout(300);
  await shot(page, testInfo, '04-global');
  await expectNoHorizontalOverflow(page, 'rapport global');

  // Configuration : attentes, questions, weight grid
  await page.locator('.tab[data-tab=config]').click();
  await page.getByTestId('cfg-attente-competition').locator('summary').click();
  await shot(page, testInfo, '05-config-attentes');
  await expectNoHorizontalOverflow(page, 'config attentes');
  await page.getByTestId('cfg-nav-questions').click();
  await page.getByTestId('cfg-question-q01').locator('summary').click();
  const q = page.getByTestId('cfg-question-q01');
  await q.scrollIntoViewIfNeeded();
  await shot(page, testInfo, '06-config-poids');
  await page.evaluate(() => window.scrollBy(0, 420));
  await shot(page, testInfo, '06b-grille-poids');
  await expectNoHorizontalOverflow(page, 'grille des poids');
  // editing a weight still works (touch: tap then type)
  const w = page.locator('[data-testid^=poids-q01-0-]').first();
  await w.tap();
  await w.fill('3');
  await expect(page.getByTestId('config-banner')).toHaveAttribute('data-state', 'modifiee');

  // Aide
  await page.locator('.tab[data-tab=aide]').click();
  await expect(page.frameLocator('.help-frame').locator('h1').first()).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, testInfo, '08-aide');
  await expectNoHorizontalOverflow(page, 'aide');
  expect(errors).toEqual([]);
  // full-height captures last (a fullPage screenshot disturbs the mobile emulation)
  await page.locator('.tab[data-tab=individuels]').click();
  await page.waitForTimeout(300);
  await shot(page, testInfo, '03-individuel-complet', { fullPage: true });
  await page.locator('.tab[data-tab=global]').click();
  await page.waitForTimeout(300);
  await shot(page, testInfo, '04-global-complet', { fullPage: true });
});

test('rapports exportés lisibles sur téléphone, partage et impression', async ({ page, context }, testInfo) => {
  await context.addInitScript(() => {
    window.__shared = [];
    navigator.canShare = (d) => !!(d && d.files && d.files.length);
    navigator.share = (d) => { window.__shared.push(d.files.map((f) => ({ name: f.name, type: f.type, size: f.size }))); return Promise.resolve(); };
    window.print = () => { window.__printed = (window.__printed || 0) + 1; };
  });
  await page.goto('./');
  await loadExample(page);
  await page.locator('.tab[data-tab=individuels]').click();
  await expect(page.frameLocator('[data-testid=frame-individuel]').locator('.r-name')).toHaveText('Répondant 1');

  // « Partager… » sends the report file to the share sheet
  await page.getByTestId('btn-partager-un').click();
  await expect.poll(() => page.evaluate(() => window.__shared.length)).toBe(1);
  const shared = await page.evaluate(() => window.__shared[0]);
  expect(shared[0].name).toBe('Rapport - Répondant 1.html');
  expect(shared[0].type).toBe('text/html');
  expect(shared[0].size).toBeGreaterThan(5000);

  // « Imprimer / PDF » opens the report in a new tab that prints itself
  const [popup] = await Promise.all([context.waitForEvent('page'), page.getByTestId('btn-imprimer-un').click()]);
  await expect(popup.locator('.r-name')).toHaveText('Répondant 1');
  await expect.poll(() => popup.evaluate(() => window.__printed || 0), { timeout: 5000 }).toBeGreaterThan(0);
  await popup.close();

  // the exported files, opened on their own (as a player would on a phone)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export-un').click()]);
  const html = fs.readFileSync(await dl.path(), 'utf8');
  const solo = await context.newPage();
  await solo.setContent(html);
  await solo.waitForTimeout(200);
  expect(await solo.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(testInfo.project.use.viewport.width + 1);
  await shot(solo, testInfo, '10-rapport-exporte', { fullPage: true });
  await solo.close();

  await page.locator('.tab[data-tab=global]').click();
  const [dlg] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export-global').click()]);
  const ghtml = fs.readFileSync(await dlg.path(), 'utf8');
  const gsolo = await context.newPage();
  await gsolo.setContent(ghtml);
  await gsolo.waitForTimeout(200);
  expect(await gsolo.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(testInfo.project.use.viewport.width + 1);
  await shot(gsolo, testInfo, '11-global-exporte', { fullPage: true });
  await gsolo.close();
});
