const test = require('node:test');
const assert = require('node:assert/strict');
const { core, miniConfig } = require('./helpers');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('mean / median / sample std dev / ignores null', () => {
  close(core.mean([1, 2, 3, null, 6]), 3);
  close(core.median([5, 1, 3]), 3);
  close(core.median([4, 1, 3, 2]), 2.5);
  close(core.stdDev([2, 4, 4, 4, 5, 5, 7, 9]), Math.sqrt(32 / 7));
  assert.equal(core.stdDev([3]), 0);
  assert.equal(core.mean([]), null);
});

test('Pearson correlation', () => {
  close(core.correlation([1, 2, 3, 4], [2, 4, 6, 8]), 1);
  close(core.correlation([1, 2, 3, 4], [8, 6, 4, 2]), -1);
  close(core.correlation([1, 2, 3], [1, 3, 2]), 0.5);
  assert.equal(core.correlation([1, 1, 1], [1, 2, 3]), null);
  assert.equal(core.correlation([1, null, 3], [2, 5, 6]), 1);
});

test('histogram uses 10-point bins with 100 in the last one', () => {
  const bins = core.histogram([0, 9.99, 10, 55, 100, null]);
  assert.equal(bins.length, 10);
  assert.deepEqual(bins.map((b) => b.count), [2, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
});

test('globalStats: levels distribution, dominant counts, date range', () => {
  const cfg = miniConfig();
  const t = core.parseTable([
    'Horodateur,Question l’une ?,Question « deux »,Troisième',
    '2026/11/05 10:00:00 UTC+1,Réponse un,Oui,X',
    '2026/11/01 10:00:00 UTC+1,Réponse deux,Non,Y',
    '2026/11/03 10:00:00 UTC+1,Réponse deux,Oui,X'
  ].join('\n'));
  const a = core.analyze(cfg, t);
  const s = core.globalStats(cfg, a);
  assert.equal(s.count, 3);
  assert.equal(s.first.dateLabel, '01/11/2026');
  assert.equal(s.last.dateLabel, '05/11/2026');
  // scores a: 100, 20, 80 ; b: 25, 100, 75
  assert.deepEqual(a.respondents.map((r) => r.scores.a), [100, 20, 80]);
  assert.deepEqual(s.perAttente.a.levels, [1, 2]);
  assert.deepEqual(s.perAttente.b.levels, [0, 1, 0, 1, 1]);
  assert.equal(s.perAttente.a.dominantCount + s.perAttente.b.dominantCount + s.mixedCount, 3);
  assert.equal(s.questions[0].counts[1], 2);
  assert.equal(s.correlation[0][0], 1);
  assert.equal(s.correlation[2][2], null);
});
