/* util.js — small DOM helpers shared by the UI modules (global QJ.util). */
(function (QJ) {
  'use strict';

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
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
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

  function toast(message, isError) {
    var box = document.getElementById('toasts');
    if (!box) return;
    var t = h('div', { class: 'toast' + (isError ? ' err' : ''), role: isError ? 'alert' : 'status' }, message);
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, isError ? 7000 : 3500);
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
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function downloadText(text, fileName, mime) {
    downloadBlob(new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' }), fileName);
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
    downloadBlob: downloadBlob, downloadText: downloadText, nowLabel: nowLabel,
    debounce: debounce, readFileBuffer: readFileBuffer, readFileText: readFileText,
    msg: msg, fillFrame: fillFrame
  };
})(window.QJ = window.QJ || {});
