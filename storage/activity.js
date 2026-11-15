import {mkdir, open, link, unlink, readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID, createHash} from 'node:crypto';
import {readRun, DEFAULT_DATA_DIR} from './files.js';
import {canView, activitySubject} from '../shared/crew.js';
import {prepareActivity} from '../shared/activity.js';

export {AccessError} from '../shared/activity.js';

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
  const history = input?.type === 'dispatch' ? await readActivity(id, dir) : [];
  const prepared = prepareActivity(result, input, {actor, history});
  const {payload} = prepared;
  // Un envío por informe: el archivo con nombre derivado del informe se crea en exclusiva ('wx'),
  // así dos solicitudes simultáneas no pueden registrar dos envíos.
  const entry = {id: input.type === 'dispatch' ? dispatchId(payload.reportId) : randomUUID(), createdAt: new Date().toISOString(), elapsedSec: input.elapsedSec,
    observedAt: new Date(Date.parse(result.config.startTime) + input.elapsedSec * 1000).toISOString(),
    ...prepared};
  const folder = path.join(dir instanceof URL ? fileURLToPath(dir) : dir, id + '-activity');
  await mkdir(folder, {recursive: true});
  const final = path.join(folder, entry.id + '.json'), temp = `${final}.${randomUUID()}.tmp`;
  const handle = await open(temp, 'wx');
  try { await handle.writeFile(JSON.stringify(entry, null, 2)); await handle.sync(); } finally { await handle.close(); }
  try { await link(temp, final); }
  catch (e) { if (e.code === 'EEXIST') throw new Error('Registro inválido. Revisá los campos.'); throw e; }
  finally { await unlink(temp); }
  return entry;
}

// UUID determinista (formato v4-like) a partir del informe, para que el nombre del envío sea único por informe.
function dispatchId(reportId) {
  const h = createHash('sha256').update('dispatch:' + reportId).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
