// Consultas compartidas: la web solo explora registros persistidos.
import {isSensorMetric, HISTORY_STEP_SEC} from './catalog.js';
import {activitySubject, defaultSubject} from './crew.js';

// Tripulante consultado: `subject` de una vista individual (memberView) o el primero de la tripulación.
const subjectOf = result => result.subject?.id ?? defaultSubject(result);

/** Convierte los chequeos psicológicos (autoinforme) en filas consultables de "Estrés percibido". */
export function selfReportRows(result, activity = []) {
  const metric = result.indicators.find(m => m.clave === 'stress');
  if (!metric) return [];
  const subject = subjectOf(result);
  // Chequeos sintéticos del historial (dentro del archivo) + chequeos registrados por el tripulante.
  const synthetic = (result.checkins || []).filter(c => c.subjectId === subject)
    .map(c => ({id: c.id, type: 'wellbeing', elapsedSec: c.elapsedSec, observedAt: c.observedAt, createdAt: '', synthetic: true, payload: {mood: c.mood, stress: c.stress, note: c.note}}));
  return [...synthetic, ...activity.filter(e => e.type === 'wellbeing' && activitySubject(e, result) === subject)]
    .map(e => ({id: `wellbeing:${e.id}`, subjectId: subject, indicator: 'stress', value: e.payload.stress,
      unit: metric.unidad, timestamp: e.observedAt, elapsedSec: e.elapsedSec, sourceId: 'bienestar',
      captureMethod: 'self_report', quality: 'valid', availability: 'available',
      condition: e.payload.stress < metric.lo || e.payload.stress > metric.hi ? 'outside' : 'inside',
      mood: e.payload.mood, note: e.payload.note || '', createdAt: e.createdAt, synthetic: Boolean(e.synthetic)}))
    .sort((a, b) => a.elapsedSec - b.elapsedSec || a.createdAt.localeCompare(b.createdAt));
}

/** Chequeos psicológicos (sintéticos del historial y registrados) hasta un momento, en orden. */
export function wellbeingEntries(result, activity, elapsedSec) {
  return selfReportRows(result, activity).filter(r => r.elapsedSec <= elapsedSec);
}

// Los indicadores de sensores salen de la telemetría guardada; los de autoinforme, de los chequeos.
// Las lecturas sintéticas de estrés de resultados 1.0.0 se conservan en el archivo pero no se presentan.
export function buildIndex(result, activity = []) {
  const manual = selfReportRows(result, activity), subject = subjectOf(result);
  return Object.fromEntries(result.indicators.map(m => [m.clave, isSensorMetric(m.clave)
    ? result.measurements.filter(r => r.indicator === m.clave && r.subjectId === subject)
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
  // Las lecturas del historial previo están más espaciadas que las de la ejecución.
  const period = metric ? Math.max(metric.periodSec, latest && latest.elapsedSec < 0 ? HISTORY_STEP_SEC : result.config.stepSec) : 0;
  const stale = latest && elapsedSec - latest.elapsedSec > period * 2;
  return {latest, lastValid, current: latest?.quality === 'valid' && !stale ? latest : null,
    availability: !latest ? 'no_data' : stale ? 'stale' : latest.availability,
    quality: latest?.quality || 'missing', condition: lastValid?.condition || 'unknown'};
}

export function summarize(result, index, id, elapsedSec, fromSec = -Infinity) {
  const values = (index[id] || []).filter(r => r.elapsedSec <= elapsedSec && r.elapsedSec >= fromSec && r.quality === 'valid').map(r => r.value);
  return {count: values.length, min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null};
}
