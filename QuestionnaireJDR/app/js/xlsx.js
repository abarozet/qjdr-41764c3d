/*
 * xlsx.js — minimal reader for the first sheet of an .xlsx file (as exported
 * by Google Sheets / Excel), built on JSZip. Returns the same
 * { headers, rows } table shape as core.parseTable. Dates stored as Excel
 * serial numbers are converted to "AAAA/MM/JJ HH:MM:SS".
 * Browser: QJ.xlsx (uses global JSZip). Node: require (pass JSZip).
 */
(function (root, factory) {
  'use strict';
  var mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.QJ = root.QJ || {};
    root.QJ.xlsx = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function unescapeXml(s) {
    return s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, function (m, e) {
      if (e === 'lt') return '<';
      if (e === 'gt') return '>';
      if (e === 'amp') return '&';
      if (e === 'quot') return '"';
      if (e === 'apos') return "'";
      if (e[1] === 'x') return String.fromCodePoint(parseInt(e.slice(2), 16));
      return String.fromCodePoint(parseInt(e.slice(1), 10));
    });
  }

  function textOf(xml) {
    var out = '';
    var re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    var m;
    while ((m = re.exec(xml))) out += unescapeXml(m[1]);
    return out;
  }

  function colIndex(ref) {
    var letters = (ref.match(/^[A-Z]+/) || ['A'])[0];
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
  }

  function pad(x) { return (x < 10 ? '0' : '') + x; }

  function serialToDate(v) {
    var ms = Math.round((v - 25569) * 86400 * 1000);
    var d = new Date(ms);
    return d.getUTCFullYear() + '/' + pad(d.getUTCMonth() + 1) + '/' + pad(d.getUTCDate()) + ' ' +
      pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  }

  function attr(tag, name) {
    var m = tag.match(new RegExp('\\s' + name + '="([^"]*)"'));
    return m ? m[1] : null;
  }

  /** Reads the first worksheet. data: ArrayBuffer/Uint8Array. Returns a Promise. */
  function readXlsx(data, JSZipLib) {
    var Z = JSZipLib || (typeof JSZip !== 'undefined' ? JSZip : null);
    if (!Z) return Promise.reject(new Error('JSZip manquant'));
    return Z.loadAsync(data).then(function (zip) {
      function read(path) {
        var f = zip.file(path);
        return f ? f.async('string') : Promise.resolve(null);
      }
      return Promise.all([read('xl/workbook.xml'), read('xl/_rels/workbook.xml.rels'), read('xl/sharedStrings.xml'), read('xl/styles.xml')])
        .then(function (parts) {
          var wb = parts[0], rels = parts[1], ss = parts[2], styles = parts[3];
          if (!wb) throw new Error('Ce fichier n’est pas un classeur Excel (.xlsx) valide.');
          var sheetPath = 'xl/worksheets/sheet1.xml';
          var sheetTag = wb.match(/<sheet\s[^>]*>/);
          if (sheetTag && rels) {
            var rid = attr(sheetTag[0], 'r:id');
            var relRe = /<Relationship\s[^>]*>/g;
            var m;
            while ((m = relRe.exec(rels))) {
              if (attr(m[0], 'Id') === rid) {
                var target = attr(m[0], 'Target');
                sheetPath = target.charAt(0) === '/' ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
              }
            }
          }
          var shared = [];
          if (ss) {
            var siRe = /<si>([\s\S]*?)<\/si>/g;
            var sm;
            while ((sm = siRe.exec(ss))) shared.push(textOf(sm[1]));
          }
          var dateStyles = {};
          if (styles) {
            var custom = {};
            var nfRe = /<numFmt\s[^>]*>/g;
            var nm;
            while ((nm = nfRe.exec(styles))) custom[attr(nm[0], 'numFmtId')] = attr(nm[0], 'formatCode') || '';
            var xfs = styles.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/);
            if (xfs) {
              var xfRe = /<xf\s[^>]*?(?:\/>|>)/g;
              var xm, k = 0;
              while ((xm = xfRe.exec(xfs[1]))) {
                var id = Number(attr(xm[0], 'numFmtId') || 0);
                var code = custom[id];
                var isDate = (id >= 14 && id <= 22) || (id >= 45 && id <= 47) ||
                  (code !== undefined && /[dmyhs]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]/g, '')));
                if (isDate) dateStyles[k] = true;
                k++;
              }
            }
          }
          return read(sheetPath).then(function (sheet) {
            if (!sheet) throw new Error('Feuille de calcul introuvable dans le fichier.');
            var rows = [];
            var rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g;
            var rm;
            while ((rm = rowRe.exec(sheet))) {
              var row = [];
              var cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
              var cm;
              var body = rm[1] || '';
              while ((cm = cellRe.exec(body))) {
                var tag = '<c ' + cm[1] + '>';
                var ref = attr(tag, 'r');
                var t = attr(tag, 't');
                var s = attr(tag, 's');
                var inner = cm[2] || '';
                var vm = inner.match(/<v>([\s\S]*?)<\/v>/);
                var v = vm ? unescapeXml(vm[1]) : '';
                var value;
                if (t === 's') value = shared[Number(v)] || '';
                else if (t === 'inlineStr') value = textOf(inner);
                else if (t === 'b') value = v === '1' ? 'VRAI' : 'FAUX';
                else if (t === 'str' || t === 'e') value = v;
                else if (v !== '' && s !== null && dateStyles[Number(s)]) value = serialToDate(Number(v));
                else value = v;
                var ci = ref ? colIndex(ref) : row.length;
                while (row.length < ci) row.push('');
                row[ci] = value;
              }
              if (row.some(function (x) { return String(x).trim() !== ''; })) rows.push(row);
            }
            if (!rows.length) return { headers: [], rows: [] };
            var width = rows[0].length;
            var data2 = rows.slice(1).map(function (r) { while (r.length < width) r.push(''); return r; });
            return { headers: rows[0], rows: data2 };
          });
        });
    });
  }

  return { readXlsx: readXlsx, serialToDate: serialToDate };
});
