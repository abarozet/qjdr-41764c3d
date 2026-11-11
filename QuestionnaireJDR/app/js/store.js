/*
 * store.js — application state (active configuration, loaded data, analysis),
 * persistence in localStorage and a tiny event bus. Global QJ.store.
 *
 * Configuration "source" values:
 *   'defaut'   — embedded default configuration (config-par-defaut.js)
 *   'dossier'  — read from / saved to a folder (File System Access API)
 *   'fichiers' — read from selected/dropped files or a ZIP
 * plus a `dirty` flag (modified since last load/save).
 */
(function (QJ) {
  'use strict';
  var core = QJ.core;
  var KEY_CONFIG = 'questionnaireJDR.config.v1';
  var KEY_DATA = 'questionnaireJDR.donnees.v1';

  var listeners = {};
  var state = {
    config: null,
    meta: { source: 'defaut', dirty: false, label: '', when: '' },
    data: null,        // { fileName, table, encoding, delimiter }
    analysis: null,
    validation: []
  };

  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, arg) { (listeners[evt] || []).forEach(function (fn) { try { fn(arg); } catch (e) { console.error(e); } }); }

  function lsGet(key) {
    try { var v = window.localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }

  function defaultConfig() {
    return core.deepClone(QJ.DEFAULT_CONFIG);
  }

  function persistConfig() {
    lsSet(KEY_CONFIG, { config: state.config, meta: state.meta });
  }
  var persistConfigSoon = QJ.util.debounce(persistConfig, 300);
  // never lose the last keystrokes when the window is closed or reloaded
  window.addEventListener('pagehide', function () { if (state.config) persistConfig(); });

  var pending = false;

  function recompute() {
    pending = false;
    state.validation = core.validateConfig(state.config);
    if (state.data) {
      try {
        state.analysis = core.analyze(state.config, state.data.table);
      } catch (e) {
        console.error(e);
        state.analysis = null;
      }
    } else {
      state.analysis = null;
    }
    emit('analysis', state.analysis);
  }
  var recomputeLater = QJ.util.debounce(function () { if (pending) recompute(); }, 200);
  function recomputeSoon() { pending = true; recomputeLater(); }
  /** Applies a pending (debounced) recomputation immediately. */
  function flush() { if (pending) recompute(); }

  /** Replaces the whole configuration (after loading, resetting…). */
  function setConfig(config, meta) {
    state.config = config;
    state.meta = Object.assign({ source: 'defaut', dirty: false, label: '', when: QJ.util.nowLabel() }, meta || {});
    persistConfig();
    recompute();
    emit('config', { structural: true });
    emit('meta', state.meta);
  }

  /**
   * To be called after an in-place modification of state.config by the GUI.
   * structural: true when lists changed (forces config views to re-render).
   */
  function configChanged(structural) {
    var wasDirty = state.meta.dirty;
    state.meta.dirty = true;
    persistConfigSoon();
    if (structural) { recompute(); } else { recomputeSoon(); }
    emit('config', { structural: !!structural });
    if (!wasDirty) emit('meta', state.meta);
  }

  function markSaved(meta) {
    state.meta = Object.assign({}, state.meta, meta || {}, { dirty: false, when: QJ.util.nowLabel() });
    persistConfig();
    emit('meta', state.meta);
  }

  function setData(data) {
    state.data = data;
    if (data) {
      if (!lsSet(KEY_DATA, data)) QJ.util.toast('Fichier trop volumineux pour être mémorisé : il faudra le recharger à la prochaine ouverture.');
    } else {
      lsSet(KEY_DATA, null);
    }
    recompute();
    emit('data', data);
  }

  function init() {
    var saved = lsGet(KEY_CONFIG);
    if (saved && saved.config && Array.isArray(saved.config.attentes) && Array.isArray(saved.config.questions)) {
      if (saved.meta && saved.meta.source === 'defaut' && !saved.meta.dirty) {
        // Unmodified default: always take the (possibly newer) embedded default.
        state.config = defaultConfig();
        state.meta = saved.meta;
      } else {
        state.config = saved.config;
        state.meta = Object.assign({ source: 'defaut', dirty: false }, saved.meta || {});
      }
    } else {
      state.config = defaultConfig();
      state.meta = { source: 'defaut', dirty: false, label: '', when: '' };
    }
    var data = lsGet(KEY_DATA);
    if (data && data.table && Array.isArray(data.table.headers)) state.data = data;
    recompute();
  }

  QJ.store = {
    state: state,
    on: on,
    emit: emit,
    init: init,
    setConfig: setConfig,
    configChanged: configChanged,
    markSaved: markSaved,
    setData: setData,
    defaultConfig: defaultConfig,
    recompute: recompute,
    flush: flush
  };
})(window.QJ = window.QJ || {});
