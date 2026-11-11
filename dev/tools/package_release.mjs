// =============================================================================
//  Builds the distributable archive dist/QuestionnaireJDR.zip.
//
//  1. rebuilds the generated files (default config, example data);
//  2. checks that the tests' sync guarantees hold (config embed == YAML);
//  3. zips QuestionnaireJDR/ (kept as the top-level folder inside the zip),
//     skipping .DS_Store, other hidden/OS files and anything dev-only.
//
//  Command (from anywhere):
//      node dev/tools/package_release.mjs
// =============================================================================
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const TOOLS = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TOOLS, '..', '..');
const APP = join(ROOT, 'QuestionnaireJDR');
const DIST = join(ROOT, 'dist');
const JSZip = require(join(APP, 'app', 'vendor', 'jszip.min.js'));

const EXCLUDE = [/(^|\/)\.[^/]*$/, /(^|\/)Thumbs\.db$/i, /(^|\/)desktop\.ini$/i, /~$/, /\.(map|bak|tmp|log)$/i, /(^|\/)(node_modules|dev|tests|e2e|screenshots)(\/|$)/];

for (const script of ['build_default_config.mjs', 'generate_example.mjs']) {
  execFileSync(process.execPath, [join(TOOLS, script)], { stdio: 'inherit' });
}
execFileSync(process.execPath, ['--test', join(ROOT, 'dev', 'tests', 'sync.test.js')], { stdio: 'ignore' });

function walk(dir, out) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = relative(APP, full).split(sep).join('/');
    if (EXCLUDE.some((re) => re.test(rel))) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(rel);
  }
  return out;
}

const files = walk(APP, []);
const zip = new JSZip();
const fixedDate = new Date();
for (const rel of files) zip.file('QuestionnaireJDR/' + rel, readFileSync(join(APP, rel)), { date: fixedDate });
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
mkdirSync(DIST, { recursive: true });
const target = join(DIST, 'QuestionnaireJDR.zip');
writeFileSync(target, buf);
console.log(`OK : ${target} (${files.length} fichiers, ${(buf.length / 1024).toFixed(0)} Ko)`);
