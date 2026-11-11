/* ui-global.js — "Rapport global" tab: preview and exports. */
(function (QJ) {
  'use strict';
  var h = QJ.util.h;
  var util = QJ.util;
  var store = QJ.store;

  var panel;
  var stale = true;

  function build() {
    var st = store.state;
    return QJ.reports.globalHTML(st.config, st.analysis, { fileName: st.data ? st.data.fileName : '', warnings: st.analysis.warnings });
  }

  function render() {
    stale = false;
    util.clear(panel);
    var a = store.state.analysis;
    if (!a || !a.respondents.length) {
      panel.appendChild(h('div', { class: 'card empty' },
        h('h2', null, 'Aucune réponse chargée'),
        h('p', null, 'Le rapport global apparaîtra ici dès que le fichier des réponses sera chargé.'),
        h('button', { class: 'btn primary', type: 'button', onclick: function () { QJ.main.showTab('donnees'); } }, 'Aller à l’onglet Données')));
      return;
    }
    var html = build();
    var frame = h('iframe', { class: 'viewer', title: 'Rapport global', 'data-testid': 'frame-global' });
    panel.appendChild(h('div', { class: 'toolbar' },
      h('span', { class: 'title' }, 'Rapport global – ' + a.respondents.length + ' répondant' + (a.respondents.length > 1 ? 's' : '')),
      h('span', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-export-global', onclick: function () {
          store.flush();
          util.downloadText(build(), 'Rapport global.html', 'text/html');
        } }, 'Exporter le rapport (.html)'),
        util.canShareFiles('text/html') ? h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-partager-global', onclick: function () {
          store.flush();
          util.shareText(build(), 'Rapport global.html', 'text/html', 'Rapport global').catch(function (e) {
            util.toast('Partage impossible : ' + (e && e.message ? e.message : e) + ' Utilisez « Exporter ».', true);
          });
        } }, 'Partager…') : null,
        h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-export-scores', onclick: function () {
          store.flush();
          util.downloadText(QJ.core.scoresToCSV(store.state.config, store.state.analysis), 'Scores des répondants.csv', 'text/csv');
        } }, 'Exporter les scores (.csv pour Excel)'),
        h('button', { class: 'btn primary', type: 'button', 'data-testid': 'btn-imprimer-global', onclick: function () {
          store.flush();
          util.printReport(frame, build());
        } }, 'Imprimer / PDF'))));
    panel.appendChild(frame);
    util.fillFrame(frame, html, 800);
  }

  function onShow() { if (stale) render(); }

  function init() {
    panel = document.getElementById('panel-global');
    store.on('analysis', function () {
      stale = true;
      if (QJ.main.activeTab() === 'global') render();
    });
  }

  QJ.uiGlobal = { init: init, onShow: onShow, render: render };
})(window.QJ = window.QJ || {});
