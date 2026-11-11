/*
 * core.js — pure logic of the "Questionnaire JDR" application.
 *
 * No DOM access here: CSV decoding/parsing, text normalisation and matching,
 * scoring, levels, statistics, configuration validation, exports.
 * Usable both in the browser (global QJ.core) and in Node (require), so it can
 * be unit-tested with `node --test`.
 */
(function (root, factory) {
  'use strict';
  var core = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = core;
  } else {
    root.QJ = root.QJ || {};
    root.QJ.core = core;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------------

  function deepClone(obj) {
    return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
  }

  function isNum(x) {
    return typeof x === 'number' && isFinite(x);
  }

  /** Formats a number the French way (decimal comma). */
  function formatNumber(x, decimals) {
    if (!isNum(x)) return '—';
    var d = decimals === undefined ? 0 : decimals;
    var s = x.toFixed(d);
    if (d > 0) s = s.replace(/\.?0+$/, '');
    if (s === '-0') s = '0';
    return s.replace('.', ',');
  }

  // ---------------------------------------------------------------------------
  // Text normalisation
  // ---------------------------------------------------------------------------

  var TRAILING_PUNCT = /[\s.,;:!?…'"»«)(\-–—]+$/;
  var LEADING_PUNCT = /^[\s.…,;:'"«»\-–—]+/;

  /**
   * Normalises a question/answer text so that small typographic differences
   * (apostrophes, quotes, ellipsis, case, spaces, trailing punctuation) do
   * not prevent matching.
   */
  function normalize(text) {
    if (text === null || text === undefined) return '';
    var s = String(text);
    try { s = s.normalize('NFKC'); } catch (e) { /* old engines */ }
    s = s.toLowerCase()
      .replace(/[‘’‚‛`´′]/g, "'")
      .replace(/[“”„‟«»″]/g, '"')
      .replace(/…/g, '...')
      .replace(/[‐‑‒–—−]/g, '-')
      .replace(/[\s   ​]+/g, ' ');
    // quotes followed/preceded by spaces (French typography « texte »)
    s = s.replace(/" /g, '"').replace(/ "/g, '"');
    // spaces before French double punctuation
    s = s.replace(/ ([!?;:])/g, '$1');
    s = s.replace(LEADING_PUNCT, '').replace(TRAILING_PUNCT, '');
    return s.trim();
  }

  /** Looser key: no accents, no punctuation at all. Used as a fallback. */
  function looseKey(text) {
    var s = normalize(text);
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* ignore */ }
    s = s.replace(/œ/g, 'oe').replace(/æ/g, 'ae');
    return s.replace(/[^a-z0-9]+/g, '');
  }

  /**
   * Builds a matcher over a list of candidate texts.
   * match(text) returns the index of the matching candidate or -1.
   */
  function makeMatcher(texts) {
    var exact = {};
    var loose = {};
    texts.forEach(function (t, i) {
      var n = normalize(t);
      if (!(n in exact)) exact[n] = i;
      var l = looseKey(t);
      if (l in loose) {
        if (loose[l] !== i) loose[l] = -2; // ambiguous
      } else {
        loose[l] = i;
      }
    });
    return function (text) {
      var n = normalize(text);
      if (n in exact) return exact[n];
      var l = looseKey(text);
      if (l && (l in loose) && loose[l] >= 0) return loose[l];
      return -1;
    };
  }

  // ---------------------------------------------------------------------------
  // CSV decoding & parsing
  // ---------------------------------------------------------------------------

  /**
   * Decodes raw bytes of a CSV file. Tries UTF-8 first; if the content is not
   * valid UTF-8 (typical of Excel re-saves on Windows), falls back to
   * windows-1252. Returns { text, encoding }.
   */
  function decodeBytes(bytes) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var start = 0;
    if (u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) start = 3;
    var body = u8.subarray(start);
    var text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(body);
      if (text.indexOf('�') === -1) return { text: stripBom(text), encoding: 'UTF-8' };
    } catch (e) { /* not valid UTF-8 */ }
    try {
      text = new TextDecoder('windows-1252').decode(body);
      return { text: stripBom(text), encoding: 'windows-1252' };
    } catch (e2) {
      text = new TextDecoder('utf-8').decode(body);
      return { text: stripBom(text), encoding: 'UTF-8 (avec erreurs)' };
    }
  }

  function stripBom(text) {
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  }

  /**
   * Detects the delimiter. Each candidate (, ; tab) is tried on the first
   * records: the one giving the same number of fields on every line (and the
   * most fields) wins; otherwise, the most frequent one in the header line.
   */
  function detectDelimiter(text) {
    var sample = String(text).slice(0, 65536);
    var lastNl = sample.lastIndexOf('\n');
    if (text.length > sample.length && lastNl > 0) sample = sample.slice(0, lastNl);
    var best = null;
    [',', ';', '\t'].forEach(function (d) {
      var rows = parseCSV(sample, d).slice(0, 20);
      if (!rows.length) return;
      var n = rows[0].length;
      if (n < 2) return;
      var consistent = rows.every(function (r) { return r.length === n; });
      if (consistent && (!best || n > best.n)) best = { d: d, n: n };
    });
    if (best) return best.d;
    var counts = { ',': 0, ';': 0, '\t': 0 };
    var inQuotes = false;
    for (var i = 0; i < sample.length; i++) {
      var c = sample[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (c === '\n' || c === '\r') break;
        if (c in counts) counts[c]++;
      }
    }
    var res = ',';
    if (counts[';'] > counts[res]) res = ';';
    if (counts['\t'] > counts[res]) res = '\t';
    return res;
  }

  /**
   * RFC-4180 style CSV parser (quoted fields, doubled quotes, newlines inside
   * quotes, CRLF/LF). Returns an array of rows (arrays of strings).
   * Completely empty lines are skipped.
   */
  function parseCSV(text, delimiter) {
    text = stripBom(String(text));
    var delim = delimiter || detectDelimiter(text);
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    var n = text.length;
    while (i < n) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === delim) { row.push(field); field = ''; i++; continue; }
      if (c === '\r' || c === '\n') {
        row.push(field); field = '';
        rows.push(row); row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
        i++; continue;
      }
      field += c; i++;
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(function (r) {
      return !(r.length === 1 && r[0].trim() === '') && r.some(function (v) { return v.trim() !== ''; });
    });
  }

  /** Parses a CSV text into { headers, rows, delimiter }. */
  function parseTable(text) {
    var delim = detectDelimiter(stripBom(String(text)));
    var all = parseCSV(text, delim);
    if (all.length === 0) return { headers: [], rows: [], delimiter: delim };
    return { headers: all[0], rows: all.slice(1), delimiter: delim };
  }

  // ---------------------------------------------------------------------------
  // Timestamps
  // ---------------------------------------------------------------------------

  /**
   * Parses Google Forms / Excel timestamps. Keeps the wall-clock time as
   * written (no timezone conversion). Returns
   * { raw, y, mo, d, h, mi, s, key, label } or null if not recognised.
   */
  function parseTimestamp(raw) {
    if (raw === null || raw === undefined) return null;
    var s = String(raw).trim();
    if (!s) return null;
    var m, y, mo, d, h = 0, mi = 0, sec = 0;
    // 2026/11/03 21:14:05 UTC+1   or 2026-11-03 21:14:05 / 2026-11-03T21:14:05
    m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      y = +m[1]; mo = +m[2]; d = +m[3];
    } else {
      // 03/11/2026 21:14:05 (French order, Google Sheets / Excel FR)
      m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (!m) return { raw: s, key: s, label: s };
      d = +m[1]; mo = +m[2]; y = +m[3];
      if (y < 100) y += 2000;
    }
    if (m[4] !== undefined) { h = +m[4]; mi = +m[5]; sec = m[6] !== undefined ? +m[6] : 0; }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return { raw: s, key: s, label: s };
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return {
      raw: s, y: y, mo: mo, d: d, h: h, mi: mi, s: sec,
      key: y + '-' + p(mo) + '-' + p(d) + ' ' + p(h) + ':' + p(mi) + ':' + p(sec),
      label: p(d) + '/' + p(mo) + '/' + y + (m[4] !== undefined ? ' ' + p(h) + 'h' + p(mi) : ''),
      dateLabel: p(d) + '/' + p(mo) + '/' + y
    };
  }

  // ---------------------------------------------------------------------------
  // Configuration helpers
  // ---------------------------------------------------------------------------

  /**
   * Internal configuration model:
   * {
   *   titre, colonne_identifiant, colonne_horodatage,
   *   attentes: [ { id, nom, couleur, titre, description, niveaux: [{a_partir_de, titre, texte}] } ],
   *   questions: [ { id, texte, reponses: [ { texte, poids: { attenteId: number } } ] } ],
   *   rapport: { titre_rapport_individuel, introduction, ... }
   * }
   */
  var RAPPORT_FIELDS = [
    'titre_rapport_individuel', 'introduction', 'titre_profil_dominant',
    'texte_profil_mixte', 'conclusion', 'pied_de_page',
    'titre_rapport_global', 'introduction_rapport_global'
  ];

  /** Maximum weight available for each attente in each question, summed. */
  function maxPoints(config) {
    var max = {};
    config.attentes.forEach(function (a) { max[a.id] = 0; });
    config.questions.forEach(function (q) {
      config.attentes.forEach(function (a) {
        var best = 0;
        (q.reponses || []).forEach(function (r) {
          var w = Number((r.poids || {})[a.id]) || 0;
          if (w > best) best = w;
        });
        max[a.id] += best;
      });
    });
    return max;
  }

  /** Returns the level object (and its index) reached for a score. */
  function levelFor(attente, score) {
    var niveaux = (attente && attente.niveaux) || [];
    if (!isNum(score) || niveaux.length === 0) return null;
    var idx = 0;
    for (var i = 0; i < niveaux.length; i++) {
      if (Number(niveaux[i].a_partir_de) <= score + 1e-9) idx = i;
    }
    return { index: idx, number: idx + 1, total: niveaux.length, niveau: niveaux[idx] };
  }

  // ---------------------------------------------------------------------------
  // Matching a table with the configuration
  // ---------------------------------------------------------------------------

  // Compared with looseKey (lowercase, no accents, spaces and punctuation removed).
  var IDENTIFIER_HEADERS = /^(pseudo|pseudonyme|nom|prenom|nomprenom|prenomnom|nometprenom|nomcomplet|email|mail|adresseemail|adressemail|adresseelectronique|courriel|name|username|firstname|lastname|fullname|emailaddress|identifiant)$/;

  /**
   * True when a column that matches no question looks like a player identifier
   * (pseudo, name, e-mail...): either its header is in a small FR/EN list, or
   * its (short) values are almost all distinct and match no configured answer.
   */
  function looksLikeIdentifier(header, values, answerMatch) {
    var key = looseKey(header);
    if (IDENTIFIER_HEADERS.test(key)) return true;
    var filled = [];
    values.forEach(function (v) { var t = String(v === undefined || v === null ? '' : v).trim(); if (t) filled.push(t); });
    if (filled.length < 5) return false;
    var seen = {};
    var distinct = 0;
    var tooLong = 0;
    var answers = 0;
    filled.forEach(function (t) {
      var k = normalize(t);
      if (!(k in seen)) { seen[k] = true; distinct++; }
      if (t.length > 60) tooLong++;
      if (answerMatch(t) >= 0) answers++;
    });
    return tooLong === 0 && answers === 0 && distinct >= 0.9 * filled.length;
  }

  /**
   * Matches the CSV table with the configuration.
   * Returns {
   *   respondents: [{ index, name, timestamp, answers: { qid: answerIndex|null }, unanswered, unknown }],
   *   columns: { timestamp, identifier, questions: { qid: colIndex } },
   *   warnings: [{ level: 'erreur'|'attention'|'info', message, details? }],
   *   unmatchedColumns: [header], identifierColumns: [header] (subset of unmatchedColumns that look like a player name), missingQuestions: [qid], unmatchedValues: [{ qid, value, count }]
   * }
   */
  function matchTable(config, table) {
    var headers = table.headers || [];
    var warnings = [];
    var tsNorm = normalize(config.colonne_horodatage || '');
    var idNorm = normalize(config.colonne_identifiant || '');
    var qMatch = makeMatcher(config.questions.map(function (q) { return q.texte; }));
    var columns = { timestamp: -1, identifier: -1, questions: {} };
    var unmatchedColumns = [];
    var duplicateColumns = [];

    headers.forEach(function (h, col) {
      var n = normalize(h);
      if (tsNorm && n === tsNorm && columns.timestamp === -1) { columns.timestamp = col; return; }
      if (idNorm && n === idNorm && columns.identifier === -1) { columns.identifier = col; return; }
      var qi = qMatch(h);
      if (qi >= 0) {
        var qid = config.questions[qi].id;
        if (qid in columns.questions) duplicateColumns.push(h);
        else columns.questions[qid] = col;
        return;
      }
      if (String(h).trim() === '') return;
      unmatchedColumns.push(h);
    });

    if (headers.length === 0) {
      warnings.push({ level: 'erreur', message: 'Le fichier est vide ou illisible.' });
    }
    if (config.colonne_horodatage && columns.timestamp === -1 && headers.length) {
      warnings.push({ level: 'attention', message: 'Colonne de date « ' + config.colonne_horodatage + ' » introuvable : les dates ne seront pas affichées.' });
    }
    if (config.colonne_identifiant && columns.identifier === -1 && headers.length) {
      warnings.push({ level: 'attention', message: 'Colonne d’identifiant « ' + config.colonne_identifiant + ' » introuvable : les joueurs seront appelés « Répondant 1 », « Répondant 2 »…' });
    }
    var allAnswers = [];
    config.questions.forEach(function (q) { (q.reponses || []).forEach(function (r) { allAnswers.push(r.texte); }); });
    var anyAnswerMatch = makeMatcher(allAnswers);
    var identifierColumns = [];
    unmatchedColumns.forEach(function (h) {
      var col = headers.indexOf(h);
      var values = (table.rows || []).map(function (row) { return row[col]; });
      if (looksLikeIdentifier(h, values, anyAnswerMatch)) {
        identifierColumns.push(h);
        warnings.push({ level: 'attention', kind: 'identifiant', column: h, message: 'Colonne non reconnue (ignorée) : « ' + h + ' ». Cette colonne ressemble à un nom de joueur : cliquez sur « Utiliser comme colonne identifiant » ou choisissez-la dans Configuration › Général › « Colonne contenant le nom ou le pseudo du joueur »' });
      } else {
        warnings.push({ level: 'attention', kind: 'colonne', message: 'Colonne non reconnue (ignorée) : « ' + h + ' »' });
      }
    });
    duplicateColumns.forEach(function (h) {
      warnings.push({ level: 'attention', message: 'Question présente plusieurs fois dans le fichier (seule la première colonne est utilisée) : « ' + h + ' »' });
    });
    var missingQuestions = [];
    config.questions.forEach(function (q, i) {
      if (!(q.id in columns.questions)) {
        missingQuestions.push(q.id);
        if (headers.length) {
          warnings.push({ level: 'attention', kind: 'question', message: 'Question ' + (i + 1) + ' absente du fichier : « ' + q.texte + ' »' });
        }
      }
    });

    var answerMatchers = {};
    config.questions.forEach(function (q) {
      answerMatchers[q.id] = makeMatcher((q.reponses || []).map(function (r) { return r.texte; }));
    });

    var unmatchedMap = {};
    var unmatchedValues = [];
    var respondents = [];
    (table.rows || []).forEach(function (row, ri) {
      var r = {
        index: ri + 1,
        name: 'Répondant ' + (ri + 1),
        timestamp: null,
        answers: {},
        unanswered: 0,
        unknown: 0
      };
      if (columns.identifier >= 0) {
        var nm = String(row[columns.identifier] || '').trim();
        if (nm) r.name = nm;
      }
      if (columns.timestamp >= 0) r.timestamp = parseTimestamp(row[columns.timestamp]);
      config.questions.forEach(function (q) {
        var col = columns.questions[q.id];
        if (col === undefined) { r.answers[q.id] = null; r.unanswered++; return; }
        var val = row[col] === undefined ? '' : String(row[col]);
        if (val.trim() === '') { r.answers[q.id] = null; r.unanswered++; return; }
        var ai = answerMatchers[q.id](val);
        if (ai < 0) {
          r.answers[q.id] = null; r.unknown++; r.unanswered++;
          var key = q.id + '\u0000' + normalize(val);
          if (!unmatchedMap[key]) {
            unmatchedMap[key] = { qid: q.id, value: val.trim(), count: 0 };
            unmatchedValues.push(unmatchedMap[key]);
          }
          unmatchedMap[key].count++;
          return;
        }
        r.answers[q.id] = ai;
      });
      respondents.push(r);
    });

    unmatchedValues.forEach(function (u) {
      var qi = indexOfQuestion(config, u.qid);
      warnings.push({
        level: 'attention', kind: 'reponse',
        message: 'Réponse non reconnue à la question ' + (qi + 1) + ' (' + u.count + ' fois) : « ' + u.value + ' »',
        details: 'Question : « ' + config.questions[qi].texte + ' ». Cette réponse compte comme « sans réponse ».'
      });
    });

    if (headers.length && respondents.length === 0) {
      warnings.push({ level: 'attention', message: 'Le fichier ne contient aucune réponse (seulement la ligne de titres).' });
    }
    var withMissing = respondents.filter(function (r) { return r.unanswered > 0; }).length;
    if (withMissing > 0) {
      warnings.push({ level: 'info', message: withMissing + ' répondant(s) ont au moins une question sans réponse (comptée 0 point).' });
    }

    return {
      respondents: respondents,
      columns: columns,
      warnings: warnings,
      unmatchedColumns: unmatchedColumns,
      identifierColumns: identifierColumns,
      missingQuestions: missingQuestions,
      unmatchedValues: unmatchedValues
    };
  }

  function indexOfQuestion(config, qid) {
    for (var i = 0; i < config.questions.length; i++) if (config.questions[i].id === qid) return i;
    return -1;
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /**
   * Computes the scores of a respondent.
   * answers: { qid: answerIndex|null }
   * Returns { scores: { id: number|null }, points: {id}, max: {id}, levels: {id: level|null},
   *           dominant: [ids], ranking: [ids sorted by score desc] }
   */
  function scoreRespondent(config, answers, maxCache) {
    var max = maxCache || maxPoints(config);
    var points = {};
    config.attentes.forEach(function (a) { points[a.id] = 0; });
    config.questions.forEach(function (q) {
      var ai = answers[q.id];
      if (ai === null || ai === undefined) return;
      var rep = (q.reponses || [])[ai];
      if (!rep) return;
      config.attentes.forEach(function (a) {
        var w = Number((rep.poids || {})[a.id]) || 0;
        points[a.id] += w;
      });
    });
    var scores = {};
    var levels = {};
    config.attentes.forEach(function (a) {
      scores[a.id] = max[a.id] > 0 ? (100 * points[a.id] / max[a.id]) : null;
      levels[a.id] = levelFor(a, scores[a.id]);
    });
    return {
      scores: scores, points: points, max: max, levels: levels,
      dominant: dominantOf(config, scores),
      ranking: rankingOf(config, scores)
    };
  }

  function dominantOf(config, scores) {
    var best = -Infinity;
    config.attentes.forEach(function (a) {
      var s = scores[a.id];
      if (isNum(s) && s > best) best = s;
    });
    if (!isFinite(best) || best <= 0) return [];
    return config.attentes.filter(function (a) {
      return isNum(scores[a.id]) && Math.abs(scores[a.id] - best) < 1e-9;
    }).map(function (a) { return a.id; });
  }

  function rankingOf(config, scores) {
    var order = config.attentes.map(function (a, i) { return { id: a.id, i: i, s: scores[a.id] }; });
    order.sort(function (x, y) {
      var sx = isNum(x.s) ? x.s : -1;
      var sy = isNum(y.s) ? y.s : -1;
      return sy - sx || x.i - y.i;
    });
    return order.map(function (o) { return o.id; });
  }

  /** Full analysis: match + scores for every respondent. */
  function analyze(config, table) {
    var matched = matchTable(config, table);
    var max = maxPoints(config);
    matched.respondents.forEach(function (r) {
      var res = scoreRespondent(config, r.answers, max);
      r.scores = res.scores;
      r.points = res.points;
      r.levels = res.levels;
      r.dominant = res.dominant;
      r.ranking = res.ranking;
    });
    matched.max = max;
    return matched;
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  function cleanValues(values) {
    return values.filter(isNum);
  }

  function mean(values) {
    var v = cleanValues(values);
    if (!v.length) return null;
    return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
  }

  function median(values) {
    var v = cleanValues(values).slice().sort(function (a, b) { return a - b; });
    if (!v.length) return null;
    var m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  /** Sample standard deviation (n - 1), like Excel's ECARTYPE. 0 for a single value. */
  function stdDev(values) {
    var v = cleanValues(values);
    if (!v.length) return null;
    if (v.length === 1) return 0;
    var mu = mean(v);
    var ss = v.reduce(function (acc, x) { return acc + (x - mu) * (x - mu); }, 0);
    return Math.sqrt(ss / (v.length - 1));
  }

  function minOf(values) {
    var v = cleanValues(values);
    return v.length ? Math.min.apply(null, v) : null;
  }

  function maxOf(values) {
    var v = cleanValues(values);
    return v.length ? Math.max.apply(null, v) : null;
  }

  /** Pearson correlation on paired values (pairs with a missing value are skipped). */
  function correlation(xs, ys) {
    var px = [], py = [];
    for (var i = 0; i < Math.min(xs.length, ys.length); i++) {
      if (isNum(xs[i]) && isNum(ys[i])) { px.push(xs[i]); py.push(ys[i]); }
    }
    if (px.length < 2) return null;
    var mx = mean(px), my = mean(py);
    var sxy = 0, sxx = 0, syy = 0;
    for (var j = 0; j < px.length; j++) {
      var dx = px[j] - mx, dy = py[j] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    if (sxx === 0 || syy === 0) return null;
    return sxy / Math.sqrt(sxx * syy);
  }

  /** 10-point bins: [0,10), [10,20), …, [90,100]. */
  function histogram(values, binWidth) {
    var w = binWidth || 10;
    var nb = Math.ceil(100 / w);
    var bins = [];
    for (var i = 0; i < nb; i++) bins.push({ from: i * w, to: Math.min(100, (i + 1) * w), count: 0 });
    cleanValues(values).forEach(function (x) {
      var b = Math.floor(x / w);
      if (b >= nb) b = nb - 1;
      if (b < 0) b = 0;
      bins[b].count++;
    });
    return bins;
  }

  /** Global statistics over an analysis. */
  function globalStats(config, analysis) {
    var resp = analysis.respondents;
    var perAttente = {};
    config.attentes.forEach(function (a) {
      var vals = resp.map(function (r) { return r.scores[a.id]; });
      var levelsCount = (a.niveaux || []).map(function () { return 0; });
      resp.forEach(function (r) {
        var lv = r.levels[a.id];
        if (lv) levelsCount[lv.index]++;
      });
      perAttente[a.id] = {
        mean: mean(vals), median: median(vals), std: stdDev(vals),
        min: minOf(vals), max: maxOf(vals),
        histogram: histogram(vals),
        levels: levelsCount,
        dominantCount: resp.filter(function (r) { return r.dominant.length === 1 && r.dominant[0] === a.id; }).length,
        sharedDominantCount: resp.filter(function (r) { return r.dominant.length > 1 && r.dominant.indexOf(a.id) >= 0; }).length
      };
    });
    var corr = config.attentes.map(function (a) {
      return config.attentes.map(function (b) {
        if (a.id === b.id) {
          var ok = resp.filter(function (r) { return isNum(r.scores[a.id]); }).length >= 2 && (stdDev(resp.map(function (r) { return r.scores[a.id]; })) || 0) > 0;
          return ok ? 1 : null;
        }
        return correlation(
          resp.map(function (r) { return r.scores[a.id]; }),
          resp.map(function (r) { return r.scores[b.id]; })
        );
      });
    });
    var mixed = {};
    var mixedCount = 0;
    var undetermined = 0;
    resp.forEach(function (r) {
      if (r.dominant.length === 0) undetermined++;
      if (r.dominant.length > 1) {
        mixedCount++;
        var key = r.dominant.join('+');
        mixed[key] = (mixed[key] || 0) + 1;
      }
    });
    var stamps = resp.map(function (r) { return r.timestamp; }).filter(function (t) { return t && t.y; });
    stamps.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
    // per-question answer distribution
    var questions = config.questions.map(function (q) {
      var counts = (q.reponses || []).map(function () { return 0; });
      var none = 0;
      resp.forEach(function (r) {
        var ai = r.answers[q.id];
        if (ai === null || ai === undefined) none++;
        else counts[ai]++;
      });
      return { id: q.id, counts: counts, none: none };
    });
    return {
      count: resp.length,
      first: stamps.length ? stamps[0] : null,
      last: stamps.length ? stamps[stamps.length - 1] : null,
      perAttente: perAttente,
      correlation: corr,
      mixed: mixed,
      mixedCount: mixedCount,
      undetermined: undetermined,
      questions: questions
    };
  }

  // ---------------------------------------------------------------------------
  // Configuration validation
  // ---------------------------------------------------------------------------

  /**
   * Validates a configuration. Returns a list of
   * { level: 'erreur'|'attention', section: 'attentes'|'questions'|'rapport'|'general', message, ref }
   */
  function validateConfig(config) {
    var out = [];
    function add(level, section, message, ref) { out.push({ level: level, section: section, message: message, ref: ref || null }); }

    if (!config || typeof config !== 'object') {
      add('erreur', 'general', 'Configuration absente ou illisible.');
      return out;
    }
    var attentes = config.attentes || [];
    var questions = config.questions || [];
    if (!attentes.length) add('erreur', 'attentes', 'Aucune attente ludique n’est définie.');
    if (!questions.length) add('erreur', 'questions', 'Aucune question n’est définie.');

    var ids = {};
    attentes.forEach(function (a, i) {
      var label = 'Attente « ' + (a.nom || a.id || ('n°' + (i + 1))) + ' »';
      if (!a.id || !/^[a-z0-9_-]+$/.test(a.id)) {
        add('erreur', 'attentes', label + ' : identifiant invalide (« ' + (a.id || '') + ' »). Utilisez seulement des lettres minuscules sans accent, des chiffres, « - » ou « _ ».', a.id);
      }
      if (a.id in ids) add('erreur', 'attentes', label + ' : identifiant « ' + a.id + ' » utilisé deux fois.', a.id);
      ids[a.id] = true;
      if (!String(a.nom || '').trim()) add('attention', 'attentes', label + ' : le nom est vide.', a.id);
      if (!/^#[0-9a-fA-F]{6}$/.test(String(a.couleur || ''))) add('attention', 'attentes', label + ' : couleur invalide (« ' + (a.couleur || '') + ' »), format attendu « #RRGGBB ».', a.id);
      var nv = a.niveaux || [];
      if (!nv.length) {
        add('erreur', 'attentes', label + ' : aucun niveau défini.', a.id);
      } else {
        if (Number(nv[0].a_partir_de) !== 0) add('erreur', 'attentes', label + ' : le premier niveau doit commencer à 0 % (actuellement ' + nv[0].a_partir_de + ').', a.id);
        for (var k = 0; k < nv.length; k++) {
          var t = nv[k].a_partir_de;
          if (!isNum(Number(t)) || t === '' || t === null || t === undefined) {
            add('erreur', 'attentes', label + ' : le seuil du niveau ' + (k + 1) + ' n’est pas un nombre.', a.id);
          } else if (Number(t) < 0 || Number(t) > 100) {
            add('erreur', 'attentes', label + ' : le seuil du niveau ' + (k + 1) + ' doit être compris entre 0 et 100.', a.id);
          }
          if (k > 0 && !(Number(t) > Number(nv[k - 1].a_partir_de))) {
            add('erreur', 'attentes', label + ' : les seuils doivent être strictement croissants (niveau ' + (k + 1) + ' : ' + t + ' % après ' + nv[k - 1].a_partir_de + ' %).', a.id);
          }
          if (!String(nv[k].titre || '').trim()) add('attention', 'attentes', label + ' : le niveau ' + (k + 1) + ' n’a pas de titre.', a.id);
        }
      }
    });

    var max = attentes.length ? maxPoints({ attentes: attentes.filter(function (a) { return a.id; }), questions: questions }) : {};
    attentes.forEach(function (a) {
      if (a.id && max[a.id] === 0 && questions.length) {
        add('erreur', 'attentes', 'Attente « ' + (a.nom || a.id) + ' » : aucune réponse ne lui donne de points, son score ne peut pas être calculé (affiché « — »).', a.id);
      }
    });

    var seenQ = {};
    var seenQid = {};
    questions.forEach(function (q, i) {
      var label = 'Question ' + (i + 1);
      var key = normalize(q.texte);
      if (!key) add('erreur', 'questions', label + ' : le texte est vide.', q.id);
      else if (key in seenQ) add('erreur', 'questions', label + ' : même texte que la question ' + (seenQ[key] + 1) + ' (doublon).', q.id);
      else seenQ[key] = i;
      if (!q.id) add('erreur', 'questions', label + ' : identifiant manquant.', q.id);
      else if (q.id in seenQid) add('erreur', 'questions', label + ' : identifiant « ' + q.id + ' » utilisé deux fois.', q.id);
      seenQid[q.id] = true;
      var reps = q.reponses || [];
      if (reps.length < 2) add('attention', 'questions', label + ' : moins de deux réponses.', q.id);
      var seenR = {};
      reps.forEach(function (r, j) {
        var rl = label + ', réponse ' + (j + 1);
        var rk = normalize(r.texte);
        if (!rk) add('erreur', 'questions', rl + ' : le texte est vide.', q.id);
        else if (rk in seenR) add('erreur', 'questions', rl + ' : même texte que la réponse ' + (seenR[rk] + 1) + ' (doublon).', q.id);
        else seenR[rk] = j;
        var poids = r.poids || {};
        var total = 0;
        Object.keys(poids).forEach(function (aid) {
          var w = poids[aid];
          if (!(aid in ids)) add('erreur', 'questions', rl + ' : attente inconnue « ' + aid + ' » dans les poids.', q.id);
          if (!isNum(Number(w)) || w === '' || w === null) add('erreur', 'questions', rl + ' : le poids pour « ' + aid + ' » n’est pas un nombre.', q.id);
          else if (Number(w) < 0) add('erreur', 'questions', rl + ' : poids négatif pour « ' + aid + ' ».', q.id);
          else total += Number(w);
        });
        if (total === 0) add('attention', 'questions', rl + ' : cette réponse ne donne aucun point (tous les poids sont à 0).', q.id);
      });
    });

    var rapport = config.rapport || {};
    RAPPORT_FIELDS.forEach(function (f) {
      if (!String(rapport[f] || '').trim()) add('attention', 'rapport', 'Texte du rapport « ' + f + ' » vide.', f);
    });
    if (config.colonne_horodatage === undefined) add('attention', 'general', 'Nom de la colonne de date non défini.');
    return out;
  }

  // ---------------------------------------------------------------------------
  // Proposals from a CSV (when the form evolves)
  // ---------------------------------------------------------------------------

  /**
   * Finds questions (columns) and answers present in a CSV but absent from the
   * configuration. Returns { newQuestions: [{ texte, reponses: [{texte, count}], identifier }],
   *                          newAnswers: [{ qid, qIndex, texte, count }] }
   */
  function proposeFromTable(config, table) {
    var matched = matchTable(config, table);
    var newQuestions = matched.unmatchedColumns.map(function (h) {
      var col = (table.headers || []).indexOf(h);
      var seen = {};
      var list = [];
      (table.rows || []).forEach(function (row) {
        var v = String(row[col] || '').trim();
        if (!v) return;
        var k = normalize(v);
        if (!(k in seen)) { seen[k] = { texte: v, count: 0 }; list.push(seen[k]); }
        seen[k].count++;
      });
      return { texte: String(h).trim(), reponses: list, identifier: matched.identifierColumns.indexOf(h) !== -1 };
    });
    var newAnswers = matched.unmatchedValues.map(function (u) {
      return { qid: u.qid, qIndex: indexOfQuestion(config, u.qid), texte: u.value, count: u.count };
    });
    return { newQuestions: newQuestions, newAnswers: newAnswers };
  }

  /**
   * Threshold for a level appended after the current last one: last + 10,
   * capped so that it stays strictly above `last` (midpoint towards 100).
   * Returns null when no valid threshold remains (last >= 99.5 or so).
   */
  function nextLevelThreshold(last) {
    last = Number(last);
    if (!isFinite(last)) last = 0;
    if (last >= 99) return null;
    var next = last + 10;
    if (next > 100) next = Math.round((last + 100) / 2);
    if (next <= last) next = last + 1;
    return next <= 100 ? next : null;
  }

  /** Generates an unused question id (q01, q02, …). */
  function nextQuestionId(config) {
    var used = {};
    config.questions.forEach(function (q) { used[q.id] = true; });
    for (var i = 1; i < 10000; i++) {
      var id = 'q' + (i < 10 ? '0' : '') + i;
      if (!used[id]) return id;
    }
    return 'q' + Date.now();
  }

  /** Builds a safe attente id from a name. */
  function slugify(text) {
    var s = String(text || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* ignore */ }
    s = s.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return s || 'attente';
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  /** Safe file name (French accents kept, forbidden characters removed). */
  function safeFileName(name) {
    var s = String(name || '').replace(/[\\\/:*?"<>|\u0000-\u001F]+/g, ' ')
      .replace(/\s+/g, ' ').trim().replace(/^\.+/, '').replace(/[. ]+$/, '');
    if (!s) s = 'sans_nom';
    if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s = '_' + s;
    return s.slice(0, 80);
  }

  /** Assigns unique file names to respondents. Returns array aligned with respondents. */
  function uniqueFileNames(respondents, prefix, ext) {
    var used = {};
    return respondents.map(function (r) {
      var base = safeFileName((prefix || '') + r.name);
      var name = base;
      var k = 2;
      while (used[name.toLowerCase()]) { name = base + ' (' + k + ')'; k++; }
      used[name.toLowerCase()] = true;
      return name + (ext || '');
    });
  }

  function csvCell(v, sep) {
    var s = v === null || v === undefined ? '' : String(v);
    if (s.indexOf(sep) >= 0 || s.indexOf('"') >= 0 || /[\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /** Scores export for Excel FR: ';' separator, decimal comma, UTF-8 BOM. */
  function scoresToCSV(config, analysis) {
    var sep = ';';
    var head = ['Répondant', 'Date'];
    config.attentes.forEach(function (a) { head.push(a.nom + ' (%)'); });
    config.attentes.forEach(function (a) { head.push(a.nom + ' – niveau'); });
    head.push('Attente(s) principale(s)', 'Questions sans réponse');
    var lines = [head.map(function (h) { return csvCell(h, sep); }).join(sep)];
    var names = {};
    config.attentes.forEach(function (a) { names[a.id] = a.nom; });
    analysis.respondents.forEach(function (r) {
      var cells = [r.name, r.timestamp ? (r.timestamp.label || r.timestamp.raw) : ''];
      config.attentes.forEach(function (a) { cells.push(formatNumber(r.scores[a.id], 1)); });
      config.attentes.forEach(function (a) {
        var lv = r.levels[a.id];
        cells.push(lv ? (lv.number + '/' + lv.total + ' – ' + (lv.niveau.titre || '')) : '—');
      });
      cells.push(r.dominant.map(function (id) { return names[id]; }).join(' + '));
      cells.push(r.unanswered);
      lines.push(cells.map(function (c) { return csvCell(c, sep); }).join(sep));
    });
    return '\uFEFF' + lines.join('\r\n') + '\r\n';
  }

  /** Replaces {placeholders} in report texts. */
  function fillPlaceholders(text, vars) {
    return String(text || '').replace(/\{([a-z_]+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
    });
  }

  return {
    deepClone: deepClone,
    isNum: isNum,
    formatNumber: formatNumber,
    normalize: normalize,
    looseKey: looseKey,
    makeMatcher: makeMatcher,
    decodeBytes: decodeBytes,
    detectDelimiter: detectDelimiter,
    parseCSV: parseCSV,
    parseTable: parseTable,
    parseTimestamp: parseTimestamp,
    RAPPORT_FIELDS: RAPPORT_FIELDS,
    maxPoints: maxPoints,
    levelFor: levelFor,
    matchTable: matchTable,
    scoreRespondent: scoreRespondent,
    analyze: analyze,
    mean: mean,
    median: median,
    stdDev: stdDev,
    correlation: correlation,
    histogram: histogram,
    globalStats: globalStats,
    validateConfig: validateConfig,
    proposeFromTable: proposeFromTable,
    looksLikeIdentifier: looksLikeIdentifier,
    nextLevelThreshold: nextLevelThreshold,
    nextQuestionId: nextQuestionId,
    slugify: slugify,
    safeFileName: safeFileName,
    uniqueFileNames: uniqueFileNames,
    scoresToCSV: scoresToCSV,
    fillPlaceholders: fillPlaceholders
  };
});
