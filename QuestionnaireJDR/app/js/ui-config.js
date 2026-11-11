/*
 * ui-config.js — "Configuration" tab: graphical editor of the whole
 * configuration (attentes, levels, report texts, questions, answers and
 * weights), live validation, loading and saving the YAML files.
 */
(function (QJ) {
  'use strict';
  var h = QJ.util.h;
  var util = QJ.util;
  var store = QJ.store;
  var core = QJ.core;

  var panel, navEl, contentEl;
  var section = 'attentes';
  var openSet = new WeakSet();     // config objects whose <details> is open
  var questionFilter = '';
  var storedHandle = null;         // FileSystemDirectoryHandle remembered in IndexedDB

  var SECTIONS = [
    { id: 'general', label: 'Général' },
    { id: 'attentes', label: 'Attentes ludiques' },
    { id: 'rapport', label: 'Textes des rapports' },
    { id: 'questions', label: 'Questions et poids' },
    { id: 'fichiers', label: 'Ouvrir / Enregistrer' }
  ];

  var RAPPORT_LABELS = {
    titre_rapport_individuel: ['Titre du rapport individuel', false, 'Grand titre en haut du rapport de chaque joueur.'],
    introduction: ['Introduction du rapport individuel', true, 'Texte affiché sous le titre. Laissez une ligne vide pour changer de paragraphe.'],
    titre_profil_dominant: ['Titre de l’encart « attente principale »', false, 'Titre de l’encadré à côté du graphique radar.'],
    texte_profil_mixte: ['Texte du profil mixte', true, 'Affiché quand plusieurs attentes arrivent à égalité en tête.'],
    conclusion: ['Conclusion du rapport individuel', true, 'Message de fin.'],
    pied_de_page: ['Pied de page', true, 'Petite mention en bas de chaque rapport.'],
    titre_rapport_global: ['Titre du rapport global', false, 'Rapport de synthèse destiné au créateur du questionnaire.'],
    introduction_rapport_global: ['Introduction du rapport global', true, '']
  };

  var PALETTE = ['#D55E00', '#0072B2', '#CC79A7', '#009E73', '#E69F00', '#56B4E9', '#8E3B1F', '#6A3D9A', '#B15928', '#33A02C', '#1F78B4', '#E31A1C'];

  function cfg() { return store.state.config; }
  function changed(structural) { store.configChanged(structural); if (structural) renderSection(); }

  // ---------------------------------------------------------------------------
  // Generic form helpers
  // ---------------------------------------------------------------------------

  function textField(label, obj, key, opts) {
    opts = opts || {};
    var input;
    if (opts.multiline) {
      input = h('textarea', { rows: opts.rows || 4 });
      input.value = obj[key] || '';
    } else {
      input = h('input', { type: 'text', value: obj[key] || '' });
      if (opts.list) input.setAttribute('list', opts.list);
    }
    if (opts.testid) input.setAttribute('data-testid', opts.testid);
    input.addEventListener('input', function () {
      obj[key] = input.value;
      if (opts.onInput) opts.onInput(input.value);
      changed(false);
    });
    return h('label', { class: 'field' },
      h('span', { class: 'lbl' }, label),
      input,
      opts.help ? h('span', { class: 'help' }, opts.help) : null);
  }

  function details(obj, summaryChildren, bodyChildren, testid) {
    var d = h('details', { class: 'block' }, h('summary', null, summaryChildren), h('div', { class: 'body' }, bodyChildren));
    if (testid) d.setAttribute('data-testid', testid);
    if (openSet.has(obj)) d.open = true;
    d.addEventListener('toggle', function () { if (d.open) openSet.add(obj); else openSet.delete(obj); });
    return d;
  }

  function moveItem(list, i, delta) {
    var j = i + delta;
    if (j < 0 || j >= list.length) return false;
    var x = list[i]; list[i] = list[j]; list[j] = x;
    return true;
  }

  function sectionMessages(sec) {
    return store.state.validation.filter(function (v) { return v.section === sec || (sec === 'general' && v.section === 'general'); });
  }

  function messagesBox(sec) {
    var box = h('div', { class: 'msgs', 'data-section': sec, style: { margin: '0 0 14px' } });
    fillMessages(box, sec);
    return box;
  }

  function fillMessages(box, sec) {
    util.clear(box);
    var list = sectionMessages(sec);
    var max = 12;
    list.slice(0, max).forEach(function (v) { box.appendChild(util.msg(v.level, v.message)); });
    if (list.length > max) box.appendChild(util.msg('info', '… et ' + (list.length - max) + ' autre(s) remarque(s).'));
  }

  // ---------------------------------------------------------------------------
  // Navigation & validation summary
  // ---------------------------------------------------------------------------

  function renderNav() {
    util.clear(navEl);
    var val = store.state.validation;
    SECTIONS.forEach(function (s) {
      var errs = val.filter(function (v) { return v.section === s.id && v.level === 'erreur'; }).length;
      var warns = val.filter(function (v) { return v.section === s.id && v.level === 'attention'; }).length;
      var badge = errs ? h('span', { class: 'badge', title: errs + ' erreur(s)' }, String(errs)) :
        (warns ? h('span', { class: 'badge warn', title: warns + ' remarque(s)' }, String(warns)) : null);
      navEl.appendChild(h('button', {
        type: 'button', 'aria-current': section === s.id ? 'true' : 'false', 'data-testid': 'cfg-nav-' + s.id,
        onclick: function () { section = s.id; renderNav(); renderSection(); window.scrollTo(0, 0); }
      }, s.label, badge));
    });
    navEl.appendChild(h('hr'));
    var errsAll = val.filter(function (v) { return v.level === 'erreur'; }).length;
    var warnsAll = val.filter(function (v) { return v.level === 'attention'; }).length;
    navEl.appendChild(h('div', { class: 'validation-box' },
      errsAll ? util.msg('erreur', errsAll + ' erreur' + (errsAll > 1 ? 's' : '') + ' à corriger') :
        util.msg('ok', 'Configuration valide'),
      warnsAll ? h('div', { style: { marginTop: '6px' } }, util.msg('attention', warnsAll + ' remarque' + (warnsAll > 1 ? 's' : ''))) : null));
  }

  function refreshValidation() {
    renderNav();
    var boxes = contentEl.querySelectorAll('.msgs[data-section]');
    Array.prototype.forEach.call(boxes, function (b) { fillMessages(b, b.getAttribute('data-section')); });
    var maxBox = contentEl.querySelector('[data-role=max-table]');
    if (maxBox) { util.clear(maxBox); maxBox.appendChild(maxTable()); }
  }

  function renderSection() {
    util.clear(contentEl);
    var fn = { general: renderGeneral, attentes: renderAttentes, rapport: renderRapport, questions: renderQuestions, fichiers: renderFichiers }[section];
    fn();
  }

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------

  function previewRespondent() {
    var a = store.state.analysis;
    if (a && a.respondents.length) return a.respondents[0];
    var c = cfg();
    var answers = {};
    c.questions.forEach(function (q, i) { answers[q.id] = q.reponses.length ? i % q.reponses.length : null; });
    var res = core.scoreRespondent(c, answers);
    return Object.assign({ index: 1, name: 'Joueur exemple', timestamp: null, answers: answers, unanswered: 0 }, res);
  }

  function showPreview() {
    var r = previewRespondent();
    var frame = h('iframe', { class: 'viewer', style: { minHeight: '65vh' }, title: 'Aperçu' });
    var m = util.modal({ title: 'Aperçu : rapport de « ' + r.name + ' »', body: frame, actions: [{ label: 'Fermer', primary: true }] });
    m.box.style.maxWidth = '980px';
    util.fillFrame(frame, QJ.reports.individualHTML(cfg(), r), 500);
  }

  // ---------------------------------------------------------------------------
  // Général
  // ---------------------------------------------------------------------------

  function renderGeneral() {
    var c = cfg();
    var headers = store.state.data ? store.state.data.table.headers : [];
    var dl = h('datalist', { id: 'csv-headers' }, headers.map(function (x) { return h('option', { value: x }); }));
    contentEl.appendChild(h('div', { class: 'card' },
      h('h2', null, 'Général'),
      messagesBox('general'),
      textField('Titre du questionnaire', c, 'titre', { help: 'Affiché en haut des rapports.' }),
      textField('Colonne contenant le nom ou le pseudo du joueur', c, 'colonne_identifiant', {
        list: 'csv-headers', testid: 'cfg-colonne-identifiant',
        help: 'Titre exact de la colonne dans le fichier des réponses (par exemple « Pseudo »). Laissez vide s’il n’y en a pas : les joueurs seront appelés « Répondant 1 », « Répondant 2 »…'
      }),
      textField('Colonne contenant la date de réponse', c, 'colonne_horodatage', { list: 'csv-headers', help: 'Ajoutée automatiquement par Google Forms : « Horodateur ».' }),
      dl));
  }

  // ---------------------------------------------------------------------------
  // Attentes
  // ---------------------------------------------------------------------------

  function renameAttente(a, newId) {
    var c = cfg();
    newId = core.slugify(newId);
    if (newId === a.id) return true;
    if (c.attentes.some(function (x) { return x !== a && x.id === newId; })) {
      util.toast('L’identifiant « ' + newId + ' » est déjà utilisé.', true);
      return false;
    }
    var old = a.id;
    c.questions.forEach(function (q) {
      q.reponses.forEach(function (r) {
        if (r.poids && old in r.poids) {
          var np = {};
          Object.keys(r.poids).forEach(function (k) { np[k === old ? newId : k] = r.poids[k]; });
          r.poids = np;
        }
      });
    });
    a.id = newId;
    return true;
  }

  function addAttente() {
    var c = cfg();
    var base = 'nouvelle_attente', id = base, k = 2;
    while (c.attentes.some(function (x) { return x.id === id; })) { id = base + '_' + k; k++; }
    var used = c.attentes.map(function (x) { return String(x.couleur).toUpperCase(); });
    var color = PALETTE.filter(function (p) { return used.indexOf(p.toUpperCase()) === -1; })[0] || '#7A6A5C';
    var a = {
      id: id, nom: 'Nouvelle attente', couleur: color, titre: 'Quel … êtes-vous ?', description: '',
      niveaux: [
        { a_partir_de: 0, titre: 'Niveau faible', texte: '' },
        { a_partir_de: 34, titre: 'Niveau moyen', texte: '' },
        { a_partir_de: 67, titre: 'Niveau fort', texte: '' }
      ]
    };
    c.attentes.push(a);
    openSet.add(a);
    changed(true);
    util.toast('Attente ajoutée. Pensez à lui donner des points dans « Questions et poids ».');
  }

  function addLevelButton(a) {
    var last = a.niveaux.length ? Number(a.niveaux[a.niveaux.length - 1].a_partir_de) || 0 : null;
    var next = last === null ? 0 : core.nextLevelThreshold(last);
    var btn = h('button', { class: 'btn small', type: 'button', onclick: function () {
      if (next === null) return;
      a.niveaux.push({ a_partir_de: next, titre: 'Nouveau niveau', texte: '' });
      changed(true);
    } }, '+ Ajouter un niveau');
    if (next === null) {
      btn.disabled = true;
      btn.title = 'Impossible d’ajouter un niveau : le dernier seuil est déjà à 99 % ou plus. Baissez-le d’abord.';
    }
    return btn;
  }

  function levelsTable(a) {
    var tbody = h('tbody');
    a.niveaux.forEach(function (n, i) {
      var thr = h('input', { type: 'number', min: 0, max: 100, step: 1, value: n.a_partir_de, 'aria-label': 'Seuil du niveau ' + (i + 1) });
      if (i === 0) thr.title = 'Le premier niveau commence toujours à 0 %.';
      thr.addEventListener('input', function () {
        n.a_partir_de = thr.value === '' ? '' : Number(thr.value);
        changed(false);
      });
      var ti = h('input', { type: 'text', value: n.titre || '', 'aria-label': 'Titre du niveau ' + (i + 1) });
      ti.addEventListener('input', function () { n.titre = ti.value; changed(false); });
      var tx = h('textarea', { rows: 3, 'aria-label': 'Texte du niveau ' + (i + 1) });
      tx.value = n.texte || '';
      tx.addEventListener('input', function () { n.texte = tx.value; changed(false); });
      tbody.appendChild(h('tr', null,
        h('td', { class: 'num' }, h('b', null, 'Niveau ' + (i + 1)), h('div', { class: 'row', style: { gap: '4px', marginTop: '4px' } }, thr, h('span', null, '%'))),
        h('td', null, ti, h('div', { style: { height: '6px' } }), tx),
        h('td', { class: 'acts' }, h('button', {
          class: 'btn small danger icon', type: 'button', title: 'Supprimer ce niveau', 'aria-label': 'Supprimer le niveau ' + (i + 1),
          disabled: a.niveaux.length <= 1,
          onclick: function () { a.niveaux.splice(i, 1); changed(true); }
        }, '✕'))));
    });
    return h('table', { class: 'levels-edit' },
      h('thead', null, h('tr', null, h('th', { style: { width: '130px' } }, 'À partir de'), h('th', null, 'Titre et texte du niveau'), h('th'))),
      tbody);
  }

  function attenteCard(a, i) {
    var c = cfg();
    var swatch = h('span', { class: 'swatch', style: { background: a.couleur } });
    var nameSpan = h('span', { class: 'ttl' }, a.nom || a.id);
    var errs = store.state.validation.filter(function (v) { return v.section === 'attentes' && v.ref === a.id && v.level === 'erreur'; }).length;
    var summary = [swatch, nameSpan,
      h('span', { class: 'muted small' }, a.niveaux.length + ' niveau' + (a.niveaux.length > 1 ? 'x' : '')),
      errs ? h('span', { class: 'flag-err' }, '● ' + errs + ' erreur' + (errs > 1 ? 's' : '')) : null];

    var color = h('input', { type: 'color', value: /^#[0-9a-fA-F]{6}$/.test(a.couleur) ? a.couleur : '#888888', 'aria-label': 'Couleur' });
    var hex = h('input', { type: 'text', value: a.couleur, style: { width: '110px' }, 'aria-label': 'Code couleur' });
    color.addEventListener('input', function () { a.couleur = color.value.toUpperCase(); hex.value = a.couleur; swatch.style.background = a.couleur; changed(false); });
    hex.addEventListener('input', function () {
      a.couleur = hex.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(a.couleur)) { color.value = a.couleur; swatch.style.background = a.couleur; }
      changed(false);
    });
    var idInput = h('input', { type: 'text', value: a.id, style: { width: '200px' }, 'aria-label': 'Identifiant' });
    idInput.addEventListener('change', function () {
      if (renameAttente(a, idInput.value)) changed(true);
      else idInput.value = a.id;
    });

    var body = [
      h('div', { class: 'grid-2' },
        textField('Nom (court, affiché sur le radar)', a, 'nom', { onInput: function (v) { nameSpan.textContent = v || a.id; } }),
        h('div', { class: 'field' }, h('span', { class: 'lbl', style: { fontWeight: 600, fontSize: '13.5px', display: 'block', marginBottom: '4px' } }, 'Couleur'),
          h('div', { class: 'row' }, color, hex))),
      textField('Titre de la section du rapport', a, 'titre', { help: 'Sous forme de question, par exemple « Quel compétiteur êtes-vous ? ».' }),
      textField('Description', a, 'description', { multiline: true, rows: 3, help: 'Une ou deux phrases expliquant ce que mesure cette attente.' }),
      h('h3', null, 'Niveaux'),
      h('p', { class: 'help', style: { marginTop: 0 } }, 'Chaque niveau s’applique à partir du score indiqué (en %). Le premier commence à 0 et les seuils doivent être croissants.'),
      levelsTable(a),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        addLevelButton(a)),
      h('h3', null, 'Paramètres avancés'),
      h('div', { class: 'row' },
        h('label', null, h('span', { class: 'small' }, 'Identifiant technique (nom du fichier) : '), idInput),
        h('span', { class: 'help' }, 'Lettres minuscules sans accent. Le modifier met à jour les poids des questions.')),
      h('div', { class: 'row', style: { marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '12px' } },
        h('button', { class: 'btn small', type: 'button', disabled: i === 0, onclick: function () { moveItem(c.attentes, i, -1); changed(true); } }, '↑ Monter'),
        h('button', { class: 'btn small', type: 'button', disabled: i === c.attentes.length - 1, onclick: function () { moveItem(c.attentes, i, 1); changed(true); } }, '↓ Descendre'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn small danger', type: 'button', onclick: function () {
          util.confirm('Supprimer l’attente « ' + a.nom + ' » ?', 'Ses niveaux et ses textes seront supprimés, ainsi que tous les points que les réponses lui donnent.', 'Supprimer', function () {
            c.attentes.splice(i, 1);
            c.questions.forEach(function (q) { q.reponses.forEach(function (r) { if (r.poids) delete r.poids[a.id]; }); });
            changed(true);
          }, true);
        } }, 'Supprimer cette attente'))
    ];
    return details(a, summary, body, 'cfg-attente-' + a.id);
  }

  function renderAttentes() {
    var c = cfg();
    contentEl.appendChild(h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('h2', { class: 'grow', style: { margin: 0 } }, 'Attentes ludiques'),
        h('button', { class: 'btn', type: 'button', onclick: showPreview }, 'Aperçu d’un rapport'),
        h('button', { class: 'btn primary', type: 'button', onclick: addAttente }, '+ Ajouter une attente')),
      h('p', { class: 'lead', style: { marginTop: '8px' } }, 'Les attentes sont affichées dans cet ordre sur le graphique radar. Cliquez sur une attente pour la modifier.'),
      messagesBox('attentes'),
      c.attentes.map(attenteCard)));
  }

  // ---------------------------------------------------------------------------
  // Textes des rapports
  // ---------------------------------------------------------------------------

  function renderRapport() {
    var c = cfg();
    c.rapport = c.rapport || {};
    var card = h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('h2', { class: 'grow', style: { margin: 0 } }, 'Textes des rapports'),
        h('button', { class: 'btn', type: 'button', onclick: showPreview }, 'Aperçu d’un rapport')),
      h('p', { class: 'lead', style: { marginTop: '8px' } }, 'Mots spéciaux utilisables : {joueur} (nom du joueur), {nombre_attentes} (nombre d’attentes), {questionnaire} (titre du questionnaire).'),
      messagesBox('rapport'));
    core.RAPPORT_FIELDS.forEach(function (f) {
      var meta = RAPPORT_LABELS[f];
      if (f === 'titre_rapport_global') card.appendChild(h('h3', null, 'Rapport global'));
      card.appendChild(textField(meta[0], c.rapport, f, { multiline: meta[1], rows: 4, help: meta[2] }));
    });
    contentEl.appendChild(card);
  }

  // ---------------------------------------------------------------------------
  // Questions et poids
  // ---------------------------------------------------------------------------

  function maxTable() {
    var c = cfg();
    var max = core.maxPoints(c);
    return h('table', { class: 'max-table' },
      h('thead', null, h('tr', null, h('th', null, ''), c.attentes.map(function (a) {
        return h('th', null, h('span', { class: 'swatch', style: { background: a.couleur, display: 'inline-block', width: '10px', height: '10px', marginRight: '4px' } }), a.nom);
      }))),
      h('tbody', null, h('tr', null, h('td', null, 'Points maximum possibles'), c.attentes.map(function (a) {
        return h('td', { style: max[a.id] === 0 ? { color: 'var(--err)', fontWeight: 700 } : null }, core.formatNumber(max[a.id], 1));
      }))));
  }

  function weightsTable(q) {
    var c = cfg();
    var tbody = h('tbody');
    var foot = h('tr');
    function refreshFoot() {
      util.clear(foot);
      foot.appendChild(h('td', { style: { textAlign: 'right' } }, 'maximum de la question'));
      c.attentes.forEach(function (a) {
        var m = 0;
        q.reponses.forEach(function (r) { var w = Number((r.poids || {})[a.id]) || 0; if (w > m) m = w; });
        foot.appendChild(h('td', null, core.formatNumber(m, 1)));
      });
    }
    q.reponses.forEach(function (r, ri) {
      r.poids = r.poids || {};
      var tx = h('textarea', { rows: 2, 'aria-label': 'Texte de la réponse ' + (ri + 1) });
      tx.value = r.texte || '';
      tx.addEventListener('input', function () { r.texte = tx.value; changed(false); });
      var acts = h('div', { class: 'ans-acts' },
        h('button', { class: 'btn small icon', type: 'button', title: 'Monter', 'aria-label': 'Monter la réponse', disabled: ri === 0, onclick: function () { moveItem(q.reponses, ri, -1); changed(true); } }, '↑'),
        h('button', { class: 'btn small icon', type: 'button', title: 'Descendre', 'aria-label': 'Descendre la réponse', disabled: ri === q.reponses.length - 1, onclick: function () { moveItem(q.reponses, ri, 1); changed(true); } }, '↓'),
        h('button', { class: 'btn small icon danger', type: 'button', title: 'Supprimer la réponse', 'aria-label': 'Supprimer la réponse', onclick: function () {
          util.confirm('Supprimer cette réponse ?', '« ' + r.texte + ' »', 'Supprimer', function () { q.reponses.splice(ri, 1); changed(true); }, true);
        } }, '✕'));
      // answer text + its actions in the first (sticky) column: the grid stays narrow on tablets
      var tr = h('tr', null, h('td', { class: 'ans' }, h('div', { class: 'ans-cell' }, tx, acts)));
      c.attentes.forEach(function (a) {
        var v = r.poids[a.id];
        var inp = h('input', {
          type: 'number', step: '0.5', min: 0, value: v === undefined ? '0' : String(v),
          'aria-label': 'Points pour ' + a.nom + ', réponse ' + (ri + 1),
          'data-testid': 'poids-' + q.id + '-' + ri + '-' + a.id
        });
        if (Number(v)) inp.classList.add('nz');
        inp.addEventListener('input', function () {
          var raw = inp.value.replace(',', '.');
          if (raw === '' || Number(raw) === 0) delete r.poids[a.id];
          else r.poids[a.id] = isFinite(Number(raw)) ? Number(raw) : raw;
          inp.classList.toggle('nz', !!Number(raw));
          inp.classList.toggle('invalid', raw !== '' && (!isFinite(Number(raw)) || Number(raw) < 0));
          refreshFoot();
          changed(false);
        });
        tr.appendChild(h('td', { class: 'w', 'data-label': a.nom, style: { '--c': a.couleur } }, inp));
      });
      tbody.appendChild(tr);
    });
    refreshFoot();
    return h('div', { class: 'weights-wrap' }, h('table', { class: 'weights' },
      h('thead', null, h('tr', null,
        h('th', null, 'Réponse'),
        c.attentes.map(function (a) { return h('th', { class: 'att' }, h('span', { class: 'swatch' , style: { background: a.couleur } }), a.nom); }))),
      tbody,
      h('tfoot', null, foot)));
  }

  function questionCard(q, i) {
    var c = cfg();
    var byId = {};
    c.attentes.forEach(function (a) { byId[a.id] = a; });
    var feeds = {};
    q.reponses.forEach(function (r) { Object.keys(r.poids || {}).forEach(function (k) { if (Number(r.poids[k])) feeds[k] = true; }); });
    var issues = store.state.validation.filter(function (v) { return v.section === 'questions' && v.ref === q.id; });
    var errs = issues.filter(function (v) { return v.level === 'erreur'; }).length;
    var warns = issues.length - errs;
    var ttl = h('span', { class: 'ttl' }, q.texte || '(question sans texte)');
    var summary = [
      h('span', { class: 'qn' }, 'Q' + (i + 1)), ttl,
      h('span', { class: 'row', style: { gap: '3px' } }, c.attentes.filter(function (a) { return feeds[a.id]; }).map(function (a) {
        return h('span', { class: 'swatch', title: a.nom, style: { background: a.couleur, width: '10px', height: '10px', borderRadius: '50%' } });
      })),
      errs ? h('span', { class: 'flag-err' }, '● ' + errs) : (warns ? h('span', { class: 'flag-warn' }, '● ' + warns) : null)
    ];
    var body = [
      textField('Texte de la question (identique au formulaire Google)', q, 'texte', { multiline: true, rows: 2, onInput: function (v) { ttl.textContent = v; } }),
      h('p', { class: 'help', style: { margin: '0 0 8px' } }, 'Pour chaque réponse, indiquez combien de points elle donne à chaque attente (0 = aucun). Une réponse peut donner des points à plusieurs attentes.'),
      h('p', { class: 'feeds small' }, 'Attentes alimentées : ', (function () {
        var fed = c.attentes.filter(function (a) { return feeds[a.id]; });
        if (!fed.length) return h('span', { class: 'muted' }, 'aucune');
        return fed.map(function (a) { return h('span', { class: 'feed-chip' }, h('span', { class: 'swatch', style: { background: a.couleur } }), a.nom); });
      })()),
      weightsTable(q),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn small', type: 'button', onclick: function () { q.reponses.push({ texte: 'Nouvelle réponse', poids: {} }); changed(true); } }, '+ Ajouter une réponse'),
        h('span', { class: 'grow' }),
        h('span', { class: 'muted small' }, 'identifiant : ' + q.id),
        h('button', { class: 'btn small', type: 'button', disabled: i === 0, onclick: function () { moveItem(c.questions, i, -1); changed(true); } }, '↑ Monter'),
        h('button', { class: 'btn small', type: 'button', disabled: i === c.questions.length - 1, onclick: function () { moveItem(c.questions, i, 1); changed(true); } }, '↓ Descendre'),
        h('button', { class: 'btn small danger', type: 'button', onclick: function () {
          util.confirm('Supprimer la question ' + (i + 1) + ' ?', '« ' + q.texte + ' » et ses réponses seront supprimées.', 'Supprimer', function () { c.questions.splice(i, 1); changed(true); }, true);
        } }, 'Supprimer la question'))
    ];
    return details(q, summary, body, 'cfg-question-' + q.id);
  }

  function renderQuestions() {
    var c = cfg();
    var list = h('div');
    var search = h('input', { type: 'search', placeholder: 'Filtrer les questions…', value: questionFilter, style: { maxWidth: '280px' }, 'aria-label': 'Filtrer les questions' });
    function fill() {
      util.clear(list);
      var f = core.normalize(questionFilter);
      c.questions.forEach(function (q, i) {
        if (f && core.normalize(q.texte).indexOf(f) === -1 && !q.reponses.some(function (r) { return core.normalize(r.texte).indexOf(f) >= 0; })) return;
        list.appendChild(questionCard(q, i));
      });
    }
    search.addEventListener('input', function () { questionFilter = search.value; fill(); });
    fill();
    contentEl.appendChild(h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('h2', { class: 'grow', style: { margin: 0 } }, 'Questions et poids'),
        h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-propositions', onclick: function () { openProposals(); } }, 'Créer les questions à partir d’un fichier de réponses…'),
        h('button', { class: 'btn primary', type: 'button', onclick: function () {
          var q = { id: core.nextQuestionId(c), texte: 'Nouvelle question', reponses: [{ texte: 'Réponse 1', poids: {} }, { texte: 'Réponse 2', poids: {} }] };
          c.questions.push(q); openSet.add(q); changed(true);
        } }, '+ Ajouter une question')),
      h('p', { class: 'lead', style: { marginTop: '8px' } }, c.questions.length + ' questions. Le score d’une attente = points obtenus ÷ points maximum possibles (ligne ci-dessous), en %.'),
      h('div', { 'data-role': 'max-table' }, maxTable()),
      messagesBox('questions'),
      h('div', { class: 'row', style: { margin: '10px 0' } }, search, h('span', { class: 'grow' }),
        h('button', { class: 'btn small', type: 'button', onclick: function () { c.questions.forEach(function (q) { openSet.add(q); }); fill(); } }, 'Tout déplier'),
        h('button', { class: 'btn small', type: 'button', onclick: function () { c.questions.forEach(function (q) { openSet.delete(q); }); fill(); } }, 'Tout replier')),
      list));
  }

  /** Proposes questions/answers found in a responses file but absent from the configuration. */
  function openProposals(table) {
    if (!table) {
      if (store.state.data) {
        var m = util.modal({
          title: 'Créer les questions à partir d’un fichier de réponses',
          body: h('p', null, 'Utiliser le fichier déjà chargé (« ' + store.state.data.fileName + ' ») ou en choisir un autre ?'),
          actions: [
            { label: 'Annuler' },
            { label: 'Choisir un autre fichier…', onClick: function () { pickTableThen(openProposals); } },
            { label: 'Utiliser le fichier chargé', primary: true, onClick: function () { setTimeout(function () { openProposals(store.state.data.table); }, 0); } }
          ]
        });
        void m;
      } else {
        pickTableThen(openProposals);
      }
      return;
    }
    var c = cfg();
    var prop = core.proposeFromTable(c, table);
    if (!prop.newQuestions.length && !prop.newAnswers.length) {
      util.toast('Rien à ajouter : toutes les questions et réponses du fichier sont déjà dans la configuration.');
      return;
    }
    var checks = [];
    var ul = h('ul', { class: 'checklist' });
    prop.newQuestions.forEach(function (nq) {
      var cb = h('input', { type: 'checkbox', checked: !nq.identifier });
      checks.push({ cb: cb, kind: 'q', item: nq });
      ul.appendChild(h('li', null, h('label', null, cb, h('span', null, h('b', null, 'Nouvelle question : '), nq.texte, nq.identifier ? h('i', null, ' (ressemble à un nom de joueur : plutôt à choisir comme colonne identifiant, donc décochée)') : null)),
        nq.reponses.length ? h('ul', null, nq.reponses.map(function (r) { return h('li', null, r.texte + ' (' + r.count + ' fois)'); })) : h('ul', null, h('li', null, 'aucune réponse dans le fichier'))));
    });
    prop.newAnswers.forEach(function (na) {
      var cb = h('input', { type: 'checkbox', checked: true });
      checks.push({ cb: cb, kind: 'a', item: na });
      ul.appendChild(h('li', null, h('label', null, cb, h('span', null, h('b', null, 'Nouvelle réponse à la question ' + (na.qIndex + 1) + ' : '), na.texte + ' (' + na.count + ' fois)'))));
    });
    util.modal({
      title: 'Éléments trouvés dans le fichier',
      body: h('div', null,
        h('p', { class: 'lead' }, 'Ces questions et réponses sont dans le fichier mais pas dans la configuration. Cochez celles à ajouter : elles seront créées avec 0 point partout, il faudra ensuite renseigner les poids.'),
        ul,
        h('p', { class: 'help' }, 'Astuce : si une question a seulement été reformulée dans Google Forms, corrigez plutôt son texte dans la configuration pour garder ses poids.')),
      actions: [
        { label: 'Annuler' },
        { label: 'Ajouter la sélection', primary: true, onClick: function () {
          var nq = 0, na = 0;
          checks.forEach(function (x) {
            if (!x.cb.checked) return;
            if (x.kind === 'q') {
              var q = { id: core.nextQuestionId(c), texte: x.item.texte, reponses: x.item.reponses.map(function (r) { return { texte: r.texte, poids: {} }; }) };
              c.questions.push(q); openSet.add(q); nq++;
            } else {
              var target = c.questions[x.item.qIndex];
              if (target) { target.reponses.push({ texte: x.item.texte, poids: {} }); openSet.add(target); na++; }
            }
          });
          if (nq || na) {
            store.configChanged(true);
            section = 'questions';
            QJ.main.showTab('config');
            renderNav(); renderSection();
            util.toast((nq ? nq + ' question(s) ' : '') + (nq && na ? 'et ' : '') + (na ? na + ' réponse(s) ' : '') + 'ajoutée(s). Renseignez maintenant les poids.');
          }
        } }
      ]
    });
  }

  function pickTableThen(fn) {
    var input = h('input', { type: 'file', accept: QJ.files.DATA_ACCEPT, class: 'visually-hidden' });
    input.addEventListener('change', function () {
      var f = input.files[0];
      input.remove();
      if (!f) return;
      QJ.files.loadDataFile(f).then(function (d) { fn(d.table); }, function (e) { util.toast('Lecture impossible : ' + e.message, true); });
    });
    document.body.appendChild(input);
    input.click();
  }

  // ---------------------------------------------------------------------------
  // Ouvrir / Enregistrer
  // ---------------------------------------------------------------------------

  function applyLoaded(result, meta) {
    if (!result.config) {
      util.modal({ title: 'Configuration non chargée', body: h('div', { class: 'msgs' }, result.problems.map(function (p) { return util.msg('erreur', p.message); })) });
      return false;
    }
    store.setConfig(result.config, meta);
    openSet = new WeakSet();
    if (result.problems.length) {
      util.modal({ title: 'Configuration chargée avec des remarques', body: h('div', { class: 'msgs' }, result.problems.map(function (p) { return util.msg(p.level, p.message); })) });
    } else {
      util.toast('Configuration chargée.');
    }
    return true;
  }

  function guardDirty(then) {
    if (!store.state.meta.dirty) { then(); return; }
    util.confirm('Remplacer la configuration ?', 'La configuration actuelle contient des modifications non enregistrées, elles seront perdues.', 'Remplacer', then, true);
  }

  function guardErrors(then) {
    var errs = store.state.validation.filter(function (v) { return v.level === 'erreur'; }).length;
    if (!errs) { then(); return; }
    util.confirm('Enregistrer malgré les erreurs ?', 'La configuration contient ' + errs + ' erreur(s). Vous pouvez l’enregistrer quand même et la corriger plus tard.', 'Enregistrer quand même', then);
  }

  function loadFromHandle(dir) {
    return QJ.files.verifyPermission(dir, false).then(function (ok) {
      if (!ok) throw new Error('Accès au dossier refusé.');
      return QJ.files.readConfigDir(dir);
    }).then(function (map) {
      var res = QJ.configIO.configFromPathMap(map);
      if (applyLoaded(res, { source: 'dossier', label: dir.name })) {
        storedHandle = dir;
        QJ.files.saveHandle(dir);
        renderSection();
      }
    }).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      util.toast('Lecture du dossier impossible : ' + (e && e.message ? e.message : e), true);
    });
  }

  function saveToHandle(dir) {
    return QJ.files.verifyPermission(dir, true).then(function (ok) {
      if (!ok) throw new Error('Autorisation d’écriture refusée.');
      return QJ.files.writeConfigDir(dir, cfg());
    }).then(function (n) {
      storedHandle = dir;
      QJ.files.saveHandle(dir);
      store.markSaved({ source: 'dossier', label: dir.name });
      util.toast(n + ' fichiers enregistrés dans le dossier « ' + dir.name + ' ».');
      renderSection();
    }).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      util.toast('Enregistrement impossible : ' + (e && e.message ? e.message : e), true);
    });
  }

  function downloadZip() {
    QJ.files.configZipBlob(cfg()).then(function (blob) {
      util.downloadBlob(blob, 'configuration.zip');
      store.markSaved({ source: 'fichiers', label: 'configuration.zip (téléchargé)' });
      util.toast('Archive « configuration.zip » téléchargée.');
    });
  }

  function loadFromFiles(fileList, label) {
    QJ.files.readConfigFiles(fileList).then(function (map) {
      if (!Object.keys(map).length) { util.toast('Aucun fichier .yaml trouvé.', true); return; }
      if (applyLoaded(QJ.configIO.configFromPathMap(map), { source: 'fichiers', label: label })) renderSection();
    }).catch(function (e) { util.toast('Lecture impossible : ' + e.message, true); });
  }

  /** Public entry point used by the banner "Enregistrer" button. */
  function quickSave() {
    guardErrors(function () {
      if (QJ.files.fsSupported && storedHandle) saveToHandle(storedHandle);
      else if (QJ.files.fsSupported) {
        window.showDirectoryPicker({ id: 'questionnaire-jdr-config', mode: 'readwrite' }).then(function (d) { return saveToHandle(d); }).catch(function (e) { if (!e || e.name !== 'AbortError') util.toast(String(e.message || e), true); });
      } else downloadZip();
    });
  }

  function renderFichiers() {
    var meta = store.state.meta;
    var cards = [];
    cards.push(h('div', { class: 'card' },
      h('h2', null, 'Ouvrir / Enregistrer la configuration'),
      h('p', { class: 'lead' }, 'La configuration est un dossier « configuration » contenant questionnaire.yaml, rapport.yaml et un fichier par attente dans « attentes ». L’application garde automatiquement la dernière configuration utilisée sur cet appareil ; enregistrez-la (dossier ou fichier configuration.zip) pour la conserver, la sauvegarder ou la partager.'),
      util.msg(meta.dirty ? 'attention' : 'info', QJ.main.describeMeta(meta))));

    if (QJ.files.fsSupported) {
      var actions = h('div', { class: 'row', 'data-testid': 'config-fs-actions' });
      if (storedHandle) {
        actions.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: function () { guardErrors(function () { saveToHandle(storedHandle); }); } }, 'Enregistrer dans le dossier « ' + storedHandle.name + ' »'));
        actions.appendChild(h('button', { class: 'btn', type: 'button', onclick: function () { guardDirty(function () { loadFromHandle(storedHandle); }); } }, 'Recharger depuis « ' + storedHandle.name + ' »'));
      }
      actions.appendChild(h('button', { class: 'btn' + (storedHandle ? '' : ' primary'), type: 'button', onclick: function () {
        guardDirty(function () {
          QJ.files.pickDirectory().then(loadFromHandle).catch(function (e) { if (!e || e.name !== 'AbortError') util.toast(String(e.message || e), true); });
        });
      } }, storedHandle ? 'Choisir un autre dossier…' : 'Choisir le dossier « configuration »…'));
      actions.appendChild(h('button', { class: 'btn', type: 'button', onclick: function () {
        guardErrors(function () {
          QJ.files.pickDirectory().then(saveToHandle).catch(function (e) { if (!e || e.name !== 'AbortError') util.toast(String(e.message || e), true); });
        });
      } }, 'Enregistrer dans un dossier…'));
      cards.push(h('div', { class: 'card' },
        h('h3', { style: { marginTop: 0 } }, 'Dossier de configuration (Edge, Chrome)'),
        h('p', { class: 'small muted' }, 'Choisissez le dossier « configuration » (ou le dossier « QuestionnaireJDR » qui le contient). Le navigateur demande l’autorisation de le lire et de le modifier. Le dossier est mémorisé : la prochaine fois, un clic suffit (le navigateur peut redemander l’autorisation).'),
        actions));
    }

    var fs = QJ.files.fsSupported;
    var mobile = util.env.mobile;
    var dirInput = QJ.files.folderInputSupported ? h('input', { type: 'file', class: 'visually-hidden', webkitdirectory: true, multiple: true }) : null;
    if (dirInput) dirInput.addEventListener('change', function () { var fl = dirInput.files; guardDirty(function () { loadFromFiles(fl, 'dossier sélectionné'); }); });
    var filesInput = h('input', { type: 'file', class: 'visually-hidden', multiple: true, accept: QJ.files.CONFIG_ACCEPT, 'data-testid': 'input-config-files' });
    filesInput.addEventListener('change', function () { var fl = filesInput.files; guardDirty(function () { loadFromFiles(fl, Array.prototype.map.call(fl, function (f) { return f.name; }).join(', ')); }); });
    var drop = null;
    if (util.env.canDropFiles) {
      drop = h('div', { class: 'dropzone', style: { padding: '20px' }, 'data-testid': 'config-dropzone' }, h('p', { style: { margin: 0 } }, 'Ou déposez ici le dossier « configuration », ses fichiers .yaml ou un fichier configuration.zip.'));
      ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) {
        var dt = e.dataTransfer;
        QJ.files.readDroppedItems(dt).then(function (map) {
          if (!Object.keys(map).length) { util.toast('Aucun fichier .yaml trouvé.', true); return; }
          guardDirty(function () { if (applyLoaded(QJ.configIO.configFromPathMap(map), { source: 'fichiers', label: 'fichiers déposés' })) renderSection(); });
        });
      });
    }
    var explain = null;
    if (!fs && mobile) {
      explain = h('div', { class: 'howto', 'data-testid': 'config-howto-mobile' },
        h('p', null, h('b', null, 'Sur tablette ou téléphone'), ', l’application ne peut pas écrire directement dans un dossier :'),
        h('ul', null,
          h('li', null, h('b', null, 'Enregistrer'), ' : touchez « Télécharger la configuration (.zip) ». Le fichier configuration.zip arrive dans le dossier ', h('i', null, 'Téléchargements'), ' de l’appareil ; gardez-le ou envoyez-le-vous.'),
          h('li', null, h('b', null, 'Recharger'), ' : touchez « Ouvrir des fichiers… » et choisissez ce configuration.zip (ou des fichiers .yaml).'),
          h('li', null, 'Entre deux utilisations, le navigateur mémorise de lui-même vos modifications sur cet appareil : le .zip sert de sauvegarde et de copie à partager.')));
    } else if (!fs) {
      explain = h('p', { class: 'small muted' }, 'Ce navigateur ne permet pas d’écrire directement dans un dossier. Pour enregistrer, téléchargez l’archive puis remplacez le dossier « configuration » par son contenu. (Avec Microsoft Edge ou Google Chrome sur ordinateur, l’enregistrement direct est possible.)');
    }
    cards.push(h('div', { class: 'card' },
      h('h3', { style: { marginTop: 0 } }, fs ? 'Autres possibilités' : 'Fichiers de configuration'),
      explain,
      h('div', { class: 'row' },
        h('button', { class: 'btn' + (fs ? '' : ' primary'), type: 'button', 'data-testid': 'btn-config-zip', onclick: function () { guardErrors(downloadZip); } }, 'Télécharger la configuration (.zip)'),
        h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-config-open-files', onclick: function () { filesInput.click(); } }, 'Ouvrir des fichiers (.zip ou .yaml)…'),
        // With File System Access (Edge/Chrome desktop) the folder is chosen above (read + write): no read-only duplicate.
        fs || !dirInput ? null : h('button', { class: 'btn', type: 'button', 'data-testid': 'btn-config-open-dir', onclick: function () { dirInput.click(); } }, 'Ouvrir le dossier « configuration »…')),
      drop ? h('div', { style: { marginTop: '12px' } }, drop) : null,
      dirInput, filesInput));

    cards.push(h('div', { class: 'card' },
      h('h3', { style: { marginTop: 0 } }, 'Configuration par défaut'),
      h('p', { class: 'small muted' }, 'Revenir à la configuration livrée avec l’application. Les modifications non enregistrées seront perdues.'),
      h('button', { class: 'btn danger', type: 'button', 'data-testid': 'btn-reset-config', onclick: function () {
        util.confirm('Réinitialiser la configuration ?', 'La configuration par défaut va remplacer la configuration active. Les modifications non enregistrées seront perdues.', 'Réinitialiser', function () {
          store.setConfig(store.defaultConfig(), { source: 'defaut', label: '' });
          openSet = new WeakSet();
          util.toast('Configuration par défaut rétablie.');
          renderSection();
        }, true);
      } }, 'Réinitialiser à la configuration par défaut')));
    cards.forEach(function (c) { contentEl.appendChild(c); });
  }

  // ---------------------------------------------------------------------------

  function render() {
    util.clear(panel);
    navEl = h('nav', { class: 'card subnav', 'aria-label': 'Parties de la configuration' });
    contentEl = h('div');
    panel.appendChild(h('div', { class: 'config-layout' }, navEl, contentEl));
    renderNav();
    renderSection();
  }

  function init() {
    panel = document.getElementById('panel-config');
    store.on('analysis', function () { if (navEl) refreshValidation(); });
    store.on('config', function (e) { if (e && e.structural && contentEl && QJ.main.activeTab() !== 'config') renderSection(); });
    store.on('meta', function () { if (section === 'fichiers' && contentEl) renderSection(); });
    if (QJ.files.fsSupported) {
      QJ.files.getHandle().then(function (hd) { if (hd) { storedHandle = hd; if (section === 'fichiers') renderSection(); } });
    }
    render();
  }

  function goTo(sec) { section = sec; renderNav(); renderSection(); }

  QJ.uiConfig = { init: init, render: render, openProposals: openProposals, quickSave: quickSave, goTo: goTo };
})(window.QJ = window.QJ || {});
