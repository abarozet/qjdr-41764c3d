const test = require('node:test');
const assert = require('node:assert/strict');
const { core, miniConfig } = require('./helpers');

test('maxPoints sums the best weight per question', () => {
  const max = core.maxPoints(miniConfig());
  // a: q1 max 2, q2 max 1, q3 max 2 = 5 ; b: 2 + 2 + 0 = 4 ; c: 0
  assert.deepEqual(max, { a: 5, b: 4, c: 0 });
});

test('scores with multi-weight answers, unanswered question and max-0 attente', () => {
  const cfg = miniConfig();
  const res = core.scoreRespondent(cfg, { q1: 1, q2: 0, q3: null });
  // a: 1 + 1 = 2 / 5 = 40 % ; b: 2 + 1 = 3 / 4 = 75 %
  assert.equal(res.scores.a, 40);
  assert.equal(res.scores.b, 75);
  assert.equal(res.scores.c, null);
  assert.equal(res.levels.c, null);
  assert.deepEqual(res.dominant, ['b']);
  assert.deepEqual(res.ranking, ['b', 'a', 'c']);
});

test('levels with variable counts and thresholds (inclusive)', () => {
  const cfg = miniConfig();
  const b = cfg.attentes[1];
  assert.equal(core.levelFor(b, 0).number, 1);
  assert.equal(core.levelFor(b, 24.99).number, 1);
  assert.equal(core.levelFor(b, 25).number, 2);
  assert.equal(core.levelFor(b, 75).number, 4);
  assert.equal(core.levelFor(b, 100).number, 5);
  assert.equal(core.levelFor(b, 100).total, 5);
  assert.equal(core.levelFor(cfg.attentes[0], 49).niveau.titre, 'A1');
  assert.equal(core.levelFor(cfg.attentes[2], 80).total, 1);
});

test('ties produce a mixed profile; all-zero gives no dominant', () => {
  const cfg = miniConfig();
  // a: 2 (q1) / 5 = 40 ; b: q2 "Non" 2 / 4 = 50 → b alone
  assert.deepEqual(core.scoreRespondent(cfg, { q1: 0, q2: 1, q3: 1 }).dominant, ['b']);
  // explicit tie: a single answer feeding a and b equally
  cfg.attentes[1].niveaux = [{ a_partir_de: 0, titre: 'x', texte: '' }];
  cfg.questions = [{ id: 'q1', texte: 'Q', reponses: [{ texte: 'r', poids: { a: 1, b: 1 } }] }];
  const res = core.scoreRespondent(cfg, { q1: 0 });
  assert.deepEqual(res.dominant, ['a', 'b']);
  assert.deepEqual(core.scoreRespondent(cfg, { q1: null }).dominant, []);
});

test('analyze end-to-end on a table', () => {
  const cfg = miniConfig();
  const t = core.parseTable('Horodateur,Question l’une ?,Question « deux »,Troisième\n2026/11/01 10:00:00 UTC+1,Réponse deux,Oui,\n');
  const a = core.analyze(cfg, t);
  assert.equal(a.respondents.length, 1);
  assert.equal(a.respondents[0].unanswered, 1);
  assert.equal(a.respondents[0].scores.b, 75);
});

test('validateConfig flags thresholds, unknown ids, max-0, duplicates, all-zero answers', () => {
  const cfg = miniConfig();
  cfg.attentes[0].niveaux[0].a_partir_de = 5;
  cfg.attentes[1].niveaux[2].a_partir_de = 20; // not ascending
  cfg.questions[0].reponses[0].poids.zzz = 1;
  cfg.questions.push({ id: 'q4', texte: 'troisième.', reponses: [{ texte: 'a', poids: { a: 1 } }, { texte: 'b', poids: {} }] });
  const v = core.validateConfig(cfg);
  const txt = v.map((x) => x.level + ' ' + x.message).join('\n');
  assert.match(txt, /erreur .*premier niveau doit commencer à 0/);
  assert.match(txt, /erreur .*strictement croissants/);
  assert.match(txt, /erreur .*attente inconnue « zzz »/);
  assert.match(txt, /erreur .*Gamma.*aucune réponse ne lui donne de points/);
  assert.match(txt, /erreur .*Question 4 : même texte que la question 3/);
  assert.match(txt, /attention .*ne donne aucun point/);
  assert.equal(core.validateConfig(miniConfig()).filter((x) => x.level === 'erreur').length, 1); // only Gamma max 0
});

test('scores CSV export: BOM, semicolon, decimal comma', () => {
  const cfg = miniConfig();
  const t = core.parseTable('Horodateur,Question l’une ?,Question « deux »,Troisième\n2026/11/01 10:00:00 UTC+1,Réponse un,Oui,X\n');
  const csv = core.scoresToCSV(cfg, core.analyze(cfg, t));
  assert.ok(csv.startsWith('\uFEFFRépondant;Date;Alpha (%)'));
  const line = csv.split('\r\n')[1].split(';');
  assert.equal(line[2], '100'); // a: 2+1+2 = 5/5
  assert.equal(line[3], '25');  // b: 1/4
  assert.equal(line[4], '—');
  const t2 = core.parseTable('Horodateur,Question l’une ?,Question « deux »\n,Réponse deux,Oui\n');
  assert.equal(core.scoresToCSV(cfg, core.analyze(cfg, t2)).split('\r\n')[1].split(';')[2], '40');
  assert.equal(core.formatNumber(33.333, 1), '33,3');
});

test('identifier-like columns are detected and not proposed as questions', () => {
  const cfg = miniConfig();
  const table = {
    headers: ['Horodateur', 'Pseudo', 'Adresse e-mail', 'Surnom libre', 'Commentaires', 'Question l’une ?'],
    rows: ['u', 'v', 'w', 'x', 'y', 'z'].map((n, i) => ['2024-01-0' + (i + 1), 'Joueur ' + n, n + '@ex.fr', 'Alias' + i, 'même', '... Réponse un.'])
  };
  const m = core.matchTable(cfg, table);
  // header-based (Pseudo, Adresse e-mail) and value-based (Surnom libre: all distinct, no answer)
  assert.deepEqual(m.identifierColumns, ['Pseudo', 'Adresse e-mail', 'Surnom libre']);
  const w = m.warnings.filter((x) => x.kind === 'identifiant');
  assert.equal(w.length, 3);
  assert.match(w[0].message, /ressemble à un nom de joueur/);
  assert.match(w[0].message, /colonne identifiant/);
  assert.equal(w[0].column, 'Pseudo');
  assert.deepEqual(m.warnings.filter((x) => x.kind === 'colonne').map((x) => x.message), ['Colonne non reconnue (ignorée) : « Commentaires »']);
  const prop = core.proposeFromTable(cfg, table);
  assert.deepEqual(prop.newQuestions.map((q) => [q.texte, q.identifier]),
    [['Pseudo', true], ['Adresse e-mail', true], ['Surnom libre', true], ['Commentaires', false]]);
});

test('looksLikeIdentifier: repeated or answer-like values are not identifiers', () => {
  const none = () => -1;
  assert.equal(core.looksLikeIdentifier('Pseudo', [], none), true);
  assert.equal(core.looksLikeIdentifier('Prénom', [], none), true);
  assert.equal(core.looksLikeIdentifier('Autre', ['a', 'a', 'a', 'b', 'b', 'b'], none), false);
  assert.equal(core.looksLikeIdentifier('Autre', ['a', 'b', 'c', 'd', 'e', 'f'], (t) => (t === 'a' ? 0 : -1)), false);
  assert.equal(core.looksLikeIdentifier('Autre', ['a', 'b'], none), false, 'too few values');
});

test('nextLevelThreshold stays strictly above the last threshold', () => {
  assert.equal(core.nextLevelThreshold(0), 10);
  assert.equal(core.nextLevelThreshold(50), 60);
  assert.equal(core.nextLevelThreshold(95), 98);
  assert.equal(core.nextLevelThreshold(91), 96);
  assert.equal(core.nextLevelThreshold(99), null);
  assert.equal(core.nextLevelThreshold(100), null);
  for (let last = 0; last <= 100; last += 0.5) {
    const n = core.nextLevelThreshold(last);
    assert.ok(n === null || (n > last && n <= 100), 'last=' + last);
  }
});
