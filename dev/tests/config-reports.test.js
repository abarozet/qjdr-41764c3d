const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { core, reports, configIO, xlsx, JSZip, readRealConfig, miniConfig, APP } = require('./helpers');

test('the real configuration loads and validates without errors', () => {
  const { config, problems } = readRealConfig();
  assert.ok(config);
  assert.deepEqual(problems.filter((p) => p.level === 'erreur'), []);
  assert.equal(config.questions.length > 0, true);
  assert.deepEqual(core.validateConfig(config).filter((v) => v.level === 'erreur'), []);
});

test('YAML serializer round-trips the real configuration and keeps comments', () => {
  const { config } = readRealConfig();
  const files = configIO.configToFiles(config);
  assert.match(files['questionnaire.yaml'], /^# =+\n#  CONFIGURATION DU QUESTIONNAIRE/);
  assert.match(files['rapport.yaml'], /TEXTES DES RAPPORTS/);
  // The whole header (comment block up to the first blank line) must match the hand-written files.
  const header = (t) => t.split('\n\n')[0];
  const dir = path.join(APP, 'configuration');
  for (const name of Object.keys(files)) {
    assert.equal(header(fs.readFileSync(path.join(dir, name), 'utf8')), header(files[name]), 'header of ' + name);
  }
  for (const ph of ['{joueur}', '{nombre_attentes}', '{questionnaire}']) assert.ok(header(files['rapport.yaml']).includes(ph), ph);
  const back = configIO.configFromPathMap(files);
  assert.deepEqual(back.config, config);
});

test('YAML serializer handles awkward texts (newlines, quotes, colons, leading spaces)', () => {
  const cfg = miniConfig();
  cfg.rapport.introduction = 'Premier paragraphe : avec « guillemets » et "doubles".\n\nSecond paragraphe # pas un commentaire.\nLigne suivante.';
  cfg.rapport.conclusion = '  espaces au début et à la fin  ';
  cfg.attentes[0].niveaux[0].texte = 'a'.repeat(30) + ' ' + 'b: c '.repeat(30) + '\n\n\nTrois sauts.';
  cfg.questions[0].texte = 'Une "question" : avec # dièse';
  const back = configIO.configFromPathMap(configIO.configToFiles(cfg)).config;
  assert.equal(back.rapport.introduction, cfg.rapport.introduction);
  assert.equal(back.rapport.conclusion, cfg.rapport.conclusion.replace(/\s+$/, ''));
  assert.equal(back.attentes[0].niveaux[0].texte, cfg.attentes[0].niveaux[0].texte);
  assert.equal(back.questions[0].texte, cfg.questions[0].texte);
});

test('config loading reports missing attente file and YAML syntax errors in French', () => {
  const r = configIO.configFromPathMap({ 'questionnaire.yaml': 'attentes: [x]\nquestions: []\n' });
  assert.ok(r.problems.some((p) => /attentes\/x\.yaml.*introuvable/.test(p.message)));
  const bad = configIO.configFromPathMap({ 'questionnaire.yaml': 'attentes: [x\n' });
  assert.equal(bad.config, null);
  assert.match(bad.problems[0].message, /erreur de syntaxe \(ligne/);
});

test('individual report is a self-contained HTML document', () => {
  const { config } = readRealConfig();
  const csv = fs.readFileSync(path.join(APP, 'exemples/reponses_exemple.csv'), 'utf8');
  const a = core.analyze(config, core.parseTable(csv));
  assert.equal(a.respondents.length, 30);
  assert.deepEqual(a.warnings.filter((w) => w.level !== 'info'), []);
  const html = reports.individualHTML(config, a.respondents[0]);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<svg[^>]+qj-radar/);
  assert.ok(!/(src|href)="(https?:|\/\/|[^"#]+\.(css|js|png))/.test(html), 'no external reference');
  const { charts } = require('./helpers');
  for (const at of config.attentes) assert.ok(html.includes(charts.esc(at.titre)), at.titre);
  assert.match(html, /Niveau \d\/\d/);
  const g = reports.globalHTML(config, a, { warnings: a.warnings });
  assert.match(g, /id="r-30"/);
  assert.match(g, /table class="sortable"/);
  assert.ok(!/(src|href)="(https?:|\/\/)/.test(g));
});

test('placeholders and mixed profile in individual report', () => {
  const cfg = miniConfig();
  cfg.attentes[2].niveaux = [{ a_partir_de: 0, titre: 'C1', texte: '' }];
  cfg.questions = [{ id: 'q1', texte: 'Q', reponses: [{ texte: 'r', poids: { a: 1, b: 1, c: 1 } }] }];
  const r = Object.assign({ index: 1, name: 'Zoé <b>', timestamp: null, unanswered: 0 }, core.scoreRespondent(cfg, { q1: 0 }));
  const html = reports.individualHTML(cfg, r);
  assert.match(html, /Profil de Zoé &lt;b&gt;/);
  assert.match(html, /Profil mixte/);
});

test('xlsx reader (shared strings, inline strings, dates)', async () => {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', '<workbook><sheets><sheet name="R" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/sharedStrings.xml', '<sst><si><t>Horodateur</t></si><si><t>Question l’une ?</t></si><si><r><t>Réponse </t></r><r><t>deux</t></r></si></sst>');
  zip.file('xl/styles.xml', '<styleSheet><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="22"/></cellXfs></styleSheet>');
  zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
    '<row r="2"><c r="A2" s="1"><v>46329.5</v></c><c r="B2" t="s"><v>2</v></c></row>' +
    '<row r="3"><c r="B3" t="inlineStr"><is><t>Réponse un</t></is></c></row>' +
    '</sheetData></worksheet>');
  const buf = await zip.generateAsync({ type: 'uint8array' });
  const t = await xlsx.readXlsx(buf, JSZip);
  assert.deepEqual(t.headers, ['Horodateur', 'Question l’une ?']);
  assert.equal(t.rows[0][0], '2026/11/03 12:00:00');
  assert.equal(t.rows[1][0], '');
  assert.equal(t.rows[1][1], 'Réponse un');
  const a = core.analyze(miniConfig(), t);
  assert.equal(a.respondents[0].answers.q1, 1);
  assert.equal(a.respondents[0].timestamp.dateLabel, '03/11/2026');
});
