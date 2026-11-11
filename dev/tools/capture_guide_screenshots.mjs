// =============================================================================
//  Captures the screenshots used by the user guide
//  (QuestionnaireJDR/documentation/guide.html) into
//  QuestionnaireJDR/documentation/images/.
//
//  Drives the system Google Chrome (headless, like the e2e tests): the desktop
//  screenshots over file://, the tablet / phone ones (4x-*.png) with Android
//  emulation over http (dev/tools/serve.mjs is started on port 4174 for that).
//  Re-run it whenever the user interface changes:
//
//      cd dev && node tools/capture_guide_screenshots.mjs
//
//  The guide references the images by their file names: keep them stable.
// =============================================================================
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = join(ROOT, 'QuestionnaireJDR');
const OUT = join(APP, 'documentation', 'images');
const DEV_SHOTS = join(ROOT, 'dev', 'screenshots');
const URL = pathToFileURL(join(APP, 'Questionnaire JDR.html')).href;
const GUIDE_URL = pathToFileURL(join(APP, 'documentation', 'guide.html')).href;
const core = require(join(APP, 'app', 'js', 'core.js'));

mkdirSync(OUT, { recursive: true });
mkdirSync(DEV_SHOTS, { recursive: true });

// ---------------------------------------------------------------------------
// A small responses file with a "Pseudo" column, an unknown answer and an
// extra question, to illustrate the warnings and the proposals dialog.
// ---------------------------------------------------------------------------
function demoCsv() {
  const table = core.parseTable(readFileSync(join(APP, 'exemples', 'reponses_exemple.csv'), 'utf8'));
  const pseudos = ['Grimgor', 'Nagash', 'Aelys', 'Bran', 'Catalina', 'Dorn', 'Eloi', 'Ferrin'];
  const headers = [table.headers[0], 'Pseudo', ...table.headers.slice(1), 'Quel est votre jeu préféré ?'];
  const games = ['Warhammer 40k', 'Bolt Action', 'Warhammer 40k', 'Age of Sigmar', 'Bolt Action', 'Warhammer 40k', 'Kings of War', 'Age of Sigmar'];
  const rows = table.rows.slice(0, 8).map((r, i) => {
    const row = [r[0], pseudos[i], ...r.slice(1), games[i]];
    if (i === 1) row[2] = '... Un peu de tout, ça dépend des jours.'; // unknown answer to Q1
    return row;
  });
  const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Tablet / phone screenshots (Android emulation, app served over http).
// No fullPage screenshots here: in Playwright 1.49 they drop touch emulation.
// ---------------------------------------------------------------------------
const TABLET_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const PORT = 4174;

async function startServer() {
  const proc = spawn(process.execPath, [join(ROOT, 'dev', 'tools', 'serve.mjs'), '--port', String(PORT), '--base', '/qjdr/'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/qjdr/`); if (r.ok) return proc; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error('serveur de test injoignable');
}

async function captureMobile(browser) {
  const server = await startServer();
  const errors = [];
  const device = (viewport, ua) => ({ viewport, screen: viewport, userAgent: ua, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'fr-FR', reducedMotion: 'reduce' });
  const open = async (viewport, ua) => {
    const ctx = await browser.newContext(device(viewport, ua));
    await ctx.addInitScript(() => { try { delete Window.prototype.showDirectoryPicker; delete window.showDirectoryPicker; } catch (e) { /* */ } }); // as on Android
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`http://localhost:${PORT}/qjdr/`);
    await p.waitForSelector('[data-testid=config-banner]');
    await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready);
    await p.waitForTimeout(400);
    return { ctx, p };
  };
  const clean = (p) => p.evaluate(() => { document.querySelectorAll('#toasts > *').forEach((t) => t.remove()); window.scrollTo(0, 0); });
  const save = async (p, name, target) => { await clean(p); await (target || p).screenshot({ path: join(OUT, name) }); console.log('  ' + name); };

  // tablet, portrait
  {
    const { ctx, p } = await open({ width: 800, height: 1280 }, TABLET_UA);
    await save(p, '40-tablette-accueil.png');
    await p.getByTestId('btn-exemple').click();
    await p.locator('.tab[data-tab=individuels]').click();
    await p.frameLocator('[data-testid=frame-individuel]').locator('.r-name').waitFor();
    await p.getByTestId('btn-liste-repondants').click();
    await p.waitForTimeout(300);
    await clean(p);
    await save(p, '42-tablette-liste.png', p.getByTestId('side-repondants'));
    await p.getByTestId('btn-liste-repondants').click();
    await p.waitForTimeout(300);
    await save(p, '43-tablette-barre.png', p.locator('#panel-individuels .toolbar'));
    await p.locator('.tab[data-tab=config]').click();
    await p.getByTestId('cfg-nav-questions').click();
    await p.getByTestId('cfg-question-q01').locator('summary').click();
    await p.waitForTimeout(200);
    await clean(p);
    await p.getByTestId('cfg-question-q01').locator('.weights-wrap').scrollIntoViewIfNeeded();
    await p.getByTestId('cfg-question-q01').locator('.weights-wrap').screenshot({ path: join(OUT, '44-tablette-poids.png') });
    console.log('  44-tablette-poids.png');
    await p.getByTestId('cfg-nav-fichiers').click();
    await p.waitForTimeout(200);
    await save(p, '45-tablette-config-fichiers.png', p.locator('#panel-config .config-layout > div > .card').nth(1));
    // the update notice, as shown when a new version has been published
    await p.evaluate(() => window.QJ.util.toast('Nouvelle version disponible.', false, { sticky: true, action: { label: 'Recharger', onClick: function () {} } }));
    await p.waitForTimeout(400);
    await p.locator('#toasts .toast').screenshot({ path: join(OUT, '47-mise-a-jour.png') });
    console.log('  47-mise-a-jour.png');
    await ctx.close();
  }
  // tablet, landscape
  {
    const { ctx, p } = await open({ width: 1280, height: 800 }, TABLET_UA);
    await p.getByTestId('btn-exemple').click();
    await p.locator('.tab[data-tab=individuels]').click();
    await p.getByTestId('liste-repondants').locator('button').nth(2).click();
    await p.frameLocator('[data-testid=frame-individuel]').locator('.r-name').waitFor();
    await p.waitForTimeout(500);
    await save(p, '41-tablette-individuel.png');
    await ctx.close();
  }
  // phone: an exported report as a player sees it
  {
    const { ctx, p } = await open({ width: 412, height: 915 }, PHONE_UA);
    await p.getByTestId('btn-exemple').click();
    await p.locator('.tab[data-tab=individuels]').click();
    await p.frameLocator('[data-testid=frame-individuel]').locator('.r-name').waitFor();
    const html = await p.evaluate(() => window.QJ.reports.individualHTML(window.QJ.store.state.config, window.QJ.store.state.analysis.respondents[2]));
    const solo = await ctx.newPage();
    await solo.setContent(html);
    await solo.waitForTimeout(300);
    await solo.screenshot({ path: join(OUT, '46-telephone-rapport.png') });
    console.log('  46-telephone-rapport.png');
    await ctx.close();
  }
  server.kill();
  if (errors.length) throw new Error('Erreurs JS (tablette) : ' + errors.join(' | '));
}

// ---------------------------------------------------------------------------
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR', deviceScaleFactor: 1, reducedMotion: 'reduce' }); // no half-finished animation in the images
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const shot = async (name, target, opts) => {
    const path = join(OUT, name);
    await page.mouse.move(0, 0); // no hover highlight in the capture
    await (target || page).screenshot({ path, ...(opts || {}) });
    console.log('  ' + name);
  };
  // Screenshot of the union of several elements (page coordinates).
  const shotUnion = async (name, locators, pad = 8) => {
    const boxes = [];
    for (const l of locators) {
      await l.scrollIntoViewIfNeeded();
      const b = await l.boundingBox(); // viewport coordinates at this scroll position
      const sc = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
      boxes.push({ x: b.x + sc.x, y: b.y + sc.y, width: b.width, height: b.height }); // page coordinates
    }
    const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
    const x1 = Math.max(...boxes.map((b) => b.x + b.width)), y1 = Math.max(...boxes.map((b) => b.y + b.height));
    await shot(name, page, { fullPage: true, clip: { x: x0 - pad, y: y0 - pad, width: x1 - x0 + 2 * pad, height: y1 - y0 + 2 * pad } });
  };
  const tab = async (name) => { await page.locator(`.tab[data-tab=${name}]`).click(); await page.waitForTimeout(150); };
  const banner = () => page.getByTestId('config-banner');
  const closeToasts = () => page.evaluate(() => { document.querySelectorAll('#toasts > *').forEach((t) => t.remove()); });

  console.log('Capture des écrans dans ' + OUT);
  await page.goto(URL);
  await page.waitForSelector('[data-testid=config-banner][data-state=defaut]');

  // --- 1. Données, vide
  await shot('01-accueil.png');
  await shot('02-bandeau-defaut.png', banner());

  // --- 2. Données, exemple chargé
  await page.getByTestId('btn-exemple').click();
  await page.waitForFunction(() => document.querySelector('[data-testid=nb-repondants]')?.textContent === '30');
  await closeToasts();
  await shot('03-donnees-chargees.png', page.getByTestId('data-summary'));
  await shot('04-donnees-verification-ok.png', page.locator('#panel-donnees .card').nth(1));

  // --- 3. Rapports individuels
  await tab('individuels');
  await page.getByTestId('liste-repondants').locator('button').nth(2).click();
  const fi = page.frameLocator('[data-testid=frame-individuel]');
  await fi.locator('.r-name').waitFor();
  await page.waitForTimeout(600);
  await shot('06-individuels.png');
  await shot('07-individuels-barre.png', page.locator('#panel-individuels .toolbar'));
  await shot('08-individuel-attente.png', fi.locator('.r-attente').first());
  await shot('08b-individuel-haut.png', fi.locator('.r-top'));

  // --- 4. Rapport global
  await tab('global');
  const fg = page.frameLocator('[data-testid=frame-global]');
  await fg.locator('h1').first().waitFor();
  await page.waitForTimeout(800);
  await shot('09-global.png');
  await shot('10-global-profil-moyen.png', fg.locator('#profil-moyen'));
  await shot('11-global-principales.png', fg.locator('#principales'));
  await shot('12-global-detail-attente.png', fg.locator('#attentes .g-att').first());
  await shot('13-global-correlations.png', fg.locator('#correlations'));
  await shot('14-global-questions.png', fg.locator('#questions .q').first());
  // the respondents table is long: keep its top (title, lead, first rows)
  {
    const el = fg.locator('#repondants');
    await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox();
    const sc = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    await shot('15-global-repondants.png', page, { fullPage: true, clip: { x: b.x + sc.x, y: b.y + sc.y, width: b.width, height: Math.min(b.height, 420) } });
  }

  // --- 5. Configuration : attentes et niveaux
  await tab('config');
  await page.getByTestId('cfg-nav-attentes').click();
  await page.getByTestId('cfg-attente-competition').locator('summary').click();
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('16-config-attentes.png');
  const att = page.getByTestId('cfg-attente-competition');
  await shotUnion('17-config-niveaux.png', [att.locator('p.help'), att.locator('table.levels-edit'), att.locator('button', { hasText: 'Ajouter un niveau' })]);
  await shotUnion('17b-config-attente-haut.png', [att.locator('summary'), att.locator('.body .field').nth(2)]);

  // --- 6. Configuration : questions et poids
  await page.getByTestId('cfg-nav-questions').click();
  await shot('19-config-max.png', page.locator('[data-role=max-table]'));
  await page.getByTestId('cfg-question-q01').locator('summary').click();
  await page.waitForTimeout(200);
  await shot('18-config-poids.png', page.getByTestId('cfg-question-q01'));
  await shotUnion('18b-config-questions-haut.png', [page.locator('#panel-config h2', { hasText: 'Questions et poids' }), page.locator('[data-role=max-table]')]);
  // modify a weight → "modifiée, non enregistrée"
  const w = page.locator('[data-testid^=poids-q01-][data-testid$=-hasard]').first();
  await w.fill('1');
  await page.waitForSelector('[data-testid=config-banner][data-state=modifiee]');
  await closeToasts();
  await shot('23-bandeau-modifiee.png', banner());

  // --- 7. Configuration : textes, général
  await page.getByTestId('cfg-nav-rapport').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('21-config-rapport.png');

  // --- 8. Configuration : ouvrir / enregistrer
  await page.getByTestId('cfg-nav-fichiers').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('22-config-fichiers.png');
  // banner as it looks after a save into the folder (state only, no real folder in headless mode)
  await page.evaluate(() => window.QJ.store.markSaved({ source: 'dossier', label: 'configuration' }));
  await page.waitForTimeout(200);
  await closeToasts();
  await shot('24-bandeau-dossier.png', banner());
  // how the section looks in a browser without direct folder access (Firefox, Safari)
  await page.evaluate(() => { window.QJ.files.fsSupported = false; window.QJ.uiConfig.goTo('fichiers'); });
  await page.waitForTimeout(200);
  await shot('30-config-fichiers-firefox.png', page.locator('#panel-config .card').nth(2));
  await page.evaluate(() => { window.QJ.files.fsSupported = true; window.QJ.uiConfig.goTo('fichiers'); });

  // reset to the default configuration
  await page.getByTestId('btn-reset-config').click();
  await shot('31-confirmation.png', page.locator('.modal'));
  await page.locator('.modal .btn.danger').click();
  await page.waitForSelector('[data-testid=config-banner][data-state=defaut]');

  // --- 9. Données : fichier avec avertissements
  await tab('donnees');
  await page.getByTestId('input-csv').setInputFiles({ name: 'reponses.csv', mimeType: 'text/csv', buffer: Buffer.from(demoCsv(), 'utf8') });
  await page.waitForFunction(() => document.querySelector('[data-testid=nb-repondants]')?.textContent === '8');
  await closeToasts();
  await shot('05-donnees-avertissements.png', page.locator('#panel-donnees .card').nth(1));

  // --- 10. Général : colonne du pseudo
  await tab('config');
  await page.getByTestId('cfg-nav-general').click();
  await page.getByTestId('cfg-colonne-identifiant').fill('Pseudo');
  await page.waitForTimeout(300);
  await closeToasts();
  await shot('20-config-general.png', page.locator('#panel-config .config-layout > div:last-child .card').first());
  await tab('individuels');
  await page.waitForTimeout(600);
  await shot('27-individuels-pseudos.png', page.locator('#panel-individuels .side'));

  // --- 11. Propositions à partir du fichier
  await tab('config');
  await page.getByTestId('cfg-nav-questions').click();
  await page.getByTestId('btn-propositions').click();
  await shot('26-propositions-choix.png', page.locator('.modal'));
  await page.locator('.modal .btn.primary').click();
  await page.locator('.modal', { hasText: 'Éléments trouvés' }).waitFor();
  await shot('25-propositions.png', page.locator('.modal'));
  await page.locator('.modal .btn', { hasText: 'Annuler' }).click();

  // --- 12. Aide
  await tab('aide');
  await page.waitForFunction(() => !document.querySelector('#panel-aide')?.textContent.includes('Chargement du guide'), null, { timeout: 5000 });
  await page.waitForTimeout(1200);
  // verification only (the guide shown inside the app): not referenced by the guide
  await page.screenshot({ path: join(DEV_SHOTS, 'aide-guide.png') });
  console.log('  dev/screenshots/aide-guide.png');

  // --- 13. The guide itself (checks only, kept out of the guide's images)
  if (existsSync(join(APP, 'documentation', 'guide.html'))) {
    const g = await context.newPage();
    const gerrors = [];
    g.on('pageerror', (e) => gerrors.push(e.message));
    await g.goto(GUIDE_URL);
    await g.waitForTimeout(500);
    const broken = await g.evaluate(() => Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
    const anchors = await g.evaluate(() => Array.from(document.querySelectorAll('a[href^="#"]')).map((a) => a.getAttribute('href').slice(1)).filter((id) => !document.getElementById(id)));
    await g.screenshot({ path: join(DEV_SHOTS, 'guide-haut.png') });
    await g.screenshot({ path: join(DEV_SHOTS, 'guide-complet.png'), fullPage: true });
    console.log('Guide : ' + (broken.length ? 'images manquantes : ' + broken.join(', ') : 'toutes les images se chargent') +
      ' ; ' + (anchors.length ? 'ancres cassées : ' + anchors.join(', ') : 'toutes les ancres existent'));
    if (gerrors.length) console.log('Erreurs JS dans le guide : ' + gerrors.join(' | '));
  } else {
    console.log('guide.html absent : pas de vérification du guide.');
  }

  console.log('Écrans tablette et téléphone (émulation Android, http) :');
  await captureMobile(browser);

  await browser.close();
  if (errors.length) { console.error('Erreurs JS dans l’application :\n' + errors.join('\n')); process.exit(1); }
  console.log('Terminé.');
}

main().catch((e) => { console.error(e); process.exit(1); });
