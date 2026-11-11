// =============================================================================
//  Regenerates QuestionnaireJDR/app/js/config-par-defaut.js from the YAML files
//  of QuestionnaireJDR/configuration/ (the configuration embedded in the app,
//  used when nothing else has been loaded).
//
//  Command (from the project root):
//      node dev/tools/build_default_config.mjs
// =============================================================================
import { writeFileSync } from 'node:fs';
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
 * Generated on ${new Date().toISOString()}.
 */
(function (root) {
  'use strict';
  root.QJ = root.QJ || {};
  root.QJ.DEFAULT_CONFIG = ${JSON.stringify(config, null, 2).replace(/\n/g, '\n  ')};
})(typeof self !== 'undefined' ? self : this);
`;
const target = join(APP, 'app', 'js', 'config-par-defaut.js');
writeFileSync(target, out, 'utf8');
console.log(`OK : ${target} (${config.attentes.length} attentes, ${config.questions.length} questions)`);
