/* util.js — small DOM helpers shared by the UI modules (global QJ.util). */
(function (QJ) {
  'use strict';

  /**
   * Environment detection (computed once). `mobile` is true on phones and
   * tablets (Android, iOS/iPadOS): no File System Access, no drag-and-drop of
   * files, no folder picker, and printing an iframe is unreliable there.
   * `touchOnly` is true when no fine pointer (mouse, trackpad) is available.
   */
  var env = (function () {
    var nav = window.navigator || {};
    var ua = nav.userAgent || '';
    var uad = nav.userAgentData;
    var mobile = !!(uad && uad.mobile) || /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
      (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
    var mq = function (q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
    var touchOnly = mq('(any-pointer: coarse)') && !mq('(any-pointer: fine)');
    var web = /^https?:$/.test(location.protocol);
    return { mobile: mobile, touchOnly: touchOnly, web: web, canDropFiles: !mobile && !touchOnly };
  })();

  /**
   * h('div', { class: 'x', onclick: fn, style: {...}, dataset: {...} }, child, [children], 'text')
   */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
          Object.keys(v).forEach(function (sk) {
            if (sk.slice(0, 2) === '--') el.style.setProperty(sk, v[sk]); // CSS custom property
            else el.style[sk] = v[sk];
          });
        }
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  /**
   * Transient message at the bottom right. opts (optional): { sticky: true }
   * keeps it until closed; { action: { label, onClick, testid } } adds a button.
   */
  function toast(message, isError, opts) {
    opts = opts || {};
    var box = document.getElementById('toasts');
    if (!box) return null;
    var t = h('div', { class: 'toast' + (isError ? ' err' : '') + (opts.action ? ' with-action' : ''), role: isError ? 'alert' : 'status', 'data-testid': opts.testid || null },
      h('span', { class: 'toast-msg' }, message));
    if (opts.action) {
      t.appendChild(h('button', { class: 'btn small primary', type: 'button', 'data-testid': opts.action.testid || null, onclick: function () { t.remove(); opts.action.onClick(); } }, opts.action.label));
    }
    if (opts.sticky) {
      t.appendChild(h('button', { class: 'toast-close', type: 'button', 'aria-label': 'Fermer', onclick: function () { t.remove(); } }, '✕'));
    }
    box.appendChild(t);
    if (!opts.sticky) setTimeout(function () { t.remove(); }, isError ? 7000 : 3500);
    return t;
  }

  /** Simple modal. opts: { title, body (Node|string), actions: [{label, primary, danger, onClick -> false keeps open}] } */
  function modal(opts) {
    var back = h('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title });
    var box = h('div', { class: 'modal' });
    var close = function () { back.remove(); document.removeEventListener('keydown', onKey); };
    function onKey(e) { if (e.key === 'Escape') close(); }
    box.appendChild(h('h2', null, opts.title));
    if (typeof opts.body === 'string') box.appendChild(h('p', null, opts.body));
    else if (opts.body) box.appendChild(opts.body);
    var actions = h('div', { class: 'actions' });
    (opts.actions || [{ label: 'Fermer' }]).forEach(function (a) {
      actions.appendChild(h('button', {
        class: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : ''),
        type: 'button',
        onclick: function () {
          var keep = a.onClick ? a.onClick() === false : false;
          if (!keep) close();
        }
      }, a.label));
    });
    box.appendChild(actions);
    back.appendChild(box);
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    var first = box.querySelector('.btn.primary') || box.querySelector('button');
    if (first) first.focus();
    return { close: close, box: box };
  }

  function confirmBox(title, text, okLabel, onOk, danger) {
    return modal({
      title: title, body: text,
      actions: [{ label: 'Annuler' }, { label: okLabel || 'Confirmer', primary: !danger, danger: !!danger, onClick: onOk }]
    });
  }

  function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: fileName, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    // Generous delay: on Android the download may start well after the click.
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
  }

  function textBlob(text, mime) {
    return new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
  }

  function downloadText(text, fileName, mime) {
    downloadBlob(textBlob(text, mime), fileName);
  }

  // ---------------------------------------------------------------------------
  // Web Share API (Android / iOS share sheet: WhatsApp, e-mail, Drive…)
  // ---------------------------------------------------------------------------

  function makeFile(text, fileName, mime) {
    try { return new File([text], fileName, { type: mime || 'text/plain' }); } catch (e) { return null; }
  }

  /** True when this browser can share files of this type (checked with a tiny probe file). */
  function canShareFiles(mime, sampleName) {
    try {
      if (!navigator.share || !navigator.canShare) return false;
      var f = makeFile('x', sampleName || 'rapport.html', mime || 'text/html');
      return !!f && navigator.canShare({ files: [f] });
    } catch (e) { return false; }
  }

  /** Opens the system share sheet with one text file. Resolves false if cancelled. */
  function shareText(text, fileName, mime, title) {
    var f = makeFile(text, fileName, mime);
    if (!f || !canShareFiles(mime, fileName)) return Promise.reject(new Error('Partage non disponible sur cet appareil.'));
    return navigator.share({ files: [f], title: title || fileName }).then(function () { return true; }, function (e) {
      if (e && e.name === 'AbortError') return false;
      throw e;
    });
  }

  // ---------------------------------------------------------------------------
  // Printing a report
  // ---------------------------------------------------------------------------

  var PRINT_BAR = '<div class="no-print" style="position:sticky;top:0;z-index:20;display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;padding:10px 12px;background:#2e2276;color:#fff;font:15px system-ui,sans-serif">' +
    '<span>Aperçu avant impression</span>' +
    '<button type="button" onclick="window.print()" style="font:600 16px system-ui,sans-serif;min-height:44px;padding:8px 18px;border-radius:12px;border:0;background:#ffc93c;color:#1e1b3a">Imprimer / PDF</button>' +
    '<button type="button" onclick="window.close()" style="font:600 16px system-ui,sans-serif;min-height:44px;padding:8px 18px;border-radius:12px;border:1.5px solid #cfc6ff;background:transparent;color:#fff">Fermer</button></div>';
  var AUTO_PRINT = '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},500);});<\/script>';

  /** Report HTML with a print bar and an automatic print() call (used in a new tab). */
  function printableHTML(html) {
    var out = html.replace(/<body([^>]*)>/i, function (m) { return m + PRINT_BAR; });
    return out.indexOf('</body>') >= 0 ? out.replace('</body>', AUTO_PRINT + '</body>') : out + AUTO_PRINT;
  }

  /**
   * Prints a report. Desktop: prints the preview iframe. Phones/tablets
   * (printing an iframe is unreliable on Android Chrome): writes the report
   * into a new tab, which opens the print dialog (« Enregistrer au format PDF »
   * is one of the printers).
   */
  function printReport(frame, html) {
    if (!env.mobile && frame) {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); return true; } catch (e) { /* fall through */ }
    }
    var w = null;
    try { w = window.open('', '_blank'); } catch (e) { w = null; }
    if (w) {
      try {
        w.document.open();
        w.document.write(printableHTML(html));
        w.document.close();
        return true;
      } catch (e) { try { w.close(); } catch (e2) { /* ignore */ } }
    }
    toast('Impossible d’ouvrir l’aperçu d’impression. Exportez le rapport (.html), ouvrez-le dans Chrome puis ⋮ → Partager… → Imprimer.', true);
    return false;
  }

  function nowLabel() {
    var d = new Date();
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' à ' + p(d.getHours()) + 'h' + p(d.getMinutes());
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /** Reads a File as ArrayBuffer (Promise). */
  function readFileBuffer(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(file);
    });
  }

  function readFileText(file) {
    return readFileBuffer(file).then(function (buf) { return QJ.core.decodeBytes(new Uint8Array(buf)).text; });
  }

  /** Message line (erreur / attention / info / ok). */
  function msg(level, text, details, action) {
    var icons = { erreur: '!', attention: '!', info: 'i', ok: '✓' };
    return h('div', { class: 'msg ' + level },
      h('span', { class: 'ico', 'aria-hidden': 'true' }, icons[level] || 'i'),
      h('div', { class: 'txt' }, h('div', null, text), details ? h('div', { class: 'details' }, details) : null),
      action ? h('div', { class: 'act' }, action) : null);
  }

  /** Sets an iframe's document and auto-sizes it to its content. */
  function fillFrame(frame, html, minHeight) {
    frame.onload = function () {
      try {
        var d = frame.contentDocument;
        var fit = function () {
          var hgt = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0);
          frame.style.height = Math.max(minHeight || 400, hgt + 4) + 'px';
        };
        fit();
        setTimeout(fit, 120);
        if (d.defaultView && d.defaultView.ResizeObserver) {
          new d.defaultView.ResizeObserver(fit).observe(d.body);
        }
      } catch (e) { /* cross-origin: keep CSS height */ }
    };
    frame.srcdoc = html;
  }

  QJ.util = {
    h: h, clear: clear, toast: toast, modal: modal, confirm: confirmBox,
    env: env, downloadBlob: downloadBlob, downloadText: downloadText, textBlob: textBlob, nowLabel: nowLabel,
    canShareFiles: canShareFiles, shareText: shareText, printReport: printReport, printableHTML: printableHTML,
    debounce: debounce, readFileBuffer: readFileBuffer, readFileText: readFileText,
    msg: msg, fillFrame: fillFrame
  };
})(window.QJ = window.QJ || {});
