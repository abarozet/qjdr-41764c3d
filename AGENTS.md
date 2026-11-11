# AGENTS.md — Questionnaire JDR

Guide for AI coding agents. Keep it accurate: update it when you change structure, commands or invariants.

## Purpose
- Offline browser app (plain HTML/CSS/JS, no build step to run) that scores a Google Forms wargame-player questionnaire exported as CSV/ZIP/XLSX.
- Scoring is driven entirely by YAML config (`QuestionnaireJDR/configuration/`): "attentes" (play expectations), questions, answer weights, level thresholds, report texts.
- Produces self-contained French HTML reports (one per player + a global synthesis) and a scores CSV; includes a GUI config editor.

## Hard constraints (never violate)
- All user-facing text is French (UI, reports, warnings, validation messages, YAML header comments, user guide). Code, identifiers' comments, tests, README/DEVELOPER/AGENTS are English. Config keys are French (`niveaux`, `poids`, `a_partir_de`, ...) — do not rename.
- Must run by double-clicking `QuestionnaireJDR/Questionnaire JDR.html` over `file://`: zero install, no network, no server.
  - No ES modules (`import`/`export`, `type="module"`) in `app/` — classic `<script>` tags + IIFEs only.
  - No `fetch`/XHR of local files (blocked on file://). Data enters via user actions (file input, drop, File System Access) or is embedded in a JS file.
  - Only vendored libs in `app/vendor/` (js-yaml, JSZip). No CDN, no web fonts, no remote images. Do not add a dependency without vendoring it.
- Nothing about specific attentes (competition, hasard, ...), question counts or texts may be hard-coded in JS. Attentes, levels, colours, weights, texts all come from config. Tools and tests derive from config too (see `dev/tools/generate_example.mjs`). Tests may use `miniConfig()` fixtures.
- End user is a non-developer on Windows with Edge (Chrome also). Avoid APIs absent from Edge/Chrome current; Firefox/Safari get fallbacks (no File System Access -> ZIP download / file pick). ES5-style code is the convention (`var`, `function`, no classes/modules/arrow functions in `app/`).
- Reports (`reports.js`, `charts.js`) must stay self-contained HTML: inline CSS, inline SVG, inline `<script>` only; no external reference of any kind. Individual reports can be opened/emailed alone.
- Dev tooling in `dev/` is never distributed; `QuestionnaireJDR/` is the distributable folder.

## File map (`QuestionnaireJDR/`)
`Questionnaire JDR.html` — single page: header/tabs (Données, Rapports individuels, Rapport global, Configuration, Aide), empty `#panel-*` sections, script tags. `app/css/app.css` — all app styles.

Load order in the HTML (each file may only use what is above it):
| # | File | Responsibility |
|---|------|----------------|
| 1 | `app/vendor/js-yaml.min.js`, `jszip.min.js` | globals `jsyaml`, `JSZip` |
| 2 | `app/js/core.js` | PURE logic (UMD: `QJ.core` / `require`): `RAPPORT_FIELDS` (single definition), `looksLikeIdentifier`, `nextLevelThreshold`, text normalisation + matcher, CSV decode/parse/delimiter, timestamps, maxPoints, levelFor, matchTable, scoreRespondent, analyze, stats (mean/median/stdDev/correlation/histogram/globalStats), validateConfig, proposeFromTable, file-name safety, scoresToCSV, placeholders |
| 3 | `charts.js` | PURE (UMD `QJ.charts`): SVG string charts — radar, hbars, scoreBar, histogram, heatmap; `esc`, `fmt` |
| 4 | `reports.js` | PURE (UMD `QJ.reports`; needs core+charts): `individualHTML`, `individualFragment`, `globalHTML`; CSS and sort/anchor script inlined |
| 5 | `config-io.js` | PURE (UMD `QJ.configIO`; needs `jsyaml`): YAML folder -> internal model (`configFromYamlTexts`, `configFromPathMap`) and model -> YAML files with French header comments (`serializeQuestionnaire/Rapport/Attente`, `configToFiles`, `emitText`) |
| 6 | `xlsx.js` | PURE (UMD `QJ.xlsx`): minimal first-sheet .xlsx reader on JSZip |
| 7 | `config-par-defaut.js` | GENERATED: `QJ.DEFAULT_CONFIG` (embedded default config) |
| 8 | `exemple-donnees.js` | GENERATED: `QJ.EXAMPLE_CSV` (embedded example CSV text) |
| 9 | `util.js` | DOM helpers `QJ.util`: `h()` element builder, toast, modal, confirmBox, downloads, debounce, `fillFrame` (srcdoc iframe) |
| 10 | `store.js` | state (`config`, `meta`, `data`, `analysis`, `validation`), localStorage persistence (`questionnaireJDR.config.v1`, `.donnees.v1`), event bus (`on/emit`: `config`, `meta`, `data`, `analysis`), debounced recompute |
| 11 | `files.js` | I/O: data files (CSV/ZIP/XLSX), config folder via File System Access (handle in IndexedDB), dropped files/folders, config ZIP download |
| 12-16 | `ui-donnees.js`, `ui-individuels.js`, `ui-global.js`, `ui-config.js`, `ui-aide.js` | one module per tab (`QJ.uiXxx` with `init`, `render`/`onShow`); `ui-config.js` is the GUI editor (sections general/attentes/rapport/questions/fichiers) |
| 17 | `main.js` | tab switching (`QJ.main.showTab`), config banner, start-up (last; self-starts on DOMContentLoaded) |

UMD files (core, charts, reports, config-io, xlsx) are also `require`d by Node tests/tools: keep them DOM-free and keep the UMD wrapper. UI files are browser-only IIFEs `(function (QJ) {...})(window.QJ = window.QJ || {})`.

Config: `configuration/questionnaire.yaml` (titre, colonne_identifiant, colonne_horodatage, `attentes` id list = order, `questions[].reponses[].poids{attenteId: n}`), `rapport.yaml` (general report texts), `attentes/<id>.yaml` (nom, couleur, titre, description, `niveaux[{a_partir_de,titre,texte}]`). Also `exemples/reponses_exemple.csv` (generated) and `documentation/guide.html` (French user guide).

Global namespace: everything hangs off `window.QJ` (`QJ.core`, `charts`, `reports`, `configIO`, `xlsx`, `DEFAULT_CONFIG`, `EXAMPLE_CSV`, `util`, `store`, `files`, `uiDonnees`, `uiIndividuels`, `uiGlobal`, `uiConfig`, `uiAide`, `main`). Do not add other globals (except vendored `jsyaml`, `JSZip`). New script = new `<script>` tag in the HTML at the right position.

## Core invariants
Internal model: `{titre, colonne_identifiant, colonne_horodatage, attentes:[{id,nom,couleur,titre,description,niveaux}], questions:[{id,texte,reponses:[{texte,poids}]}], rapport:{...}}`.
- **Scoring**: `max[a] = Σ_questions max over answers of poids[a]`; `points[a] = Σ weight of the chosen answer`; `score[a] = 100 * points / max` (0–100). `max == 0` -> score `null` (shown "—", validation error). Unanswered/unrecognised answer = 0 points but max is unchanged (never rescaled). Multiple attentes may get weights from one answer.
- **Level**: last `niveaux[i]` with `a_partir_de <= score` (+1e-9 tolerance), i.e. thresholds inclusive; first level must start at 0, thresholds strictly increasing, 0–100. Number of levels is free per attente. `null` score -> no level.
- **Dominant**: attentes whose score equals the max (1e-9); several -> "profil mixte"; best <= 0 -> none. Ranking: score desc, ties by config order.
- **Normalisation/matching** (`normalize`, `looseKey`, `makeMatcher`): NFKC, lowercase, typographic apostrophes/quotes/ellipsis/dashes unified, spaces collapsed, edge punctuation trimmed. Matching tries exact normalised text first, then a loose key (no accents/punctuation) which is rejected if ambiguous. Used for question columns and answers. Timestamp/identifier columns match by `normalize` equality. Unmatched column -> warning, unmatched answer -> counted as unanswered + warning with count.
- **CSV**: tolerant input — UTF-8 BOM, UTF-8 else windows-1252 fallback, delimiter auto-detect (`,` `;` tab; consistent field count wins), RFC-4180 quotes/newlines in quotes/CRLF, empty lines skipped, ZIP (first csv/xlsx inside) and .xlsx accepted; .xls/.ods rejected with a French message. Timestamps keep wall-clock (no TZ conversion). Output scores CSV: `;`, decimal comma, UTF-8 BOM, CRLF (Excel FR).
- **YAML serializer** (`config-io.js`): output must (1) keep the French header comments of the three file kinds (`HEADER_QUESTIONNAIRE`, `HEADER_RAPPORT`, `headerAttente`) and the explanatory comments between fields; (2) round-trip exactly: `configFromYamlTexts(configToFiles(cfg))` deep-equals `cfg`. Long texts are emitted as folded `>-` blocks only if `roundTripsBlock` proves exact reload, else double-quoted JSON-style string. Header comments in `config-io.js` are what the GUI writes; the hand-written files in `configuration/` should mirror them. The hand-written files in `configuration/` are kept byte-identical to the serializer output (headers and line wrapping); `dev/tests/sync.test.js` enforces it and the round-trip test compares the whole header. When editing a header or a YAML by hand, re-serialize (`configIO.configToFiles(configFromPathMap(...).config)`) and copy the result, then rebuild.
- Placeholders in report texts: `{joueur}`, `{nombre_attentes}`, `{questionnaire}` (`fillPlaceholders`; unknown ones are left as is). Documented in the `rapport.yaml` header.
- Config source of truth at runtime: `store.state.config`; GUI edits mutate it in place then call `store.configChanged(structural)`. Unmodified default config is re-read from the embedded default on every start (so a newer embedded default wins); modified/loaded configs persist in localStorage.

## Generated files — do not hand-edit
| File | Generator | Rerun when |
|------|-----------|-----------|
| `QuestionnaireJDR/app/js/config-par-defaut.js` | `node dev/tools/build_default_config.mjs` | ANY edit of `configuration/**/*.yaml`, or of the loader/model in `config-io.js` |
| `QuestionnaireJDR/app/js/exemple-donnees.js` and `QuestionnaireJDR/exemples/reponses_exemple.csv` | `node dev/tools/generate_example.mjs [N]` (default 30, deterministic seed) | after rebuilding the default config whenever questions/answers/attentes changed (answer texts must match config) |
| `QuestionnaireJDR/documentation/images/*.png` | `node dev/tools/capture_guide_screenshots.mjs` | UI changes, for the user guide (view the PNGs afterwards) |
| `dev/screenshots/*.png` | scratch copies written by the e2e run and the capture tool | not used by the guide |
| `dist/QuestionnaireJDR.zip` | `node dev/tools/package_release.mjs` (rebuilds the two generated JS files above, then zips `QuestionnaireJDR/` without `.DS_Store`/hidden files; `dist/` is git-ignored) | releasing to the end user |

Order after a config change: edit YAML -> `node dev/tools/build_default_config.mjs` -> `node dev/tools/generate_example.mjs` -> tests. Run both from the project root (paths are absolute via `import.meta.url`, so cwd does not matter). `npm run build-config` / `npm run exemple` in `dev/` are aliases. `dev/tests/sync.test.js` fails if `config-par-defaut.js` / `exemple-donnees.js` drift from the YAML / example CSV. The build tool prints validation warnings; fix them rather than ignoring.

## Tests (must all pass before you finish)
Setup once: `cd dev && npm install` (Playwright 1.49.1; e2e uses the system Google Chrome, `channel: 'chrome'`, headless, over `file://`).
```
cd dev && npm test            # node --test tests/   -> 38 unit tests, ~0.2 s
cd dev && npx playwright test # 5 e2e tests, ~6 s (npm run e2e is equivalent)
```
Unit tests (`dev/tests/*.test.js`, `node:test`, helpers in `helpers.js` with `miniConfig()`/`readRealConfig()`) cover csv, matching, scoring, stats, config round-trip, reports, xlsx, and `sync.test.js` (embedded default config/example == sources; hand YAML == serializer output). E2E (`dev/e2e/app.spec.js`, `dossier.spec.js`) drive the whole UI; the File System Access API is simulated with an in-memory directory handle. E2E rewrites scratch `dev/screenshots/*.png` (harmless; guide images come from `capture_guide_screenshots.mjs`). A Node deprecation warning (`module.register`) in output is noise. Add or update tests with every behaviour change; prefer a unit test in `dev/tests` for pure logic, e2e only for UI flows.

## Task checklists
**Change scoring / levels / matching**: edit `core.js` only (pure) -> update unit tests in `dev/tests/scoring|matching.test.js` -> check `validateConfig` stays consistent -> update formula text in `rapport.yaml`/attente headers, README, docs/DEVELOPER.md, user guide if wording changes -> rebuild default config + example if outputs depend on it -> run all tests.

**Add a config field end-to-end** (e.g. a new per-attente or per-question key): in this order
1. Model: add to the internal model docs comment in `core.js` and, if default-needed, to `stubAttente`/`normalizeAttente`/`configFromYamlTexts` (`config-io.js`; for a new report text add it to `RAPPORT_FIELDS` in `core.js`, the single definition that `config-io.js` reads).
2. Loader: parse in `config-io.js` (`configFromYamlTexts`, `normalizeAttente`) with tolerant defaults so old YAML still loads.
3. Validator: `core.validateConfig` (French message, section, level erreur/attention).
4. Use it: `reports.js` / `core.js` / `charts.js` where it matters.
5. GUI: `ui-config.js` (field in the right section; call `changed(structural)`).
6. Serializer: `serializeQuestionnaire/Rapport/Attente` + header comment text (French) in `config-io.js`; mirror the header in the YAML files in `configuration/`; keep round-trip exact.
7. YAML files: add the field to the real config files; run `build_default_config.mjs` (and `generate_example.mjs` if relevant).
8. Docs: README.md, docs/DEVELOPER.md, French user guide section, this file if invariants change.
9. Tests: round-trip in `config-reports.test.js`, validator in `scoring.test.js`, e2e if GUI.

**Add a chart**: write a pure string-returning function in `charts.js` (inline SVG, colours via `safeColor`, escape text with `esc`, no external refs, readable when printed, add `<title>`/aria text), export it, call it from `reports.js` (individual and/or global; keep `.no-print` conventions), add a unit assertion in `config-reports.test.js` (output contains `<svg`, no `http`), eyeball via the e2e report screenshots, update the guide if the report layout described there changes.

**Change UI / update user guide screenshots**: edit `ui-*.js`/`app.css`/HTML -> update `documentation/guide.html` (French) text and any `data-testid` used by e2e -> run `cd dev && npm run e2e` -> `node dev/tools/capture_guide_screenshots.mjs` (refreshes `documentation/images/*.png`, checks guide images/anchors) -> view the changed PNGs to check them.

## Pitfalls
- `config-par-defaut.js` silently drifts from the YAML if you forget to rebuild; the running app shows the embedded copy, not the YAML files. Its header has a generation timestamp, so every rebuild changes the file.
- Unknown string keys in `rapport.yaml` are preserved by the loader but not by the validator.
- The attente file name (`attentes/<id>.yaml`) wins over its inner `id:`; ids must match `^[a-z0-9_-]+$`. Renaming an id means renaming weights in all questions (`renameAttente` in `ui-config.js` does it; manual YAML edits must too).
- Weights referencing an unknown attente id are a validation error, but are ignored by scoring (only configured attentes are summed).
- Question/answer text is the join key with the CSV; editing wording in config without matching the form makes answers "non reconnues". Normalisation tolerates case/punctuation/apostrophes only, not rewording. Duplicate normalised texts are validation errors.
- localStorage can be full/blocked: `lsSet` returns false and the UI toasts; never assume persistence. Large CSVs are not persisted.
- File System Access (`showDirectoryPicker`) is Chromium-only and needs a user gesture + permission re-check (`verifyPermission`); Firefox/Safari use the file-pick/ZIP path. The Aide tab detects whether `documentation/guide.html` exists via a `<link media="not all">` load/error probe because `fetch` is impossible on file://.
- Reports are rendered in `srcdoc` iframes (`util.fillFrame`); in-report `#anchor` links are handled by the inline script of the global report, not by the browser.
- `store.setData` stores the whole parsed table in localStorage; recompute is debounced (200 ms) for non-structural edits — call `store.flush()` before reading `analysis` right after an edit (`showTab` does).
- Format numbers shown to users with `core.formatNumber` / `charts.fmt` (decimal comma, deterministic); no `Intl`/`toLocale*` is used in the code base.
- Windows file names: use `core.safeFileName` / `uniqueFileNames` for any exported file (reserved names, forbidden chars, case-insensitive duplicates).
- French typography: `wrapWords` in `config-io.js` never splits `« »`/`:;!?` from their word when folding YAML; UI strings use real apostrophes `’` as existing code does.

## Documentation map
- `README.md` — project overview and user-oriented quick start (root).
- `docs/DEVELOPER.md` — architecture, data model, dev workflow.
- `QuestionnaireJDR/documentation/guide.html` — French end-user guide, shown in the app's Aide tab. MUST be updated whenever the UI, tabs, buttons, report content or config semantics change (and its screenshots refreshed).
- `AGENTS.md` (this file; `CLAUDE.md` imports it).
