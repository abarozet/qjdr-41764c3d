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
