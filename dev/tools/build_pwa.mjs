// =============================================================================
//  Web version (GitHub Pages / PWA) build step. Pure Node, deterministic.
//
//  1. writes "QuestionnaireJDR/Questionnaire JDR.html" (desktop entry point)
//     from QuestionnaireJDR/index.html (the page source of truth);
//  2. rewrites the GENERATED block of QuestionnaireJDR/sw.js: the precache
//     list (every distributable file except sw.js) and VERSION, a content
//     hash of those files — any change of any file gives a new version, an
//     unchanged tree gives the same version (no spurious update toast).
//
//  Commands (from anywhere):
//      node dev/tools/build_pwa.mjs           # write the files
//      node dev/tools/build_pwa.mjs --check   # exit 1 if they are out of date (CI)
//
//  Run it after ANY change in QuestionnaireJDR/ (package_release.mjs runs it).
// =============================================================================
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const lib = require('./pwa_lib.js');
const check = process.argv.includes('--check');

const { desktop, sw, version, files } = lib.expectedOutputs();
const targets = [[join(lib.APP, lib.DESKTOP_HTML), desktop], [join(lib.APP, lib.SW), sw]];
let stale = 0;
for (const [file, text] of targets) {
  const cur = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (cur === text) continue;
  stale++;
  if (check) console.error('Pas à jour : ' + file);
  else writeFileSync(file, text, 'utf8');
}
if (check && stale) {
  console.error('Lancez : node dev/tools/build_pwa.mjs');
  process.exit(1);
}
console.log(`OK : version ${version}, ${files.length} fichiers en cache hors ligne` + (check ? ' (vérification)' : stale ? ' (mis à jour)' : ' (inchangé)'));
