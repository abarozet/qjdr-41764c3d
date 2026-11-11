// Shared helper for the dev tools: reads the YAML configuration folder of the
// distributable and converts it to the internal model with the app's own
// config-io.js (which uses the vendored js-yaml).
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const APP = join(ROOT, 'QuestionnaireJDR');
export const configIO = require(join(APP, 'app', 'js', 'config-io.js'));
export const core = require(join(APP, 'app', 'js', 'core.js'));
export const reports = require(join(APP, 'app', 'js', 'reports.js'));

export function readConfigFolder(dir = join(APP, 'configuration')) {
  const map = {};
  for (const f of ['questionnaire.yaml', 'rapport.yaml']) {
    const p = join(dir, f);
    if (existsSync(p)) map[f] = readFileSync(p, 'utf8');
  }
  const attDir = join(dir, 'attentes');
  if (existsSync(attDir)) {
    for (const f of readdirSync(attDir)) {
      if (/\.ya?ml$/i.test(f)) map['attentes/' + f] = readFileSync(join(attDir, f), 'utf8');
    }
  }
  return configIO.configFromPathMap(map);
}
