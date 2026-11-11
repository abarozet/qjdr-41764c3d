const test = require('node:test');
const assert = require('node:assert/strict');
const { core } = require('./helpers');

test('parse basic Google Forms CSV with quotes and commas', () => {
  const t = core.parseTable('"Horodateur","Q, avec virgule"\n"2026/11/03 21:14:05 UTC+1","Réponse ""citée"", ok"\n');
  assert.equal(t.delimiter, ',');
  assert.deepEqual(t.headers, ['Horodateur', 'Q, avec virgule']);
  assert.deepEqual(t.rows, [['2026/11/03 21:14:05 UTC+1', 'Réponse "citée", ok']]);
});

test('newlines inside quoted fields and CRLF', () => {
  const t = core.parseTable('a,b\r\n"ligne 1\r\nligne 2",x\r\n"",y\r\n');
  assert.equal(t.rows.length, 2);
  assert.equal(t.rows[0][0], 'ligne 1\r\nligne 2');
  assert.equal(t.rows[1][1], 'y');
});

test('semicolon delimiter (Excel FR) is auto-detected even with commas in headers', () => {
  const t = core.parseTable('Horodateur;Concernant, les décors;Autre, question, ici\n03/11/2026 21:14;Oui, bien sûr;Non\n');
  assert.equal(t.delimiter, ';');
  assert.deepEqual(t.headers, ['Horodateur', 'Concernant, les décors', 'Autre, question, ici']);
  assert.deepEqual(t.rows[0], ['03/11/2026 21:14', 'Oui, bien sûr', 'Non']);
});

test('tab delimiter', () => {
  const t = core.parseTable('a\tb\n1\t2\n');
  assert.equal(t.delimiter, '\t');
  assert.deepEqual(t.rows, [['1', '2']]);
});

test('BOM is stripped (text and bytes)', () => {
  const t = core.parseTable('\uFEFFHorodateur,Q\n1,2\n');
  assert.equal(t.headers[0], 'Horodateur');
  const bytes = new Uint8Array([0xEF, 0xBB, 0xBF, ...Buffer.from('Horodateur,Q\n', 'utf8')]);
  assert.equal(core.decodeBytes(bytes).text, 'Horodateur,Q\n');
});

test('windows-1252 fallback when bytes are not valid UTF-8', () => {
  // "Répondu ’" in windows-1252: é = 0xE9, ’ = 0x92
  const bytes = new Uint8Array([0x52, 0xE9, 0x70, 0x6F, 0x6E, 0x64, 0x75, 0x20, 0x92]);
  const d = core.decodeBytes(bytes);
  assert.equal(d.encoding, 'windows-1252');
  assert.equal(d.text, 'Répondu ’');
  assert.equal(core.decodeBytes(Buffer.from('Répondu ’', 'utf8')).encoding, 'UTF-8');
});

test('empty lines are skipped, trailing field kept without final newline', () => {
  const t = core.parseTable('a,b\n\n1,2\n\n3,4');
  assert.deepEqual(t.rows, [['1', '2'], ['3', '4']]);
});

test('timestamps: Google FR, French order, unknown', () => {
  const g = core.parseTimestamp('2026/11/03 21:14:05 UTC+1');
  assert.equal(g.key, '2026-11-03 21:14:05');
  assert.equal(g.dateLabel, '03/11/2026');
  const f = core.parseTimestamp('03/11/2026 21:14');
  assert.equal(f.key, '2026-11-03 21:14:00');
  assert.equal(core.parseTimestamp('hier').label, 'hier');
  assert.equal(core.parseTimestamp(''), null);
});
