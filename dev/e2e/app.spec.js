const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const JSZip = require('../../QuestionnaireJDR/app/vendor/jszip.min.js');

const APP_DIR = path.join(__dirname, '..', '..', 'QuestionnaireJDR');
const URL = pathToFileURL(path.join(APP_DIR, 'Questionnaire JDR.html')).href;
const SHOTS = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

async function download(page, action) {
  const [dl] = await Promise.all([page.waitForEvent('download'), action()]);
  const file = await dl.path();
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(file) };
}

function firstDataRow(csvBuf) {
  const lines = csvBuf.toString('utf8').replace(/^\uFEFF/, '').split('\r\n');
  const head = lines[0].split(';');
  const row = lines[1].split(';');
  return Object.fromEntries(head.map((h, i) => [h, row[i]]));
}

test('parcours complet : exemple, rapports, exports, configuration', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await expect(page.getByTestId('config-banner')).toHaveAttribute('data-state', 'defaut');
  await page.screenshot({ path: path.join(SHOTS, '01-accueil.png') });

  // --- Données : charger l'exemple
  await page.getByTestId('btn-exemple').click();
  await expect(page.getByTestId('nb-repondants')).toHaveText('30');
  await page.screenshot({ path: path.join(SHOTS, '02-donnees.png') });

  // --- Rapports individuels
  await page.locator('.tab[data-tab=individuels]').click();
  const frame = page.frameLocator('[data-testid=frame-individuel]');
  await expect(frame.locator('h1')).toContainText('Votre profil');
  await expect(frame.locator('.r-name')).toHaveText('Répondant 1');
  await expect(frame.locator('svg.qj-radar')).toHaveCount(1);
  await expect(frame.locator('.badge').first()).toContainText(/Niveau \d+\/\d+/);
  await page.getByTestId('liste-repondants').locator('button').nth(2).click();
  await expect(page.frameLocator('[data-testid=frame-individuel]').locator('.r-name')).toHaveText('Répondant 3');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, '03-rapport-individuel.png') });
  const one = await download(page, () => page.getByTestId('btn-export-un').click());
  expect(one.name).toBe('Rapport - Répondant 3.html');
  expect(one.buf.toString()).toContain('<svg');
  const zipDl = await download(page, () => page.getByTestId('btn-export-zip').click());
  expect(zipDl.name).toBe('Rapports individuels.zip');
  const zip = await JSZip.loadAsync(zipDl.buf);
  expect(Object.values(zip.files).filter((f) => !f.dir).length).toBe(30);

  // --- Rapport global
  await page.locator('.tab[data-tab=global]').click();
  const g = page.frameLocator('[data-testid=frame-global]');
  await expect(g.locator('h1').first()).toContainText('Synthèse');
  await expect(g.locator('table.sortable tbody tr')).toHaveCount(30);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, '04-rapport-global.png') });
  const glob = await download(page, () => page.getByTestId('btn-export-global').click());
  expect(glob.name).toBe('Rapport global.html');
  const globHtml = glob.buf.toString();
  expect(globHtml).toContain('id="r-30"');
  expect(globHtml).not.toMatch(/(src|href)="https?:/);
  const scores1 = await download(page, () => page.getByTestId('btn-export-scores').click());
  expect(scores1.buf[0]).toBe(0xEF); // UTF-8 BOM
  const before = firstDataRow(scores1.buf);

  // --- Configuration : changer un poids et vérifier que les scores changent
  const csv = fs.readFileSync(path.join(APP_DIR, 'exemples/reponses_exemple.csv'), 'utf8');
  const config = await page.evaluate(() => window.QJ.store.state.config);
  const r1 = window_firstAnswer(csv, config);
  await page.locator('.tab[data-tab=config]').click();
  await page.getByTestId('cfg-attente-competition').locator('summary').click();
  await page.screenshot({ path: path.join(SHOTS, '05-configuration-attentes.png') });
  await page.getByTestId('cfg-nav-questions').click();
  await page.getByTestId('cfg-question-q01').locator('summary').click();
  const input = page.getByTestId(`poids-q01-${r1}-hasard`);
  await input.fill('10');
  await expect(page.getByTestId('config-banner')).toHaveAttribute('data-state', 'modifiee');
  await page.screenshot({ path: path.join(SHOTS, '06-configuration-poids.png') });
  await page.locator('.tab[data-tab=global]').click();
  await expect(page.frameLocator('[data-testid=frame-global]').locator('h1').first()).toContainText('Synthèse');
  const scores2 = await download(page, () => page.getByTestId('btn-export-scores').click());
  const after = firstDataRow(scores2.buf);
  const hasardCol = Object.keys(before).find((k) => /^Hasard/.test(k));
  expect(after[hasardCol]).not.toBe(before[hasardCol]);
  expect(parseFloat(after[hasardCol].replace(',', '.'))).toBeGreaterThan(parseFloat(before[hasardCol].replace(',', '.')));

  // --- Configuration : téléchargement ZIP puis réinitialisation
  await page.locator('.tab[data-tab=config]').click();
  await page.getByTestId('cfg-nav-fichiers').click();
  await page.screenshot({ path: path.join(SHOTS, '07-configuration-fichiers.png') });
  const cz = await download(page, () => page.getByTestId('btn-config-zip').click());
  const czip = await JSZip.loadAsync(cz.buf);
  const q = await czip.file('configuration/questionnaire.yaml').async('string');
  expect(q).toContain('CONFIGURATION DU QUESTIONNAIRE');
  expect(q).toContain('hasard: 10');
  expect(Object.keys(czip.files).filter((p) => p.startsWith('configuration/attentes/') && p.endsWith('.yaml')).length).toBe(config.attentes.length);
  await page.getByTestId('btn-reset-config').click();
  await page.locator('.modal .btn.danger').click();
  await expect(page.getByTestId('config-banner')).toHaveAttribute('data-state', 'defaut');

  // --- Aide
  await page.locator('.tab[data-tab=aide]').click();
  await expect(page.locator('#panel-aide')).not.toContainText('Chargement du guide', { timeout: 5000 });
  await page.screenshot({ path: path.join(SHOTS, '08-aide.png') });

  expect(errors).toEqual([]);
});

test('colonne identifiant, fichier Excel FR (;) et rechargement de la page', async ({ page }) => {
  await page.goto(URL);
  const csv = '\uFEFFHorodateur;Pseudo;Concernant, les décors de votre champ de bataille, vous préférez...;Colonne inconnue\r\n' +
    '03/11/2026 21:14;Grimgor;… Qu’ils soient installés pour faire une belle table;x\r\n' +
    '04/11/2026 10:00;Nagash;Réponse inventée;y\r\n';
  // windows-1252 re-save (Excel FR): encode manually (’ = 0x92, … = 0x85)
  const cp1252 = Buffer.from([...csv.replace('\uFEFF', '')].map((ch) => ch === '’' ? 0x92 : ch === '…' ? 0x85 : ch.charCodeAt(0)));
  await page.getByTestId('input-csv').setInputFiles({ name: 'reponses.csv', mimeType: 'text/csv', buffer: cp1252 });
  await expect(page.getByTestId('nb-repondants')).toHaveText('2');
  const warnings = page.getByTestId('data-warnings');
  await expect(warnings).toContainText('Colonne non reconnue (ignorée) : « Pseudo »');
  await expect(warnings).toContainText('Réponse non reconnue à la question 1 (1 fois) : « Réponse inventée »');
  await expect(page.getByTestId('data-summary')).toContainText('windows-1252');
  await expect(page.getByTestId('data-summary')).toContainText('point-virgule');

  await page.locator('.tab[data-tab=config]').click();
  await page.getByTestId('cfg-nav-general').click();
  await page.getByTestId('cfg-colonne-identifiant').fill('Pseudo');
  await page.locator('.tab[data-tab=individuels]').click();
  await expect(page.getByTestId('liste-repondants')).toContainText('Grimgor');
  await expect(page.getByTestId('liste-repondants')).toContainText('Nagash');

  // state survives a reload (localStorage)
  await page.reload();
  await expect(page.getByTestId('config-banner')).toHaveAttribute('data-state', 'modifiee');
  await page.locator('.tab[data-tab=individuels]').click();
  await expect(page.getByTestId('liste-repondants')).toContainText('Grimgor');

  // proposals from the loaded file
  await page.locator('.tab[data-tab=config]').click();
  await page.getByTestId('cfg-nav-questions').click();
  await page.getByTestId('btn-propositions').click();
  await page.locator('.modal .btn.primary').click();
  await expect(page.locator('.modal')).toContainText('Nouvelle question : Colonne inconnue');
  await page.screenshot({ path: path.join(SHOTS, '09-propositions.png') });
  await page.locator('.modal .btn.primary').click();
  await expect(page.getByTestId('cfg-question-q33')).toContainText('Colonne inconnue');
});

/** Index of the answer chosen by the first respondent to q01 (computed with the app core in Node). */
function window_firstAnswer(csv, config) {
  const core = require('../../QuestionnaireJDR/app/js/core.js');
  const a = core.analyze(config, core.parseTable(csv));
  return a.respondents[0].answers.q01;
}

test('colonne Pseudo : suggestion « colonne identifiant » en un clic', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  const example = fs.readFileSync(path.join(APP_DIR, 'exemples', 'reponses_exemple.csv'), 'utf8').replace(/^﻿/, '');
  const lines = example.split(/\r?\n/).filter(Boolean);
  const withPseudo = lines.map((l, i) => l.replace(/^("[^"]*"|[^,]*),/, (m, ts) => ts + ',' + (i === 0 ? '"Pseudo"' : '"Joueur' + i + '"') + ',')).join('\r\n');
  await page.getByTestId('input-csv').setInputFiles({ name: 'avec-pseudo.csv', mimeType: 'text/csv', buffer: Buffer.from(withPseudo, 'utf8') });
  await expect(page.getByTestId('nb-repondants')).toHaveText('30');
  const warnings = page.getByTestId('data-warnings');
  await expect(warnings).toContainText('ressemble à un nom de joueur');
  await expect(warnings.getByRole('button', { name: 'Ajouter à la configuration…' })).toHaveCount(0);
  await page.getByTestId('btn-set-identifiant').click();
  await expect(warnings).not.toContainText('ressemble à un nom de joueur');
  await page.locator('.tab[data-tab=individuels]').click();
  await expect(page.getByTestId('liste-repondants')).toContainText('Joueur1');
  expect(errors).toEqual([]);
});
