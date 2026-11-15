// Dispositivos de monitoreo por tripulante (nombres de SIMISA_entrega/js/data/sensores.js) y su estado.
// Conexión y calidad salen de las lecturas guardadas. La batería es una estimación sintética determinista:
// descarga lineal y recarga diaria, sin telemetría de batería en el archivo.
import {observationAt} from './results.js';
import {SCENARIO_SUBJECT} from './crew.js';

export const DEVICES = Object.freeze({
  pulso: {name: 'ECG · Parche torácico', type: 'Ritmo cardíaco', drain: 2.2, charge: 21},
  oximetria: {name: 'Oxímetro de pulso', type: 'SpO₂', drain: 3.0, charge: 22},
  respiracion: {name: 'Banda respiratoria', type: 'Frecuencia respiratoria', drain: 2.4, charge: 21},
  temperatura: {name: 'Sensor térmico dérmico', type: 'Temperatura corporal', drain: 1.3, charge: 20},
  presion: {name: 'Tensiómetro biométrico', type: 'Presión arterial', drain: 1.1, charge: 20},
  glucosa: {name: 'Biosensor metabólico', type: 'Glucosa', drain: 0.7, charge: 19},
  descanso: {name: 'Actígrafo de sueño', type: 'Duración del sueño', drain: 1.0, charge: 18},
  osea: {name: 'Densitómetro óseo portátil', type: 'Densidad ósea', drain: 0.15, charge: 12},
  radiacion: {name: 'Dosímetro personal', type: 'Tasa de dosis de radiación', drain: 0.8, charge: 20},
});
export const LOW_BATTERY = 20;

// Hash FNV-1a: variación estable por tripulante y dispositivo, sin dependencias.
function hash(text) {
  let h = 2166136261;
  for (const c of text) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/** Batería estimada (%) de un dispositivo en un momento de la misión. */
export function batteryAt(result, subjectId, sourceId, elapsedSec) {
  const device = DEVICES[sourceId];
  if (!device) return null;
  const v = hash(`${result.config.seed}:${subjectId}:${sourceId}`);
  // En el tripulante del escenario, el oxímetro se descarga rápido: llega bajo al episodio.
  const fast = subjectId === SCENARIO_SUBJECT && sourceId === 'oximetria';
  const drain = fast ? 4.8 : device.drain * (0.8 + 0.4 * v);
  const chargeHour = fast ? 19 : device.charge + Math.floor(v * 3);
  const at = new Date(Date.parse(result.config.startTime) + elapsedSec * 1000);
  const hours = ((at.getUTCHours() + at.getUTCMinutes() / 60 - chargeHour) % 24 + 24) % 24;
  return Math.max(3, Math.round(100 - drain * hours));
}

/** Estado de cada dispositivo del tripulante consultado (`result` es una vista individual). */
export function deviceStatus(result, index, elapsedSec) {
  return result.sources.filter(s => s.kind === 'sensor' && DEVICES[s.id]).map(source => {
    const metrics = result.indicators.filter(m => m.sourceId === source.id);
    const main = metrics[0];
    const o = observationAt(result, index, main.clave, elapsedSec);
    const recent = (index[main.clave] || []).filter(r => r.elapsedSec <= elapsedSec).slice(-12);
    const quality = recent.length ? Math.round(recent.filter(r => r.quality === 'valid').length / recent.length * 100) : null;
    const battery = batteryAt(result, result.subject.id, source.id, elapsedSec);
    const state = o.availability === 'no_data' ? 'nodata' : o.availability === 'disconnected' ? 'off'
      : o.quality === 'invalid' ? 'invalid' : o.quality === 'low_quality' ? 'low' : o.availability === 'stale' ? 'stale' : 'ok';
    const issues = [];
    const since = o.lastValid ? ` Última lectura válida: ${o.lastValid.timestamp.slice(11, 16)} UTC.` : '';
    if (state === 'off') issues.push({level: 'bad', text: `Sin señal: el dispositivo no transmite.${since} Revisar colocación y conexión.`});
    if (state === 'nodata') issues.push({level: 'bad', text: 'Sin lecturas registradas en este período.'});
    if (state === 'invalid') issues.push({level: 'bad', text: 'Lecturas fuera de rango físico: se excluyen de los valores y alertas. Revisar el contacto del sensor.'});
    if (state === 'low') issues.push({level: 'warn', text: 'Señal de baja calidad (movimiento o mal contacto). La lectura no se usa como valor actual.'});
    if (state === 'stale') issues.push({level: 'warn', text: `Datos desactualizados.${since}`});
    if (quality != null && quality < 80 && !['off', 'invalid', 'low'].includes(state)) issues.push({level: 'warn', text: `Calidad de señal reciente baja (${quality} %).`});
    if (battery != null && battery < LOW_BATTERY) issues.push({level: battery < 10 ? 'bad' : 'warn', text: `Batería baja (${battery} %). Cargar o reemplazar el dispositivo.`});
    return {source, device: DEVICES[source.id], metrics, latest: o.latest, observation: o, quality, battery, state, issues};
  });
}

export const DEVICE_STATE = {
  ok: {text: 'Conectado', tone: 'ok'}, stale: {text: 'Datos desactualizados', tone: 'warn'},
  low: {text: 'Señal débil', tone: 'warn'}, invalid: {text: 'Datos inválidos', tone: 'bad'},
  off: {text: 'Desconectado', tone: 'bad'}, nodata: {text: 'Sin datos', tone: 'bad'},
};
