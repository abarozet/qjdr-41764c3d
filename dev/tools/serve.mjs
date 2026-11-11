// =============================================================================
//  Tiny static HTTP server for development and the http/mobile e2e tests.
//  Serves QuestionnaireJDR/ under a sub-path, like GitHub Pages serves a
//  project site (https://<user>.github.io/<repo>/).
//
//      node dev/tools/serve.mjs                  # http://localhost:4173/qjdr/
//      node dev/tools/serve.mjs --port 8080 --base /mon-depot/
//
//  --test-hooks (e2e only): a request for sw.js carrying the cookie
//  qjdr_sw_version=<hex> gets that VERSION instead of the real one, which
//  simulates a new deployment for that browser context only.
//
//  localhost counts as a secure context: the service worker works over http.
//  No dependency, no directory listing, no caching (Cache-Control: no-cache).
// =============================================================================
import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync } from 'node:fs';
import { join, dirname, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'QuestionnaireJDR');
const arg = (name, def) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };
const PORT = Number(arg('--port', process.env.PORT || 4173));
let BASE = arg('--base', '/qjdr/');
if (!BASE.startsWith('/')) BASE = '/' + BASE;
if (!BASE.endsWith('/')) BASE += '/';
const TEST_HOOKS = process.argv.includes('--test-hooks');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.yaml': 'text/yaml; charset=utf-8', '.yml': 'text/yaml; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon'
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end(); return; }
  if (pathname + '/' === BASE) { res.writeHead(301, { Location: BASE }).end(); return; } // like Pages: /repo -> /repo/
  if (!pathname.startsWith(BASE)) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
  let rel = pathname.slice(BASE.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT + sep)) { res.writeHead(403).end(); return; }
  let st;
  try { st = statSync(file); } catch { st = null; }
  if (!st || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
  const fake = TEST_HOOKS && rel === 'sw.js' && /(?:^|;\s*)qjdr_sw_version=([0-9a-f]{1,32})/.exec(req.headers.cookie || '');
  if (fake) {
    const body = readFileSync(file, 'utf8').replace(/var VERSION = "[^"]*"/, 'var VERSION = "' + fake[1] + '"');
    res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-cache' }).end(body);
    return;
  }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': st.size,
    'Cache-Control': 'no-cache'
  });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`Questionnaire JDR : http://localhost:${PORT}${BASE}  (Ctrl+C pour arrêter)`));
