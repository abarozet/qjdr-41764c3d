// =============================================================================
//  Builds the distributable archive dist/QuestionnaireJDR.zip.
//
//  1. rebuilds the generated files (default config, example data, then the
//     web/PWA files: desktop HTML copy of index.html, sw.js precache list);
//  2. checks that the tests' sync guarantees hold (config embed == YAML,
//     precache list == files on disk);
//  3. zips QuestionnaireJDR/ (kept as the top-level folder inside the zip),
//     skipping .DS_Store, other hidden/OS files and anything dev-only.
//
//  Command (from anywhere):
//      node dev/tools/package_release.mjs
// =============================================================================
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const TOOLS = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TOOLS, '..', '..');
const APP = join(ROOT, 'QuestionnaireJDR');
const DIST = join(ROOT, 'dist');
const JSZip = require(join(APP, 'app', 'vendor', 'jszip.min.js'));
const { listAppFiles } = require('./pwa_lib.js'); // same file selection as the web app's precache

for (const script of ['build_default_config.mjs', 'generate_example.mjs', 'build_pwa.mjs']) {
  execFileSync(process.execPath, [join(TOOLS, script)], { stdio: 'inherit' });
}
execFileSync(process.execPath, ['--test', join(ROOT, 'dev', 'tests', 'sync.test.js')], { stdio: 'ignore' });

const files = listAppFiles(APP);
const zip = new JSZip();
const fixedDate = new Date();
for (const rel of files) zip.file('QuestionnaireJDR/' + rel, readFileSync(join(APP, rel)), { date: fixedDate });
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
mkdirSync(DIST, { recursive: true });
const target = join(DIST, 'QuestionnaireJDR.zip');
writeFileSync(target, buf);
console.log(`OK : ${target} (${files.length} fichiers, ${(buf.length / 1024).toFixed(0)} Ko)`);
