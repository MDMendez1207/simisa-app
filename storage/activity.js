import {mkdir, open, link, unlink, readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {readRun, DEFAULT_DATA_DIR} from './files.js';

export async function readActivity(id, dir = DEFAULT_DATA_DIR) {
  await readRun(id, dir);
  const folder = path.join(dir instanceof URL ? fileURLToPath(dir) : dir, id + '-activity');
  let files;
  try { files = await readdir(folder); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const entries = await Promise.all(files.filter(f => f.endsWith('.json')).map(async f => JSON.parse(await readFile(path.join(folder, f), 'utf8'))));
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export async function addActivity(id, input, dir = DEFAULT_DATA_DIR) {
  const {result} = await readRun(id, dir);
  const fail = () => { throw new Error('Registro inválido. Revisá los campos.'); };
  if (!input || !Number.isInteger(input.elapsedSec) || input.elapsedSec < 0 || input.elapsedSec > result.config.durationMinutes * 60) fail();
  const p = input.payload;
  if (!p || typeof p !== 'object') fail();
  const text = (v, max = 1000) => typeof v === 'string' && v.length > 0 && v.length <= max;
  let payload;
  // Signos vitales y sueño provienen exclusivamente de sensores: no existe carga manual de mediciones.
  if (['measurement', 'sleep'].includes(input.type)) throw new Error('Las mediciones provienen exclusivamente de sensores; no se admiten cargas manuales.');
  switch (input.type) {
    case 'wellbeing':
      if (!['Muy bien', 'Bien', 'Neutro', 'Bajo', 'Muy bajo'].includes(p.mood) || !Number.isFinite(p.stress) || p.stress < 0 || p.stress > 10) fail();
      payload = {mood: p.mood, stress: p.stress, note: String(p.note || '').slice(0, 1000)}; break;
    case 'acknowledge':
      if (!result.events.some(e => e.id === p.eventId)) fail();
      payload = {eventId: p.eventId, note: String(p.note || '').slice(0, 1000)}; break;
    case 'chat':
      if (!text(p.question, 500) || !text(p.answer, 10000)) fail();
      payload = {question: p.question, answer: p.answer}; break;
    case 'profile':
      if (!['Astronauta', 'Equipo médico', 'Investigador'].includes(p.role)) fail();
      payload = {role: p.role}; break;
    case 'report':
      payload = {runId: id, observations: result.measurements.filter(r => r.elapsedSec <= input.elapsedSec).length,
        events: result.events.filter(e => e.elapsedSec <= input.elapsedSec).length, status: 'prepared'}; break;
    case 'dispatch': {
      const history = await readActivity(id, dir);
      if (!history.some(e => e.id === p.reportId && e.type === 'report') || history.some(e => e.type === 'dispatch' && e.payload.reportId === p.reportId)) fail();
      payload = {reportId: p.reportId, status: 'received_local', receivedAt: new Date().toISOString()}; break;
    }
    case 'preferences':
      if (typeof p.reducedMotion !== 'boolean') fail();
      payload = {reducedMotion: p.reducedMotion}; break;
    default: fail();
  }
  const entry = {id: randomUUID(), createdAt: new Date().toISOString(), elapsedSec: input.elapsedSec,
    observedAt: new Date(Date.parse(result.config.startTime) + input.elapsedSec * 1000).toISOString(), type: input.type, payload};
  const folder = path.join(dir instanceof URL ? fileURLToPath(dir) : dir, id + '-activity');
  await mkdir(folder, {recursive: true});
  const final = path.join(folder, entry.id + '.json'), temp = final + '.tmp';
  const handle = await open(temp, 'wx');
  try { await handle.writeFile(JSON.stringify(entry, null, 2)); await handle.sync(); } finally { await handle.close(); }
  try { await link(temp, final); } finally { await unlink(temp); }
  return entry;
}
