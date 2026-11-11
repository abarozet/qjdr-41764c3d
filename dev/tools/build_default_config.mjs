// =============================================================================
//  Regenerates QuestionnaireJDR/app/js/config-par-defaut.js from the YAML files
//  of QuestionnaireJDR/configuration/ (the configuration embedded in the app,
//  used when nothing else has been loaded).
//
//  Command (from the project root):
//      node dev/tools/build_default_config.mjs
// =============================================================================
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { APP, readConfigFolder, core } from './load_config.mjs';

const { config, problems } = readConfigFolder();
for (const p of problems) console.warn(`[${p.level}] ${p.message}`);
if (!config) {
  console.error('Configuration illisible : fichier non généré.');
  process.exit(1);
}
const validation = core.validateConfig(config);
for (const v of validation) console.warn(`[validation ${v.level}] ${v.message}`);

const out = `/*
 * config-par-defaut.js — GENERATED FILE, do not edit by hand.
 * Default configuration embedded in the application (browsers cannot read
 * local files without a user action).
 *
 * Regenerate after editing QuestionnaireJDR/configuration/*.yaml with:
 *     node dev/tools/build_default_config.mjs
 *
 * Generated on @@STAMP@@.
 */
(function (root) {
  'use strict';
  root.QJ = root.QJ || {};
  root.QJ.DEFAULT_CONFIG = ${JSON.stringify(config, null, 2).replace(/\n/g, '\n  ')};
})(typeof self !== 'undefined' ? self : this);
`;
const target = join(APP, 'app', 'js', 'config-par-defaut.js');
// Keep the previous timestamp when nothing else changed: the file (and thus the
// web app's precache version, see build_pwa.mjs) stays byte-identical.
const STAMP_RE = /Generated on [^\n]*\./;
const previous = existsSync(target) ? readFileSync(target, 'utf8') : '';
const same = previous && previous.replace(STAMP_RE, 'Generated on @@STAMP@@.') === out;
if (!same) writeFileSync(target, out.replace('@@STAMP@@', new Date().toISOString()), 'utf8');
console.log(`OK : ${target}${same ? ' (inchangé)' : ''} (${config.attentes.length} attentes, ${config.questions.length} questions)`);
