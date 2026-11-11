/* main.js — application start-up: tabs, configuration banner, wiring. */
(function (QJ) {
  'use strict';
  var h = QJ.util.h;
  var store = QJ.store;
  var active = 'donnees';
  var modules = {};

  function activeTab() { return active; }

  function showTab(name) {
    store.flush();
    active = name;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      var sel = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', sel ? 'true' : 'false');
      // narrow screens: the tab row scrolls sideways, keep the active tab visible
      if (sel && t.parentNode && t.parentNode.scrollWidth > t.parentNode.clientWidth) {
        var row = t.parentNode;
        var rb = row.getBoundingClientRect(), tb = t.getBoundingClientRect();
        if (tb.left < rb.left || tb.right > rb.right - 24) row.scrollLeft += tb.left - rb.left - 12;
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.panel'), function (p) {
      p.classList.toggle('active', p.id === 'panel-' + name);
    });
    var m = modules[name];
    if (m && m.onShow) m.onShow();
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* file:// may refuse */ }
  }

  function describeMeta(meta) {
    var when = meta.when ? ' (' + meta.when + ')' : '';
    var base;
    if (meta.source === 'dossier') base = 'Configuration du dossier « ' + (meta.label || 'configuration') + ' »';
    else if (meta.source === 'fichiers') base = 'Configuration chargée depuis des fichiers' + (meta.label ? ' : ' + meta.label : '');
    else base = 'Configuration par défaut (livrée avec l’application)';
    if (meta.dirty) return base + ' — modifiée, non enregistrée.';
    return base + when + '.';
  }

  function renderBanner() {
    var meta = store.state.meta;
    var val = store.state.validation;
    var errs = val.filter(function (v) { return v.level === 'erreur'; }).length;
    var warns = val.filter(function (v) { return v.level === 'attention'; }).length;
    var stateClass = meta.dirty ? 'modifiee' : (meta.source || 'defaut');
    var label = meta.dirty ? 'Modifiée – non enregistrée' : (meta.source === 'dossier' ? 'Dossier' : meta.source === 'fichiers' ? 'Fichiers' : 'Par défaut');
    var detail;
    if (meta.source === 'dossier') detail = 'dossier « ' + (meta.label || 'configuration') + ' »';
    else if (meta.source === 'fichiers') detail = meta.label || 'fichiers chargés';
    else detail = 'configuration livrée avec l’application';
    if (meta.dirty) detail = 'à partir de : ' + detail;
    var box = h('div', { class: 'box state-' + stateClass, 'data-testid': 'config-banner', 'data-state': stateClass },
      h('span', null, 'Configuration active : ', h('span', { class: 'label' }, label)),
      h('span', { class: 'detail' }, '· ' + detail),
      h('span', { class: 'spacer' }),
      h('span', { class: 'valid ' + (errs ? 'err' : warns ? 'warn' : 'ok') },
        errs ? errs + ' erreur' + (errs > 1 ? 's' : '') + ' dans la configuration' : (warns ? warns + ' remarque' + (warns > 1 ? 's' : '') : 'configuration valide')),
      meta.dirty ? h('button', { class: 'btn small primary', type: 'button', onclick: function () { QJ.uiConfig.quickSave(); } }, 'Enregistrer…') : null,
      h('button', { class: 'btn small', type: 'button', onclick: function () { showTab('config'); QJ.uiConfig.goTo('fichiers'); } }, 'Gérer'));
    var el = document.getElementById('config-banner');
    QJ.util.clear(el);
    el.appendChild(box);

    var cc = document.getElementById('count-config');
    cc.hidden = !errs;
    cc.textContent = String(errs);
    cc.classList.toggle('err', !!errs);
    var cr = document.getElementById('count-resp');
    var n = store.state.analysis ? store.state.analysis.respondents.length : 0;
    cr.hidden = !n;
    cr.textContent = String(n);
    document.getElementById('app-subtitle').textContent = store.state.config.titre || 'Profils de joueurs';
  }

  function start() {
    store.init();
    modules = {
      donnees: QJ.uiDonnees, individuels: QJ.uiIndividuels, global: QJ.uiGlobal,
      config: QJ.uiConfig, aide: QJ.uiAide
    };
    Object.keys(modules).forEach(function (k) { modules[k].init(); });
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.addEventListener('click', function () { showTab(t.getAttribute('data-tab')); });
    });
    store.on('meta', renderBanner);
    store.on('analysis', renderBanner);
    renderBanner();
    var hash = (location.hash || '').slice(1);
    showTab(modules[hash] ? hash : 'donnees');
    // Avoid losing a dropped file that misses the drop zone: the browser would open it.
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.target && e.target.closest && e.target.closest('.dropzone, [data-testid=data-summary]')) return;
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && active === 'donnees' && !/\.ya?ml$/i.test(f.name)) QJ.uiDonnees.handleFile(f);
    });
  }

  QJ.main = { showTab: showTab, activeTab: activeTab, describeMeta: describeMeta, renderBanner: renderBanner };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.QJ = window.QJ || {});
