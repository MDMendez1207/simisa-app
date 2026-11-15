import {createHash} from 'node:crypto';
import {INDICATORS, SENSOR_INDICATORS, SOURCES, SCENARIOS, CATALOG_VERSION, HISTORY_STEP_SEC, MAX_HISTORY_DAYS, RADIATION_MODEL, condition} from '../shared/catalog.js';
import {CREW, SCENARIO_SUBJECT, publicMember} from '../shared/crew.js';

// 1.1.0: el motor solo produce lecturas de sensores; el estrés percibido proviene del chequeo psicológico manual.
// 2.0.0: una ejecución simula a toda la tripulación; los episodios preparados afectan a SCENARIO_SUBJECT.
// 2.1.0: historial previo opcional (historyDays) con tiempos negativos y chequeos psicológicos sintéticos.
// 2.2.0: dosímetro personal y tasa de dosis en µSv/h, sin umbrales clínicos configurados.
// 2.3.0: escala de exposición ISS/LEO (0,4–1,1 mSv/día); perfil y fuentes persistidos.
export const ENGINE_VERSION = 'synthetic-2.3.0';
export const SCHEMA_VERSION = 2;
/** Versiones del esquema 2 que se siguen leyendo. */
export const COMPATIBLE_ENGINE_VERSIONS = Object.freeze(['synthetic-2.0.0', 'synthetic-2.1.0', 'synthetic-2.2.0', ENGINE_VERSION]);
export const LEGACY_ENGINE_VERSIONS = Object.freeze(['synthetic-1.0.0', 'synthetic-1.1.0']);
export const DEFAULT_CONFIG = Object.freeze({name: 'Recorrido de prueba', seed: 2026,
  scenario: 'recorrido', startTime: '2026-11-14T12:00:00.000Z', durationMinutes: 60, stepSec: 10, historyDays: 0});
export const MOODS = Object.freeze(['Muy bien', 'Bien', 'Neutro', 'Bajo', 'Muy bajo']);

export function normalizeConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('La configuración debe ser un objeto.');
  const allowed = Object.keys(DEFAULT_CONFIG);
  if (Object.keys(input).some(k => !allowed.includes(k))) throw new Error('La configuración contiene campos desconocidos.');
  const c = {...DEFAULT_CONFIG, ...input};
  if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 80) throw new Error('El nombre debe tener entre 1 y 80 caracteres.');
  if (!Number.isInteger(c.seed) || c.seed < 0 || c.seed > 4294967295) throw new Error('La semilla debe ser un entero entre 0 y 4294967295.');
  if (!SCENARIOS.some(s => s.id === c.scenario)) throw new Error('Escenario desconocido.');
  if (!Number.isInteger(c.durationMinutes) || c.durationMinutes < 1 || c.durationMinutes > 1440) throw new Error('La duración debe ser de 1 a 1440 minutos enteros.');
  if (![5, 10, 30, 60].includes(c.stepSec)) throw new Error('El paso debe ser 5, 10, 30 o 60 segundos.');
  if (!Number.isInteger(c.historyDays) || c.historyDays < 0 || c.historyDays > MAX_HISTORY_DAYS) throw new Error(`El historial previo debe ser de 0 a ${MAX_HISTORY_DAYS} días enteros.`);
  if (typeof c.startTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(c.startTime) || !Number.isFinite(Date.parse(c.startTime))) throw new Error('El inicio debe ser una fecha UTC ISO válida terminada en Z.');
  const iso = new Date(c.startTime).toISOString();
  if (iso.slice(0, 19) !== c.startTime.slice(0, 19)) throw new Error('La fecha de inicio no existe.');
  return {...c, name: c.name.trim(), startTime: iso};
}

// Mulberry32 conservado del motor original; cada observación crea su propio flujo.
export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const round = (value, decimals) => Number(value.toFixed(decimals));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function sample(metric, elapsed, config, member) {
  const duration = config.durationMinutes * 60;
  const p = elapsed / duration;
  const seed = Number.parseInt(hash([config.seed, member.id, metric.clave, elapsed]).slice(0, 8), 16);
  const rng = mulberry32(seed);
  const noise = (rng() + rng() + rng() - 1.5) / 1.5;
  // Cada tripulante tiene su propio desfase de actividad dentro de la hora; el afectado conserva
  // la fase original para que el episodio preparado se distinga del esfuerzo habitual.
  const affected = member.id === SCENARIO_SUBJECT;
  const phase = affected ? 0 : CREW.indexOf(member) * 900;
  let activity = (1 - Math.cos((elapsed + phase) / 3600 * Math.PI * 2)) / 2;
  const episode = affected && ['recorrido', 'respiratorio'].includes(config.scenario) && p >= 0.25 && p < 0.55
    ? Math.sin((p - 0.25) / 0.3 * Math.PI) : 0;
  const drop = affected && ['recorrido', 'desconexion'].includes(config.scenario) && p >= 0.65 && p < 0.8;
  const invalid = affected && config.scenario === 'calidad' && p >= 0.35 && p < 0.55;
  const low = affected && config.scenario === 'recorrido' && p >= 0.85 && p < 0.9;
  let value = metric.base + (member.offsets[metric.clave] || 0);
  if (elapsed < 0) {
    // Historial previo: ritmo día/noche, leve pérdida ósea propia del vuelo y, en el tripulante
    // afectado por el escenario, descanso que empeora en los últimos días (antesala del episodio).
    const at = new Date(Date.parse(config.startTime) + elapsed * 1000);
    const hour = at.getUTCHours() + at.getUTCMinutes() / 60;
    const night = (1 + Math.cos((hour - 3) / 24 * Math.PI * 2)) / 2; // 1 a las 03:00, 0 a las 15:00
    activity = 0.7 * (1 - night) * (0.8 + 0.2 * Math.sin(elapsed / 86400 * 1.7));
    const daysAgo = -elapsed / 86400, recent = 1 - daysAgo / config.historyDays;
    value += {hr: -7 * night, rr: -2 * night, sys: -6 * night, dia: -3 * night, temp: -0.2 * night,
      bmd: 0.0004 * daysAgo, sleep: affected ? -1 * recent : 0}[metric.clave] || 0;
  }
  switch (metric.clave) {
    case 'hr': value += 9 * activity + 9 * episode + noise * 1.4; break;
    case 'rr': value += 2 * activity + 4 * episode + noise * 0.6; break;
    case 'spo2': value += -7 * episode + noise * 0.3; break;
    case 'sys': value += 7 * activity + noise * 2; break;
    case 'dia': value += 3 * activity + noise; break;
    case 'temp': value += 0.12 * Math.sin(elapsed / 86400 * Math.PI * 2) + noise * 0.04; break;
    case 'gluc': value += 8 * Math.sin(elapsed / 7200 * Math.PI * 2) + noise * 2; break;
    case 'bmd': value += noise * 0.005; break;
    case 'sleep': value += noise * 0.4; break;
    case 'rad': {
      // Perfil común de exposición, independiente del esfuerzo y del episodio respiratorio.
      // Las ondas de 7 días y 90 min son recursos sintéticos, no predicciones orbitales/solares.
      const phase = mulberry32(config.seed ^ 0x726164)() * Math.PI * 2;
      const personal = 2 * CREW.indexOf(member) / (CREW.length - 1) - 1;
      const variation = 0.8 * Math.sin(elapsed / (7 * 86400) * Math.PI * 2 + phase)
        + 0.15 * Math.sin(elapsed / 5400 * Math.PI * 2) + 0.03 * noise + 0.02 * personal;
      value = metric.base + metric.amplitud * variation;
      break;
    }
  }
  value = round(clamp(value, ...metric.domain), metric.decimals);
  const isOximetry = metric.clave === 'spo2';
  const quality = isOximetry && drop ? 'missing' : isOximetry && invalid ? 'invalid' : isOximetry && low ? 'low_quality' : 'valid';
  if (isOximetry && invalid) value = 105;
  if (isOximetry && drop) value = null;
  return {id: `${member.code.toLowerCase()}:${metric.clave}:${elapsed}`, subjectId: member.id, indicator: metric.clave,
    value, unit: metric.unidad, timestamp: new Date(Date.parse(config.startTime) + elapsed * 1000).toISOString(),
    elapsedSec: elapsed, sourceId: metric.sourceId, captureMethod: 'synthetic', isDemo: true, quality,
    availability: isOximetry && drop ? 'disconnected' : 'available',
    condition: quality === 'valid' ? condition(metric, value) : 'unknown'};
}

/** Chequeos psicológicos sintéticos del historial: uno por día y tripulante, a las 20:00 relativas. */
function historyCheckins(config) {
  const base = {'ana-torres': 3, 'lucia-ferreyra': 2.4, 'kenji-mori': 3.2, 'omar-haddad': 3.8};
  const checkins = [];
  for (let day = config.historyDays; day >= 1; day--) {
    const elapsed = -day * 86400 + 20 * 3600;
    for (const member of CREW) {
      const rng = mulberry32(Number.parseInt(hash([config.seed, member.id, 'checkin', elapsed]).slice(0, 8), 16));
      const noise = (rng() + rng() + rng() - 1.5) / 1.5;
      const trend = member.id === SCENARIO_SUBJECT ? 3 * (1 - (day - 1) / config.historyDays) : 0;
      const stress = round(clamp((base[member.id] ?? 3) + trend + noise * 0.9, 0, 10), 1);
      const mood = MOODS[stress < 2.5 ? 0 : stress < 4 ? 1 : stress < 5.5 ? 2 : stress < 7 ? 3 : 4];
      checkins.push({id: `${member.code.toLowerCase()}:checkin:${elapsed}`, subjectId: member.id, elapsedSec: elapsed,
        observedAt: new Date(Date.parse(config.startTime) + elapsed * 1000).toISOString(), mood, stress, note: '', synthetic: true});
    }
  }
  return checkins;
}

export function simulate(input = {}) {
  const config = normalizeConfig(input);
  const measurements = [], events = [], previous = new Map(), lastEmit = new Map();
  const historySec = config.historyDays * 86400;
  for (let elapsed = historySec ? -historySec : 0; elapsed <= config.durationMinutes * 60; elapsed += elapsed < 0 ? HISTORY_STEP_SEC : config.stepSec) {
    for (const member of CREW) for (const metric of SENSOR_INDICATORS) {
      const key = `${member.id}:${metric.clave}`;
      const period = Math.max(elapsed < 0 ? HISTORY_STEP_SEC : config.stepSec, metric.periodSec);
      if (lastEmit.has(key) && elapsed - lastEmit.get(key) < period) continue;
      lastEmit.set(key, elapsed);
      const reading = sample(metric, elapsed, config, member);
      measurements.push(reading);
      const prev = previous.get(key);
      if (prev && prev.quality !== reading.quality) events.push({id: `quality:${reading.id}`, type: 'technical', subjectId: member.id,
        indicator: metric.clave, timestamp: reading.timestamp, elapsedSec: elapsed,
        state: reading.quality, evidenceId: reading.id,
        message: reading.quality === 'missing' ? 'Fuente desconectada; historial conservado.' :
          reading.quality === 'valid' ? 'Nueva lectura válida recibida.' : 'Cambio de calidad de la lectura.'});
      const lastCondition = prev?.lastCondition ?? 'inside';
      if (reading.quality === 'valid' && reading.condition !== 'unknown' && reading.condition !== lastCondition) events.push({
        id: `condition:${reading.id}`, type: 'indicator', subjectId: member.id, indicator: metric.clave,
        timestamp: reading.timestamp, elapsedSec: elapsed, state: reading.condition,
        evidenceId: reading.id, message: reading.condition === 'outside' ? 'Fuera de la referencia ilustrativa.' : 'Regreso a la referencia ilustrativa.',
      });
      previous.set(key, {...reading, lastCondition: reading.quality === 'valid' ? reading.condition : lastCondition});
    }
  }
  const payload = {schemaVersion: SCHEMA_VERSION, engineVersion: ENGINE_VERSION, catalogVersion: CATALOG_VERSION,
    config, crew: CREW.map(publicMember),
    indicators: INDICATORS, sources: SOURCES, measurements, events, checkins: historyCheckins(config),
    radiationModel: RADIATION_MODEL,
    assumptions: ['Datos sintéticos para probar software; sin validación clínica.',
      'Relaciones y variaciones preparadas para la demostración; no son un modelo fisiológico validado.',
      'Unidades, escalas y referencias heredadas de SIMISA_entrega; referencias ilustrativas. Radiación amplía el catálogo con la tasa en µSv/h definida en docs/simisa/08-unificacion.md.',
      'El dosímetro usa el perfil sintético ISS/LEO: 0,4–1,1 mSv/día como escala de exposición, equivalente a medias de 16,67–45,83 µSv/h. Cada minuto se registra una tasa en µSv/h; el historial previo conserva su muestreo de 30 minutos. La variación de 7 días y 90 min, la semilla y las diferencias entre tripulantes son recursos para probar software, no un modelo de transporte de radiación.',
      'El rango documentado NASA corresponde a dosis equivalente a órganos hematopoyéticos en ISS; se usa solo para orientar la escala. No se convierte una lectura personal en dosis efectiva ni dosis por órgano; tampoco se predice exposición lunar ni riesgo individual. Los 100 mSv citados por la OMS son contexto epidemiológico, no un umbral anual automático. Sin umbrales de seguridad configurados.',
      'Las ausencias no son ceros. Las lecturas de baja calidad o inválidas no generan condiciones de indicador.',
      'Los signos vitales y registros fisiológicos provienen solo de sensores; no se admiten cargas manuales. El estrés percibido no se simula en la telemetría: se registra en el chequeo psicológico.',
      'El historial previo (tiempos negativos) se muestrea cada 30 minutos e incluye chequeos psicológicos sintéticos marcados como tales.']};
  return {id: hash(payload).slice(0, 24), ...payload};
}
