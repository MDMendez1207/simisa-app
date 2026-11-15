import {SECCIONES} from './data/navegacion-original.js';
import {isSensorMetric, hasReference} from '../../shared/catalog.js';

export const NAV = [['tripulacion', 'Centro de tripulación', 'perfiles'], ...SECCIONES.map(s => [s.id, s.titulo, s.icono])];
/** Vistas que requieren acceso de tripulación (comandante o médica). */
export const CREW_ONLY_VIEWS = ['tripulacion', 'inves'];
export const REFERENCE_LABEL = {inside: 'Dentro de referencia', outside: 'Fuera de referencia', unknown: 'Sin datos evaluables'};
export const referenceText = m => hasReference(m) ? `Referencia ${m.lo}–${m.hi} ${m.unidad}` : 'Sin umbral de referencia configurado';
import {DEVICES} from '../../shared/devices.js';
// Nombres de dispositivo de SIMISA_entrega/js/data/sensores.js.
export const SOURCE_LABEL = {...Object.fromEntries(Object.entries(DEVICES).map(([id, d]) => [id, d.name])), bienestar: 'Chequeo psicológico'};
export const REGION_NOTE = {
  cuerpo: 'Tus indicadores generales y la exposición registrada por el dosímetro, en una sola vista.',
  pecho: 'Frecuencia cardíaca y presión arterial.',
  pulmones: 'Frecuencia respiratoria y saturación de oxígeno.',
  abdomen: 'Seguimiento de glucosa y evolución metabólica.',
  huesos: 'Registro de densidad ósea y evolución de las mediciones.',
  cabeza: 'Descanso y bienestar.',
};
export const METRIC_DESCRIPTION = {
  hr: 'Número de latidos por minuto.', sys: 'Componente sistólico de la presión arterial.',
  dia: 'Componente diastólico de la presión arterial.', rr: 'Número de respiraciones por minuto.',
  spo2: 'Saturación periférica de oxígeno, expresada como porcentaje.',
  temp: 'Registro de temperatura corporal en grados Celsius.', gluc: 'Concentración de glucosa registrada en mg/dL.',
  bmd: 'Densidad mineral ósea expresada en g/cm².', sleep: 'Duración del sueño informada por el sensor de descanso, en horas.',
  stress: 'Estrés percibido en una escala de 0 a 10, informado por el astronauta en el chequeo psicológico.',
  rad: 'Tasa de dosis registrada por el dosímetro personal, en microsieverts por hora (µSv/h). Describe el ritmo de exposición; no es una dosis acumulada ni una medición de daño en un órgano.',
};

export function eventLabel(event) {
  if (event.type === 'indicator') return event.state === 'outside' ? 'Valor fuera del intervalo de referencia.' : 'Regreso al intervalo de referencia.';
  return {missing: 'Conexión interrumpida.', valid: 'Lecturas recuperadas.',
    low_quality: 'Señal de baja calidad.', invalid: 'Lectura inválida.'}[event.state] || 'Cambio en la fuente de datos.';
}

export function assistantAnswer(question, {result, index, elapsed, observationAt, summarize}) {
  const q = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const reading = id => {
    const m = result.indicators.find(i => i.clave === id);
    if (!m) return id === 'rad' ? 'Este historial no contiene lecturas del dosímetro.' : 'Indicador no disponible en este historial.';
    const o = observationAt(result, index, id, elapsed);
    const current = o.current ? `${o.current.value.toFixed(m.decimals)} ${m.unidad}` : isSensorMetric(id) ? 'sin lectura actual' : 'sin chequeo psicológico registrado';
    const acquired = o.current?.timestamp || o.lastValid?.timestamp;
    return `${m.nombre}: ${current}${acquired ? ` (${isSensorMetric(id) ? 'adquisición' : 'chequeo psicológico'} ${acquired.slice(11, 19)} UTC)` : ''}.${o.current ? ` ${hasReference(m) ? REFERENCE_LABEL[o.condition] : referenceText(m)}.` : o.lastValid ? ` Última lectura válida: ${o.lastValid.value.toFixed(m.decimals)} ${m.unidad}.` : ''}`;
  };
  const radiationQuery = /radiacion|dosimetr|tasa de dosis|dosis acumulada/.test(q);
  if (/diagnostic|tratamiento|medicamento|dosific/.test(q) || (/dosis/.test(q) && !radiationQuery)) return 'Puedo consultar las lecturas y su evolución. Para un diagnóstico o tratamiento, consultá al equipo médico.';
  if (/sensor|disponib|desconect|sin lectura/.test(q) && !radiationQuery) {
    const unavailable = result.indicators.filter(m => isSensorMetric(m.clave) && !observationAt(result, index, m.clave, elapsed).current);
    return unavailable.length ? unavailable.map(m => reading(m.clave)).join('\n') : 'Todos los sensores tienen una lectura válida en el momento consultado.';
  }
  const synonyms = {spo2: /saturacion|oxigen|spo2/, hr: /pulso|cardiac|corazon/, sys: /presion|sistol/,
    dia: /diastol/, rr: /respir/, temp: /temperatura/, gluc: /glucosa|azucar/,
    bmd: /osea|hueso|densidad/, sleep: /sueno|descanso|dormi/, stress: /estres|bienestar/,
    rad: /radiacion|dosimetr|tasa de dosis|exposicion|dosis acumulada/};
  const ids = Object.entries(synonyms).filter(([, pattern]) => pattern.test(q)).map(([id]) => id);
  if (/resumen|indicador|como estoy/.test(q) && !ids.length) return ['hr', 'spo2', 'rr', 'temp', 'sleep', 'stress'].map(reading).join('\n');
  if (ids.length) return ids.map(id => {
    const m = result.indicators.find(i => i.clave === id);
    if (!m) return reading(id);
    const summary = summarize(result, index, id, elapsed);
    return reading(id) + (id === 'rad' && /acumulad/.test(q) ? ' La métrica guardada es una tasa en µSv/h; este historial no calcula la dosis acumulada.' : '') + (/tendencia|evolucion|media|promedio/.test(q) && summary.count
      ? ` En el período consultado hay ${summary.count} lecturas válidas, con mínimo ${summary.min.toFixed(m.decimals)}, máximo ${summary.max.toFixed(m.decimals)} y media ${summary.mean.toFixed(m.decimals)} ${m.unidad}.` : '');
  }).join('\n');
  if (/protocolo/.test(q)) return 'No hay protocolos incorporados a la biblioteca. Podés consultar las definiciones y referencias disponibles en Información médica.';
  return 'Podés consultar pulso, presión, saturación, respiración, temperatura, glucosa, densidad ósea, radiación, sueño, estrés o disponibilidad de sensores.';
}
