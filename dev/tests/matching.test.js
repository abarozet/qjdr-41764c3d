const test = require('node:test');
const assert = require('node:assert/strict');
const { core, miniConfig } = require('./helpers');

test('normalize unifies apostrophes, quotes, ellipsis, case, spaces, punctuation', () => {
  assert.equal(core.normalize('L’armée'), core.normalize("l'armée"));
  assert.equal(core.normalize('“Coeur”'), core.normalize('«  coeur  »'));
  assert.equal(core.normalize('... Jouer sur un layout.'), core.normalize('…jouer   sur un LAYOUT'));
  assert.equal(core.normalize('Pas de soucis !'), core.normalize('Pas de soucis !'));
  assert.equal(core.normalize('Question ?'), core.normalize('question'));
  assert.equal(core.normalize('  ...Vous en profitez  '), 'vous en profitez');
});

test('matcher: exact normalized then loose (accents/punctuation) fallback', () => {
  const m = core.makeMatcher(['Réponse un', 'Réponse deux']);
  assert.equal(m('réponse UN.'), 0);
  assert.equal(m('Reponse deux'), 1);
  assert.equal(m('Réponse trois'), -1);
});

test('matchTable reports unmatched columns, unknown answers (with count) and missing questions', () => {
  const cfg = miniConfig();
  const table = {
    headers: ['Horodateur', 'question l\'une', 'Colonne en trop'],
    rows: [
      ['2026/11/01 10:00:00 UTC+1', 'Réponse un', 'x'],
      ['2026/11/02 10:00:00 UTC+1', 'Inconnue', 'y'],
      ['2026/11/03 10:00:00 UTC+1', 'inconnue.', 'z'],
      ['2026/11/04 10:00:00 UTC+1', '', 'z']
    ]
  };
  const r = core.matchTable(cfg, table);
  assert.deepEqual(r.unmatchedColumns, ['Colonne en trop']);
  assert.deepEqual(r.missingQuestions, ['q2', 'q3']);
  assert.equal(r.unmatchedValues.length, 1);
  assert.equal(r.unmatchedValues[0].count, 2);
  assert.equal(r.respondents[0].answers.q1, 0);
  assert.equal(r.respondents[1].answers.q1, null);
  assert.equal(r.respondents[3].unanswered, 3);
  const msgs = r.warnings.map((w) => w.message).join('\n');
  assert.match(msgs, /Colonne non reconnue/);
  assert.match(msgs, /Réponse non reconnue à la question 1 \(2 fois\)/);
  assert.match(msgs, /Question 2 absente du fichier/);
});

test('identifier column: names used when configured, fallback to "Répondant N"', () => {
  const cfg = miniConfig();
  const table = { headers: ['Horodateur', 'Pseudo', 'Question l’une ?'], rows: [['', 'Grimgor', 'Oui'], ['', '', 'Oui']] };
  let r = core.matchTable(cfg, table);
  assert.equal(r.respondents[0].name, 'Répondant 1');
  assert.ok(r.unmatchedColumns.includes('Pseudo'));
  cfg.colonne_identifiant = 'pseudo';
  r = core.matchTable(cfg, table);
  assert.equal(r.respondents[0].name, 'Grimgor');
  assert.equal(r.respondents[1].name, 'Répondant 2');
  assert.ok(!r.unmatchedColumns.includes('Pseudo'));
  cfg.colonne_identifiant = 'Nom';
  r = core.matchTable(cfg, table);
  assert.ok(r.warnings.some((w) => /Colonne d’identifiant « Nom » introuvable/.test(w.message)));
});

test('proposeFromTable lists new questions and answers', () => {
  const cfg = miniConfig();
  const table = { headers: ['Horodateur', 'Question l’une ?', 'Nouvelle question'], rows: [['', 'Autre', 'A'], ['', 'Autre', 'B'], ['', 'Réponse un', 'A']] };
  const p = core.proposeFromTable(cfg, table);
  assert.equal(p.newQuestions.length, 1);
  assert.equal(p.newQuestions[0].texte, 'Nouvelle question');
  assert.deepEqual(p.newQuestions[0].reponses.map((r) => [r.texte, r.count]), [['A', 2], ['B', 1]]);
  assert.deepEqual(p.newAnswers.map((a) => [a.qid, a.texte, a.count]), [['q1', 'Autre', 2]]);
});

test('file names are safe and unique', () => {
  const names = core.uniqueFileNames([{ name: 'Jean/Luc: "le" Grand?' }, { name: 'Jean/Luc: "le" Grand?' }, { name: 'CON' }], 'Rapport - ', '.html');
  assert.equal(names[0], 'Rapport - Jean Luc le Grand.html');
  assert.equal(names[1], 'Rapport - Jean Luc le Grand (2).html');
  assert.ok(!/[\\/:*?"<>|]/.test(names.join('')));
});
