/*
 * pwa.js — installable web app / offline mode (global QJ.pwa).
 *
 * When the page is served over http(s) (e.g. GitHub Pages), registers the
 * service worker `sw.js` (next to index.html, so its scope covers the whole
 * app) which keeps a copy of every file of the application: after a first
 * visit the app works without network. Never registers over file:// (the
 * desktop "double-click" mode needs no service worker and could not use one).
 *
 * Updates: the browser re-checks sw.js on each visit (and here, when the app
 * comes back to the foreground and hourly). A new version installs in the
 * background, then waits; the toast « Nouvelle version disponible » offers
 * « Recharger », which activates it and reloads the page.
 */
(function (QJ) {
  'use strict';
  var util = QJ.util;
  var supported = util.env.web && ('serviceWorker' in navigator);
  var prompted = false;
  var noop = function () { /* ignore */ };

  function promptUpdate(worker) {
    if (prompted || !worker) return;
    prompted = true;
    util.toast('Nouvelle version disponible.', false, {
      sticky: true, testid: 'toast-maj',
      action: { label: 'Recharger', testid: 'btn-recharger-maj', onClick: function () { worker.postMessage({ type: 'SKIP_WAITING' }); } }
    });
  }

  function track(reg, hadController) {
    if (reg.waiting && hadController) promptUpdate(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', function () {
        if (w.state !== 'installed') return;
        if (navigator.serviceWorker.controller) promptUpdate(w);
        else util.toast('L’application est maintenant disponible hors connexion sur cet appareil.');
      });
    });
  }

  function register() {
    var previous = navigator.serviceWorker.controller;
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // A controller replacing another one = an update was activated (here or
      // in another tab): reload to run it. The very first install only takes
      // control of a page already running this version: nothing to do.
      var had = previous;
      previous = navigator.serviceWorker.controller;
      if (!had || reloading) return;
      reloading = true;
      location.reload();
    });
    return navigator.serviceWorker.register('sw.js').then(function (reg) {
      QJ.pwa.registration = reg;
      track(reg, !!previous);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(noop);
      });
      setInterval(function () { reg.update().catch(noop); }, 60 * 60 * 1000);
      return reg;
    }).catch(function (e) {
      if (window.console) console.warn('Service worker non enregistré :', e);
      return null;
    });
  }

  QJ.pwa = { supported: supported, registration: null };
  if (supported) {
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
  }
})(window.QJ = window.QJ || {});
