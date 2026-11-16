import {t, html, getLocale} from './i18n.js';
// Evolución del dibujo SVG de SIMISA_entrega/features/graficas.js.
// Área y línea con tiempos reales de registros, huecos explícitos y ventana temporal.
// En períodos largos se agrupan las lecturas: línea de media y banda mínimo–máximo.
import {escapar} from './core/utilidades.js';
import {formatDuration} from './core/formatos.js';
import {HISTORY_STEP_SEC, hasReference} from '/shared/catalog.js';

const pad = n => String(n).padStart(2, '0');
function label(startTime, sec, span) {
  const d = new Date(Date.parse(startTime) + sec * 1000);
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return span > 86400 ? `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}${span > 4 * 86400 ? '' : ' ' + hm}` : hm;
}
let uid = 0;

/** Media por intervalo, dentro de un segmento continuo de lecturas válidas. */
function buckets(rows, start, size) {
  const out = new Map();
  for (const r of rows) {
    const i = Math.floor((r.elapsedSec - start) / size);
    if (!out.has(i)) out.set(i, {t: 0, sum: 0, n: 0, min: Infinity, max: -Infinity, first: r.timestamp, last: r.timestamp});
    const b = out.get(i); b.sum += r.value; b.n++; b.t += (r.elapsedSec - b.t) / b.n;
    b.min = Math.min(b.min, r.value); b.max = Math.max(b.max, r.value); b.last = r.timestamp;
  }
  return [...out.values()].map(b => ({...b, value: b.sum / b.n}));
}

/**
 * rows: lecturas del indicador; elapsedSec: hora de misión; fromSec: inicio de la ventana.
 * metric.effectivePeriod: período en la ejecución; el historial previo usa HISTORY_STEP_SEC.
 */
export function chart(rows, metric, elapsedSec, {fromSec = 0, startTime, width = 900} = {}) {
  const visible = rows.filter(r => r.elapsedSec <= elapsedSec && r.elapsedSec >= fromSec);
  const good = visible.filter(r => r.quality === 'valid' && Number.isFinite(r.value));
  if (!good.length) return html('<p class="empty">No hay lecturas válidas en este período.</p>');
  // `width` en unidades del SVG: menor en tarjetas angostas para que los textos conserven su tamaño.
  const w = width, h = width < 700 ? 250 : 270, left = 54, right = 16, top = 18, bottom = 34;
  const start = Math.min(fromSec, elapsedSec - 1), span = Math.max(1, elapsedSec - start);
  const grouped = good.length > 240 && span > 2 * 86400;
  const bucketSec = [60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 14400, 21600, 43200, 86400].find(s => s >= span / 180) || Math.ceil(span / 180 / 86400) * 86400;
  let lo = Infinity, hi = -Infinity;
  for (const row of good) { lo = Math.min(lo, row.value); hi = Math.max(hi, row.value); }
  const margin = Math.max((hi - lo) * 0.15, metric.clave === 'bmd' ? 0.01 : 0.5);
  lo -= margin; hi += margin;
  const x = t => left + (t - start) / span * (w - left - right);
  const y = value => top + (hi - value) / (hi - lo) * (h - top - bottom);
  const base = h - bottom, id = `g${++uid}`;
  // Segmentos continuos (se cortan en huecos de datos).
  let segments = [];
  {
    let seg = [], previous = null;
    for (const r of visible) {
      if (r.quality !== 'valid' || !Number.isFinite(r.value)) { if (seg.length) segments.push(seg); seg = []; previous = null; continue; }
      const period = r.elapsedSec <= 0 && previous?.elapsedSec < 0 ? Math.max(metric.periodSec, HISTORY_STEP_SEC) : metric.effectivePeriod;
      if (previous && r.elapsedSec - previous.elapsedSec > period * 2 && seg.length) { segments.push(seg); seg = []; }
      seg.push({...r, t: r.elapsedSec}); previous = r;
    }
    if (seg.length) segments.push(seg);
  }
  if (grouped) segments = segments.map(seg => buckets(seg, start, bucketSec));
  const line = seg => seg.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const area = seg => `${line(seg)}L${x(seg.at(-1).t).toFixed(1)},${base}L${x(seg[0].t).toFixed(1)},${base}Z`;
  const band = seg => `${seg.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.max).toFixed(1)}`).join('')}${seg.slice().reverse().map(p => `L${x(p.t).toFixed(1)},${y(p.min).toFixed(1)}`).join('')}Z`;
  // Franja de referencia configurada (si cae dentro del rango visible).
  const refTop = y(Math.min(hi, metric.hi)), refBottom = y(Math.max(lo, metric.lo));
  const reference = hasReference(metric) && refBottom > refTop ? `<rect x="${left}" y="${refTop.toFixed(1)}" width="${w - left - right}" height="${(refBottom - refTop).toFixed(1)}" class="chart-ref"/>` : '';
  const ticks = Array.from({length: 4}, (_, i) => {
    const value = lo + (hi - lo) * i / 3, yy = y(value);
    return `<line x1="${left}" x2="${w - right}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" class="chart-grid"/><text x="${left - 10}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${value.toFixed(metric.decimals)}</text>`;
  }).join('');
  const labels = (w < 700 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map(f => {
    const sec = start + span * f;
    const text = startTime ? label(startTime, sec, span) : `${(sec / 60).toFixed(0)} min`;
    return `<text x="${x(sec).toFixed(1)}" y="${h - 8}" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}">${text}</text>`;
  }).join('');
  const now = start < 0 && elapsedSec > 0 && x(0) < w - right - 150
    ? html`<line x1="${x(0)}" x2="${x(0)}" y1="${top}" y2="${base}" class="chart-now"/><text x="${x(0) + 6}" y="${top + 12}" class="chart-now-label">Inicio de la ejecución</text>` : '';
  const last = good.at(-1);
  const marker = `<circle cx="${x(last.elapsedSec).toFixed(1)}" cy="${y(last.value).toFixed(1)}" r="4.5" fill="${metric.color}" class="chart-last"><title>${escapar(last.timestamp)} · ${last.value} ${escapar(t(metric.unidad))}</title></circle>`;
  const dots = !grouped && good.length <= 24 ? good.map(r => `<circle cx="${x(r.elapsedSec).toFixed(1)}" cy="${y(r.value).toFixed(1)}" r="3" fill="${metric.color}"><title>${escapar(r.timestamp)} · ${r.value} ${escapar(t(metric.unidad))}</title></circle>`).join('') : '';
  const averages = grouped ? segments.flatMap(seg => seg.map(p => html`<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="4" fill="transparent"><title>${escapar(p.first)} — ${escapar(p.last)} · Media: ${p.value.toFixed(metric.decimals)} ${escapar(t(metric.unidad))} · ${p.n} lecturas · Mín.: ${p.min} · Máx.: ${p.max}</title></circle>`)).join('') : '';
  const interval = formatDuration(bucketSec);
  return html`<svg class="history-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapar(t(metric.nombre))} en ${escapar(t(metric.unidad))}${grouped ? t(', media por intervalo con rango mínimo y máximo') : ''}. Las interrupciones representan datos ausentes o excluidos.">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${metric.color}" stop-opacity=".28"/><stop offset="1" stop-color="${metric.color}" stop-opacity="0"/></linearGradient></defs>
    ${reference}${ticks}${now}${labels}
    ${grouped ? segments.map(s => `<path d="${band(s)}" fill="${metric.color}" opacity=".18"/>`).join('') : segments.map(s => `<path d="${area(s)}" fill="url(#${id})"/>`).join('')}
    ${segments.map(s => `<path d="${line(s)}" fill="none" stroke="${metric.color}" stroke-width="${grouped ? 2 : 1.8}" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
    ${dots}${averages}${marker}</svg>${grouped ? html`<p class="hint chart-legend">Media cada ${interval} · ${good.length.toLocaleString(getLocale())} lecturas → ${segments.reduce((n,s)=>n+s.length,0)} puntos. Franja: mínimo y máximo${reference ? t(' · zona clara: referencia') : ''}.</p>` : ''}`;
}
