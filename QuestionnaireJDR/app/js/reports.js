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

  var CSS = [
    ':root{--paper:#f7f2e8;--card:#fffdf8;--ink:#2a2320;--ink2:#5c5048;--muted:#8a7d72;--line:#e6dccb;--accent:#8e3b1f;--brass:#a8792a;}',
    '*{box-sizing:border-box}',
    'html{-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    "body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 'Segoe UI',system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif}",
    ".serif,h1,h2,h3{font-family:'Palatino Linotype','Book Antiqua',Palatino,'Iowan Old Style',Georgia,serif}",
    '.page{max-width:860px;margin:0 auto;padding:32px 28px 48px}',
    '.rapport{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:36px 40px;box-shadow:0 1px 2px rgba(60,40,20,.05),0 8px 24px rgba(60,40,20,.06)}',
    '.r-head{border-bottom:2px solid var(--ink);padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}',
    '.r-kicker{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:0 0 4px}',
    '.r-head h1{font-size:30px;line-height:1.15;margin:0}',
    '.r-who{text-align:right}',
    '.r-name{font-family:inherit;font-size:20px;font-weight:700;margin:0}',
    '.r-date{color:var(--muted);font-size:13px;margin:2px 0 0}',
    '.r-intro{color:var(--ink2);margin:0 0 18px}',
    '.r-intro p,.r-text p{margin:0 0 .7em}',
    '.r-top{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:24px;align-items:center;margin:8px 0 26px;break-inside:avoid;page-break-inside:avoid}',
    '.r-radar{text-align:center}',
    '.r-dominant{border-radius:12px;padding:20px 22px;background:#fbf6ec;border:1px solid var(--line);border-top:6px solid var(--dom,#8e3b1f)}',
    '.r-dominant h2{font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;font-family:inherit;font-weight:600}',
    '.r-dom-name{font-size:28px;font-weight:700;margin:0;line-height:1.15}',
    '.r-dom-level{font-size:17px;margin:6px 0 10px;color:var(--ink2);font-style:italic}',
    '.r-dom-desc{font-size:14px;color:var(--ink2);margin:0}',
    '.chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;padding:0;list-style:none}',
    '.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:3px 10px 3px 8px;font-size:13px}',
    '.dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none}',
    '.r-note{font-size:12.5px;color:var(--muted);margin:-12px 0 18px}',
    '.r-attente{border:1px solid var(--line);border-left:6px solid var(--c,#888);border-radius:10px;padding:18px 22px 10px;margin:0 0 16px;break-inside:avoid;page-break-inside:avoid;background:#fff}',
    '.r-att-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap}',
    '.r-att-head h2{font-size:21px;margin:0}',
    '.r-att-name{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);font-weight:600;display:inline-flex;align-items:center;gap:6px}',
    '.r-score{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;margin:10px 0 8px}',
    '.r-pct{font-weight:700;font-size:18px;min-width:56px;text-align:right}',
    '.badge{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;border:1px solid var(--line);background:#f6efe2;color:var(--ink);white-space:nowrap}',
    '.r-level-title{font-size:17px;margin:4px 0 6px}',
    '.r-text{color:var(--ink2)}',
    '.r-desc{font-size:13px;color:var(--muted);margin:0 0 6px}',
    '.r-conclusion{margin:24px 0 0;padding:18px 22px;border-radius:10px;background:#fbf6ec;border:1px dashed #d6c7ad}',
    '.r-foot{margin-top:22px;padding-top:10px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);text-align:center}',
    // global report
    '.g-nav{position:sticky;top:0;z-index:5;background:rgba(247,242,232,.95);backdrop-filter:blur(4px);border-bottom:1px solid var(--line);padding:8px 0;margin:-8px 0 20px;display:flex;gap:6px;flex-wrap:wrap}',
    '.g-nav a{font-size:13px;color:var(--ink);text-decoration:none;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--card)}',
    '.g-nav a:hover{border-color:var(--accent);color:var(--accent)}',
    '.g-section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px 28px;margin:0 0 20px}',
    '.g-section > h2{font-size:23px;margin:0 0 4px}',
    '.g-lead{color:var(--ink2);margin:0 0 16px;font-size:14px}',
    '.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0 0}',
    '.kpi{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:#fff}',
    '.kpi b{display:block;font-size:24px;font-family:inherit}',
    '.kpi span{font-size:12.5px;color:var(--muted)}',
    '.g-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}',
    '.g-att{border:1px solid var(--line);border-top:5px solid var(--c,#888);border-radius:10px;padding:14px 16px;background:#fff;break-inside:avoid;page-break-inside:avoid}',
    '.g-att h3{margin:0 0 6px;font-size:18px;display:flex;align-items:center;gap:8px}',
    '.stats{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0 8px}',
    '.stats td{padding:2px 4px;border-bottom:1px solid #f0e8da}',
    '.stats td:last-child{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}',
    '.subhead{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:10px 0 2px;font-weight:600}',
    '.levels{width:100%;border-collapse:collapse;font-size:13px}',
    '.levels td{padding:3px 4px;border-bottom:1px solid #f0e8da;vertical-align:middle}',
    '.levels td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.lvbar{height:8px;border-radius:4px;background:#efe7da;overflow:hidden;min-width:60px}',
    '.lvbar i{display:block;height:100%;border-radius:4px}',
    '.q{border-top:1px solid var(--line);padding:14px 0 8px;break-inside:avoid;page-break-inside:avoid}',
    '.q:first-of-type{border-top:0}',
    '.q h3{font-size:16px;margin:0 0 8px;font-family:inherit;font-weight:600}',
    '.q h3 small{color:var(--muted);font-weight:400;margin-right:6px}',
    '.ans{display:grid;grid-template-columns:minmax(0,1fr) 170px 74px;gap:4px 12px;align-items:center;font-size:13.5px;padding:3px 0}',
    '.ans .bar{height:12px;border-radius:3px;background:#efe7da;overflow:hidden}',
    '.ans .bar i{display:block;height:100%;background:#7a6a5c;border-radius:3px}',
    '.ans .cnt{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink2)}',
    '.ans .w{display:flex;gap:4px;flex-wrap:wrap;margin-top:2px}',
    '.wchip{font-size:11px;border-radius:999px;padding:0 7px;border:1px solid var(--line);background:#fff;display:inline-flex;gap:4px;align-items:center;color:var(--ink2)}',
    '.flag{font-size:11px;color:#9a3412;background:#fdecdf;border-radius:4px;padding:0 6px;margin-left:6px}',
    '.tbl-wrap{overflow-x:auto}',
    'table.sortable{width:100%;border-collapse:collapse;font-size:13.5px}',
    'table.sortable th{position:sticky;top:0;background:#f3ebdd;text-align:left;padding:8px;border-bottom:2px solid #d9cab0;cursor:pointer;white-space:nowrap;user-select:none}',
    'table.sortable th[aria-sort=ascending]::after{content:" ▲";font-size:10px}',
    'table.sortable th[aria-sort=descending]::after{content:" ▼";font-size:10px}',
    'table.sortable td{padding:6px 8px;border-bottom:1px solid #f0e8da;white-space:nowrap}',
    'table.sortable td.num{text-align:right;font-variant-numeric:tabular-nums}',
    'table.sortable tr:hover td{background:#fbf6ec}',
    'a{color:var(--accent)}',
    '.g-section[id],details.indiv{scroll-margin-top:96px}',
    'details.indiv{margin:0 0 12px;border:1px solid var(--line);border-radius:12px;background:var(--card)}',
    'details.indiv > summary{cursor:pointer;padding:12px 18px;font-weight:600;list-style-position:inside}',
    'details.indiv[open] > summary{border-bottom:1px solid var(--line)}',
    'details.indiv .rapport{border:0;box-shadow:none;border-radius:0}',
    '.warn{border-left:4px solid #c2410c;background:#fff7ed;padding:8px 12px;border-radius:6px;margin:6px 0;font-size:13.5px}',
    '.warn.info{border-left-color:#7a6a5c;background:#f8f4ec}',
    '.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--ink2);margin:6px 0 0}',
    '.legend span{display:inline-flex;gap:6px;align-items:center}',
    '@media (max-width:700px){.page{padding:16px}.rapport{padding:20px 18px}.r-top{grid-template-columns:1fr}.r-who{text-align:left}.ans{grid-template-columns:1fr 90px 60px}.g-grid{grid-template-columns:1fr}}',
    // phones: more room for the text, readable titles, tap-friendly links
    '@media (max-width:480px){body{font-size:15.5px}.page{padding:8px 6px 24px}.rapport{padding:18px 14px;border-radius:10px}.g-section{padding:18px 14px;border-radius:10px}.r-head h1{font-size:25px}.r-dom-name{font-size:24px}.r-attente{padding:14px 14px 8px}.r-conclusion{padding:14px}.g-section > h2{font-size:21px}.ans{grid-template-columns:minmax(0,1fr) 64px 52px;gap:2px 8px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.g-att{padding:12px}}',
    '@media (pointer:coarse){.g-nav a{padding:9px 14px;font-size:14px}details.indiv > summary{padding:14px 18px}table.sortable th{padding:12px 8px}}',
    '@page{size:A4;margin:12mm}',
    '@media print{body{background:#fff;font-size:12.5px}.page{max-width:none;padding:0}.rapport{border:0;box-shadow:none;padding:0}.g-nav,.no-print{display:none!important}.g-section{border:0;padding:0 0 12px;break-inside:auto}details.indiv{border:0;break-before:page}details.indiv > summary{display:none}.r-attente{padding:12px 16px 4px;margin-bottom:10px}.r-top{margin-bottom:14px}a{color:inherit;text-decoration:none}}'
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
        color: '#5c3d2e', fill: 0.12, width: 2.5, dots: true, label: r.name
      }],
      size: size || 300,
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
    h.push('<article class="rapport"' + (opts.id ? ' id="' + esc(opts.id) + '"' : '') + '>');
    h.push('<header class="r-head"><div><p class="r-kicker">' + esc(config.titre || '') + '</p><h1>' + inline(R.titre_rapport_individuel || 'Votre profil de joueur', V) + '</h1></div>');
    h.push('<div class="r-who"><p class="r-name serif">' + esc(r.name) + '</p>' +
      (r.timestamp ? '<p class="r-date">Réponses du ' + esc(r.timestamp.dateLabel || r.timestamp.label || r.timestamp.raw) + '</p>' : '') + '</div></header>');
    if (R.introduction) h.push('<div class="r-intro">' + paragraphs(R.introduction, V) + '</div>');

    // radar + dominant block
    var domHtml;
    var dom = r.dominant || [];
    if (dom.length === 1) {
      var a = byId[dom[0]];
      var lv = r.levels[a.id];
      domHtml = '<div class="r-dominant" style="--dom:' + esc(a.couleur) + '"><h2>' + inline(R.titre_profil_dominant || 'Votre attente principale', V) + '</h2>' +
        '<p class="r-dom-name serif"><span class="dot" style="background:' + esc(a.couleur) + ';width:14px;height:14px;margin-right:8px;vertical-align:2px"></span>' + esc(a.nom) + '</p>' +
        (lv ? '<p class="r-dom-level serif">' + esc(lv.niveau.titre || '') + ' — ' + pct(r.scores[a.id]) + '</p>' : '') +
        (a.description ? '<p class="r-dom-desc">' + esc(a.description) + '</p>' : '') + '</div>';
    } else if (dom.length > 1) {
      domHtml = '<div class="r-dominant"><h2>' + inline(R.titre_profil_dominant || 'Votre attente principale', V) + '</h2>' +
        '<p class="r-dom-name serif">Profil mixte</p>' +
        '<div class="r-dom-desc">' + paragraphs(R.texte_profil_mixte, V) + '</div><ul class="chips">' +
        dom.map(function (id) {
          var x = byId[id];
          return '<li class="chip"><span class="dot" style="background:' + esc(x.couleur) + '"></span>' + esc(x.nom) + ' · ' + pct(r.scores[id]) + '</li>';
        }).join('') + '</ul></div>';
    } else {
      domHtml = '<div class="r-dominant"><h2>' + inline(R.titre_profil_dominant || 'Votre attente principale', V) + '</h2>' +
        '<p class="r-dom-desc">Pas assez de réponses pour déterminer une attente principale.</p></div>';
    }
    h.push('<section class="r-top"><div class="r-radar">' + respondentRadar(config, r) + '</div>' + domHtml + '</section>');
    if (r.unanswered > 0) {
      h.push('<p class="r-note">' + r.unanswered + ' question' + (r.unanswered > 1 ? 's' : '') + ' sans réponse (ou réponse non reconnue) : ' + (r.unanswered > 1 ? 'elles comptent' : 'elle compte') + ' pour 0 point.</p>');
    }

    // one block per attente, highest score first
    (r.ranking || config.attentes.map(function (x) { return x.id; })).forEach(function (id) {
      var at = byId[id];
      if (!at) return;
      var score = r.scores[id];
      var lvl = r.levels[id];
      var ticks = (at.niveaux || []).map(function (n) { return Number(n.a_partir_de); });
      h.push('<section class="r-attente" style="--c:' + esc(at.couleur) + '">');
      h.push('<div class="r-att-head"><h2>' + esc(at.titre || at.nom) + '</h2><span class="r-att-name"><span class="dot" style="background:' + esc(at.couleur) + '"></span>' + esc(at.nom) + '</span></div>');
      h.push('<div class="r-score">' + charts.scoreBar(score, at.couleur, { ticks: ticks }) +
        '<span class="r-pct">' + pct(score) + '</span>' +
        (lvl ? '<span class="badge">Niveau ' + lvl.number + '/' + lvl.total + '</span>' : '<span class="badge">Score non calculable</span>') + '</div>');
      if (lvl) {
        h.push('<h3 class="r-level-title">' + esc(lvl.niveau.titre || '') + '</h3>');
        h.push('<div class="r-text">' + paragraphs(lvl.niveau.texte, V) + '</div>');
      }
      h.push('</section>');
    });
    if (R.conclusion) h.push('<div class="r-conclusion">' + paragraphs(R.conclusion, V) + '</div>');
    if (R.pied_de_page) h.push('<footer class="r-foot">' + inline(R.pied_de_page, V) + '</footer>');
    h.push('</article>');
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
    h.push('<main class="page">');
    h.push('<header class="g-section"><p class="r-kicker">' + esc(config.titre || '') + '</p><h1 style="margin:0 0 8px;font-size:32px">' + inline(R.titre_rapport_global || 'Synthèse des réponses', V) + '</h1>');
    if (R.introduction_rapport_global) h.push('<div class="g-lead">' + paragraphs(R.introduction_rapport_global, V) + '</div>');
    var period = '—';
    if (stats.first && stats.last) {
      period = stats.first.dateLabel === stats.last.dateLabel ? 'le ' + stats.first.dateLabel : 'du ' + stats.first.dateLabel + ' au ' + stats.last.dateLabel;
    }
    h.push('<div class="kpis">' +
      '<div class="kpi"><b>' + stats.count + '</b><span>répondant' + (stats.count > 1 ? 's' : '') + '</span></div>' +
      '<div class="kpi"><b style="font-size:16px;line-height:1.9">' + esc(period) + '</b><span>période des réponses</span></div>' +
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
      return { values: config.attentes.map(function (a) { return r.scores[a.id]; }), color: '#7a6a5c', fill: 0, stroke: 0.22, width: 1, label: r.name };
    });
    series.push({ values: config.attentes.map(function (a) { return stats.perAttente[a.id].mean; }), color: '#8e3b1f', fill: 0.18, width: 3, dots: true, label: 'Moyenne' });
    h.push('<section class="g-section" id="profil-moyen"><h2>Profil moyen</h2><p class="g-lead">En couleur : la moyenne du groupe. En gris clair : le profil de chaque répondant.</p>' +
      '<div style="text-align:center">' + charts.radar({ axes: axes, series: series, size: 380, showValues: true, title: 'Profil moyen du groupe' }) + '</div>' +
      '<div class="legend" style="justify-content:center"><span><span class="dot" style="background:#8e3b1f"></span>Moyenne du groupe</span><span><span class="dot" style="background:#c9beb2"></span>Répondants (un trait chacun)</span></div></section>');

    // Dominant profiles
    var domItems = config.attentes.map(function (a) {
      var c = stats.perAttente[a.id].dominantCount;
      return { label: a.nom, value: c, color: a.couleur, text: c + ' (' + fmt(100 * c / stats.count) + ' %)' };
    });
    domItems.push({ label: 'Profil mixte (égalité)', value: stats.mixedCount, color: '#9a8b7c', text: stats.mixedCount + ' (' + fmt(100 * stats.mixedCount / stats.count) + ' %)' });
    if (stats.undetermined) domItems.push({ label: 'Indéterminé', value: stats.undetermined, color: '#c9beb2', text: String(stats.undetermined) });
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
      h.push('<div class="g-att" style="--c:' + esc(a.couleur) + '"><h3 class="serif"><span class="dot" style="background:' + esc(a.couleur) + '"></span>' + esc(a.nom) + '</h3>' +
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
      if (qs.none) rows += '<div class="ans" style="color:var(--muted)"><div><i>Sans réponse ou réponse non reconnue</i></div><div class="bar"><i style="width:' + fmt(100 * qs.none / total, 1).replace(',', '.') + '%;background:#c9beb2"></i></div><div class="cnt">' + qs.none + ' · ' + fmt(100 * qs.none / total) + ' %</div></div>';
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
    h.push('<section id="individuels"><h2 class="serif" style="font-size:23px;margin:28px 0 12px">Rapports individuels</h2>');
    resp.forEach(function (r) {
      h.push('<details class="indiv" id="r-' + r.index + '"><summary>' + esc(r.name) + (r.timestamp ? ' <span style="color:var(--muted);font-weight:400">– ' + esc(r.timestamp.label || r.timestamp.raw) + '</span>' : '') + '</summary>' +
        individualFragment(config, r) + '</details>');
    });
    h.push('</section></main>');
    return doc(R.titre_rapport_global || 'Synthèse des réponses', h.join('\n') + SORT_SCRIPT);
  }

  return {
    CSS: CSS,
    individualFragment: individualFragment,
    individualHTML: individualHTML,
    globalHTML: globalHTML,
    paragraphs: paragraphs
  };
});
