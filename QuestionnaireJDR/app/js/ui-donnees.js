/* ui-donnees.js — "Données" tab: load the responses file, summary, warnings. */
(function (QJ) {
  'use strict';
  var h = QJ.util.h;
  var util = QJ.util;
  var store = QJ.store;

  var panel;

  function uploadIcon() {
    var s = '<svg class="big" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>';
    return h('div', { html: s });
  }

  function handleFile(file) {
    if (!file) return;
    QJ.files.loadDataFile(file).then(function (data) {
      store.setData(data);
      var n = store.state.analysis ? store.state.analysis.respondents.length : 0;
      util.toast('Fichier « ' + data.fileName + ' » chargé : ' + n + ' répondant' + (n > 1 ? 's' : '') + '.');
    }).catch(function (e) {
      console.error(e);
      util.toast('Impossible de lire le fichier : ' + (e && e.message ? e.message : e), true);
    });
  }

  function loadExample() {
    var ex = QJ.EXAMPLE_CSV;
    if (!ex) { util.toast('Exemple introuvable.', true); return; }
    var table = QJ.core.parseTable(ex.text);
    store.setData({ fileName: ex.fileName + ' (exemple)', table: table, encoding: 'UTF-8', delimiter: table.delimiter, example: true });
    util.toast('Exemple chargé : ' + table.rows.length + ' répondants fictifs.');
  }

  function filePicker() {
    var input = h('input', { type: 'file', accept: QJ.files.DATA_ACCEPT, class: 'visually-hidden', 'data-testid': 'input-csv' });
    input.addEventListener('change', function () { handleFile(input.files[0]); input.value = ''; });
    return input;
  }

  function setupDrop(el) {
    ['dragenter', 'dragover'].forEach(function (t) {
      el.addEventListener(t, function (e) { e.preventDefault(); el.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      el.addEventListener(t, function (e) { e.preventDefault(); el.classList.remove('over'); });
    });
    el.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      handleFile(f);
    });
  }

  function render() {
    util.clear(panel);
    var st = store.state;
    var input = filePicker();
    panel.appendChild(input);

    if (!st.data) {
      var drop = util.env.canDropFiles;
      var dz = h('div', { class: 'dropzone card' + (drop ? '' : ' no-drop'), 'data-testid': 'dropzone' },
        uploadIcon(),
        h('h2', null, drop ? 'Déposez ici le fichier des réponses' : 'Choisissez le fichier des réponses'),
        h('p', null, drop ? 'Le fichier CSV téléchargé depuis Google Forms (ou l’archive .zip telle quelle), ou un fichier Excel (.xlsx).'
          : 'Le fichier .xlsx ou .csv enregistré depuis Google Sheets, ou le .zip téléchargé depuis Google Forms.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', 'data-testid': 'btn-choisir-fichier', onclick: function () { input.click(); } }, 'Choisir un fichier…'),
          h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-exemple', onclick: loadExample }, 'Charger l’exemple')));
      if (drop) setupDrop(dz);
      panel.appendChild(dz);
      var steps = util.env.mobile ? [
        h('li', null, 'Dans l’application ', h('b', null, 'Google Sheets'), ', ouvrez la feuille des réponses liée au formulaire.'),
        h('li', null, 'Touchez le menu ', h('b', null, '⋮'), ' (trois points) puis ', h('b', null, 'Partager et exporter'), ' → ', h('b', null, 'Enregistrer sous'), ' : choisissez ', h('b', null, 'Excel (.xlsx)'), ' ou ', h('b', null, 'CSV'), '.'),
        h('li', null, 'Revenez ici, touchez ', h('b', null, 'Choisir un fichier…'), ' et sélectionnez ce fichier (souvent dans ', h('i', null, 'Téléchargements'), ').'),
        h('li', null, 'Consultez les ', h('b', null, 'Rapports individuels'), ' et le ', h('b', null, 'Rapport global'), '.')
      ] : [
        h('li', null, 'Ouvrez votre formulaire dans Google Forms, onglet ', h('b', null, 'Réponses'), '.'),
        h('li', null, 'Cliquez sur les trois points ', h('b', null, '⋮'), ' puis ', h('b', null, 'Télécharger les réponses (.csv)'), '.'),
        h('li', null, drop ? 'Glissez le fichier téléchargé (même le .zip) dans le cadre ci-dessus.' : 'Choisissez le fichier téléchargé (même le .zip) avec le bouton ci-dessus.'),
        h('li', null, 'Consultez les ', h('b', null, 'Rapports individuels'), ' et le ', h('b', null, 'Rapport global'), '.')
      ];
      panel.appendChild(h('div', { class: 'card' },
        h('h2', null, 'Comment récupérer les réponses ?'),
        h('ol', { class: 'steps', 'data-testid': 'steps-reponses' }, steps),
        h('p', { class: 'small muted', style: { marginTop: '12px' } }, util.env.web
          ? 'Les réponses restent sur cet appareil : le fichier est lu et traité ici même, rien n’est envoyé sur Internet.'
          : 'Les réponses restent sur cet ordinateur : rien n’est envoyé sur Internet.')));
      return;
    }

    var a = st.analysis;
    var n = a ? a.respondents.length : 0;
    var stats = a ? QJ.core.globalStats(st.config, a) : null;
    var period = '—';
    if (stats && stats.first) {
      period = stats.first.dateLabel === stats.last.dateLabel ? stats.first.dateLabel : stats.first.dateLabel + ' → ' + stats.last.dateLabel;
    }
    var matchedQ = a ? Object.keys(a.columns.questions).length : 0;

    var head = h('div', { class: 'card', 'data-testid': 'data-summary' },
      h('div', { class: 'row' },
        h('h2', { class: 'grow', style: { margin: 0 } }, 'Fichier chargé : ', h('span', { style: { fontFamily: 'var(--sans)', fontSize: '18px' } }, st.data.fileName)),
        h('button', { class: 'btn', type: 'button', onclick: function () { input.click(); } }, 'Changer de fichier…'),
        h('button', { class: 'btn danger', type: 'button', onclick: function () {
          util.confirm('Oublier les données ?', 'Les réponses chargées seront retirées de l’application (le fichier d’origine n’est pas touché).', 'Oublier', function () { store.setData(null); }, true);
        } }, 'Oublier les données')),
      h('div', { class: 'kpis', style: { marginTop: '14px' } },
        h('div', { class: 'kpi' }, h('b', { 'data-testid': 'nb-repondants' }, String(n)), h('span', null, 'répondant' + (n > 1 ? 's' : ''))),
        h('div', { class: 'kpi' }, h('b', { class: 'small-val' }, period), h('span', null, 'période des réponses')),
        h('div', { class: 'kpi' }, h('b', null, matchedQ + ' / ' + st.config.questions.length), h('span', null, 'questions reconnues')),
        h('div', { class: 'kpi' }, h('b', { class: 'small-val' }, (st.data.encoding || '—') + (st.data.delimiter ? ' · ' + QJ.files.delimiterLabel(st.data.delimiter) : '')), h('span', null, 'encodage · séparateur'))),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', type: 'button', onclick: function () { QJ.main.showTab('individuels'); } }, 'Voir les rapports individuels'),
        h('button', { class: 'btn', type: 'button', onclick: function () { QJ.main.showTab('global'); } }, 'Voir le rapport global')));
    if (util.env.canDropFiles) setupDrop(head);
    panel.appendChild(head);

    var box = h('div', { class: 'card' }, h('h2', null, 'Vérification du fichier'));
    var msgs = h('div', { class: 'msgs', 'data-testid': 'data-warnings' });
    var warnings = a ? a.warnings : [];
    if (!warnings.length) {
      msgs.appendChild(util.msg('ok', 'Tout est en ordre : toutes les colonnes et toutes les réponses correspondent à la configuration.'));
    }
    var order = { erreur: 0, attention: 1, info: 2 };
    warnings.slice().sort(function (x, y) { return order[x.level] - order[y.level]; }).forEach(function (w) {
      var action = null;
      if (w.kind === 'identifiant') {
        action = h('button', { class: 'btn small', type: 'button', 'data-testid': 'btn-set-identifiant', onclick: function () {
          st.config.colonne_identifiant = w.column;
          store.configChanged(true);
          util.toast('« ' + w.column + ' » est maintenant la colonne identifiant.');
        } }, 'Utiliser comme colonne identifiant');
      } else if (w.kind === 'colonne' || w.kind === 'reponse') {
        action = h('button', { class: 'btn small', type: 'button', onclick: function () { QJ.uiConfig.openProposals(st.data.table); } }, 'Ajouter à la configuration…');
      }
      msgs.appendChild(util.msg(w.level, w.message, w.details, action));
    });
    box.appendChild(msgs);
    var unknownCount = a ? a.unmatchedColumns.length + a.unmatchedValues.length : 0;
    if (unknownCount) {
      box.appendChild(h('p', { class: 'small muted', style: { marginTop: '12px' } },
        'Une colonne ou une réponse « non reconnue » correspond souvent à une question modifiée dans Google Forms après la création de la configuration. ',
        'Corrigez le texte dans l’onglet Configuration, ou utilisez « Ajouter à la configuration… ».'));
    }
    panel.appendChild(box);
  }

  function init() {
    panel = document.getElementById('panel-donnees');
    store.on('analysis', render);
    store.on('data', render);
    render();
  }

  QJ.uiDonnees = { init: init, render: render, loadExample: loadExample, handleFile: handleFile };
})(window.QJ = window.QJ || {});
