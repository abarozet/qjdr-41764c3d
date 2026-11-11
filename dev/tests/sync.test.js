// Guards against drift between the hand-edited sources and what is embedded
// in / produced by the app.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { APP, configIO, readRealConfig } = require('./helpers');

function loadEmbedded(file) {
  const sandbox = { QJ: {} };
  sandbox.self = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(APP, 'app/js', file), 'utf8'), sandbox, { filename: file });
  return sandbox.QJ;
}

function readConfigFiles() {
  const dir = path.join(APP, 'configuration');
  const files = {};
  for (const f of ['questionnaire.yaml', 'rapport.yaml']) files[f] = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const f of fs.readdirSync(path.join(dir, 'attentes'))) {
    if (/\.ya?ml$/i.test(f)) files['attentes/' + f] = fs.readFileSync(path.join(dir, 'attentes', f), 'utf8');
  }
  return files;
}

test('config-par-defaut.js equals the YAML in configuration/ (rebuild with build_default_config.mjs)', () => {
  const { config } = readRealConfig();
  const embedded = loadEmbedded('config-par-defaut.js').DEFAULT_CONFIG;
  assert.ok(embedded, 'QJ.DEFAULT_CONFIG is defined');
  assert.deepEqual(JSON.parse(JSON.stringify(embedded)), config); // JSON: vm objects have another realm's prototypes
});

test('exemple-donnees.js equals exemples/reponses_exemple.csv (rebuild with generate_example.mjs)', () => {
  const embedded = loadEmbedded('exemple-donnees.js').EXAMPLE_CSV;
  const csv = fs.readFileSync(path.join(APP, 'exemples/reponses_exemple.csv'), 'utf8');
  assert.equal(embedded.fileName, 'reponses_exemple.csv');
  assert.equal(embedded.text, csv);
});

test('hand-written YAML files are identical to the GUI serializer output (header and layout included)', () => {
  const files = readConfigFiles();
  const { config } = readRealConfig();
  const out = configIO.configToFiles(config);
  assert.deepEqual(Object.keys(out).sort(), Object.keys(files).sort());
  for (const name of Object.keys(out)) {
    assert.equal(files[name], out[name], name + ' differs from the serializer output; re-save it (see AGENTS.md)');
  }
});

// ---------------------------------------------------------------------------
// Web version (PWA): generated desktop page, service worker precache list.
// ---------------------------------------------------------------------------
const pwa = require('../tools/pwa_lib.js');

test('Questionnaire JDR.html is generated from index.html (run build_pwa.mjs)', () => {
  const index = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const desktop = fs.readFileSync(path.join(APP, pwa.DESKTOP_HTML), 'utf8');
  assert.equal(desktop, pwa.desktopHtmlFrom(index), 'run: node dev/tools/build_pwa.mjs');
});

test('sw.js precache list matches the files on disk, version matches their content (run build_pwa.mjs)', () => {
  const sw = pwa.readSwBlock(fs.readFileSync(path.join(APP, pwa.SW), 'utf8'));
  assert.ok(sw, 'GENERATED block present in sw.js');
  const onDisk = pwa.precacheFiles().map(pwa.toURL);
  assert.deepEqual(sw.precache, onDisk, 'precache list drifted: run node dev/tools/build_pwa.mjs');
  assert.ok(!sw.precache.includes('sw.js'), 'sw.js never precaches itself');
  for (const f of ['index.html', 'manifest.webmanifest', 'app/css/app.css', 'app/vendor/jszip.min.js', 'configuration/questionnaire.yaml',
    'exemples/reponses_exemple.csv', 'documentation/guide.html', 'Questionnaire%20JDR.html']) {
    assert.ok(sw.precache.includes(f), f + ' is precached');
  }
  assert.ok(sw.precache.some((f) => /^documentation\/images\/.+\.png$/.test(f)), 'guide images are precached');
  assert.equal(sw.version, pwa.expectedOutputs().version, 'version is stale: run node dev/tools/build_pwa.mjs');
  assert.match(sw.version, /^[0-9a-f]{12}$/);
});

test('every file referenced by index.html, the manifest and the scripts exists and is precached', () => {
  const index = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const refs = Array.from(index.matchAll(/(?:src|href)="([^"#:]+)"/g)).map((m) => m[1]);
  const manifest = JSON.parse(fs.readFileSync(path.join(APP, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) refs.push(icon.src);
  const precached = new Set(pwa.precacheFiles());
  assert.ok(refs.length > 15);
  for (const r of refs) {
    assert.ok(!r.startsWith('/'), r + ' must be relative (GitHub Pages sub-path)');
    assert.ok(precached.has(r), r + ' exists and is precached');
  }
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'));
  assert.match(index, /<meta name="robots" content="noindex, nofollow">/);
});

test('the report font embedded in reports.js is the vendored woff2', () => {
  const reports = require(path.join(APP, 'app/js/reports.js'));
  const woff2 = fs.readFileSync(path.join(APP, 'app/vendor/fonts/fredoka-600.woff2'));
  assert.equal(reports.FONT_WOFF2, woff2.toString('base64'), 'update FONT_WOFF2 in reports.js');
  assert.ok(fs.existsSync(path.join(APP, 'app/vendor/fonts/OFL-Fredoka.txt')), 'font licence shipped next to the font');
});
