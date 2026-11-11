// The real folder picker cannot be driven headless (and OPFS is unavailable on
// file://), so the File System Access code paths are exercised with an
// in-memory implementation of the FileSystemDirectoryHandle interface.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const URL = pathToFileURL(path.join(__dirname, '..', '..', 'QuestionnaireJDR', 'Questionnaire JDR.html')).href;

test('écriture puis relecture du dossier de configuration (API File System Access simulée)', async ({ page }) => {
  await page.goto(URL);
  const result = await page.evaluate(async () => {
    function makeDir(name) {
      const files = new Map();
      const dirs = new Map();
      return {
        kind: 'directory', name, files, dirs,
        async getFileHandle(n, opts) {
          if (!files.has(n)) {
            if (!(opts && opts.create)) throw new DOMException('absent', 'NotFoundError');
            files.set(n, '');
          }
          return {
            kind: 'file', name: n,
            async getFile() { return new File([files.get(n)], n); },
            async createWritable() { let buf = ''; return { async write(t) { buf += t; }, async close() { files.set(n, buf); } }; }
          };
        },
        async getDirectoryHandle(n, opts) {
          if (!dirs.has(n)) {
            if (!(opts && opts.create)) throw new DOMException('absent', 'NotFoundError');
            dirs.set(n, makeDir(n));
          }
          return dirs.get(n);
        },
        values() {
          const entries = [...files.keys()].map((n) => ({ kind: 'file', name: n, getFile: async () => new File([files.get(n)], n) }));
          let i = 0;
          return { next: async () => (i < entries.length ? { done: false, value: entries[i++] } : { done: true }) };
        },
        async queryPermission() { return 'granted'; }
      };
    }
    const dir = makeDir('configuration');
    const cfg = window.QJ.store.state.config;
    cfg.questions[0].reponses[0].poids.hasard = 3;
    const n = await window.QJ.files.writeConfigDir(dir, cfg);
    const map = await window.QJ.files.readConfigDir(dir);
    const back = window.QJ.configIO.configFromPathMap(map);
    return {
      n, files: Object.keys(map).sort(),
      same: JSON.stringify(back.config) === JSON.stringify(cfg),
      problems: back.problems.length,
      head: map['questionnaire.yaml'].split('\n')[1]
    };
  });
  expect(result.same).toBe(true);
  expect(result.problems).toBe(0);
  expect(result.files).toContain('attentes/competition.yaml');
  expect(result.n).toBe(result.files.length);
  expect(result.head).toContain('CONFIGURATION DU QUESTIONNAIRE');
});

test('IndexedDB disponible en file:// (mémorisation du dossier)', async ({ page }) => {
  await page.goto(URL);
  const v = await page.evaluate(async () => {
    await window.QJ.files.saveHandle({ name: 'configuration' });
    const h = await window.QJ.files.getHandle();
    await window.QJ.files.forgetHandle();
    return h && h.name;
  });
  expect(v).toBe('configuration');
});
