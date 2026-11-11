/*
 * files.js — everything that touches files: reading response files (CSV, ZIP
 * from Google Forms, XLSX), reading/writing the configuration folder (File
 * System Access API in Edge/Chrome, with the folder handle remembered in
 * IndexedDB), and the fallback (pick/drop files, download a ZIP).
 * Global QJ.files.
 */
(function (QJ) {
  'use strict';
  var core = QJ.core;
  var util = QJ.util;

  // ---------------------------------------------------------------------------
  // Response files
  // ---------------------------------------------------------------------------

  function ext(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }

  /** Returns a Promise of { fileName, table, encoding, delimiter }. */
  function loadDataFile(file) {
    var e = ext(file.name);
    if (e === 'xls' || e === 'ods' || e === 'numbers') {
      return Promise.reject(new Error('Le format « .' + e + ' » n’est pas pris en charge. Dans Google Forms, utilisez « Télécharger les réponses (.csv) » ; dans Excel, « Enregistrer sous… » au format CSV.'));
    }
    return util.readFileBuffer(file).then(function (buf) {
      return loadDataBuffer(new Uint8Array(buf), file.name);
    });
  }

  function loadDataBuffer(bytes, name) {
    var e = ext(name);
    var isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4B;
    if (isZip && e !== 'xlsx') {
      return JSZip.loadAsync(bytes).then(function (zip) {
        var entries = Object.keys(zip.files).filter(function (p) { return !zip.files[p].dir && /\.(csv|xlsx)$/i.test(p) && !/__MACOSX/.test(p); });
        if (!entries.length) throw new Error('L’archive « ' + name + ' » ne contient aucun fichier CSV.');
        var entry = entries[0];
        return zip.file(entry).async('uint8array').then(function (inner) {
          return loadDataBuffer(inner, entry.split('/').pop());
        });
      });
    }
    if (e === 'xlsx' || isZip) {
      return QJ.xlsx.readXlsx(bytes).then(function (table) {
        return { fileName: name, table: table, encoding: 'Excel (.xlsx)', delimiter: '' };
      });
    }
    var dec = core.decodeBytes(bytes);
    var table = core.parseTable(dec.text);
    if (!table.headers.length) return Promise.reject(new Error('Le fichier « ' + name + ' » est vide.'));
    return Promise.resolve({ fileName: name, table: table, encoding: dec.encoding, delimiter: table.delimiter });
  }

  function delimiterLabel(d) {
    return d === ';' ? 'point-virgule' : d === '\t' ? 'tabulation' : d === ',' ? 'virgule' : '—';
  }

  // ---------------------------------------------------------------------------
  // IndexedDB (remember the configuration folder handle between sessions)
  // ---------------------------------------------------------------------------

  var DB = 'questionnaireJDR';
  var STORE = 'handles';

  function idb(mode, fn) {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB indisponible')); return; }
      var req;
      try { req = indexedDB.open(DB, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onerror = function () { reject(req.error); };
      req.onsuccess = function () {
        var db = req.result;
        var tx = db.transaction(STORE, mode);
        var r = fn(tx.objectStore(STORE));
        tx.oncomplete = function () { db.close(); resolve(r && 'result' in r ? r.result : undefined); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      };
    });
  }

  function saveHandle(handle) {
    return idb('readwrite', function (s) { return s.put(handle, 'configDir'); }).catch(function () { /* ignore */ });
  }
  function getHandle() {
    return idb('readonly', function (s) { return s.get('configDir'); }).catch(function () { return null; });
  }
  function forgetHandle() {
    return idb('readwrite', function (s) { return s.delete('configDir'); }).catch(function () { /* ignore */ });
  }

  // ---------------------------------------------------------------------------
  // File System Access API (Edge / Chrome)
  // ---------------------------------------------------------------------------

  var fsSupported = typeof window.showDirectoryPicker === 'function';

  /**
   * `accept` lists for the file inputs. Deliberately permissive: Android
   * pickers grey out files whose MIME type is not listed, and the type given
   * to a CSV varies (text/csv, text/comma-separated-values, application/vnd.ms-excel,
   * application/octet-stream…). The content is checked when the file is read.
   */
  var DATA_ACCEPT = ['.csv', '.tsv', '.txt', '.zip', '.xlsx',
    'text/csv', 'text/comma-separated-values', 'text/tab-separated-values', 'text/plain', 'application/csv',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-zip-compressed', 'application/octet-stream'].join(',');
  var CONFIG_ACCEPT = ['.yaml', '.yml', '.zip', '.txt',
    'application/zip', 'application/x-zip-compressed', 'application/yaml', 'application/x-yaml', 'text/yaml', 'text/x-yaml',
    'text/plain', 'application/octet-stream'].join(',');

  /** Folder selection through <input webkitdirectory>: desktop browsers only (absent on Android). */
  var folderInputSupported = !util.env.mobile && ('webkitdirectory' in document.createElement('input'));

  function hasFile(dir, name) {
    return dir.getFileHandle(name).then(function () { return true; }, function () { return false; });
  }

  /** If the user picked the parent folder (QuestionnaireJDR), go down to "configuration". */
  function resolveConfigDir(dir) {
    return hasFile(dir, 'questionnaire.yaml').then(function (ok) {
      if (ok) return dir;
      return dir.getDirectoryHandle('configuration').then(function (sub) {
        return hasFile(sub, 'questionnaire.yaml').then(function (ok2) { return ok2 ? sub : dir; });
      }, function () { return dir; });
    });
  }

  function verifyPermission(handle, write) {
    var opts = { mode: write ? 'readwrite' : 'read' };
    if (!handle.queryPermission) return Promise.resolve(true);
    return handle.queryPermission(opts).then(function (p) {
      if (p === 'granted') return true;
      return handle.requestPermission(opts).then(function (p2) { return p2 === 'granted'; });
    });
  }

  function pickDirectory() {
    return window.showDirectoryPicker({ id: 'questionnaire-jdr-config', mode: 'readwrite' }).then(resolveConfigDir);
  }

  function readTextFile(dir, name) {
    return dir.getFileHandle(name).then(function (fh) { return fh.getFile(); }).then(function (f) { return util.readFileText(f); });
  }

  /** Reads questionnaire.yaml, rapport.yaml and attentes/*.yaml into a path → text map. */
  function readConfigDir(dir) {
    var map = {};
    return Promise.all(['questionnaire.yaml', 'rapport.yaml'].map(function (n) {
      return readTextFile(dir, n).then(function (t) { map[n] = t; }, function () { /* missing */ });
    })).then(function () {
      return dir.getDirectoryHandle('attentes').then(function (att) {
        var tasks = [];
        var it = att.values();
        function next() {
          return it.next().then(function (r) {
            if (r.done) return Promise.all(tasks);
            var entry = r.value;
            if (entry.kind === 'file' && /\.ya?ml$/i.test(entry.name)) {
              tasks.push(entry.getFile().then(util.readFileText).then(function (t) { map['attentes/' + entry.name] = t; }));
            }
            return next();
          });
        }
        return next();
      }, function () { /* no attentes folder */ });
    }).then(function () { return map; });
  }

  function writeFile(dir, name, text) {
    return dir.getFileHandle(name, { create: true }).then(function (fh) {
      return fh.createWritable();
    }).then(function (w) {
      return w.write(text).then(function () { return w.close(); });
    });
  }

  /** Writes all configuration files into the folder. */
  function writeConfigDir(dir, config) {
    var files = QJ.configIO.configToFiles(config);
    return dir.getDirectoryHandle('attentes', { create: true }).then(function (att) {
      var jobs = Object.keys(files).map(function (p) {
        if (p.indexOf('attentes/') === 0) return writeFile(att, p.slice(9), files[p]);
        return writeFile(dir, p, files[p]);
      });
      return Promise.all(jobs);
    }).then(function () { return Object.keys(files).length; });
  }

  // ---------------------------------------------------------------------------
  // Fallback: selected / dropped files, ZIP download
  // ---------------------------------------------------------------------------

  /** Builds a path → text map from a FileList (YAML files and/or ZIP archives). */
  function readConfigFiles(fileList) {
    var map = {};
    var files = Array.prototype.slice.call(fileList || []);
    return Promise.all(files.map(function (f) {
      var path = f.webkitRelativePath || f.relativePath || f.name;
      if (/\.zip$/i.test(f.name)) {
        return util.readFileBuffer(f).then(function (buf) { return JSZip.loadAsync(buf); }).then(function (zip) {
          var jobs = [];
          zip.forEach(function (p, entry) {
            if (!entry.dir && /\.ya?ml$/i.test(p) && !/__MACOSX/.test(p)) {
              jobs.push(entry.async('uint8array').then(function (u8) { map[p] = core.decodeBytes(u8).text; }));
            }
          });
          return Promise.all(jobs);
        });
      }
      if (!/\.ya?ml$/i.test(f.name)) return null;
      return util.readFileText(f).then(function (t) { map[path] = t; });
    })).then(function () { return map; });
  }

  /** Reads files dropped on an element, including dropped folders (webkitGetAsEntry). */
  function readDroppedItems(dataTransfer) {
    var items = dataTransfer.items ? Array.prototype.slice.call(dataTransfer.items) : [];
    var entries = items.map(function (it) { return it.webkitGetAsEntry ? it.webkitGetAsEntry() : null; }).filter(Boolean);
    if (!entries.length) return readConfigFiles(dataTransfer.files);
    var out = [];
    function walk(entry, prefix) {
      return new Promise(function (resolve) {
        if (entry.isFile) {
          entry.file(function (f) {
            try { Object.defineProperty(f, 'relativePath', { value: prefix + f.name }); } catch (e) { /* ignore */ }
            out.push(f); resolve();
          }, function () { resolve(); });
        } else if (entry.isDirectory) {
          var reader = entry.createReader();
          var all = [];
          (function readBatch() {
            reader.readEntries(function (batch) {
              if (!batch.length) {
                Promise.all(all.map(function (e) { return walk(e, prefix + entry.name + '/'); })).then(function () { resolve(); });
              } else { all = all.concat(Array.prototype.slice.call(batch)); readBatch(); }
            }, function () { resolve(); });
          })();
        } else resolve();
      });
    }
    return Promise.all(entries.map(function (e) { return walk(e, ''); })).then(function () { return readConfigFiles(out); });
  }

  function configZipBlob(config) {
    var files = QJ.configIO.configToFiles(config);
    var zip = new JSZip();
    Object.keys(files).forEach(function (p) { zip.file('configuration/' + p, files[p]); });
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  QJ.files = {
    loadDataFile: loadDataFile,
    loadDataBuffer: loadDataBuffer,
    delimiterLabel: delimiterLabel,
    fsSupported: fsSupported,
    folderInputSupported: folderInputSupported,
    DATA_ACCEPT: DATA_ACCEPT,
    CONFIG_ACCEPT: CONFIG_ACCEPT,
    pickDirectory: pickDirectory,
    verifyPermission: verifyPermission,
    readConfigDir: readConfigDir,
    writeConfigDir: writeConfigDir,
    saveHandle: saveHandle,
    getHandle: getHandle,
    forgetHandle: forgetHandle,
    readConfigFiles: readConfigFiles,
    readDroppedItems: readDroppedItems,
    configZipBlob: configZipBlob
  };
})(window.QJ = window.QJ || {});
