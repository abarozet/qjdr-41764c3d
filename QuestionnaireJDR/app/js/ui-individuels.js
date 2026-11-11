/* ui-individuels.js — "Rapports individuels" tab: list, preview, exports. */
(function (QJ) {
  'use strict';
  var h = QJ.util.h;
  var util = QJ.util;
  var store = QJ.store;
  var core = QJ.core;

  var panel;
  var selected = 0;    // index in respondents array
  var filter = '';
  var stale = true;
  var listOpen = false; // narrow screens: the list of players is folded by default

  function noData() {
    util.clear(panel);
    panel.appendChild(h('div', { class: 'card empty' },
      h('h2', null, 'Aucune réponse chargée'),
      h('p', null, 'Chargez d’abord le fichier des réponses dans l’onglet « Données ».'),
      h('button', { class: 'btn primary', type: 'button', onclick: function () { QJ.main.showTab('donnees'); } }, 'Aller à l’onglet Données')));
  }

  function fileNames(resp) {
    return core.uniqueFileNames(resp, 'Rapport - ', '.html');
  }

  function fileNameOf(r) {
    var idx = store.state.analysis.respondents.indexOf(r);
    return fileNames(store.state.analysis.respondents)[idx];
  }

  function exportOne(r) {
    util.downloadText(QJ.reports.individualHTML(store.state.config, r), fileNameOf(r), 'text/html');
  }

  function shareOne(r) {
    util.shareText(QJ.reports.individualHTML(store.state.config, r), fileNameOf(r), 'text/html', 'Rapport de ' + r.name)
      .catch(function (e) { util.toast('Partage impossible : ' + (e && e.message ? e.message : e) + ' Utilisez « Exporter ».', true); });
  }

  function exportAll() {
    store.flush();
    var resp = store.state.analysis.respondents;
    var names = fileNames(resp);
    var zip = new JSZip();
    var folder = zip.folder('Rapports individuels');
    resp.forEach(function (r, i) { folder.file(names[i], QJ.reports.individualHTML(store.state.config, r)); });
    util.toast('Préparation de l’archive…');
    zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(function (blob) {
      util.downloadBlob(blob, 'Rapports individuels.zip');
    });
  }

  function render() {
    stale = false;
    var a = store.state.analysis;
    if (!a || !a.respondents.length) { noData(); return; }
    var cfg = store.state.config;
    var resp = a.respondents;
    if (selected >= resp.length) selected = 0;
    var byId = {};
    cfg.attentes.forEach(function (x) { byId[x.id] = x; });

    util.clear(panel);
    var list = h('ul', { class: 'plist', 'data-testid': 'liste-repondants' });
    var search = h('input', { type: 'search', placeholder: 'Rechercher un joueur…', value: filter, 'aria-label': 'Rechercher un joueur' });
    function fillList() {
      util.clear(list);
      var f = core.normalize(filter);
      resp.forEach(function (r, i) {
        if (f && core.normalize(r.name).indexOf(f) === -1) return;
        var dom = r.dominant.length === 1 ? byId[r.dominant[0]] : null;
        var sub = (r.timestamp ? (r.timestamp.label || r.timestamp.raw) : '') +
          (r.dominant.length === 1 ? ' · ' + dom.nom : r.dominant.length > 1 ? ' · Profil mixte' : '');
        list.appendChild(h('li', null, h('button', {
          type: 'button', 'aria-current': i === selected ? 'true' : 'false',
          onclick: function () { selected = i; listOpen = false; render(); }
        },
          h('span', { class: 'dot', style: { background: dom ? dom.couleur : (r.dominant.length > 1 ? 'conic-gradient(' + r.dominant.map(function (id, k) { return byId[id].couleur + ' ' + (k * 100 / r.dominant.length) + '% ' + ((k + 1) * 100 / r.dominant.length) + '%'; }).join(',') + ')' : '#c9beb2') } }),
          h('span', { class: 'nm' }, r.name),
          h('span', { class: 'sub' }, sub))));
      });
    }
    search.addEventListener('input', function () { filter = search.value; fillList(); });
    fillList();

    var r = resp[selected];
    var side = h('aside', { class: 'card side' + (listOpen ? ' open' : ''), 'data-testid': 'side-repondants' },
      h('button', { class: 'side-toggle', type: 'button', 'aria-expanded': listOpen ? 'true' : 'false', 'data-testid': 'btn-liste-repondants',
        onclick: function () { listOpen = !listOpen; side.classList.toggle('open', listOpen); this.setAttribute('aria-expanded', listOpen ? 'true' : 'false'); if (listOpen) search.focus(); } },
        h('span', { class: 'grow' }, h('b', null, 'Joueurs'), ' (' + resp.length + ')', h('span', { class: 'cur' }, ' · ' + r.name)),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '▾')),
      h('div', { class: 'side-body' },
        h('div', { class: 'row side-head', style: { marginBottom: '8px' } },
          h('b', { class: 'grow' }, resp.length + ' répondant' + (resp.length > 1 ? 's' : ''))),
        search, list,
        h('button', { class: 'btn', type: 'button', style: { marginTop: '10px', justifyContent: 'center' }, 'data-testid': 'btn-export-zip', onclick: exportAll }, 'Tout exporter (ZIP)')));

    var frame = h('iframe', { class: 'viewer', title: 'Rapport de ' + r.name, 'data-testid': 'frame-individuel' });
    var tools = h('div', { class: 'toolbar' },
      h('span', { class: 'title' }, r.name),
      h('span', { class: 'nav-pair' },
        h('button', { class: 'btn icon', type: 'button', onclick: function () { if (selected > 0) { selected--; render(); } }, disabled: selected === 0, 'aria-label': 'Répondant précédent' }, '‹'),
        h('span', { class: 'pos small muted' }, (selected + 1) + ' / ' + resp.length),
        h('button', { class: 'btn icon', type: 'button', onclick: function () { if (selected < resp.length - 1) { selected++; render(); } }, disabled: selected >= resp.length - 1, 'aria-label': 'Répondant suivant' }, '›')),
      h('span', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-export-un', onclick: function () { exportOne(r); } }, 'Exporter ce rapport (.html)'),
        util.canShareFiles('text/html') ? h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-partager-un', onclick: function () { shareOne(r); } }, 'Partager…') : null,
        h('button', { class: 'btn primary', type: 'button', 'data-testid': 'btn-imprimer-un', onclick: function () {
          util.printReport(frame, QJ.reports.individualHTML(store.state.config, r));
        } }, 'Imprimer / PDF')));
    var main = h('div', null, tools, frame);
    panel.appendChild(h('div', { class: 'split' }, side, main));
    util.fillFrame(frame, QJ.reports.individualHTML(cfg, r), 600);
  }

  function onShow() { if (stale) render(); }

  function init() {
    panel = document.getElementById('panel-individuels');
    store.on('analysis', function () {
      stale = true;
      if (QJ.main.activeTab() === 'individuels') render();
    });
    store.on('data', function () { selected = 0; filter = ''; });
  }

  QJ.uiIndividuels = { init: init, onShow: onShow, render: render };
})(window.QJ = window.QJ || {});
