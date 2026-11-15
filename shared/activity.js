import {isSensorMetric} from './catalog.js';
import {crewOf, canView, activitySubject, memberView} from './crew.js';

export class AccessError extends Error {}

/** Valida acciones de la interfaz. El guardado se resuelve por separado, en disco o en la pestaña. */
export function prepareActivity(result, input, {actor = null, history = []} = {}) {
  const id = result.id;
  const crew = crewOf(result);
  actor ??= crew[0];
  const fail = () => { throw new Error('Registro inválido. Revisá los campos.'); };
  const historySec = (result.config.historyDays || 0) * 86400;
  if (!input || !Number.isInteger(input.elapsedSec) || input.elapsedSec < -historySec || input.elapsedSec > result.config.durationMinutes * 60) fail();
  const p = input.payload;
  if (!p || typeof p !== 'object') fail();
  const subjectId = input.subjectId ?? actor.id;
  if (!crew.some(m => m.id === subjectId)) fail();
  if (!canView(actor, subjectId)) throw new AccessError('No tenés permiso para registrar información de otro tripulante.');
  const own = subjectId === actor.id;
  const view = memberView(result, subjectId);
  const text = (v, max = 1000) => typeof v === 'string' && v.length > 0 && v.length <= max;
  let payload;
  // Signos vitales y sueño provienen exclusivamente de sensores: no existe carga manual de mediciones.
  if (['measurement', 'sleep'].includes(input.type)) throw new Error('Las mediciones provienen exclusivamente de sensores; no se admiten cargas manuales.');
  switch (input.type) {
    case 'wellbeing':
      // El chequeo psicológico es un autoinforme: nadie lo completa por otro tripulante.
      if (!own) throw new AccessError('Cada tripulante completa solamente su propio chequeo psicológico.');
      if (!['Muy bien', 'Bien', 'Neutro', 'Bajo', 'Muy bajo'].includes(p.mood) || !Number.isFinite(p.stress) || p.stress < 0 || p.stress > 10) fail();
      payload = {mood: p.mood, stress: p.stress, note: String(p.note || '').slice(0, 1000)}; break;
    case 'acknowledge':
      if (!view.events.some(e => e.id === p.eventId)) fail();
      payload = {eventId: p.eventId, note: String(p.note || '').slice(0, 1000)}; break;
    case 'chat':
      if (!text(p.question, 500) || !text(p.answer, 10000)) fail();
      payload = {question: p.question, answer: p.answer}; break;
    case 'report':
      payload = {runId: id, observations: view.measurements.filter(r => r.elapsedSec <= input.elapsedSec && isSensorMetric(r.indicator)).length,
        events: view.events.filter(e => e.elapsedSec <= input.elapsedSec).length, status: 'prepared'}; break;
    case 'dispatch': {
      if (typeof p.reportId !== 'string' || !/^[0-9a-f-]{36}$/.test(p.reportId)) fail();
      if (!history.some(e => e.id === p.reportId && e.type === 'report' && activitySubject(e, result) === subjectId) ||
          history.some(e => e.type === 'dispatch' && e.payload.reportId === p.reportId)) fail();
      payload = {reportId: p.reportId, status: 'received_local', receivedAt: new Date().toISOString()}; break;
    }
    case 'preferences':
      if (!own || typeof p.reducedMotion !== 'boolean') fail();
      payload = {reducedMotion: p.reducedMotion}; break;
    default: fail();
  }
  return {subjectId, authorId: actor.id, type: input.type, payload};
}
