/*
 * reports.js — builds the French reports as self-contained HTML strings
 * (inline CSS + inline SVG, no external reference):
 *   - individual report (one player), standalone or as a fragment;
 *   - global report (for the form creator), embedding all individual reports.
 * Pure (no DOM). Browser: global QJ.reports. Node: require.
 */
(function (root, factory) {
  'use strict';
  var core, charts;
  if (typeof module === 'object' && module.exports) {
    core = require('./core.js');
    charts = require('./charts.js');
    module.exports = factory(core, charts);
  } else {
    root.QJ = root.QJ || {};
    root.QJ.reports = factory(root.QJ.core, root.QJ.charts);
  }
})(typeof self !== 'undefined' ? self : this, function (core, charts) {
  'use strict';

  var esc = charts.esc;
  var fmt = charts.fmt;

  // ---------------------------------------------------------------------------
  // Shared CSS (embedded in every exported file)
  // ---------------------------------------------------------------------------

  // Display font of the reports: Fredoka SemiBold (SIL Open Font License 1.1,
  // app/vendor/fonts/OFL-Fredoka.txt), latin subset, embedded so that an exported
  // report stays a single self-contained file. MUST equal the base64 of
  // app/vendor/fonts/fredoka-600.woff2 (dev/tests/sync.test.js checks it).
  var FONT_WOFF2 = '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';

  var D20 = '<svg class="r-die" viewBox="0 0 40 40" aria-hidden="true"><g stroke="#fff" stroke-width="1.3" stroke-linejoin="round">' +
    '<path d="M20 2.5 5 11.2l15-.7z" fill="#56B4E9"/><path d="M20 2.5l15 8.7-15-.7z" fill="#CC79A7"/>' +
    '<path d="M5 11.2l5.6 15.2 9.4-15.9z" fill="#0072B2"/><path d="M35 11.2l-5.6 15.2-9.4-15.9z" fill="#D55E00"/>' +
    '<path d="M5 11.2v17.6l5.6-2.4z" fill="#009E73"/><path d="M35 11.2v17.6l-5.6-2.4z" fill="#E69F00"/>' +
    '<path d="M5 28.8l15 8.7-9.4-11.1zM35 28.8l-15 8.7 9.4-11.1z" fill="#3B2A9E"/>' +
    '<path d="M10.6 26.4h18.8L20 37.5z" fill="#5A3FD8"/><path d="M20 10.5l9.4 15.9H10.6z" fill="#fff"/></g>' +
    '<text x="20" y="23.4" text-anchor="middle" font-size="8" fill="#2e2276" style="font-family:Fredoka,Arial,sans-serif;font-weight:600">20</text></svg>';

  var CSS = [
    "@font-face{font-family:'Fredoka';font-style:normal;font-weight:400 800;font-display:swap;src:url(data:font/woff2;base64," + FONT_WOFF2 + ") format('woff2')}",
    ':root{--bg:#f3f2fb;--card:#fff;--ink:#1e1b3a;--ink2:#47436b;--muted:#64607f;--line:#e3e0f2;--line2:#cdc8e6;--brand:#5a3fd8;--brand-deep:#2e2276;--brand-soft:#ece8ff;' +
      "--display:'Fredoka','Nunito','Segoe UI Rounded','Arial Rounded MT Bold','Segoe UI',system-ui,sans-serif;" +
      '--confetti:linear-gradient(90deg,#d55e00 0 16.66%,#0072b2 0 33.33%,#cc79a7 0 50%,#009e73 0 66.66%,#e69f00 0 83.33%,#56b4e9 0)}',
    '*{box-sizing:border-box}',
    'html{-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    "body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 'Segoe UI',system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif}",
    '.serif,h1,h2,h3,.r-name,.r-dom-name,.r-pct,.kpi b{font-family:var(--display);font-weight:600;letter-spacing:.005em}',
    '.page{max-width:880px;margin:0 auto;padding:32px 28px 48px}',
    '.rapport{background:var(--card);border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:0 1px 2px rgba(46,34,118,.06),0 14px 36px -10px rgba(46,34,118,.18)}',
    // hero: the "character sheet" header
    '.r-hero{position:relative;padding:34px 40px 30px;color:#fff;overflow:hidden;background:radial-gradient(circle at 92% -30%,rgba(255,255,255,.16) 0 30%,transparent 30.5%),radial-gradient(circle at 60% 170%,rgba(255,255,255,.10) 0 30%,transparent 30.5%),linear-gradient(115deg,#2e2276 0%,#4129b0 50%,#5a3fd8 100%)}',
    '.r-hero::before,.g-hero::before{content:"";position:absolute;left:0;right:0;top:0;height:7px;background:var(--confetti)}',
    '.r-hero-txt{position:relative;max-width:calc(100% - 130px)}',
    '.r-kicker{font-size:14px;color:#d9d2ff;margin:0 0 6px;font-weight:600}',
    '.r-hero h1{font-size:20px;line-height:1.2;margin:0;color:#ffd96b}',
    '.r-name{font-size:46px;line-height:1.05;margin:4px 0 0;overflow-wrap:anywhere}',
    '.r-date{display:inline-block;margin:12px 0 0;font-size:13px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:2px 12px;color:#f1eeff}',
    '.r-die{position:absolute;right:30px;top:50%;width:112px;height:112px;transform:translateY(-50%) rotate(12deg);filter:drop-shadow(0 8px 14px rgba(10,5,50,.4))}',
    '.r-body{padding:28px 40px 30px}',
    '.r-intro{color:var(--ink2);margin:0 0 18px}',
    '.r-intro p,.r-text p{margin:0 0 .7em}',
    '.r-top{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:22px;align-items:center;margin:6px 0 26px;break-inside:avoid;page-break-inside:avoid}',
    '.r-radar{text-align:center}',
    '.r-dominant{position:relative;border-radius:20px;padding:22px 22px 20px;background:var(--dom-t,var(--brand-soft));border:2px solid var(--dom,var(--brand));box-shadow:0 6px 0 var(--dom,var(--brand))}',
    '.r-dominant h2{font-size:15px;color:var(--ink2);margin:0 0 8px}',
    '.r-dom-name{font-size:34px;margin:0;line-height:1.1;display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.r-dom-name .dot{width:18px!important;height:18px!important;box-shadow:0 0 0 3px #fff}',
    '.r-dom-level{font-family:var(--display);font-weight:600;font-size:19px;margin:8px 0 4px;color:var(--ink)}',
    '.r-dom-score{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 12px}',
    '.r-dom-score b{font-family:var(--display);font-weight:600;font-size:30px;line-height:1}',
    '.r-dom-desc{font-size:14px;color:var(--ink2);margin:0}',
    '.chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;padding:0;list-style:none}',
    '.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:3px 11px 3px 8px;font-size:13px}',
    '.dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none}',
    '.r-note{font-size:12.5px;color:var(--muted);margin:-12px 0 18px}',
    '.r-attente{border:1px solid var(--line);border-top:6px solid var(--c,#888);border-radius:20px;margin:0 0 18px;break-inside:avoid;page-break-inside:avoid;background:#fff;overflow:hidden}',
    '.r-att-head{display:flex;gap:14px;align-items:center;padding:14px 20px 12px;background:var(--ct,#f7f6fd)}',
    '.r-rank{flex:none;width:44px;height:48px;display:grid;place-items:center;font-family:var(--display);font-weight:600;font-size:21px;color:var(--ci,#fff);background:var(--c,#888);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}',
    '.r-att-titles{flex:1;min-width:0}',
    '.r-att-head h2{font-size:22px;margin:0;line-height:1.2}',
    '.r-att-name{font-size:13px;color:var(--ink2);font-weight:600;display:inline-flex;align-items:center;gap:6px}',
    '.r-pct{font-size:28px;line-height:1;white-space:nowrap}',
    '.r-att-body{padding:12px 20px 8px}',
    '.r-score{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;margin:2px 0 8px}',
    '.r-lv{display:inline-flex;align-items:center;gap:8px}',
    '.badge{display:inline-flex;align-items:center;border-radius:999px;padding:2px 11px;font-size:12.5px;font-weight:700;border:1.5px solid var(--c,var(--brand));background:var(--ct,var(--brand-soft));color:var(--ink);white-space:nowrap}',
    '.r-dominant .badge{border-color:var(--dom,var(--brand));background:#fff}',
    '.pips{display:inline-flex;gap:4px}',
    '.pips i{width:10px;height:10px;border-radius:50%;border:2px solid var(--c,var(--brand));background:#fff}',
    '.pips i.on{background:var(--c,var(--brand))}',
    '.r-level-title{font-size:19px;margin:6px 0 6px}',
    '.r-text{color:var(--ink2)}',
    '.r-desc{font-size:13px;color:var(--muted);margin:0 0 6px}',
    '.r-conclusion{position:relative;margin:26px 0 0;padding:20px 24px 20px 24px;border-radius:20px;background:var(--brand-soft);border:2px dashed #b9aef0;color:var(--ink)}',
    '.r-conclusion p:last-child{margin-bottom:0}',
    '.r-foot{margin-top:22px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);text-align:center}',
    // global report
    '.g-nav{position:sticky;top:0;z-index:5;background:rgba(243,242,251,.94);backdrop-filter:blur(6px);padding:10px 0;margin:-6px 0 18px;display:flex;gap:6px;flex-wrap:wrap}',
    '.g-nav a{font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none;padding:5px 12px;border-radius:999px;border:1.5px solid var(--line2);background:var(--card)}',
    '.g-nav a:hover{border-color:var(--brand);color:var(--brand)}',
    '.g-section{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:24px 28px;margin:0 0 20px;box-shadow:0 1px 2px rgba(46,34,118,.05),0 10px 26px -12px rgba(46,34,118,.16)}',
    '.g-section > h2,.g-h2{font-size:25px;margin:0 0 6px}',
    '.g-section > h2::after,.g-h2::after{content:"";display:block;width:72px;height:6px;border-radius:3px;margin:8px 0 0;background:var(--confetti)}',
    '.g-hero{position:relative;overflow:hidden;color:#fff;border:0;padding-top:34px;background:radial-gradient(circle at 92% -30%,rgba(255,255,255,.16) 0 30%,transparent 30.5%),linear-gradient(115deg,#2e2276 0%,#4129b0 50%,#5a3fd8 100%)}',
    '.g-hero .r-kicker{color:#d9d2ff}',
    '.g-hero h1{color:#fff}',
    '.g-hero .g-lead,.g-hero .r-note{color:#e6e1ff}',
    '.g-hero .kpi{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.22)}',
    '.g-hero .kpi span{color:#e6e1ff}',
    '.g-lead{color:var(--ink2);margin:0 0 16px;font-size:14.5px}',
    '.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0 0}',
    '.kpi{border:1px solid var(--line);border-radius:16px;padding:12px 14px;background:#fff}',
    '.kpi b{display:block;font-size:28px;line-height:1.25}',
    '.kpi span{font-size:12.5px;color:var(--muted)}',
    '.g-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}',
    '.g-att{border:1px solid var(--line);border-top:6px solid var(--c,#888);border-radius:18px;padding:0 16px 14px;background:#fff;break-inside:avoid;page-break-inside:avoid;overflow:hidden}',
    '.g-att h3{margin:0 -16px 10px;padding:10px 16px;font-size:19px;display:flex;align-items:center;gap:8px;background:var(--ct,#f7f6fd)}',
    '.stats{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0 8px}',
    '.stats td{padding:3px 4px;border-bottom:1px solid var(--line)}',
    '.stats td:last-child{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}',
    '.subhead{font-size:13px;color:var(--ink2);margin:12px 0 2px;font-weight:700}',
    '.levels{width:100%;border-collapse:collapse;font-size:13px}',
    '.levels td{padding:4px 4px;border-bottom:1px solid var(--line);vertical-align:middle}',
    '.levels td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.lvbar{height:10px;border-radius:5px;background:var(--ct,#efedf8);overflow:hidden;min-width:60px}',
    '.lvbar i{display:block;height:100%;border-radius:5px}',
    '.q{border-top:1px solid var(--line);padding:14px 0 8px;break-inside:avoid;page-break-inside:avoid}',
    '.q:first-of-type{border-top:0}',
    '.q h3{font-size:17px;margin:0 0 8px}',
    '.q h3 small{display:inline-block;font-size:13px;color:#fff;background:var(--brand);border-radius:8px;padding:0 7px;margin-right:8px;vertical-align:2px}',
    '.ans{display:grid;grid-template-columns:minmax(0,1fr) 170px 74px;gap:4px 12px;align-items:center;font-size:13.5px;padding:3px 0}',
    '.ans .bar{height:12px;border-radius:6px;background:#efedf8;overflow:hidden}',
    '.ans .bar i{display:block;height:100%;background:#7466c9;border-radius:6px}',
    '.ans .cnt{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink2);font-weight:600}',
    '.ans .w{display:flex;gap:4px;flex-wrap:wrap;margin-top:2px}',
    '.wchip{font-size:11px;border-radius:999px;padding:0 7px;border:1px solid var(--line);background:#fff;display:inline-flex;gap:4px;align-items:center;color:var(--ink2)}',
    '.flag{font-size:11px;font-weight:700;color:#8f3a00;background:#ffe9d6;border-radius:999px;padding:0 8px;margin-left:6px}',
    '.tbl-wrap{overflow-x:auto}',
    'table.sortable{width:100%;border-collapse:collapse;font-size:13.5px}',
    'table.sortable th{position:sticky;top:0;background:var(--brand-soft);text-align:left;padding:8px;border-bottom:2px solid #cdc3fb;cursor:pointer;white-space:nowrap;user-select:none}',
    'table.sortable th:first-child{border-top-left-radius:12px}',
    'table.sortable th:last-child{border-top-right-radius:12px}',
    'table.sortable th[aria-sort=ascending]::after{content:" ▲";font-size:10px}',
    'table.sortable th[aria-sort=descending]::after{content:" ▼";font-size:10px}',
    'table.sortable td{padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}',
    'table.sortable td.num{text-align:right;font-variant-numeric:tabular-nums}',
    'table.sortable tr:hover td{background:#f7f6fd}',
    'a{color:var(--brand)}',
    '.g-section[id],details.indiv{scroll-margin-top:96px}',
    'details.indiv{margin:0 0 12px;border:1px solid var(--line);border-radius:20px;background:var(--card);overflow:hidden}',
    'details.indiv > summary{cursor:pointer;padding:12px 18px;font-weight:600;list-style-position:inside}',
    'details.indiv > summary:hover{background:#f7f6fd}',
    'details.indiv[open] > summary{border-bottom:1px solid var(--line)}',
    'details.indiv .rapport{border:0;box-shadow:none;border-radius:0}',
    '.warn{border-left:5px solid #c2410c;background:#fff4ea;padding:8px 12px;border-radius:10px;margin:6px 0;font-size:13.5px}',
    '.warn.info{border-left-color:var(--brand);background:var(--brand-soft)}',
    '.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--ink2);margin:6px 0 0}',
    '.legend span{display:inline-flex;gap:6px;align-items:center}',
    '@media (max-width:700px){.page{padding:16px}.r-hero{padding:30px 22px 24px}.r-body{padding:20px 18px 22px}.r-name{font-size:38px}.r-die{width:84px;height:84px;right:16px}.r-hero-txt{max-width:calc(100% - 88px)}.r-top{grid-template-columns:1fr}.ans{grid-template-columns:1fr 90px 60px}.g-grid{grid-template-columns:1fr}}',
    // phones: more room for the text, readable titles, tap-friendly links
    '@media (max-width:480px){body{font-size:15.5px}.page{padding:8px 6px 24px}.rapport{border-radius:18px}.r-hero{padding:26px 16px 20px}.r-body{padding:18px 14px 20px}.r-name{font-size:32px}.r-hero h1{font-size:17px}.r-die{width:64px;height:64px;right:10px;top:34px;transform:rotate(12deg)}.r-hero-txt{max-width:calc(100% - 64px)}.g-section{padding:18px 14px;border-radius:18px}.r-dom-name{font-size:28px}.r-att-head{padding:12px 14px 10px;gap:10px}.r-att-head h2{font-size:19px}.r-pct{font-size:23px}.r-rank{width:36px;height:40px;font-size:18px}.r-att-body{padding:10px 14px 6px}.r-conclusion{padding:14px}.g-section > h2,.g-h2{font-size:22px}.ans{grid-template-columns:minmax(0,1fr) 64px 52px;gap:2px 8px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.g-att{padding:0 12px 12px}.g-att h3{margin:0 -12px 10px;padding:10px 12px}}',
    '@media (pointer:coarse){.g-nav a{padding:9px 14px;font-size:14px}details.indiv > summary{padding:14px 18px}table.sortable th{padding:12px 8px}}',
    '@page{size:A4;margin:12mm}',
    // print: white paper, colour kept for the accents (ribbon, borders, tints, bars), no heavy fills
    '@media print{body{background:#fff;font-size:12.5px}.page{max-width:none;padding:0}.rapport{border:0;box-shadow:none;border-radius:0;overflow:visible}' +
      '.r-hero,.g-hero{background:#fff;color:var(--ink);padding:16px 0 14px;border-bottom:2px solid var(--line)}.r-hero::before,.g-hero::before{height:5px}' +
      '.r-hero h1{color:var(--brand)}.r-kicker,.g-hero .r-kicker{color:var(--ink2)}.r-date{background:var(--brand-soft);border-color:var(--line2);color:var(--ink2)}.r-name{font-size:38px}.r-die{width:76px;height:76px;right:6px;filter:none}' +
      '.g-hero h1{color:var(--ink)}.g-hero .g-lead,.g-hero .r-note,.g-hero .kpi span{color:var(--ink2)}.g-hero .kpi{background:#fff;border-color:var(--line)}' +
      '.r-body{padding:14px 0 0}.r-dominant{box-shadow:none}.g-nav,.no-print{display:none!important}.g-section{border:0;box-shadow:none;padding:0 0 12px;break-inside:auto}details.indiv{border:0;break-before:page}details.indiv > summary{display:none}' +
      '.r-attente{margin-bottom:10px}.r-att-head{padding:10px 14px 8px}.r-att-body{padding:8px 14px 2px}.r-top{margin-bottom:14px}.r-conclusion{background:#fff}a{color:inherit;text-decoration:none}}'
  ].join('\n');

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function paragraphs(text, vars) {
    var t = core.fillPlaceholders(text || '', vars || {}).trim();
    if (!t) return '';
    return t.split(/\n\s*\n/).map(function (p) {
      return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function inline(text, vars) {
    return esc(core.fillPlaceholders(text || '', vars || {}));
  }

  function vars(config, respondent) {
    return {
      joueur: respondent ? respondent.name : '',
      nombre_attentes: config.attentes.length,
      questionnaire: config.titre || ''
    };
  }

  function attenteById(config) {
    var m = {};
    config.attentes.forEach(function (a) { m[a.id] = a; });
    return m;
  }

  function pct(v) {
    return typeof v === 'number' && isFinite(v) ? fmt(v) + ' %' : '—';
  }

  /** Ribbon of the attente colours (CSS custom property value), one segment each. */
  function confetti(config) {
    var cols = (config.attentes || []).map(function (a) { return a.couleur; }).filter(function (c) { return /^#[0-9a-fA-F]{3,8}$/.test(String(c || '')); });
    if (!cols.length) return '';
    return '--confetti:linear-gradient(90deg,' + cols.map(function (c, i) {
      return c + ' ' + fmt(100 * i / cols.length, 2).replace(',', '.') + '% ' + fmt(100 * (i + 1) / cols.length, 2).replace(',', '.') + '%';
    }).join(',') + ')';
  }

  /** CSS custom properties of one attente: colour, light tint, ink for text set on the colour. */
  function colorVars(c) {
    return '--c:' + esc(c) + ';--ct:' + charts.tint(c, 0.13) + ';--ci:' + charts.inkOn(c);
  }

  function pips(lvl) {
    var out = '<span class="pips" aria-hidden="true">';
    for (var i = 1; i <= lvl.total; i++) out += '<i' + (i <= lvl.number ? ' class="on"' : '') + '></i>';
    return out + '</span>';
  }

  function doc(title, body, extraHead) {
    return '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(title) + '</title>\n<style>\n' + CSS + '\n</style>\n' + (extraHead || '') +
      '</head>\n<body>\n' + body + '\n</body>\n</html>\n';
  }

  // ---------------------------------------------------------------------------
  // Individual report
  // ---------------------------------------------------------------------------

  function respondentRadar(config, r, size) {
    return charts.radar({
      axes: config.attentes.map(function (a) { return { label: a.nom, color: a.couleur }; }),
      series: [{
        values: config.attentes.map(function (a) { return r.scores[a.id]; }),
        color: '#5a3fd8', fill: 0.16, width: 2.5, dots: true, label: r.name
      }],
      size: size || 340,
      showValues: true,
      title: 'Profil de ' + r.name
    });
  }

  /** HTML fragment (an <article>) of one individual report. */
  function individualFragment(config, r, opts) {
    opts = opts || {};
    var R = config.rapport || {};
    var V = vars(config, r);
    var byId = attenteById(config);
    var h = [];
    h.push('<article class="rapport"' + (opts.id ? ' id="' + esc(opts.id) + '"' : '') + ' style="' + confetti(config) + '">');
    h.push('<header class="r-hero"><div class="r-hero-txt"><p class="r-kicker">' + esc(config.titre || '') + '</p><h1>' + inline(R.titre_rapport_individuel || 'Votre profil de joueur', V) + '</h1>' +
      '<p class="r-name">' + esc(r.name) + '</p>' +
      (r.timestamp ? '<p class="r-date">Réponses du ' + esc(r.timestamp.dateLabel || r.timestamp.label || r.timestamp.raw) + '</p>' : '') + '</div>' + D20 + '</header>');
    h.push('<div class="r-body">');
    if (R.introduction) h.push('<div class="r-intro">' + paragraphs(R.introduction, V) + '</div>');

    // radar + dominant block
    var domHtml;
    var dom = r.dominant || [];
    var domTitle = '<h2>' + inline(R.titre_profil_dominant || 'Votre attente principale', V) + '</h2>';
    if (dom.length === 1) {
      var a = byId[dom[0]];
      var lv = r.levels[a.id];
      domHtml = '<div class="r-dominant" style="--dom:' + esc(a.couleur) + ';--dom-t:' + charts.tint(a.couleur, 0.16) + ';' + colorVars(a.couleur) + '">' + domTitle +
        '<p class="r-dom-name"><span class="dot" style="background:' + esc(a.couleur) + '"></span>' + esc(a.nom) + '</p>' +
        (lv ? '<p class="r-dom-level">' + esc(lv.niveau.titre || '') + '</p>' : '') +
        '<div class="r-dom-score"><b>' + pct(r.scores[a.id]) + '</b>' + (lv ? '<span class="badge">Niveau ' + lv.number + '/' + lv.total + '</span>' + pips(lv) : '') + '</div>' +
        (a.description ? '<p class="r-dom-desc">' + esc(a.description) + '</p>' : '') + '</div>';
    } else if (dom.length > 1) {
      domHtml = '<div class="r-dominant">' + domTitle +
        '<p class="r-dom-name">Profil mixte</p>' +
        '<div class="r-dom-desc">' + paragraphs(R.texte_profil_mixte, V) + '</div><ul class="chips">' +
        dom.map(function (id) {
          var x = byId[id];
          return '<li class="chip"><span class="dot" style="background:' + esc(x.couleur) + '"></span>' + esc(x.nom) + ' · ' + pct(r.scores[id]) + '</li>';
        }).join('') + '</ul></div>';
    } else {
      domHtml = '<div class="r-dominant">' + domTitle +
        '<p class="r-dom-desc">Pas assez de réponses pour déterminer une attente principale.</p></div>';
    }
    h.push('<section class="r-top"><div class="r-radar">' + respondentRadar(config, r) + '</div>' + domHtml + '</section>');
    if (r.unanswered > 0) {
      h.push('<p class="r-note">' + r.unanswered + ' question' + (r.unanswered > 1 ? 's' : '') + ' sans réponse (ou réponse non reconnue) : ' + (r.unanswered > 1 ? 'elles comptent' : 'elle compte') + ' pour 0 point.</p>');
    }

    // one block per attente, highest score first (the hexagonal token shows the rank)
    (r.ranking || config.attentes.map(function (x) { return x.id; })).forEach(function (id, rank) {
      var at = byId[id];
      if (!at) return;
      var score = r.scores[id];
      var lvl = r.levels[id];
      var ticks = (at.niveaux || []).map(function (n) { return Number(n.a_partir_de); });
      h.push('<section class="r-attente" style="' + colorVars(at.couleur) + '">');
      h.push('<div class="r-att-head"><span class="r-rank" title="Rang ' + (rank + 1) + '">' + (rank + 1) + '</span><div class="r-att-titles"><span class="r-att-name"><span class="dot" style="background:' + esc(at.couleur) + '"></span>' + esc(at.nom) + '</span><h2>' + esc(at.titre || at.nom) + '</h2></div>' +
        '<span class="r-pct">' + pct(score) + '</span></div>');
      h.push('<div class="r-att-body"><div class="r-score">' + charts.scoreBar(score, at.couleur, { ticks: ticks }) +
        (lvl ? '<span class="r-lv"><span class="badge">Niveau ' + lvl.number + '/' + lvl.total + '</span>' + pips(lvl) + '</span>' : '<span class="badge">Score non calculable</span>') + '</div>');
      if (lvl) {
        h.push('<h3 class="r-level-title">' + esc(lvl.niveau.titre || '') + '</h3>');
        h.push('<div class="r-text">' + paragraphs(lvl.niveau.texte, V) + '</div>');
      }
      h.push('</div></section>');
    });
    if (R.conclusion) h.push('<div class="r-conclusion">' + paragraphs(R.conclusion, V) + '</div>');
    if (R.pied_de_page) h.push('<footer class="r-foot">' + inline(R.pied_de_page, V) + '</footer>');
    h.push('</div></article>');
    return h.join('\n');
  }

  /** Complete standalone HTML document for one player. */
  function individualHTML(config, r) {
    var R = config.rapport || {};
    var title = (R.titre_rapport_individuel || 'Rapport') + ' – ' + r.name;
    return doc(title, '<main class="page">' + individualFragment(config, r) + '</main>');
  }

  // ---------------------------------------------------------------------------
  // Global report
  // ---------------------------------------------------------------------------

  var SORT_SCRIPT = [
    '<script>',
    '(function(){',
    'function val(td){var v=td.getAttribute("data-v");if(v===null)return td.textContent.trim().toLowerCase();var n=parseFloat(v);return isNaN(n)?v.toLowerCase():n;}',
    'document.querySelectorAll("table.sortable").forEach(function(t){',
    ' t.querySelectorAll("th").forEach(function(th,i){',
    '  th.setAttribute("tabindex","0");',
    '  function go(){var asc=th.getAttribute("aria-sort")!=="ascending";t.querySelectorAll("th").forEach(function(o){o.removeAttribute("aria-sort");});th.setAttribute("aria-sort",asc?"ascending":"descending");',
    '   var tb=t.tBodies[0];var rows=Array.prototype.slice.call(tb.rows);',
    '   rows.sort(function(a,b){var x=val(a.cells[i]),y=val(b.cells[i]);if(x===y)return 0;if(x===""||x===-1)return 1;if(y===""||y===-1)return -1;return (x<y?-1:1)*(asc?1:-1);});',
    '   rows.forEach(function(r){tb.appendChild(r);});}',
    '  th.addEventListener("click",go);th.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});',
    ' });',
    '});',
    'function openTarget(id){var el=document.getElementById(id);if(!el)return;var d=el.closest?el.closest("details"):null;if(el.tagName==="DETAILS")d=el;if(d)d.open=true;el.scrollIntoView({behavior:"smooth",block:"start"});}',
    'document.addEventListener("click",function(e){var a=e.target.closest?e.target.closest("a[href^=\'#\']"):null;if(!a)return;var id=a.getAttribute("href").slice(1);if(!id)return;e.preventDefault();openTarget(id);});',
    'if(location.hash)openTarget(location.hash.slice(1));',
    '})();',
    '</script>'
  ].join('\n');

  /**
   * Global report document.
   * analysis: result of core.analyze(); opts: { fileName, warnings }
   */
  function globalHTML(config, analysis, opts) {
    opts = opts || {};
    var R = config.rapport || {};
    var V = vars(config, null);
    var stats = core.globalStats(config, analysis);
    var resp = analysis.respondents;
    var byId = attenteById(config);
    var h = [];
    h.push('<main class="page" style="' + confetti(config) + '">');
    h.push('<header class="g-section g-hero"><p class="r-kicker">' + esc(config.titre || '') + '</p><h1 style="margin:0 0 8px;font-size:32px">' + inline(R.titre_rapport_global || 'Synthèse des réponses', V) + '</h1>');
    if (R.introduction_rapport_global) h.push('<div class="g-lead">' + paragraphs(R.introduction_rapport_global, V) + '</div>');
    var period = '—';
    if (stats.first && stats.last) {
      period = stats.first.dateLabel === stats.last.dateLabel ? 'le ' + stats.first.dateLabel : 'du ' + stats.first.dateLabel + ' au ' + stats.last.dateLabel;
    }
    h.push('<div class="kpis">' +
      '<div class="kpi"><b>' + stats.count + '</b><span>répondant' + (stats.count > 1 ? 's' : '') + '</span></div>' +
      '<div class="kpi"><b style="font-size:17px;line-height:2">' + esc(period) + '</b><span>période des réponses</span></div>' +
      '<div class="kpi"><b>' + config.questions.length + '</b><span>questions</span></div>' +
      '<div class="kpi"><b>' + config.attentes.length + '</b><span>attentes ludiques</span></div>' +
      '</div>');
    if (opts.fileName) h.push('<p class="r-note" style="margin:12px 0 0">Fichier analysé : ' + esc(opts.fileName) + '</p>');
    h.push('</header>');

    h.push('<nav class="g-nav no-print"><a href="#profil-moyen">Profil moyen</a><a href="#principales">Attentes principales</a><a href="#attentes">Détail par attente</a><a href="#correlations">Corrélations</a><a href="#questions">Réponses par question</a><a href="#repondants">Tous les répondants</a><a href="#individuels">Rapports individuels</a>' + ((opts.warnings || []).length ? '<a href="#donnees">Points d’attention</a>' : '') + '</nav>');

    if (!resp.length) {
      h.push('<section class="g-section"><p>Aucune réponse à analyser.</p></section></main>');
      return doc(R.titre_rapport_global || 'Synthèse', h.join('\n'));
    }

    // Average radar
    var axes = config.attentes.map(function (a) { return { label: a.nom, color: a.couleur }; });
    var series = resp.map(function (r) {
      return { values: config.attentes.map(function (a) { return r.scores[a.id]; }), color: '#8f86c4', fill: 0, stroke: 0.32, width: 1, label: r.name };
    });
    series.push({ values: config.attentes.map(function (a) { return stats.perAttente[a.id].mean; }), color: '#5a3fd8', fill: 0.18, width: 3, dots: true, label: 'Moyenne' });
    h.push('<section class="g-section" id="profil-moyen"><h2>Profil moyen</h2><p class="g-lead">En violet foncé : la moyenne du groupe. En violet clair : le profil de chaque répondant.</p>' +
      '<div style="text-align:center">' + charts.radar({ axes: axes, series: series, size: 380, showValues: true, title: 'Profil moyen du groupe' }) + '</div>' +
      '<div class="legend" style="justify-content:center"><span><span class="dot" style="background:#5a3fd8"></span>Moyenne du groupe</span><span><span class="dot" style="background:#bdb7de"></span>Répondants (un trait chacun)</span></div></section>');

    // Dominant profiles
    var domItems = config.attentes.map(function (a) {
      var c = stats.perAttente[a.id].dominantCount;
      return { label: a.nom, value: c, color: a.couleur, text: c + ' (' + fmt(100 * c / stats.count) + ' %)' };
    });
    domItems.push({ label: 'Profil mixte (égalité)', value: stats.mixedCount, color: '#8c88a8', text: stats.mixedCount + ' (' + fmt(100 * stats.mixedCount / stats.count) + ' %)' });
    if (stats.undetermined) domItems.push({ label: 'Indéterminé', value: stats.undetermined, color: '#c9c6da', text: String(stats.undetermined) });
    var mixedList = Object.keys(stats.mixed).sort(function (x, y) { return stats.mixed[y] - stats.mixed[x]; }).map(function (k) {
      return '<li class="chip">' + esc(k.split('+').map(function (id) { return byId[id] ? byId[id].nom : id; }).join(' + ')) + ' · ' + stats.mixed[k] + '</li>';
    }).join('');
    h.push('<section class="g-section" id="principales"><h2>Attentes principales</h2><p class="g-lead">Nombre de répondants pour lesquels chaque attente arrive seule en tête.</p>' +
      charts.hbars({ items: domItems, labelWidth: 170, width: 620, title: 'Attentes principales' }) +
      (mixedList ? '<p class="subhead">Détail des profils mixtes</p><ul class="chips">' + mixedList + '</ul>' : '') + '</section>');

    // Per attente
    h.push('<section class="g-section" id="attentes"><h2>Détail par attente</h2><p class="g-lead">Statistiques des scores (en %), répartition par tranches de 10 points et par niveau.</p><div class="g-grid">');
    config.attentes.forEach(function (a) {
      var s = stats.perAttente[a.id];
      var nv = a.niveaux || [];
      var levelsRows = nv.map(function (n, i) {
        var c = s.levels[i] || 0;
        var p = stats.count ? 100 * c / stats.count : 0;
        var upper = i + 1 < nv.length ? nv[i + 1].a_partir_de : 100;
        return '<tr><td style="width:46%"><b>' + (i + 1) + '.</b> ' + esc(n.titre || '') + ' <span style="color:var(--muted);font-size:11.5px">(' + fmt(Number(n.a_partir_de)) + '–' + fmt(Number(upper)) + ' %)</span></td>' +
          '<td><div class="lvbar"><i style="width:' + fmt(p, 1).replace(',', '.') + '%;background:' + esc(a.couleur) + '"></i></div></td>' +
          '<td class="n">' + c + ' (' + fmt(p) + ' %)</td></tr>';
      }).join('');
      h.push('<div class="g-att" style="' + colorVars(a.couleur) + '"><h3><span class="dot" style="background:' + esc(a.couleur) + '"></span>' + esc(a.nom) + '</h3>' +
        (analysis.max && analysis.max[a.id] === 0 ? '<p class="warn">Aucune réponse ne donne de points à cette attente : score non calculable.</p>' : '') +
        '<table class="stats"><tr><td>Moyenne</td><td>' + pct(s.mean) + '</td><td style="width:16px"></td><td>Écart-type</td><td>' + (s.std === null ? '—' : fmt(s.std, 1)) + '</td></tr>' +
        '<tr><td>Médiane</td><td>' + pct(s.median) + '</td><td></td><td>Min – max</td><td>' + (s.min === null ? '—' : fmt(s.min) + ' – ' + fmt(s.max) + ' %') + '</td></tr></table>' +
        '<p class="subhead">Répartition des scores</p>' + charts.histogram(s.histogram, a.couleur, { title: 'Histogramme – ' + a.nom }) +
        '<p class="subhead">Répartition par niveau</p><table class="levels">' + levelsRows + '</table></div>');
    });
    h.push('</div></section>');

    // Correlations
    h.push('<section class="g-section" id="correlations"><h2>Corrélations entre attentes</h2><p class="g-lead">Proche de +1 : les deux attentes ont tendance à être fortes chez les mêmes joueurs. Proche de −1 : quand l’une est forte, l’autre est faible. Proche de 0 : pas de lien. Avec peu de répondants, ces valeurs sont à prendre avec prudence.</p>' +
      '<div style="text-align:center">' + charts.heatmap(stats.correlation, axes, { title: 'Corrélations entre attentes' }) + '</div></section>');

    // Questions
    h.push('<section class="g-section" id="questions"><h2>Réponses par question</h2><p class="g-lead">Pour chaque question : nombre de répondants ayant choisi chaque réponse, et les attentes que cette réponse alimente (points entre parenthèses). Une réponse jamais choisie, ou choisie par presque tout le monde, apporte peu d’information : c’est une piste pour améliorer le questionnaire.</p>');
    config.questions.forEach(function (q, qi) {
      var qs = stats.questions[qi];
      var total = stats.count || 1;
      var rows = (q.reponses || []).map(function (rep, ai) {
        var c = qs.counts[ai];
        var p = 100 * c / total;
        var chips = Object.keys(rep.poids || {}).filter(function (k) { return Number(rep.poids[k]) !== 0; }).map(function (k) {
          var at = byId[k];
          return '<span class="wchip"><span class="dot" style="width:8px;height:8px;background:' + esc(at ? at.couleur : '#999') + '"></span>' + esc(at ? at.nom : k) + ' (' + fmt(Number(rep.poids[k]), 1) + ')</span>';
        }).join('');
        var flag = c === 0 ? '<span class="flag">jamais choisie</span>' : (p >= 80 && stats.count >= 5 ? '<span class="flag">très majoritaire</span>' : '');
        return '<div class="ans"><div>' + esc(rep.texte) + flag + '<div class="w">' + (chips || '<span class="wchip">aucun point</span>') + '</div></div>' +
          '<div class="bar"><i style="width:' + fmt(p, 1).replace(',', '.') + '%"></i></div><div class="cnt">' + c + ' · ' + fmt(p) + ' %</div></div>';
      }).join('');
      if (qs.none) rows += '<div class="ans" style="color:var(--muted)"><div><i>Sans réponse ou réponse non reconnue</i></div><div class="bar"><i style="width:' + fmt(100 * qs.none / total, 1).replace(',', '.') + '%;background:#c9c6da"></i></div><div class="cnt">' + qs.none + ' · ' + fmt(100 * qs.none / total) + ' %</div></div>';
      h.push('<div class="q"><h3><small>Q' + (qi + 1) + '</small>' + esc(q.texte) + '</h3>' + rows + '</div>');
    });
    h.push('</section>');

    // Table of respondents
    var head = '<tr><th>Répondant</th><th>Date</th>' + config.attentes.map(function (a) {
      return '<th><span class="dot" style="background:' + esc(a.couleur) + ';margin-right:5px"></span>' + esc(a.nom) + '</th>';
    }).join('') + '<th>Attente principale</th></tr>';
    var body = resp.map(function (r) {
      return '<tr><td data-v="' + esc(r.name.toLowerCase()) + '"><a href="#r-' + r.index + '">' + esc(r.name) + '</a></td>' +
        '<td data-v="' + esc(r.timestamp ? r.timestamp.key : '') + '">' + esc(r.timestamp ? (r.timestamp.label || r.timestamp.raw) : '') + '</td>' +
        config.attentes.map(function (a) {
          var v = r.scores[a.id];
          return '<td class="num" data-v="' + (typeof v === 'number' ? v.toFixed(3) : '-1') + '">' + pct(v) + '</td>';
        }).join('') +
        '<td>' + esc(r.dominant.length === 1 ? byId[r.dominant[0]].nom : (r.dominant.length > 1 ? 'Mixte : ' + r.dominant.map(function (id) { return byId[id].nom; }).join(' + ') : '—')) + '</td></tr>';
    }).join('');
    h.push('<section class="g-section" id="repondants"><h2>Tous les répondants</h2><p class="g-lead">Cliquez sur un titre de colonne pour trier ; cliquez sur un nom pour ouvrir son rapport individuel.</p><div class="tbl-wrap"><table class="sortable"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div></section>');

    // Data warnings
    if ((opts.warnings || []).length) {
      h.push('<section class="g-section" id="donnees"><h2>Points d’attention sur les données</h2>' + opts.warnings.map(function (w) {
        return '<div class="warn' + (w.level === 'info' ? ' info' : '') + '">' + esc(w.message) + '</div>';
      }).join('') + '</section>');
    }

    // Individual reports
    h.push('<section id="individuels"><h2 class="g-h2" style="margin:28px 0 14px">Rapports individuels</h2>');
    resp.forEach(function (r) {
      h.push('<details class="indiv" id="r-' + r.index + '"><summary>' + esc(r.name) + (r.timestamp ? ' <span style="color:var(--muted);font-weight:400">– ' + esc(r.timestamp.label || r.timestamp.raw) + '</span>' : '') + '</summary>' +
        individualFragment(config, r) + '</details>');
    });
    h.push('</section></main>');
    return doc(R.titre_rapport_global || 'Synthèse des réponses', h.join('\n') + SORT_SCRIPT);
  }

  return {
    CSS: CSS,
    FONT_WOFF2: FONT_WOFF2,
    individualFragment: individualFragment,
    individualHTML: individualHTML,
    globalHTML: globalHTML,
    paragraphs: paragraphs
  };
});
