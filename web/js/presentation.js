import {t, html} from './i18n.js';
import {SECCIONES} from './data/navegacion-original.js';
import {isSensorMetric, hasReference} from '../../shared/catalog.js';

export const NAV = [['tripulacion', 'Centro de tripulación', 'perfiles'], ...SECCIONES.map(s => [s.id, s.titulo, s.icono])];
/** Vistas que requieren acceso de tripulación (comandante o médica). */
export const CREW_ONLY_VIEWS = ['tripulacion', 'inves'];
export const REFERENCE_LABEL = {inside: 'Dentro de referencia', outside: 'Fuera de referencia', unknown: 'Sin datos evaluables'};
export const referenceText = m => hasReference(m) ? html`Referencia ${m.lo}–${m.hi} ${t(m.unidad)}` : t('Sin umbral de referencia configurado');
import {DEVICES} from '../../shared/devices.js';
// Nombres de dispositivo de SIMISA_entrega/js/data/sensores.js.
export const SOURCE_LABEL = {...Object.fromEntries(Object.entries(DEVICES).map(([id, d]) => [id, d.name])), bienestar: 'Chequeo psicológico'};
export const REGION_NOTE = {
  cuerpo: 'Tus indicadores generales, en una sola vista.',
  pecho: 'Frecuencia cardíaca y presión arterial.',
  pulmones: 'Frecuencia respiratoria y saturación de oxígeno.',
  abdomen: 'Glucosa y radiación. El dosímetro se incluye en esta categoría para facilitar su ubicación.',
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
  if (event.type === 'indicator') return event.state === 'outside' ? t('Valor fuera del intervalo de referencia.') : t('Regreso al intervalo de referencia.');
  return {missing: t('Conexión interrumpida.'), valid: t('Lecturas recuperadas.'),
    low_quality: t('Señal de baja calidad.'), invalid: t('Lectura inválida.')}[event.state] || t('Cambio en la fuente de datos.');
}

export function assistantAnswer(question, {result, index, elapsed, observationAt, summarize}) {
  const q = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const reading = id => {
    const m = result.indicators.find(i => i.clave === id);
    if (!m) return id === 'rad' ? t('Este historial no contiene lecturas del dosímetro.') : t('Indicador no disponible en este historial.');
    const o = observationAt(result, index, id, elapsed);
    const current = o.current ? `${o.current.value.toFixed(m.decimals)} ${t(m.unidad)}` : isSensorMetric(id) ? t('sin lectura actual') : t('sin chequeo psicológico registrado');
    const acquired = o.current?.timestamp || o.lastValid?.timestamp;
    return `${t(m.nombre)}: ${current}${acquired ? ` (${isSensorMetric(id) ? t('adquisición') : t('chequeo psicológico')} ${acquired.slice(11, 19)} UTC)` : ''}.${o.current ? ` ${hasReference(m) ? t(REFERENCE_LABEL[o.condition]) : referenceText(m)}.` : o.lastValid ? html` Última lectura válida: ${o.lastValid.value.toFixed(m.decimals)} ${t(m.unidad)}.` : ''}`;
  };
  const radiationQuery = /radiacion|radiation|dosimetr|dosimeter|tasa de dosis|dose rate|dosis acumulada|cumulative dose/.test(q);
  if (/diagnostic|diagnos|tratamiento|treatment|medicamento|medication|dosific|dosage/.test(q) || (/dosis|dose/.test(q) && !radiationQuery)) return t('Puedo consultar las lecturas y su evolución. Para un diagnóstico o tratamiento, consultá al equipo médico.');
  if (/sensor|disponib|availab|desconect|disconnect|sin lectura|no reading/.test(q) && !radiationQuery) {
    const unavailable = result.indicators.filter(m => isSensorMetric(m.clave) && !observationAt(result, index, m.clave, elapsed).current);
    return unavailable.length ? unavailable.map(m => reading(m.clave)).join('\n') : t('Todos los sensores tienen una lectura válida en el momento consultado.');
  }
  const synonyms = {spo2: /saturacion|saturation|oxigen|oxygen|spo2/, hr: /pulso|pulse|cardiac|corazon|heart/, sys: /presion|pressure|sistol|systol/,
    dia: /diastol/, rr: /respir|breath/, temp: /temperatur/, gluc: /glucosa|glucose|azucar|sugar/,
    bmd: /osea|hueso|densidad|bone|density/, sleep: /sueno|descanso|dormi|sleep|rest/, stress: /estres|bienestar|stress|wellbeing|mood/,
    rad: /radiacion|radiation|dosimetr|dosimeter|tasa de dosis|dose rate|exposicion|exposure|dosis acumulada|cumulative dose/};
  const ids = Object.entries(synonyms).filter(([, pattern]) => pattern.test(q)).map(([id]) => id);
  if (/resumen|indicador|como estoy|summary|indicator|how am i|readings/.test(q) && !ids.length) return ['hr', 'spo2', 'rr', 'temp', 'sleep', 'stress'].map(reading).join('\n');
  if (ids.length) return ids.map(id => {
    const m = result.indicators.find(i => i.clave === id);
    if (!m) return reading(id);
    const summary = summarize(result, index, id, elapsed);
    return reading(id) + (id === 'rad' && /acumulad|cumulat/.test(q) ? t(' La métrica guardada es una tasa en µSv/h; este historial no calcula la dosis acumulada.') : '') + (/tendencia|evolucion|media|promedio|trend|mean|average/.test(q) && summary.count
      ? html` En el período consultado hay ${summary.count} lecturas válidas, con mínimo ${summary.min.toFixed(m.decimals)}, máximo ${summary.max.toFixed(m.decimals)} y media ${summary.mean.toFixed(m.decimals)} ${t(m.unidad)}.` : '');
  }).join('\n');
  if (/protocol/.test(q)) return t('No hay protocolos incorporados a la biblioteca. Podés consultar las definiciones y referencias disponibles en Información médica.');
  return t('Podés consultar pulso, presión, saturación, respiración, temperatura, glucosa, densidad ósea, radiación, sueño, estrés o disponibilidad de sensores.');
}
