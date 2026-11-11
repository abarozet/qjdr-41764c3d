# Questionnaire JDR – player profile reports

**Questionnaire JDR** is an offline, zero-install browser application that turns the
CSV export of a Google Form (a questionnaire about what wargame players look for
in a game) into French HTML reports. Each answer of the form gives points to one
or more configurable *attentes ludiques* ("play expectations": competition,
strategy, narration, immersion, conviviality, chance…). The app scores every
respondent on each attente (0–100 %), assigns a *level* with its own text,
and produces an individual report per player (radar chart, dominant attente,
one section per attente) plus a global report for the form owner (average
profile, distributions, correlations, per-question answer counts, sortable table
of respondents, all individual reports embedded).

Everything runs from a single `.html` file opened over `file://`: plain
HTML/CSS/JS, classic `<script>` tags (ES modules do not load over `file://`),
two vendored libraries (js-yaml, JSZip), no build step and no network access.
The scoring rules, questions, weights and report texts live in a small
`configuration/` folder of YAML files, which the end user can also edit through
the in-app **Configuration** tab: on Chromium browsers (Edge, Chrome) the app
reads and writes the folder directly with the File System Access API; elsewhere
it falls back to picking/dropping files and downloading a `configuration.zip`.

## Folder map

```
.
├── README.md                     ← this file
├── docs/
│   └── DEVELOPER.md              ← architecture, module API, config schema, rules, testing
├── QuestionnaireJDR/             ← the DISTRIBUTABLE folder (zip this for end users)
│   ├── Questionnaire JDR.html    ← entry point (double-click to open)
│   ├── app/
│   │   ├── css/app.css           ← application styles (not the reports')
│   │   ├── js/                   ← application code, one global namespace `QJ`
│   │   │   ├── core.js           ← pure logic: CSV, matching, scoring, stats, validation (Node-testable)
│   │   │   ├── charts.js         ← inline-SVG charts as strings (Node-testable)
│   │   │   ├── reports.js        ← self-contained HTML reports (Node-testable)
│   │   │   ├── config-io.js      ← YAML folder ⇄ internal model, comment-preserving serializer (Node-testable)
│   │   │   ├── xlsx.js           ← minimal .xlsx first-sheet reader on top of JSZip (Node-testable)
│   │   │   ├── config-par-defaut.js  ← GENERATED: embedded default configuration
│   │   │   ├── exemple-donnees.js    ← GENERATED: embedded example CSV
│   │   │   ├── util.js           ← DOM helpers (h(), modal, toast, downloads)
│   │   │   ├── store.js          ← app state, localStorage persistence, event bus
│   │   │   ├── files.js          ← reading data files, File System Access, IndexedDB, ZIP fallback
│   │   │   ├── ui-donnees.js, ui-individuels.js, ui-global.js, ui-config.js, ui-aide.js  ← tabs
│   │   │   └── main.js           ← start-up, tab switching, configuration banner
│   │   └── vendor/               ← js-yaml.min.js, jszip.min.js (no CDN)
│   ├── configuration/            ← the shipped configuration (source of truth for the default)
│   │   ├── questionnaire.yaml    ← title, column names, attente order, questions, answers, weights
│   │   ├── rapport.yaml          ← general report texts
│   │   └── attentes/<id>.yaml    ← one file per attente: name, colour, description, levels
│   ├── exemples/reponses_exemple.csv  ← GENERATED: 30 synthetic respondents in Google Forms format
│   └── documentation/            ← French user guide (guide.html), shown in the "Aide" tab
└── dev/                          ← developer tooling, NOT distributed
    ├── package.json              ← npm scripts (test, e2e, build-config, exemple)
    ├── tests/                    ← unit tests (`node --test`), run against the real app files
    ├── e2e/                      ← Playwright tests driving the real HTML over file:// in system Chrome
    ├── screenshots/              ← PNGs written by the e2e run and the guide screenshot tool (scratch copies)
    ├── playwright.config.js
    └── tools/                    ← Node scripts that regenerate the GENERATED files
        ├── load_config.mjs       ← shared: reads configuration/ with the app's own config-io.js
        ├── build_default_config.mjs
        └── generate_example.mjs
```

## Quick start for developers

Requirements: Node.js (tested with v26; anything with `node --test` and
`TextDecoder` works) and, for the end-to-end tests only, Google Chrome
installed on the machine (Playwright uses the system Chrome, no browser
download).

```bash
cd dev
npm install            # only @playwright/test; needed for e2e, not for unit tests

npm test               # unit tests:  node --test tests/     (38 tests, < 1 s)
npm run e2e            # end-to-end:  playwright test        (5 tests, ~5 s, headless system Chrome)
```

There is no build step and no bundler: open
`QuestionnaireJDR/Questionnaire JDR.html` in a browser and edit the files under
`QuestionnaireJDR/app/` directly. The unit tests `require()` the very same files
that the browser loads.

### Regenerating the generated files

Two files in the distributable are generated and must not be edited by hand
(their header says so):

| Generated file | Source | Command (from the project root) |
|---|---|---|
| `QuestionnaireJDR/app/js/config-par-defaut.js` (`QJ.DEFAULT_CONFIG`) | `QuestionnaireJDR/configuration/**/*.yaml` | `node dev/tools/build_default_config.mjs` (or `cd dev && npm run build-config`) |
| `QuestionnaireJDR/exemples/reponses_exemple.csv` **and** `QuestionnaireJDR/app/js/exemple-donnees.js` (`QJ.EXAMPLE_CSV`) | the configuration (question and answer texts) | `node dev/tools/generate_example.mjs [N]` (or `cd dev && npm run exemple`), N defaults to 30 |

Why they exist: a page opened over `file://` cannot `fetch()` sibling files, so
the default configuration and the example data are embedded as scripts. Both
generators are deterministic (the example uses a fixed PRNG seed), so a rerun
only changes the `Generated on` timestamp of `config-par-defaut.js`.

`dev/tests/sync.test.js` fails if `config-par-defaut.js` or `exemple-donnees.js` drift from the YAML / example CSV, and if the hand-written YAML files differ from what the GUI serializer (`config-io.js`) writes (headers and line wrapping included, so saving from the GUI never produces noisy diffs). To fix the latter after editing a YAML by hand, load and re-save it with the serializer (`configIO.configToFiles`).

Whenever you touch `configuration/*.yaml`, rerun **both** tools: the example
CSV reproduces the question and answer texts verbatim, and the unit test
`individual report is a self-contained HTML document` fails if the example no
longer matches the configuration (it asserts 30 respondents and no warnings).

### Guide screenshots

The images of the French user guide (`QuestionnaireJDR/documentation/images/`)
are produced by `node dev/tools/capture_guide_screenshots.mjs` (headless system
Chrome, over `file://`). Rerun it after any UI change and look at the changed
images; the guide text in `QuestionnaireJDR/documentation/guide.html` is
maintained by hand. The e2e run also writes scratch screenshots to
`dev/screenshots/`.

## Packaging a release for the end user

The deliverable is the `QuestionnaireJDR/` folder, zipped. Before releasing,
run `cd dev && npm test && npm run e2e` (both must be green) and refresh the
guide screenshots if the UI changed. Then:

```bash
node dev/tools/package_release.mjs
```

It rebuilds the generated files (default config, example data), checks they are
in sync, and writes `dist/QuestionnaireJDR.zip` (git-ignored) containing the
`QuestionnaireJDR/` folder without `.DS_Store`, other hidden/OS files or
anything dev-only. The guide (`documentation/guide.html`) must be present: the
**Aide** tab shows a "guide not available" card otherwise.

Nothing from `dev/` is needed at runtime. The end user unzips, opens
`Questionnaire JDR.html` in Edge, Chrome or Firefox, and drops the Google Forms
CSV (or the `.zip` Google Forms produces, or an `.xlsx`) on the **Données** tab.

## Documentation

- [`docs/DEVELOPER.md`](docs/DEVELOPER.md) – architecture, script load order and
  the `QJ` namespace, core module API, full configuration schema, scoring and
  level rules, text matching rules, CSV robustness, report rendering, the YAML
  serializer, browser persistence and "active configuration" states, testing
  strategy, how to add a feature, known limitations and conventions.
- `QuestionnaireJDR/documentation/` – French user guide (end users).
- `AGENTS.md` / `CLAUDE.md` – guidance for AI coding agents (maintained separately).
