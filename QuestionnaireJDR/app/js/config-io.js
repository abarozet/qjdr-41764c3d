/*
 * config-io.js — reading the YAML configuration folder into the internal
 * model, and writing it back as human-friendly YAML (French header comments,
 * same layout as the hand-written files).
 *
 * Pure (no DOM). Browser: global QJ.configIO (needs global `jsyaml`).
 * Node: require('./config-io.js').
 */
(function (root, factory) {
  'use strict';
  var yamlLib = (typeof root !== 'undefined' && root && root.jsyaml) ? root.jsyaml : null;
  if (!yamlLib && typeof require === 'function') {
    try { yamlLib = require('../vendor/js-yaml.min.js'); } catch (e) { yamlLib = null; }
  }
  // RAPPORT_FIELDS has a single definition, in core.js (loaded before this file).
  var coreLib = (typeof root !== 'undefined' && root && root.QJ && root.QJ.core) ? root.QJ.core : null;
  if (!coreLib && typeof require === 'function') {
    try { coreLib = require('./core.js'); } catch (e) { coreLib = null; }
  }
  var mod = factory(yamlLib, coreLib);
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.QJ = root.QJ || {};
    root.QJ.configIO = mod;
  }
})(typeof self !== 'undefined' ? self : this, function (jsyaml, core) {
  'use strict';

  var RAPPORT_FIELDS = core.RAPPORT_FIELDS;

  // ---------------------------------------------------------------------------
  // Header comments (French, for the person editing the files by hand)
  // ---------------------------------------------------------------------------

  var HEADER_QUESTIONNAIRE = [
    '# =====================================================================',
    '#  CONFIGURATION DU QUESTIONNAIRE',
    '# =====================================================================',
    '#  Ce fichier décrit :',
    '#    - les attentes ludiques mesurées (et l\'ordre d\'affichage) ;',
    '#    - les questions du formulaire et leurs réponses ;',
    '#    - les points que chaque réponse donne à chaque attente ludique.',
    '#',
    '#  Règles simples :',
    '#    - Le texte des questions et des réponses doit correspondre à celui du',
    '#      formulaire Google (majuscules, espaces et apostrophes ne comptent pas).',
    '#    - « poids » : combien de points la réponse donne à une attente.',
    '#      2 = soutient fortement, 1 = soutient un peu. Une attente absente = 0.',
    '#      Une réponse peut donner des points à plusieurs attentes.',
    '#    - Le score d\'une attente = points obtenus / points maximum possibles,',
    '#      exprimé en pourcentage (0 à 100).',
    '#    - Les textes des rapports et les seuils des niveaux se trouvent dans',
    '#      le dossier « attentes » (un fichier par attente ludique).',
    '#',
    '#  Le plus simple pour modifier ce fichier : l\'onglet « Configuration »',
    '#  de l\'application.',
    '# ====================================================================='
  ].join('\n');

  var HEADER_RAPPORT = [
    '# ==============================================================',
    '#  TEXTES DES RAPPORTS',
    '# ==============================================================',
    '#  Ce fichier contient les textes généraux affichés dans les rapports.',
    '#  Les textes propres à chaque attente ludique (titres, niveaux, etc.)',
    '#  se trouvent dans le dossier « attentes ».',
    '#',
    '#    - « titre_rapport_individuel » : titre du rapport de chaque joueur.',
    '#    - « introduction » : texte affiché en haut du rapport individuel.',
    '#    - « titre_profil_dominant » : titre de l\'encart présentant l\'attente',
    '#      la plus forte du joueur.',
    '#    - « texte_profil_mixte » : phrase affichée quand plusieurs attentes',
    '#      arrivent à égalité en tête.',
    '#    - « conclusion » : message de fin du rapport individuel.',
    '#    - « pied_de_page » : petite mention en bas de chaque page.',
    '#    - « titre_rapport_global » et « introduction_rapport_global » :',
    '#      titre et introduction de la synthèse de toutes les réponses,',
    '#      destinée à la personne qui a créé le questionnaire.',
    '#',
    '#  Tous ces textes peuvent être modifiés librement.',
    '#  Mots spéciaux utilisables dans les textes : {joueur} (nom du joueur),',
    '#  {nombre_attentes} (nombre d\'attentes ludiques), {questionnaire}',
    '#  (titre du questionnaire).',
    '# =============================================================='
  ].join('\n');

  function headerAttente(a) {
    return [
      '# ==============================================================',
      '#  ATTENTE LUDIQUE : ' + oneLine(a.nom || a.id),
      '# ==============================================================',
      '#  Ce fichier décrit une attente ludique et les textes affichés dans',
      '#  les rapports des joueurs.',
      '#',
      '#    - « id » : identifiant technique, ne pas le modifier (il doit',
      '#      correspondre à la liste « attentes » de questionnaire.yaml).',
      '#    - « nom » : libellé court affiché sur le graphique radar.',
      '#    - « couleur » : couleur de l\'attente (code hexadécimal, ex. "' + oneLine(a.couleur || '#C0392B') + '").',
      '#    - « titre » : titre de la section dans le rapport individuel.',
      '#    - « description » : une ou deux phrases expliquant ce que mesure',
      '#      cette attente.',
      '#    - « niveaux » : les paliers, du plus faible au plus fort.',
      '#        « a_partir_de » = score minimum, en % (de 0 à 100), pour',
      '#        atteindre ce niveau. Le premier niveau doit commencer à 0.',
      '#        Vous pouvez ajouter ou supprimer des niveaux, et modifier',
      '#        librement les titres et les textes.',
      '# =============================================================='
    ].join('\n');
  }

  function oneLine(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[\r\n]+/g, ' ');
  }

  // ---------------------------------------------------------------------------
  // YAML scalar emission
  // ---------------------------------------------------------------------------

  /** Double-quoted YAML scalar (JSON string syntax is valid YAML). */
  function quoted(s) {
    return JSON.stringify(String(s === undefined || s === null ? '' : s));
  }

  /** Word wrap that never separates French double punctuation from its word. */
  function wrapWords(text, width) {
    var raw = text.split(' ');
    var words = [];
    raw.forEach(function (w) {
      var prev = words.length ? words[words.length - 1] : null;
      if (prev !== null && (/^[:;!?»]+[.,]*$/.test(w) || /^«$/.test(prev))) {
        words[words.length - 1] = prev + ' ' + w;
      } else {
        words.push(w);
      }
    });
    var lines = [];
    var cur = '';
    words.forEach(function (w) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length > width) { lines.push(cur); cur = w; }
      else cur += ' ' + w;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  /**
   * Emits `key: value` for a long text as a folded block (>-), wrapped for
   * readability, falling back to a double-quoted string whenever the folded
   * form would not round-trip exactly.
   */
  function emitText(key, value, indent) {
    var pad = new Array(indent + 1).join(' ');
    var s = String(value === undefined || value === null ? '' : value);
    var simple = key + ': ' + quoted(s);
    if (s.length < 60 && s.indexOf('\n') === -1) return pad + simple;
    var foldable = !/\r|\t|  |^ | $|\n | \n|^\n|\n$/.test(s) && s.trim() !== '';
    if (foldable) {
      var width = Math.max(40, 74 - indent);
      var out = [pad + key + ': >-'];
      var parts = s.split(/(\n+)/);
      parts.forEach(function (p) {
        if (/^\n+$/.test(p)) {
          for (var i = 0; i < p.length; i++) out.push('');
        } else {
          wrapWords(p, width).forEach(function (l) { out.push(pad + '  ' + l); });
        }
      });
      var block = out.join('\n');
      if (roundTripsBlock(block, key, s, indent)) return block;
    }
    return pad + simple;
  }

  function roundTripsBlock(block, key, expected, indent) {
    if (!jsyaml) return true;
    try {
      var lines = block.split('\n').map(function (l) { return l.slice(Math.min(indent, l.length - l.replace(/^ +/, '').length)); });
      var v = jsyaml.load(lines.join('\n'));
      return v && v[key] === expected;
    } catch (e) {
      return false;
    }
  }

  function num(x) {
    var n = Number(x);
    return isFinite(n) ? String(n) : '0';
  }

  // ---------------------------------------------------------------------------
  // Serializers
  // ---------------------------------------------------------------------------

  function serializeQuestionnaire(config) {
    var L = [HEADER_QUESTIONNAIRE, ''];
    L.push('titre: ' + quoted(config.titre || ''));
    L.push('');
    L.push('# Nom de la colonne du fichier CSV qui contient le nom ou le pseudo du');
    L.push('# joueur. Laisser vide ("") s\'il n\'y en a pas : les joueurs seront alors');
    L.push('# appelés « Répondant 1 », « Répondant 2 », etc.');
    L.push('colonne_identifiant: ' + quoted(config.colonne_identifiant || ''));
    L.push('');
    L.push('# Nom de la colonne contenant la date de réponse (ajoutée par Google Forms).');
    L.push('colonne_horodatage: ' + quoted(config.colonne_horodatage || ''));
    L.push('');
    L.push('# Liste des attentes ludiques, dans l\'ordre d\'affichage.');
    L.push('# Chaque identifiant correspond à un fichier « attentes/<identifiant>.yaml ».');
    if (config.attentes.length) {
      L.push('attentes:');
      config.attentes.forEach(function (a) { L.push('  - ' + a.id); });
    } else {
      L.push('attentes: []');
    }
    L.push('');
    if (!config.questions.length) {
      L.push('questions: []');
    } else {
      L.push('questions:');
      config.questions.forEach(function (q, qi) {
        if (qi > 0) L.push('');
        L.push('  - id: ' + q.id);
        L.push('    texte: ' + quoted(q.texte));
        if (!(q.reponses || []).length) {
          L.push('    reponses: []');
          return;
        }
        L.push('    reponses:');
        q.reponses.forEach(function (r) {
          L.push('      - texte: ' + quoted(r.texte));
          var parts = [];
          var poids = r.poids || {};
          // keep the author's key order (unknown keys are kept so nothing is lost)
          Object.keys(poids).forEach(function (k) {
            if (Number(poids[k]) !== 0) parts.push(safeKey(k) + ': ' + num(poids[k]));
          });
          L.push('        poids: ' + (parts.length ? '{ ' + parts.join(', ') + ' }' : '{}'));
        });
      });
    }
    return L.join('\n') + '\n';
  }

  function safeKey(k) {
    return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(k) ? k : quoted(k);
  }

  function serializeRapport(config) {
    var r = config.rapport || {};
    var L = [HEADER_RAPPORT, ''];
    var groups = [
      ['titre_rapport_individuel'], ['introduction'], ['titre_profil_dominant'],
      ['texte_profil_mixte'], ['conclusion'], ['pied_de_page'],
      ['titre_rapport_global'], ['introduction_rapport_global']
    ];
    groups.forEach(function (g, i) {
      if (i > 0) L.push('');
      L.push(emitText(g[0], r[g[0]] || '', 0));
    });
    // keep unknown extra fields
    Object.keys(r).forEach(function (k) {
      if (RAPPORT_FIELDS.indexOf(k) === -1 && typeof r[k] === 'string') {
        L.push('');
        L.push(emitText(safeKey(k), r[k], 0));
      }
    });
    return L.join('\n') + '\n';
  }

  function serializeAttente(a) {
    var L = [headerAttente(a), ''];
    L.push('id: ' + a.id);
    L.push('nom: ' + quoted(a.nom || ''));
    L.push('couleur: ' + quoted(a.couleur || ''));
    L.push('titre: ' + quoted(a.titre || ''));
    L.push(emitText('description', a.description || '', 0));
    L.push('');
    var nv = a.niveaux || [];
    if (!nv.length) {
      L.push('niveaux: []');
    } else {
      L.push('niveaux:');
      nv.forEach(function (n, i) {
        if (i > 0) L.push('');
        L.push('  - a_partir_de: ' + num(n.a_partir_de));
        L.push('    titre: ' + quoted(n.titre || ''));
        L.push(emitText('texte', n.texte || '', 4));
      });
    }
    return L.join('\n') + '\n';
  }

  /** Returns { 'questionnaire.yaml': text, 'rapport.yaml': text, 'attentes/<id>.yaml': text, … } */
  function configToFiles(config) {
    var files = {};
    files['questionnaire.yaml'] = serializeQuestionnaire(config);
    files['rapport.yaml'] = serializeRapport(config);
    config.attentes.forEach(function (a) {
      files['attentes/' + a.id + '.yaml'] = serializeAttente(a);
    });
    return files;
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  function yamlError(fileName, e) {
    var where = '';
    if (e && e.mark) where = ' (ligne ' + (e.mark.line + 1) + ', colonne ' + (e.mark.column + 1) + ')';
    return 'Le fichier « ' + fileName + ' » contient une erreur de syntaxe' + where + ' : ' + (e && e.reason ? e.reason : String(e && e.message || e));
  }

  function str(x) {
    return x === undefined || x === null ? '' : String(x);
  }

  function stubAttente(id) {
    return {
      id: id, nom: id, couleur: '#888888', titre: '', description: '',
      niveaux: [{ a_partir_de: 0, titre: '', texte: '' }]
    };
  }

  function normalizeAttente(raw, id) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var niveaux = Array.isArray(raw.niveaux) ? raw.niveaux : [];
    return {
      id: id,
      nom: str(raw.nom || id),
      couleur: str(raw.couleur || '#888888'),
      titre: str(raw.titre),
      description: str(raw.description).replace(/\s+$/, ''),
      niveaux: niveaux.map(function (n) {
        n = n || {};
        var t = Number(n.a_partir_de);
        return { a_partir_de: isFinite(t) ? t : 0, titre: str(n.titre), texte: str(n.texte).replace(/\s+$/, '') };
      })
    };
  }

  /**
   * Builds the internal config from YAML texts.
   * files: { questionnaire: text, rapport: text|null, attentes: { fileBaseName: text } }
   * Returns { config, problems: [{ level, message }] } — config is null on fatal error.
   */
  function configFromYamlTexts(files) {
    var problems = [];
    if (!jsyaml) throw new Error('js-yaml manquant');
    var q;
    if (!files.questionnaire) {
      return { config: null, problems: [{ level: 'erreur', message: 'Fichier « questionnaire.yaml » introuvable.' }] };
    }
    try {
      q = jsyaml.load(files.questionnaire);
    } catch (e) {
      return { config: null, problems: [{ level: 'erreur', message: yamlError('questionnaire.yaml', e) }] };
    }
    if (!q || typeof q !== 'object') {
      return { config: null, problems: [{ level: 'erreur', message: 'Le fichier « questionnaire.yaml » est vide ou mal formé.' }] };
    }
    var rapport = {};
    if (files.rapport) {
      try {
        rapport = jsyaml.load(files.rapport) || {};
      } catch (e2) {
        problems.push({ level: 'erreur', message: yamlError('rapport.yaml', e2) });
        rapport = {};
      }
    } else {
      problems.push({ level: 'attention', message: 'Fichier « rapport.yaml » introuvable : les textes généraux des rapports sont vides.' });
    }
    var rap = {};
    RAPPORT_FIELDS.forEach(function (f) { rap[f] = str(rapport[f]).replace(/\s+$/, ''); });
    Object.keys(rapport).forEach(function (k) {
      if (!(k in rap) && typeof rapport[k] === 'string') rap[k] = rapport[k];
    });

    var ids = Array.isArray(q.attentes) ? q.attentes.map(str) : [];
    var attFiles = files.attentes || {};
    var attentes = ids.map(function (id) {
      var text = attFiles[id];
      if (text === undefined) {
        problems.push({ level: 'erreur', message: 'Fichier « attentes/' + id + '.yaml » introuvable : attente « ' + id + ' » créée vide.' });
        return stubAttente(id);
      }
      var raw;
      try {
        raw = jsyaml.load(text);
      } catch (e3) {
        problems.push({ level: 'erreur', message: yamlError('attentes/' + id + '.yaml', e3) });
        return stubAttente(id);
      }
      if (raw && raw.id && String(raw.id) !== id) {
        problems.push({ level: 'attention', message: 'Le fichier « attentes/' + id + '.yaml » indique l’identifiant « ' + raw.id + ' » : l’identifiant « ' + id + ' » (nom du fichier) est utilisé.' });
      }
      return normalizeAttente(raw, id);
    });
    Object.keys(attFiles).forEach(function (k) {
      if (ids.indexOf(k) === -1) {
        problems.push({ level: 'info', message: 'Le fichier « attentes/' + k + '.yaml » n’est pas listé dans questionnaire.yaml : il est ignoré.' });
      }
    });

    var questions = (Array.isArray(q.questions) ? q.questions : []).map(function (qq, i) {
      qq = qq || {};
      return {
        id: str(qq.id || ('q' + (i + 1))),
        texte: str(qq.texte),
        reponses: (Array.isArray(qq.reponses) ? qq.reponses : []).map(function (r) {
          r = r || {};
          var poids = {};
          var src = r.poids && typeof r.poids === 'object' ? r.poids : {};
          Object.keys(src).forEach(function (k) {
            var w = Number(src[k]);
            poids[k] = isFinite(w) ? w : src[k];
          });
          return { texte: str(r.texte), poids: poids };
        })
      };
    });

    return {
      config: {
        titre: str(q.titre),
        colonne_identifiant: str(q.colonne_identifiant),
        colonne_horodatage: q.colonne_horodatage === undefined ? 'Horodateur' : str(q.colonne_horodatage),
        attentes: attentes,
        questions: questions,
        rapport: rap
      },
      problems: problems
    };
  }

  /**
   * Same as configFromYamlTexts, from a flat map of relative paths → text
   * (e.g. 'questionnaire.yaml', 'attentes/x.yaml', 'configuration/attentes/x.yaml').
   */
  function configFromPathMap(pathMap) {
    var files = { questionnaire: null, rapport: null, attentes: {} };
    Object.keys(pathMap).forEach(function (p) {
      var norm = p.replace(/\\/g, '/');
      var parts = norm.split('/');
      var base = parts[parts.length - 1];
      var parent = parts.length > 1 ? parts[parts.length - 2] : '';
      if (!/\.ya?ml$/i.test(base)) return;
      var stem = base.replace(/\.ya?ml$/i, '');
      if (parent.toLowerCase() === 'attentes') files.attentes[stem] = pathMap[p];
      else if (stem.toLowerCase() === 'questionnaire') files.questionnaire = pathMap[p];
      else if (stem.toLowerCase() === 'rapport') files.rapport = pathMap[p];
      else files.attentes[stem] = pathMap[p]; // loose attente file picked on its own
    });
    return configFromYamlTexts(files);
  }

  return {
    serializeQuestionnaire: serializeQuestionnaire,
    serializeRapport: serializeRapport,
    serializeAttente: serializeAttente,
    configToFiles: configToFiles,
    configFromYamlTexts: configFromYamlTexts,
    configFromPathMap: configFromPathMap,
    emitText: emitText
  };
});
