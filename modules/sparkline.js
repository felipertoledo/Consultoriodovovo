/* ============================================================
   sparkline.js — micro-gráficos SVG sem dependências
   Linha com área (tendência de PA, peso) e barras (volume
   de consultas). Saída: string SVG pronta para x-html.
   Cores via currentColor / CSS vars — funciona em claro/escuro.
   ============================================================ */

(function () {
  'use strict';

  function esc(n) { return Math.round(n * 100) / 100; }

  /**
   * Linha de tendência com área suave.
   * @param {number[]} values  série em ordem cronológica (antiga → recente)
   * @param {object}   opts    { w, h, ref, refColor, stroke, fill, dot }
   *   ref: valor de referência (ex.: 140 mmHg) desenhado como linha tracejada
   */
  function line(values, opts = {}) {
    const v = (values || []).filter((x) => typeof x === 'number' && isFinite(x));
    if (v.length < 2) return '';
    const w = opts.w || 96;
    const h = opts.h || 26;
    const pad = 3;

    let min = Math.min(...v);
    let max = Math.max(...v);
    if (typeof opts.ref === 'number') {
      min = Math.min(min, opts.ref);
      max = Math.max(max, opts.ref);
    }
    if (max === min) { max += 1; min -= 1; }
    const span = max - min;

    const x = (i) => pad + (i / (v.length - 1)) * (w - pad * 2);
    const y = (val) => pad + (1 - (val - min) / span) * (h - pad * 2);

    let d = `M ${esc(x(0))} ${esc(y(v[0]))}`;
    for (let i = 1; i < v.length; i++) d += ` L ${esc(x(i))} ${esc(y(v[i]))}`;

    const area = `${d} L ${esc(x(v.length - 1))} ${h - pad} L ${esc(x(0))} ${h - pad} Z`;

    const stroke = opts.stroke || 'currentColor';
    const fill = opts.fill || 'currentColor';
    const lastX = esc(x(v.length - 1));
    const lastY = esc(y(v[v.length - 1]));

    let refLine = '';
    if (typeof opts.ref === 'number') {
      const ry = esc(y(opts.ref));
      refLine = `<line x1="${pad}" x2="${w - pad}" y1="${ry}" y2="${ry}"
        stroke="${opts.refColor || 'var(--semaforo-vermelho)'}"
        stroke-width="1" stroke-dasharray="2 3" opacity="0.55"/>`;
    }

    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"
      preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="${area}" fill="${fill}" opacity="0.10" stroke="none"/>
      ${refLine}
      <path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round"/>
      ${opts.dot === false ? '' : `<circle cx="${lastX}" cy="${lastY}" r="2.2" fill="${stroke}"/>`}
    </svg>`;
  }

  /**
   * Barras verticais (histograma compacto).
   * @param {number[]} values  contagens em ordem cronológica
   * @param {object}   opts    { w, h, fill, highlightLast }
   */
  function bars(values, opts = {}) {
    const v = (values || []).map((x) => (typeof x === 'number' && isFinite(x) ? x : 0));
    if (!v.length) return '';
    const w = opts.w || 96;
    const h = opts.h || 26;
    const gap = 2;
    const max = Math.max(1, ...v);
    const bw = (w - gap * (v.length - 1)) / v.length;
    const fill = opts.fill || 'currentColor';

    let rects = '';
    v.forEach((val, i) => {
      const bh = Math.max(1.5, (val / max) * (h - 2));
      const xPos = esc(i * (bw + gap));
      const yPos = esc(h - bh);
      const op = opts.highlightLast && i === v.length - 1 ? 1 : 0.45;
      rects += `<rect x="${xPos}" y="${yPos}" width="${esc(bw)}" height="${esc(bh)}"
        rx="1.2" fill="${fill}" opacity="${op}"/>`;
    });

    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"
      preserveAspectRatio="none" aria-hidden="true" focusable="false">${rects}</svg>`;
  }

  const API = { line, bars };

  if (typeof window !== 'undefined') window.Sparkline = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
