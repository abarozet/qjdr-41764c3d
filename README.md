# Questionnaire JDR – player profile reports

**Questionnaire JDR** is a zero-install browser application that turns the
CSV export of a Google Form (a questionnaire about what wargame players look for
in a game) into French HTML reports. Each answer of the form gives points to one
or more configurable *attentes ludiques* ("play expectations": competition,
strategy, narration, immersion, conviviality, chance…). The app scores every
respondent on each attente (0–100 %), assigns a *level* with its own text,
and produces an individual report per player (radar chart, dominant attente,
one section per attente) plus a global report for the form owner (average
profile, distributions, correlations, per-question answer counts, sortable table
of respondents, all individual reports embedded).

It is used mainly as an **installable web app (PWA) on an Android tablet in
Chrome**, served from GitHub Pages at an unlisted URL, and works offline after
the first visit (service worker). The very same folder also runs on a desktop
by double-clicking `Questionnaire JDR.html` over `file://`. In both cases the
responses file is processed on the device only: nothing is uploaded.

Everything runs from static files, with no server logic: plain
HTML/CSS/JS, classic `<script>` tags (ES modules do not load over `file://`),
two vendored libraries (js-yaml, JSZip) and one vendored font (Fredoka, SIL OFL), no build step and no network access.
The scoring rules, questions, weights and report texts live in a small
`configuration/` folder of YAML files, which the end user can also edit through
the in-app **Configuration** tab: on Chromium browsers (Edge, Chrome) the app
reads and writes the folder directly with the File System Access API; elsewhere
it falls back to picking/dropping files and downloading a `configuration.zip`
(on Android: file pickers and `configuration.zip` only; reports can be sent with
the system share sheet).

## Folder map

```
.
├── README.md                     ← this file
├── docs/
│   └── DEVELOPER.md              ← architecture, module API, config schema, rules, testing
├── QuestionnaireJDR/             ← the DISTRIBUTABLE folder (zip this for end users)
│   ├── index.html                ← THE page (web entry point, GitHub Pages)
│   ├── Questionnaire JDR.html    ← GENERATED copy of index.html (desktop: double-click to open)
│   ├── sw.js                     ← service worker: offline cache (precache list + version GENERATED)
│   ├── manifest.webmanifest      ← PWA manifest (name, icons, standalone, start_url ./)
│   ├── robots.txt                ← disallow all (unlisted site)
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
│   │   │   ├── util.js           ← DOM helpers (h(), modal, toast, downloads, share, print), device detection
│   │   │   ├── pwa.js            ← service-worker registration (http(s) only) and update toast
│   │   │   ├── store.js          ← app state, localStorage persistence, event bus
│   │   │   ├── files.js          ← reading data files, File System Access, IndexedDB, ZIP fallback
│   │   │   ├── ui-donnees.js, ui-individuels.js, ui-global.js, ui-config.js, ui-aide.js  ← tabs
│   │   │   └── main.js           ← start-up, tab switching, configuration banner
│   │   ├── icons/                ← GENERATED PWA icons (192/512, maskable, apple-touch)
│   │   └── vendor/               ← js-yaml.min.js, jszip.min.js, fonts/ (Fredoka woff2 + OFL licence; no CDN)
│   ├── configuration/            ← the shipped configuration (source of truth for the default)
│   │   ├── questionnaire.yaml    ← title, column names, attente order, questions, answers, weights
│   │   ├── rapport.yaml          ← general report texts
│   │   └── attentes/<id>.yaml    ← one file per attente: name, colour, description, levels
│   ├── exemples/reponses_exemple.csv  ← GENERATED: 30 synthetic respondents in Google Forms format
│   └── documentation/            ← French user guide (guide.html), shown in the "Aide" tab
└── dev/                          ← developer tooling, NOT distributed
    ├── package.json              ← npm scripts (test, e2e, build-config, exemple)
    ├── tests/                    ← unit tests (`node --test`), run against the real app files
    ├── e2e/                      ← Playwright tests in system Chrome: desktop over file://, Android tablet/phone over http
    ├── screenshots/              ← PNGs written by the e2e run and the guide screenshot tool (scratch copies)
    ├── playwright.config.js
    └── tools/                    ← Node scripts that regenerate the GENERATED files
        ├── load_config.mjs       ← shared: reads configuration/ with the app's own config-io.js
        ├── build_default_config.mjs
        ├── generate_example.mjs
        ├── build_pwa.mjs         ← desktop HTML copy + sw.js precache list/version (pwa_lib.js)
        ├── make_icons.mjs        ← renders app/icons/*.png
        ├── serve.mjs             ← tiny static server, app under /qjdr/ like Pages
        ├── capture_guide_screenshots.mjs
        └── package_release.mjs
.github/workflows/pages.yml       ← CI: checks + unit tests, then deploys QuestionnaireJDR/ to GitHub Pages
```

## Quick start for developers

Requirements: Node.js (tested with v26; anything with `node --test` and
`TextDecoder` works) and, for the end-to-end tests only, Google Chrome
installed on the machine (Playwright uses the system Chrome, no browser
download).

```bash
cd dev
npm install            # only @playwright/test; needed for e2e, not for unit tests

npm test               # unit tests:  node --test tests/     (41 tests, < 1 s)
npm run e2e            # end-to-end:  playwright test        (20 tests, ~15 s, headless system Chrome)
npm run e2e:desktop    #   only the file:// desktop project (5 tests)
npm run e2e:mobile     #   only Android tablet portrait/landscape + phone over http (3 × 5 tests)
npm run serve          # http://localhost:4173/qjdr/ : the web version, as on GitHub Pages
```

There is no bundler: open `QuestionnaireJDR/Questionnaire JDR.html` (or
`npm run serve`) in a browser and edit the files under `QuestionnaireJDR/app/`
directly. The unit tests `require()` the very same files that the browser
loads. The only "build" step is `node dev/tools/build_pwa.mjs`, to run after
any change in `QuestionnaireJDR/` (see below; a test fails if you forget).

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

### Web version: desktop copy, service worker, versioning

`QuestionnaireJDR/index.html` is the page's source. `node dev/tools/build_pwa.mjs`
(deterministic, pure Node):

- writes `Questionnaire JDR.html` = `index.html` + a "generated" comment − the
  manifest link (useless over `file://`);
- rewrites the GENERATED block of `sw.js`: `PRECACHE` = every distributable file
  except `sw.js` (same selection as the release zip: no hidden/OS/dev files),
  `VERSION` = first 12 hex chars of a SHA-256 over the paths and bytes of those
  files. Changing any file gives a new cache `qjdr-<VERSION>`; an unchanged tree
  keeps the same version.

`--check` only verifies (CI). `dev/tests/sync.test.js` asserts the copy, the
precache list (against the files on disk) and the version, and that every URL
referenced by `index.html`/the manifest is relative and precached.

The service worker is cache-first on one consistent version; it checks for a
new `sw.js` on each navigation (and `pwa.js` on return to the foreground and
hourly). A new version installs in the background, waits, and the app shows
« Nouvelle version disponible — Recharger »; the button activates it
(`SKIP_WAITING`) and reloads. Old caches are deleted on activation. It is never
registered over `file://`.

Icons (`app/icons/`) come from `node dev/tools/make_icons.mjs` (system Chrome;
the d20 logo, "20" set in the vendored Fredoka), only needed if the logo changes.

### Guide screenshots

The images of the French user guide (`QuestionnaireJDR/documentation/images/`)
are produced by `node dev/tools/capture_guide_screenshots.mjs` (headless system
Chrome: desktop images over `file://`, tablet/phone images `4x-*.png` with
Android emulation over http). Rerun it after any UI change and look at the changed
images; the guide text in `QuestionnaireJDR/documentation/guide.html` is
maintained by hand. The e2e run also writes scratch screenshots to
`dev/screenshots/`.

## Deploying to GitHub Pages

The web version is the `QuestionnaireJDR/` folder served as a static site.
Recommended setup (already in the repo): **`.github/workflows/pages.yml`**.

1. Create the GitHub repository (a random, non-descriptive name keeps the URL
   unguessable, e.g. `https://<user>.github.io/q-7f3k2/`) and push this project.
2. Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Every push to `main` runs `node dev/tools/build_pwa.mjs --check` and the unit
   tests, then uploads `QuestionnaireJDR/` with `actions/upload-pages-artifact`
   and publishes it with `actions/deploy-pages`. The workflow never rewrites
   files: run `build_pwa.mjs` and commit its output before pushing.
4. Send the URL to the end user; on the tablet: open in Chrome → ⋮ → « Ajouter à
   l’écran d’accueil » / « Installer l’application » (see the user guide, part 1).

Notes: all URLs are relative, so any sub-path works. The pages carry
`<meta name="robots" content="noindex, nofollow">` and the site has a
`robots.txt` that disallows everything — but crawlers only read `robots.txt` at
the domain root (`<user>.github.io/robots.txt`), so for a project site the meta
tag is what actually applies. Unlisted ≠ private: GitHub Pages of a public repo
is public to whoever has the link (and the repository itself is public unless
your plan allows Pages from a private repo). No personal data is ever on the
site: the responses stay on the device.

## Packaging a release for the end user

The deliverable is the `QuestionnaireJDR/` folder, zipped. Before releasing,
run `cd dev && npm test && npm run e2e` (both must be green) and refresh the
guide screenshots if the UI changed. Then:

```bash
node dev/tools/package_release.mjs
```

It rebuilds the generated files (default config, example data, then the web
files with `build_pwa.mjs`), checks they are in sync, and writes `dist/QuestionnaireJDR.zip` (git-ignored) containing the
`QuestionnaireJDR/` folder without `.DS_Store`, other hidden/OS files or
anything dev-only. The guide (`documentation/guide.html`) must be present: the
**Aide** tab shows a "guide not available" card otherwise.

Nothing from `dev/` is needed at runtime. The zip is the desktop/offline
alternative to the web version: the end user unzips, opens
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
