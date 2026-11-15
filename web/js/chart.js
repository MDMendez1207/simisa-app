// Evolución del dibujo SVG de SIMISA_entrega/features/graficas.js.
// Conserva área y línea, ahora con tiempos reales de registros y huecos explícitos.
import {escapar} from './core/utilidades.js';

export function chart(rows, metric, elapsedSec) {
  const visible = rows.filter(r => r.elapsedSec <= elapsedSec);
  const good = visible.filter(r => r.quality === 'valid');
  if (!good.length) return '<p class="empty">No hay lecturas válidas en este período.</p>';
  const w = 640, h = 210, left = 58, right = 18, top = 16, bottom = 38;
  let lo = Math.min(...good.map(r => r.value)), hi = Math.max(...good.map(r => r.value));
  const margin = Math.max((hi - lo) * 0.18, metric.clave === 'bmd' ? 0.01 : 0.5);
  lo -= margin; hi += margin;
  const end = Math.max(1, elapsedSec);
  const x = t => left + t / end * (w - left - right);
  const y = value => top + (hi - value) / (hi - lo) * (h - top - bottom);
  let active = false, previous = null, d = '';
  for (const r of visible) {
    if (r.quality !== 'valid') { active = false; continue; }
    const gap = previous && r.elapsedSec - previous.elapsedSec > metric.effectivePeriod * 2;
    d += `${active && !gap ? 'L' : 'M'}${x(r.elapsedSec).toFixed(2)},${y(r.value).toFixed(2)} `;
    active = true; previous = r;
  }
  const ticks = Array.from({length: 4}, (_, i) => {
    const value = lo + (hi - lo) * i / 3, yy = y(value);
    return `<line x1="${left}" x2="${w - right}" y1="${yy}" y2="${yy}" class="chart-grid"/><text x="${left - 8}" y="${yy + 4}" text-anchor="end">${value.toFixed(metric.decimals)}</text>`;
  }).join('');
  const labels = [0, 0.5, 1].map(f => `<text x="${x(end * f)}" y="${h - 9}" text-anchor="middle">+${(end * f / 60).toFixed(1)} min</text>`).join('');
  const points = (good.length <= 20 ? good : [good.at(-1)]).map(r => `<circle cx="${x(r.elapsedSec)}" cy="${y(r.value)}" r="3" fill="${metric.color}"><title>${escapar(r.timestamp)} · ${r.value} ${escapar(metric.unidad)}</title></circle>`).join('');
  return `<svg class="history-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapar(metric.nombre)} en ${escapar(metric.unidad)}. Las interrupciones representan datos ausentes o excluidos.">
    ${ticks}${labels}<path d="${d}" fill="none" stroke="${metric.color}" stroke-width="2.5" stroke-linejoin="round"/>${points}</svg>`;
}
