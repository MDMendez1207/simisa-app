import {createHash} from 'node:crypto';
import {INDICATORS, SENSOR_INDICATORS, SOURCES, SCENARIOS, CATALOG_VERSION, condition} from '../shared/catalog.js';

// 1.1.0: el motor solo produce lecturas de sensores; el estrés percibido proviene del chequeo psicológico manual.
export const ENGINE_VERSION = 'synthetic-1.1.0';
export const LEGACY_ENGINE_VERSIONS = Object.freeze(['synthetic-1.0.0']);
export const DEFAULT_CONFIG = Object.freeze({name: 'Recorrido de prueba', seed: 2026,
  scenario: 'recorrido', startTime: '2026-11-14T12:00:00.000Z', durationMinutes: 60, stepSec: 10});

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

function sample(metric, elapsed, config) {
  const duration = config.durationMinutes * 60;
  const p = elapsed / duration;
  const seed = Number.parseInt(hash([config.seed, metric.clave, elapsed]).slice(0, 8), 16);
  const rng = mulberry32(seed);
  const noise = (rng() + rng() + rng() - 1.5) / 1.5;
  const activity = (1 - Math.cos(elapsed / 3600 * Math.PI * 2)) / 2;
  const episode = ['recorrido', 'respiratorio'].includes(config.scenario) && p >= 0.25 && p < 0.55
    ? Math.sin((p - 0.25) / 0.3 * Math.PI) : 0;
  const drop = ['recorrido', 'desconexion'].includes(config.scenario) && p >= 0.65 && p < 0.8;
  const invalid = config.scenario === 'calidad' && p >= 0.35 && p < 0.55;
  const low = config.scenario === 'recorrido' && p >= 0.85 && p < 0.9;
  let value = metric.base;
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
  }
  value = round(clamp(value, ...metric.domain), metric.decimals);
  const isOximetry = metric.clave === 'spo2';
  const quality = isOximetry && drop ? 'missing' : isOximetry && invalid ? 'invalid' : isOximetry && low ? 'low_quality' : 'valid';
  if (isOximetry && invalid) value = 105;
  if (isOximetry && drop) value = null;
  return {id: `${metric.clave}:${elapsed}`, subjectId: 'ana-torres', indicator: metric.clave,
    value, unit: metric.unidad, timestamp: new Date(Date.parse(config.startTime) + elapsed * 1000).toISOString(),
    elapsedSec: elapsed, sourceId: metric.sourceId, captureMethod: 'synthetic', isDemo: true, quality,
    availability: isOximetry && drop ? 'disconnected' : 'available',
    condition: quality === 'valid' ? condition(metric, value) : 'unknown'};
}

export function simulate(input = {}) {
  const config = normalizeConfig(input);
  const measurements = [], events = [], previous = new Map(), lastEmit = new Map();
  for (let elapsed = 0; elapsed <= config.durationMinutes * 60; elapsed += config.stepSec) {
    for (const metric of SENSOR_INDICATORS) {
      const period = Math.max(config.stepSec, metric.periodSec);
      if (lastEmit.has(metric.clave) && elapsed - lastEmit.get(metric.clave) < period) continue;
      lastEmit.set(metric.clave, elapsed);
      const reading = sample(metric, elapsed, config);
      measurements.push(reading);
      const prev = previous.get(metric.clave);
      if (prev && prev.quality !== reading.quality) events.push({id: `quality:${reading.id}`, type: 'technical',
        indicator: metric.clave, timestamp: reading.timestamp, elapsedSec: elapsed,
        state: reading.quality, evidenceId: reading.id,
        message: reading.quality === 'missing' ? 'Fuente desconectada; historial conservado.' :
          reading.quality === 'valid' ? 'Nueva lectura válida recibida.' : 'Cambio de calidad de la lectura.'});
      const lastCondition = prev?.lastCondition ?? 'inside';
      if (reading.quality === 'valid' && reading.condition !== lastCondition) events.push({
        id: `condition:${reading.id}`, type: 'indicator', indicator: metric.clave,
        timestamp: reading.timestamp, elapsedSec: elapsed, state: reading.condition,
        evidenceId: reading.id, message: reading.condition === 'outside' ? 'Fuera de la referencia ilustrativa.' : 'Regreso a la referencia ilustrativa.',
      });
      previous.set(metric.clave, {...reading, lastCondition: reading.quality === 'valid' ? reading.condition : lastCondition});
    }
  }
  const payload = {schemaVersion: 1, engineVersion: ENGINE_VERSION, catalogVersion: CATALOG_VERSION,
    config, subject: {id: 'ana-torres', name: 'Ana Torres', fictional: true},
    indicators: INDICATORS, sources: SOURCES, measurements, events,
    assumptions: ['Datos sintéticos para probar software; sin validación clínica.',
      'Relaciones y variaciones preparadas para la demostración; no son un modelo fisiológico validado.',
      'Unidades, escalas y referencias heredadas de SIMISA_entrega; referencias ilustrativas.',
      'Las ausencias no son ceros. Las lecturas de baja calidad o inválidas no generan condiciones de indicador.',
      'Los signos vitales y registros fisiológicos provienen solo de sensores; no se admiten cargas manuales. El estrés percibido no se simula: se registra en el chequeo psicológico.']};
  return {id: hash(payload).slice(0, 24), ...payload};
}
