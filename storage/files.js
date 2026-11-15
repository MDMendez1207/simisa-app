import {mkdir, open, readFile, readdir, link, unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalizeConfig, COMPATIBLE_ENGINE_VERSIONS, SCHEMA_VERSION, LEGACY_ENGINE_VERSIONS, MOODS} from '../engine/simulator.js';
import {CATALOG_VERSION, LEGACY_CATALOG_VERSIONS, isSensorMetric} from '../shared/catalog.js';
import {ROLES} from '../shared/crew.js';

export const DEFAULT_DATA_DIR = new URL('../data/runs/', import.meta.url);
const checksum = result => createHash('sha256').update(JSON.stringify(result)).digest('hex');
const validId = id => typeof id === 'string' && /^[a-f0-9]{24}$/.test(id);
const current = r => r.schemaVersion === SCHEMA_VERSION && COMPATIBLE_ENGINE_VERSIONS.includes(r.engineVersion) && [CATALOG_VERSION, ...LEGACY_CATALOG_VERSIONS].includes(r.catalogVersion);
// Versión 1: un único sujeto (motores 1.0.0 y 1.1.0). Se leen sin migrar.
const legacy = r => r.schemaVersion === 1 && LEGACY_ENGINE_VERSIONS.includes(r.engineVersion) && [CATALOG_VERSION, ...LEGACY_CATALOG_VERSIONS].includes(r.catalogVersion);
const allowsSyntheticStress = r => r.engineVersion === 'synthetic-1.0.0';

export function validateResult(result) {
  if (!result || !validId(result.id) || !(current(result) || legacy(result))) throw new Error('Formato o versión de resultado no compatible.');
  const config = normalizeConfig(result.config), historySec = config.historyDays * 86400;
  if (!Array.isArray(result.indicators) || !result.indicators.length || !Array.isArray(result.sources) ||
      !Array.isArray(result.measurements) || !result.measurements.length || !Array.isArray(result.events)) throw new Error('Resultado incompleto.');
  const crew = current(result) ? result.crew : [result.subject];
  if (!Array.isArray(crew) || !crew.length || crew.some(m => m?.fictional !== true || typeof m.id !== 'string' || typeof m.name !== 'string') ||
      (current(result) && (result.subject !== undefined || crew.some(m => !ROLES[m.role]))) ||
      new Set(crew.map(m => m.id)).size !== crew.length) throw new Error('Resultado incompleto.');
  const members = new Set(crew.map(m => m.id));
  const metrics = new Map(result.indicators.map(m => [m.clave, m]));
  const sources = new Set(result.sources.map(s => s.id));
  const ids = new Set();
  let lastTime = -Infinity;
  for (const row of result.measurements) {
    const metric = metrics.get(row.indicator);
    if (!metric || !members.has(row.subjectId) || row.unit !== metric.unidad || !sources.has(row.sourceId) ||
        row.isDemo !== true || row.captureMethod !== 'synthetic' ||
        !['valid', 'low_quality', 'invalid', 'missing'].includes(row.quality) ||
        !['available', 'disconnected'].includes(row.availability) ||
        !['inside', 'outside', 'unknown'].includes(row.condition) ||
        !Number.isInteger(row.elapsedSec) || row.elapsedSec < Math.max(lastTime, -historySec) || row.elapsedSec > result.config.durationMinutes * 60 ||
        row.timestamp !== new Date(Date.parse(result.config.startTime) + row.elapsedSec * 1000).toISOString() ||
        ids.has(row.id) || (row.quality === 'missing' ? row.value !== null : !Number.isFinite(row.value))) throw new Error('Medición inválida o inconsistente.');
    if (row.quality === 'valid' && (row.value < metric.domain[0] || row.value > metric.domain[1])) throw new Error('Valor válido fuera del dominio.');
    // Desde 1.1.0 la telemetría solo contiene indicadores de sensores.
    if (!allowsSyntheticStress(result) && !isSensorMetric(row.indicator)) throw new Error('Un indicador de autoinforme no puede provenir de la telemetría.');
    ids.add(row.id); lastTime = row.elapsedSec;
  }
  if (result.checkins !== undefined && (!Array.isArray(result.checkins) || result.checkins.some(c => !c || c.synthetic !== true || !members.has(c.subjectId) ||
      !Number.isInteger(c.elapsedSec) || c.elapsedSec < -historySec || c.elapsedSec >= 0 || !MOODS.includes(c.mood) ||
      !Number.isFinite(c.stress) || c.stress < 0 || c.stress > 10 || typeof c.id !== 'string' ||
      c.observedAt !== new Date(Date.parse(result.config.startTime) + c.elapsedSec * 1000).toISOString()))) throw new Error('Chequeo sintético inválido.');
  const owner = new Map(result.measurements.map(r => [r.id, r.subjectId]));
  for (const event of result.events) if (!ids.has(event.evidenceId) || !metrics.has(event.indicator) ||
    (current(result) && event.subjectId !== owner.get(event.evidenceId))) throw new Error('Evento sin evidencia.');
  const {id, ...payload} = result;
  if (checksum(payload).slice(0, 24) !== id) throw new Error('La identidad no coincide con el contenido.');
  return result;
}

function filePath(dir, id) {
  if (!validId(id)) throw new Error('Identificador inválido.');
  return path.join(dir, `${id}.json`);
}

// fileURLToPath conserva espacios, caracteres no ASCII y rutas Windows.
const directory = dir => path.resolve(dir instanceof URL ? fileURLToPath(dir) : dir);

export async function readRun(id, dir = DEFAULT_DATA_DIR) {
  const envelope = JSON.parse(await readFile(filePath(directory(dir), id), 'utf8'));
  if (envelope.fileVersion !== 1 || envelope.checksum !== checksum(envelope.result) || envelope.result?.id !== id) throw new Error('El archivo está dañado o su integridad no coincide.');
  validateResult(envelope.result);
  return envelope;
}

export async function saveRun(result, dir = DEFAULT_DATA_DIR) {
  validateResult(result);
  const dataDir = directory(dir);
  await mkdir(dataDir, {recursive: true});
  const finalPath = filePath(dataDir, result.id);
  try { return {envelope: await readRun(result.id, dataDir), path: finalPath, reused: true}; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const envelope = {fileVersion: 1, createdAt: new Date().toISOString(), checksum: checksum(result), result};
  const temp = path.join(dataDir, `.${result.id}.${randomUUID()}.tmp`);
  try {
    const handle = await open(temp, 'wx');
    try { await handle.writeFile(JSON.stringify(envelope, null, 2), 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    try { await link(temp, finalPath); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const verified = await readRun(result.id, dataDir);
    return {envelope: verified, path: finalPath, reused: verified.createdAt !== envelope.createdAt};
  } finally { await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

export async function listRuns(dir = DEFAULT_DATA_DIR) {
  const dataDir = directory(dir);
  await mkdir(dataDir, {recursive: true});
  const runs = [], warnings = [];
  for (const name of (await readdir(dataDir)).filter(n => n.endsWith('.json')).sort()) {
    const id = name.slice(0, -5);
    try {
      const {result, createdAt, checksum: digest} = await readRun(id, dataDir);
      runs.push({id, createdAt, checksum: digest, config: result.config,
        count: result.measurements.length, eventCount: result.events.length});
    } catch { warnings.push({file: name, message: 'No se pudo leer este resultado. Revise su formato e integridad.'}); }
  }
  runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return {runs, warnings};
}
