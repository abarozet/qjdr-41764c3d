/* ui-aide.js — "Aide" tab: shows documentation/guide.html when it exists. */
(function (QJ) {
  'use strict';
  var h = QJ.util.h;
  var GUIDE = 'documentation/guide.html';
  var panel;
  var probed = null; // null = unknown, true/false once tested

  /**
   * Browsers cannot test whether a local file exists over file:// (no fetch),
   * so we load it as a never-applied stylesheet (media="not all") and listen
   * to its load / error events.
   */
  function probe(cb) {
    var done = false;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.media = 'not all';
    link.href = GUIDE + '?t=' + Date.now();
    function finish(ok) { if (done) return; done = true; link.remove(); cb(ok); }
    link.onload = function () { finish(true); };
    link.onerror = function () { finish(false); };
    setTimeout(function () { finish(null); }, 2500);
    document.head.appendChild(link);
  }

  function render() {
    QJ.util.clear(panel);
    var open = h('a', { class: 'btn', href: GUIDE, target: '_blank', rel: 'noopener' }, 'Ouvrir le guide dans un nouvel onglet');
    panel.appendChild(h('div', { class: 'toolbar' }, h('span', { class: 'title' }, 'Aide – guide d’utilisation'), probed === false ? null : open));
    if (probed === false) {
      panel.appendChild(h('div', { class: 'card empty', 'data-testid': 'aide-absente' },
        h('h2', null, 'Le guide n’est pas encore disponible'),
        h('p', null, 'Le guide d’utilisation sera placé dans le dossier « documentation » (fichier guide.html), à côté de l’application.'),
        h('p', { class: 'small muted' }, 'En attendant : déposez le fichier des réponses dans l’onglet « Données », puis consultez les rapports. Les textes, les questions et les poids se modifient dans l’onglet « Configuration ».')));
      return;
    }
    panel.appendChild(h('iframe', { class: 'help-frame', src: GUIDE, title: 'Guide d’utilisation' }));
  }

  function onShow() {
    if (probed === null) {
      probe(function (ok) { probed = ok === null ? true : ok; render(); });
      QJ.util.clear(panel);
      panel.appendChild(h('p', { class: 'muted' }, 'Chargement du guide…'));
    }
  }

  function init() { panel = document.getElementById('panel-aide'); }

  QJ.uiAide = { init: init, onShow: onShow };
})(window.QJ = window.QJ || {});
