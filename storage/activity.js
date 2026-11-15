import {mkdir, open, link, unlink, readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID, createHash} from 'node:crypto';
import {readRun, DEFAULT_DATA_DIR} from './files.js';
import {isSensorMetric} from '../shared/catalog.js';
import {crewOf, canView, activitySubject, memberView} from '../shared/crew.js';

export class AccessError extends Error {}

/**
 * Registro de actividad de una ejecución. Con `viewer`, devuelve solo lo que ese tripulante puede ver:
 * sus propios registros, o los de toda la tripulación si es comandante o médica.
 */
export async function readActivity(id, dir = DEFAULT_DATA_DIR, viewer = null) {
  const {result} = await readRun(id, dir);
  const folder = path.join(dir instanceof URL ? fileURLToPath(dir) : dir, id + '-activity');
  let files;
  try { files = await readdir(folder); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const entries = await Promise.all(files.filter(f => f.endsWith('.json')).map(async f => {
    // Un archivo dañado o ajeno no debe bloquear el resto del registro: se omite sin modificarlo.
    try {
      const e = JSON.parse(await readFile(path.join(folder, f), 'utf8'));
      return e && typeof e === 'object' && typeof e.id === 'string' && typeof e.createdAt === 'string' && typeof e.type === 'string'
        && Number.isInteger(e.elapsedSec) && e.payload && typeof e.payload === 'object' ? e : null;
    } catch { return null; }
  }));
  return entries.filter(e => e && (!viewer || canView(viewer, activitySubject(e, result))))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/**
 * `actor` es el tripulante que registra (por defecto, el primero de la tripulación).
 * `input.subjectId` es el tripulante sobre el que se registra (por defecto, el actor).
 */
export async function addActivity(id, input, dir = DEFAULT_DATA_DIR, actor = null) {
  const {result} = await readRun(id, dir);
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
      const history = await readActivity(id, dir);
      if (!history.some(e => e.id === p.reportId && e.type === 'report' && activitySubject(e, result) === subjectId) ||
          history.some(e => e.type === 'dispatch' && e.payload.reportId === p.reportId)) fail();
      payload = {reportId: p.reportId, status: 'received_local', receivedAt: new Date().toISOString()}; break;
    }
    case 'preferences':
      if (!own || typeof p.reducedMotion !== 'boolean') fail();
      payload = {reducedMotion: p.reducedMotion}; break;
    default: fail();
  }
  // Un envío por informe: el archivo con nombre derivado del informe se crea en exclusiva ('wx'),
  // así dos solicitudes simultáneas no pueden registrar dos envíos.
  const entry = {id: input.type === 'dispatch' ? dispatchId(payload.reportId) : randomUUID(), createdAt: new Date().toISOString(), elapsedSec: input.elapsedSec,
    observedAt: new Date(Date.parse(result.config.startTime) + input.elapsedSec * 1000).toISOString(),
    subjectId, authorId: actor.id, type: input.type, payload};
  const folder = path.join(dir instanceof URL ? fileURLToPath(dir) : dir, id + '-activity');
  await mkdir(folder, {recursive: true});
  const final = path.join(folder, entry.id + '.json'), temp = `${final}.${randomUUID()}.tmp`;
  const handle = await open(temp, 'wx');
  try { await handle.writeFile(JSON.stringify(entry, null, 2)); await handle.sync(); } finally { await handle.close(); }
  try { await link(temp, final); }
  catch (e) { if (e.code === 'EEXIST') fail(); throw e; }
  finally { await unlink(temp); }
  return entry;
}

// UUID determinista (formato v4-like) a partir del informe, para que el nombre del envío sea único por informe.
function dispatchId(reportId) {
  const h = createHash('sha256').update('dispatch:' + reportId).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
