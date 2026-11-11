/*
 * charts.js — inline SVG charts generated as strings (radar, histogram,
 * horizontal bars, heatmap). Shared by the application and the exported,
 * self-contained HTML reports. Pure (no DOM): browser global QJ.charts,
 * Node require.
 */
(function (root, factory) {
  'use strict';
  var mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.QJ = root.QJ || {};
    root.QJ.charts = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Chart tokens (match the report CSS in reports.js): ink for text, lavender greys for the frame.
  var INK = '#1e1b3a';
  var INK2 = '#47436b';
  var MUTED = '#64607f';
  var GRID = '#dedaf0';
  var SURFACE = '#ffffff';
  var PLOT = '#f7f6fd';
  var TRACK = '#efedf8';
  var FONT = "'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif";
  var DISPLAY = "'Fredoka', 'Nunito', 'Segoe UI Rounded', 'Arial Rounded MT Bold', 'Segoe UI', system-ui, sans-serif";

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function r1(x) { return Math.round(x * 10) / 10; }

  function fmt(x, d) {
    if (typeof x !== 'number' || !isFinite(x)) return '—';
    var s = x.toFixed(d || 0);
    if (d) s = s.replace(/\.?0+$/, '');
    return s.replace('.', ',');
  }

  function safeColor(c) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(c || '')) ? c : '#888888';
  }

  /** '#rgb', '#rgba', '#rrggbb', '#rrggbbaa' -> '#rrggbb' (alpha dropped); anything else -> grey. */
  function hex6(c) {
    c = safeColor(c);
    if (c.length === 4 || c.length === 5) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return c.length >= 7 ? c.slice(0, 7).toLowerCase() : '#888888';
  }

  function rgb(c) { c = hex6(c); return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }

  function luminance(c) {
    var v = rgb(c).map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /** Text colour (white or ink) with the better contrast on a background colour. */
  function inkOn(bg) {
    return contrast('#ffffff', bg) >= contrast(INK, bg) ? '#ffffff' : INK;
  }

  /** Light tint of a colour: t = share of the colour mixed into white (0..1). */
  function tint(c, t) { return mix('#ffffff', hex6(c), t); }

  /** Wraps a label into lines of at most `max` characters. */
  function wrapLabel(text, max) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var cur = '';
    words.forEach(function (w) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length > max) { lines.push(cur); cur = w; }
      else cur += ' ' + w;
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }

  // ---------------------------------------------------------------------------
  // Radar
  // ---------------------------------------------------------------------------

  /**
   * opts: {
   *   axes: [{ label, color }],
   *   series: [{ values: [0..100|null], color, fill (opacity), stroke (opacity),
   *              width, dots, label }],
   *   size (px, default 360), title (for accessibility), showValues (bool: value labels
   *   for the first highlighted series)
   * }
   */
  function radar(opts) {
    var axes = opts.axes || [];
    var n = axes.length;
    if (n < 3) return barsFallback(opts);
    var size = opts.size || 360;
    var padX = 112, padY = 56;
    var W = size + 2 * padX, H = size + 2 * padY;
    var cx = W / 2, cy = H / 2;
    var R = size / 2 - 6;
    function pt(i, v) {
      var ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
      var rr = R * Math.max(0, Math.min(100, v)) / 100;
      return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)];
    }
    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" class="qj-radar" width="' + W + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title || 'Graphique radar') + '" style="font-family:' + esc(FONT) + ';max-width:100%;height:auto">');
    if (opts.title) out.push('<title>' + esc(opts.title) + '</title>');
    // rings (outermost first, so the bands alternate from the outside in)
    [100, 80, 60, 40, 20].forEach(function (lv) {
      var pts = [];
      for (var i = 0; i < n; i++) pts.push(pt(i, lv).map(r1).join(','));
      out.push('<polygon points="' + pts.join(' ') + '" fill="' + (lv % 40 === 20 ? SURFACE : PLOT) + '" stroke="' + GRID + '" stroke-width="' + (lv === 100 ? 1.5 : 1) + '" stroke-linejoin="round"/>');
    });
    // spokes
    for (var i = 0; i < n; i++) {
      var p = pt(i, 100);
      out.push('<line x1="' + r1(cx) + '" y1="' + r1(cy) + '" x2="' + r1(p[0]) + '" y2="' + r1(p[1]) + '" stroke="' + GRID + '" stroke-width="1"/>');
    }
    // identity marker of each axis, on the outer ring next to its label
    for (var m = 0; m < n; m++) {
      var pm = pt(m, 100);
      out.push('<circle cx="' + r1(pm[0]) + '" cy="' + r1(pm[1]) + '" r="4" fill="' + safeColor(axes[m].color) + '" stroke="' + SURFACE + '" stroke-width="2"/>');
    }
    // ring labels (along the first spoke)
    [20, 40, 60, 80, 100].forEach(function (lv) {
      var q = pt(0, lv);
      if (lv < 100) out.push('<text x="' + r1(q[0] + 5) + '" y="' + r1(q[1] + 3) + '" font-size="9" fill="' + MUTED + '">' + lv + '</text>');
    });
    // series
    (opts.series || []).forEach(function (s) {
      var color = safeColor(s.color || INK);
      var pts = [];
      for (var k = 0; k < n; k++) {
        var v = s.values[k];
        pts.push(pt(k, typeof v === 'number' && isFinite(v) ? v : 0).map(r1).join(','));
      }
      out.push('<polygon points="' + pts.join(' ') + '" fill="' + color + '" fill-opacity="' + (s.fill === undefined ? 0.15 : s.fill) + '" stroke="' + color + '" stroke-opacity="' + (s.stroke === undefined ? 1 : s.stroke) + '" stroke-width="' + (s.width || 2) + '" stroke-linejoin="round">' + (s.label ? '<title>' + esc(s.label) + '</title>' : '') + '</polygon>');
      if (s.dots) {
        for (var d = 0; d < n; d++) {
          var v2 = s.values[d];
          var pp = pt(d, typeof v2 === 'number' && isFinite(v2) ? v2 : 0);
          var ac = safeColor(axes[d].color);
          out.push('<circle cx="' + r1(pp[0]) + '" cy="' + r1(pp[1]) + '" r="6" fill="' + ac + '" stroke="' + SURFACE + '" stroke-width="2.5"><title>' + esc(axes[d].label + ' : ' + fmt(v2) + ' %') + '</title></circle>');
        }
      }
    });
    // axis labels
    var valSeries = opts.showValues ? (opts.series || []).filter(function (s) { return s.dots; })[0] : null;
    for (var j = 0; j < n; j++) {
      var ang = -Math.PI / 2 + (2 * Math.PI * j) / n;
      var lx = cx + (R + 16) * Math.cos(ang);
      var ly = cy + (R + 16) * Math.sin(ang);
      var cos = Math.cos(ang), sin = Math.sin(ang);
      var anchor = Math.abs(cos) < 0.2 ? 'middle' : (cos > 0 ? 'start' : 'end');
      var lines = wrapLabel(axes[j].label, 14);
      var extra = valSeries ? 1 : 0;
      var total = lines.length + extra;
      var lineH = 21;
      var y0;
      if (sin < -0.5) y0 = ly - (total - 1) * lineH - 4;
      else if (sin > 0.5) y0 = ly + 12;
      else y0 = ly - ((total - 1) * lineH) / 2 + 4;
      var txt = '<text text-anchor="' + anchor + '" font-size="19" fill="' + INK + '" font-weight="600" style="font-family:' + esc(DISPLAY) + '">';
      lines.forEach(function (l, li) {
        txt += '<tspan x="' + r1(lx) + '" y="' + r1(y0 + li * lineH) + '">' + esc(l) + '</tspan>';
      });
      if (valSeries) {
        txt += '<tspan x="' + r1(lx) + '" y="' + r1(y0 + lines.length * lineH) + '" font-weight="600" fill="' + INK2 + '" font-size="16" style="font-family:' + esc(FONT) + '">' + esc(fmt(valSeries.values[j]) + (typeof valSeries.values[j] === 'number' ? ' %' : '')) + '</tspan>';
      }
      txt += '</text>';
      out.push(txt);
    }
    out.push('</svg>');
    return out.join('');
  }

  /** Fallback when there are fewer than 3 axes: horizontal bars. */
  function barsFallback(opts) {
    var axes = opts.axes || [];
    var s = (opts.series || []).filter(function (x) { return x.dots; })[0] || (opts.series || [])[0] || { values: [] };
    return hbars({
      items: axes.map(function (a, i) { return { label: a.label, value: s.values[i], color: a.color, text: fmt(s.values[i]) + ' %' }; }),
      max: 100, width: 420, title: opts.title
    });
  }

  // ---------------------------------------------------------------------------
  // Horizontal bars
  // ---------------------------------------------------------------------------

  /**
   * opts: { items: [{ label, value, color, text, tooltip }], max, width, labelWidth, title, barHeight }
   */
  function hbars(opts) {
    var items = opts.items || [];
    var W = opts.width || 520;
    var LW = opts.labelWidth === undefined ? 150 : opts.labelWidth;
    var TW = 64;
    var BH = opts.barHeight || 18;
    var gap = 9;
    var H = items.length * (BH + gap) + gap;
    var max = opts.max || Math.max.apply(null, items.map(function (i) { return Number(i.value) || 0; }).concat([1]));
    var plotW = W - LW - TW;
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" class="qj-hbars" width="' + W + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title || 'Graphique en barres') + '" style="font-family:' + esc(FONT) + ';max-width:100%;height:auto">'];
    items.forEach(function (it, i) {
      var y = gap + i * (BH + gap);
      var v = Number(it.value);
      var w = isFinite(v) && v > 0 ? Math.max(3, plotW * Math.min(v, max) / max) : 0;
      if (LW > 0) {
        out.push('<text x="' + (LW - 8) + '" y="' + r1(y + BH / 2 + 4) + '" text-anchor="end" font-size="12" fill="' + INK + '">' + esc(truncate(it.label, Math.floor(LW / 6.5))) + '<title>' + esc(it.label) + '</title></text>');
      }
      out.push('<rect x="' + LW + '" y="' + y + '" width="' + r1(plotW) + '" height="' + BH + '" rx="4" fill="' + TRACK + '"/>');
      if (w > 0) out.push('<rect x="' + LW + '" y="' + y + '" width="' + r1(w) + '" height="' + BH + '" rx="4" fill="' + safeColor(it.color) + '"><title>' + esc(it.tooltip || (it.label + ' : ' + (it.text || fmt(v)))) + '</title></rect>');
      out.push('<text x="' + r1(LW + plotW + 8) + '" y="' + r1(y + BH / 2 + 4) + '" font-size="12.5" font-weight="600" fill="' + INK2 + '">' + esc(it.text !== undefined ? it.text : fmt(v)) + '</text>');
    });
    out.push('</svg>');
    return out.join('');
  }

  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s;
  }

  /** Single score bar (0–100) used in individual reports. */
  function scoreBar(value, color, opts) {
    opts = opts || {};
    var W = opts.width || 300, H = opts.height || 14;
    var v = typeof value === 'number' && isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" class="qj-scorebar" viewBox="0 0 ' + W + ' ' + (H + 8) + '" preserveAspectRatio="none" role="img" aria-label="' + esc('Score : ' + fmt(value) + ' %') + '" style="width:100%;height:' + (H + 8) + 'px">'];
    out.push('<rect x="0" y="4" width="' + W + '" height="' + H + '" rx="' + H / 2 + '" fill="' + tint(color, 0.22) + '"/>');
    if (v > 0) out.push('<rect x="0" y="4" width="' + r1(Math.max(H, W * v / 100)) + '" height="' + H + '" rx="' + H / 2 + '" fill="' + safeColor(color) + '"/>');
    (opts.ticks || []).forEach(function (t) {
      if (t <= 0 || t >= 100) return;
      // level thresholds: 2 px surface gaps across the bar
      out.push('<line x1="' + r1(W * t / 100) + '" x2="' + r1(W * t / 100) + '" y1="2" y2="' + (H + 6) + '" stroke="' + SURFACE + '" stroke-width="2.5"/>');
    });
    out.push('</svg>');
    return out.join('');
  }

  // ---------------------------------------------------------------------------
  // Histogram
  // ---------------------------------------------------------------------------

  /** bins: [{from, to, count}] — vertical bars, x axis in %, y in respondents. */
  function histogram(bins, color, opts) {
    opts = opts || {};
    var W = opts.width || 340, H = opts.height || 170;
    var ml = 28, mr = 8, mt = 16, mb = 26;
    var pw = W - ml - mr, ph = H - mt - mb;
    var maxC = Math.max.apply(null, bins.map(function (b) { return b.count; }).concat([1]));
    var step = maxC <= 5 ? 1 : Math.ceil(maxC / 5);
    var top = Math.ceil(maxC / step) * step;
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" class="qj-hist" width="' + W + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title || 'Histogramme des scores') + '" style="font-family:' + esc(FONT) + ';max-width:100%;height:auto">'];
    for (var t = 0; t <= top; t += step) {
      var y = mt + ph - ph * t / top;
      out.push('<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(y) + '" y2="' + r1(y) + '" stroke="' + GRID + '" stroke-width="1"/>');
      out.push('<text x="' + (ml - 5) + '" y="' + r1(y + 3.5) + '" text-anchor="end" font-size="10" fill="' + MUTED + '">' + t + '</text>');
    }
    var bw = pw / bins.length;
    bins.forEach(function (b, i) {
      var h = ph * b.count / top;
      var x = ml + i * bw + 1;
      if (b.count > 0) {
        out.push('<rect x="' + r1(x) + '" y="' + r1(mt + ph - h) + '" width="' + r1(bw - 2) + '" height="' + r1(h) + '" rx="3" fill="' + safeColor(color) + '"><title>' + esc('De ' + b.from + ' à ' + (b.to === 100 ? '100' : b.to) + ' % : ' + b.count + ' répondant' + (b.count > 1 ? 's' : '')) + '</title></rect>');
        // visible count (no hover on touch screens)
        out.push('<text x="' + r1(x + (bw - 2) / 2) + '" y="' + r1(mt + ph - h - 3) + '" text-anchor="middle" font-size="10" font-weight="600" fill="' + INK2 + '">' + b.count + '</text>');
      }
    });
    for (var k = 0; k <= bins.length; k += 2) {
      var xx = ml + k * bw;
      out.push('<text x="' + r1(xx) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" fill="' + MUTED + '">' + (k * 10) + '</text>');
    }
    out.push('<text x="' + (W - mr) + '" y="' + (H - 0.5) + '" text-anchor="end" font-size="9" fill="' + MUTED + '">score (%)</text>');
    out.push('</svg>');
    return out.join('');
  }

  // ---------------------------------------------------------------------------
  // Heatmap (correlation matrix, diverging scale)
  // ---------------------------------------------------------------------------

  function mix(c1, c2, t) {
    var a = rgb(c1), b = rgb(c2);
    var m = a.map(function (x, i) { return Math.round(x + (b[i] - x) * t); });
    return '#' + m.map(function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  }

  var NEG = '#2f6db5';
  var POS = '#c4472b';
  var MID = '#f2f2f5';

  function divergingColor(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '#ffffff';
    var t = Math.min(1, Math.abs(v));
    return v >= 0 ? mix(MID, POS, t) : mix(MID, NEG, t);
  }

  /** matrix: n×n values in [-1, 1] (or null), labels: [{label, color}] */
  function heatmap(matrix, labels, opts) {
    opts = opts || {};
    var n = labels.length;
    var cell = opts.cell || 70;
    var LW = 120, TH = 30;
    var W = LW + n * cell + 4;
    var H = TH + n * cell + 48;
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" class="qj-heatmap" width="' + W + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title || 'Matrice de corrélation') + '" style="font-family:' + esc(FONT) + ';max-width:100%;height:auto">'];
    labels.forEach(function (l, i) {
      out.push('<circle cx="' + (LW - 10) + '" cy="' + r1(TH + i * cell + cell / 2) + '" r="4" fill="' + safeColor(l.color) + '"/>');
      out.push('<text x="' + (LW - 18) + '" y="' + r1(TH + i * cell + cell / 2 + 4) + '" text-anchor="end" font-size="12" fill="' + INK + '">' + esc(truncate(l.label, 16)) + '</text>');
      out.push('<text x="' + r1(LW + i * cell + cell / 2) + '" y="' + (TH - 10) + '" text-anchor="middle" font-size="11" fill="' + INK + '">' + esc(truncate(l.label, 11)) + '<title>' + esc(l.label) + '</title></text>');
    });
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        var v = matrix[i][j];
        var x = LW + j * cell, y = TH + i * cell;
        var diag = i === j;
        var fill = diag ? '#e9e7f3' : divergingColor(v);
        var dark = !diag && typeof v === 'number' && Math.abs(v) > 0.55;
        out.push('<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (cell - 2) + '" height="' + (cell - 2) + '" rx="8" fill="' + fill + '"><title>' + esc(labels[i].label + ' × ' + labels[j].label + ' : ' + fmt(v, 2)) + '</title></rect>');
        out.push('<text x="' + r1(x + cell / 2) + '" y="' + r1(y + cell / 2 + 4) + '" text-anchor="middle" font-size="12" fill="' + (dark ? '#ffffff' : INK) + '">' + esc(fmt(v, 2)) + '</text>');
      }
    }
    // legend
    var ly = TH + n * cell + 18;
    var lw = Math.min(240, n * cell);
    var lx = LW + (n * cell - lw) / 2;
    for (var s = 0; s < 40; s++) {
      var val = -1 + 2 * s / 39;
      out.push('<rect x="' + r1(lx + s * lw / 40) + '" y="' + ly + '" width="' + r1(lw / 40 + 0.5) + '" height="10" fill="' + divergingColor(val) + '"/>');
    }
    out.push('<text x="' + r1(lx) + '" y="' + (ly + 24) + '" font-size="10" fill="' + MUTED + '">−1 (opposées)</text>');
    out.push('<text x="' + r1(lx + lw / 2) + '" y="' + (ly + 24) + '" text-anchor="middle" font-size="10" fill="' + MUTED + '">0</text>');
    out.push('<text x="' + r1(lx + lw) + '" y="' + (ly + 24) + '" text-anchor="end" font-size="10" fill="' + MUTED + '">+1 (liées)</text>');
    out.push('</svg>');
    return out.join('');
  }

  return {
    esc: esc,
    fmt: fmt,
    radar: radar,
    hbars: hbars,
    scoreBar: scoreBar,
    histogram: histogram,
    heatmap: heatmap,
    divergingColor: divergingColor,
    tint: tint,
    inkOn: inkOn,
    contrast: contrast,
    safeColor: safeColor
  };
});
