// =============================================================================
//  Generates QuestionnaireJDR/exemples/reponses_exemple.csv: ~30 synthetic
//  respondents in the exact Google Forms export format ("Horodateur" + one
//  column per question, every field quoted, answer texts exactly as in the
//  configuration). Deterministic (fixed seed).
//
//  Also writes QuestionnaireJDR/app/js/exemple-donnees.js (same data, embedded
//  for the « Charger l'exemple » button).
//
//  Command (from the project root):
//      node dev/tools/generate_example.mjs [nombre_de_repondants]
// =============================================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { APP, readConfigFolder } from './load_config.mjs';

const N = Number(process.argv[2]) || 30;
const { config } = readConfigFolder();
if (!config) throw new Error('Configuration illisible');

// Small deterministic PRNG (mulberry32).
let seed = 20261103;
function rand() {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const gumbel = () => -Math.log(-Math.log(rand() + 1e-12) + 1e-12);

// Archetypes are derived from the configured attentes (nothing hard-coded):
// one "pure" archetype per attente plus a few two-attente blends; earlier
// attentes are made more frequent so that distributions are uneven.
const ids = config.attentes.map((a) => a.id);
const archetypes = [];
ids.forEach((id, i) => archetypes.push({ main: [id], weight: Math.max(1, ids.length - i) }));
for (let i = 0; i + 2 < ids.length; i += 2) archetypes.push({ main: [ids[i], ids[i + 2]], weight: 2 });
if (ids.length >= 4) archetypes.push({ main: [ids[1], ids[3]], weight: 2 });
const totalW = archetypes.reduce((s, a) => s + a.weight, 0);
function pickArchetype() {
  let r = rand() * totalW;
  for (const a of archetypes) { r -= a.weight; if (r <= 0) return a; }
  return archetypes[archetypes.length - 1];
}

const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const pad = (x) => String(x).padStart(2, '0');

const rows = [];
let t = Date.UTC(2026, 10, 1, 18, 0, 0); // 1 Nov 2026
for (let k = 0; k < N; k++) {
  t += Math.floor((0.3 + rand() * 9) * 3600 * 1000);
  const arch = pickArchetype();
  const pref = {};
  for (const id of ids) pref[id] = 0.4 + rand() * 0.6;
  arch.main.forEach((id, j) => { pref[id] += j === 0 ? 1.9 : 1.3; });
  const d = new Date(t);
  const stamp = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC+1`;
  const cells = [stamp];
  for (const question of config.questions) {
    if (rand() < 0.004) { cells.push(''); continue; } // rare skipped question
    let best = null, bestU = -Infinity;
    for (const rep of question.reponses) {
      let u = 0;
      for (const [id, w] of Object.entries(rep.poids || {})) u += (Number(w) || 0) * (pref[id] || 0);
      u += 1.9 * gumbel();
      if (u > bestU) { bestU = u; best = rep; }
    }
    cells.push(best.texte);
  }
  rows.push(cells);
}

const header = [config.colonne_horodatage || 'Horodateur', ...config.questions.map((x) => x.texte)];
const csv = [header, ...rows].map((r) => r.map(q).join(',')).join('\n') + '\n';
mkdirSync(join(APP, 'exemples'), { recursive: true });
const target = join(APP, 'exemples', 'reponses_exemple.csv');
writeFileSync(target, csv, 'utf8');
console.log(`OK : ${target} (${N} répondants)`);

// The app cannot read exemples/*.csv by itself over file:// (no fetch), so the
// same content is embedded in a small script used by « Charger l'exemple ».
const js = `/*
 * exemple-donnees.js — GENERATED FILE (node dev/tools/generate_example.mjs).
 * Same content as exemples/reponses_exemple.csv, embedded so that the
 * « Charger l'exemple » button works without any file access.
 */
(function (root) {
  'use strict';
  root.QJ = root.QJ || {};
  root.QJ.EXAMPLE_CSV = { fileName: 'reponses_exemple.csv', text: ${JSON.stringify(csv)} };
})(typeof self !== 'undefined' ? self : this);
`;
const jsTarget = join(APP, 'app', 'js', 'exemple-donnees.js');
writeFileSync(jsTarget, js, 'utf8');
console.log(`OK : ${jsTarget}`);
