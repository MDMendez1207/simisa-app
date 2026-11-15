// Consultas compartidas: la web solo explora registros persistidos.
import {isSensorMetric} from './catalog.js';

/** Convierte los chequeos psicológicos (autoinforme) en filas consultables de "Estrés percibido". */
export function selfReportRows(result, activity = []) {
  const metric = result.indicators.find(m => m.clave === 'stress');
  if (!metric) return [];
  return activity.filter(e => e.type === 'wellbeing')
    .map(e => ({id: `wellbeing:${e.id}`, subjectId: result.subject.id, indicator: 'stress', value: e.payload.stress,
      unit: metric.unidad, timestamp: e.observedAt, elapsedSec: e.elapsedSec, sourceId: 'bienestar',
      captureMethod: 'self_report', quality: 'valid', availability: 'available',
      condition: e.payload.stress < metric.lo || e.payload.stress > metric.hi ? 'outside' : 'inside',
      mood: e.payload.mood, note: e.payload.note || '', createdAt: e.createdAt}))
    .sort((a, b) => a.elapsedSec - b.elapsedSec || a.createdAt.localeCompare(b.createdAt));
}

// Los indicadores de sensores salen de la telemetría guardada; los de autoinforme, de los chequeos.
// Las lecturas sintéticas de estrés de resultados 1.0.0 se conservan en el archivo pero no se presentan.
export function buildIndex(result, activity = []) {
  const manual = selfReportRows(result, activity);
  return Object.fromEntries(result.indicators.map(m => [m.clave, isSensorMetric(m.clave)
    ? result.measurements.filter(r => r.indicator === m.clave)
    : manual.filter(r => r.indicator === m.clave)]));
}

export function observationAt(result, index, id, elapsedSec) {
  const metric = result.indicators.find(m => m.clave === id);
  const rows = index[id] || [];
  let lo = 0, hi = rows.length - 1, chosen = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].elapsedSec <= elapsedSec) { chosen = mid; lo = mid + 1; } else hi = mid - 1;
  }
  const latest = rows[chosen] || null;
  let lastValid = null;
  for (let i = chosen; i >= 0; i--) if (rows[i].quality === 'valid') { lastValid = rows[i]; break; }
  const period = metric ? Math.max(metric.periodSec, result.config.stepSec) : 0;
  const stale = latest && elapsedSec - latest.elapsedSec > period * 2;
  return {latest, lastValid, current: latest?.quality === 'valid' && !stale ? latest : null,
    availability: !latest ? 'no_data' : stale ? 'stale' : latest.availability,
    quality: latest?.quality || 'missing', condition: lastValid?.condition || 'unknown'};
}

export function summarize(result, index, id, elapsedSec) {
  const values = (index[id] || []).filter(r => r.elapsedSec <= elapsedSec && r.quality === 'valid').map(r => r.value);
  return {count: values.length, min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null};
}
