import {listarIndicadores} from './indicadores-original.js';

export const CATALOG_VERSION = 'entrega-1.3.0';
// Versiones anteriores que se siguen leyendo (sin migrar ni reescribir sus archivos).
export const LEGACY_CATALOG_VERSIONS = Object.freeze(['entrega-1.0.0', 'entrega-1.1.0', 'entrega-1.2.0']);
// Referencia de exposición para el generador, separada de los límites clínicos.
export const RADIATION_MODEL = Object.freeze({
  id: 'iss-leo-1', environment: 'ISS / órbita terrestre baja (LEO)', kind: 'synthetic',
  dailyDoseRangeMsv: Object.freeze([0.4, 1.1]),
  sources: Object.freeze([
    'https://ntrs.nasa.gov/api/citations/20020073167/downloads/20020073167.pdf',
    'https://www.nasa.gov/wp-content/uploads/2023/10/lsah-newsletter-2023-vol28-issue2.pdf',
    'https://www.who.int/news-room/fact-sheets/detail/ionizing-radiation-and-health-effects',
  ]),
  scope: 'Rango histórico NASA de dosis equivalente a órganos hematopoyéticos en ISS; orienta la escala sintética, no calibra un dosímetro personal ni predice exposición en órbita lunar.',
  riskContext: 'La OMS cita evidencia epidemiológica de aumento del riesgo de cáncer por encima de 100 mSv de dosis; no establece un umbral anual universal ni ausencia de riesgo por debajo. No se estima riesgo individual.',
});
const radiationRates = RADIATION_MODEL.dailyDoseRangeMsv.map(dose => dose * 1000 / 24);
/** Espaciado de las lecturas del historial previo (antes del inicio de la ejecución). */
export const HISTORY_STEP_SEC = 1800;
export const MAX_HISTORY_DAYS = 30;
const periods = {hr: 10, sys: 300, dia: 300, rr: 10, spo2: 10,
  temp: 60, gluc: 300, bmd: 2419200, sleep: 86400, stress: 86400, rad: 60};
const precision = {hr: 1, sys: 0, dia: 0, rr: 1, spo2: 1,
  temp: 1, gluc: 1, bmd: 2, sleep: 1, stress: 1, rad: 2};
const domains = {hr: [20, 240], sys: [60, 240], dia: [30, 150], rr: [4, 60],
  spo2: [50, 100], temp: [30, 43], gluc: [30, 400], bmd: [0.2, 2.5],
  sleep: [0, 24], stress: [0, 10], rad: [0, 1000]};
const sources = {hr: 'pulso', sys: 'presion', dia: 'presion', rr: 'respiracion',
  spo2: 'oximetria', temp: 'temperatura', gluc: 'glucosa', bmd: 'osea',
  sleep: 'descanso', stress: 'bienestar', rad: 'radiacion'};
// Signos vitales y registros fisiológicos: solo sensores. Estrés percibido: autoinforme del chequeo psicológico.
const capture = {stress: 'self_report'};

// Ampliación del catálogo operativo; el catálogo original de entrega se conserva intacto.
const radiation = {clave: 'rad', nombre: 'Tasa de dosis de radiación', unidad: 'µSv/h',
  color: '#eab308', base: (radiationRates[0] + radiationRates[1]) / 2,
  amplitud: (radiationRates[1] - radiationRates[0]) / 2,
  min: radiationRates[0], max: radiationRates[1], lo: null, hi: null,
  sistema: 'Exposición a radiación', referenceKind: 'none', origin: 'docs/simisa/08-unificacion.md'};
export const INDICATORS = Object.freeze([...listarIndicadores(), radiation].map(m => Object.freeze({
  ...m, periodSec: periods[m.clave], decimals: precision[m.clave],
  domain: Object.freeze(domains[m.clave]), sourceId: sources[m.clave],
  capture: capture[m.clave] || 'sensor',
  referenceKind: m.referenceKind || 'illustrative', origin: m.origin || 'SIMISA_entrega/js/data/indicadores.js',
})));
export const BY_ID = Object.freeze(Object.fromEntries(INDICATORS.map(m => [m.clave, m])));
export const SENSOR_INDICATORS = Object.freeze(INDICATORS.filter(m => m.capture === 'sensor'));
/** Se decide con el catálogo vigente para que también aplique a resultados de versiones anteriores. */
export const isSensorMetric = id => BY_ID[id]?.capture !== 'self_report';
export const SOURCES = Object.freeze([
  {id: 'pulso', name: 'Fuente sintética de pulso', kind: 'sensor'},
  {id: 'presion', name: 'Medición sintética de presión arterial', kind: 'sensor'},
  {id: 'respiracion', name: 'Fuente sintética respiratoria', kind: 'sensor'},
  {id: 'oximetria', name: 'Oxímetro simulado', kind: 'sensor'},
  {id: 'temperatura', name: 'Fuente sintética de temperatura', kind: 'sensor'},
  {id: 'glucosa', name: 'Fuente sintética de glucosa', kind: 'sensor'},
  {id: 'osea', name: 'Medición ósea sintética periódica', kind: 'sensor'},
  {id: 'descanso', name: 'Sensor sintético de sueño', kind: 'sensor'},
  {id: 'radiacion', name: 'Dosímetro personal simulado', kind: 'sensor'},
  {id: 'bienestar', name: 'Chequeo psicológico (autoinforme del astronauta)', kind: 'self_report'},
].map(Object.freeze));
export const REGIONS = Object.freeze([
  {id: 'cuerpo', name: 'Cuerpo completo', image: 'cuerpo-holografico-v2.png',
    metrics: ['temp', 'hr', 'spo2', 'rad'], note: 'Resumen de indicadores y exposición registrada por el dosímetro personal.'},
  {id: 'pecho', name: 'Pecho y corazón', image: 'corazon-oblicuo.png',
    metrics: ['hr', 'sys', 'dia'], note: 'La presión conserva sistólica y diastólica en mmHg, adquiridas juntas.'},
  {id: 'pulmones', name: 'Pulmones', image: 'pulmones-oblicuos.png',
    metrics: ['rr', 'spo2'], note: 'Agrupa respiración y oxigenación. Una lectura no localiza una lesión pulmonar.'},
  {id: 'abdomen', name: 'Abdomen', image: 'abdomen-oblicuo.png',
    metrics: ['gluc'], note: 'Acceso al grupo metabólico. La glucosa no describe el estado del estómago.'},
  {id: 'huesos', name: 'Huesos y articulaciones', image: 'piernas-oblicuas.png',
    metrics: ['bmd'], note: 'Densidad ósea sintética en g/cm², según SIMISA_entrega. No se convierte desde QUS ni se actualiza como un signo vital.'},
  {id: 'cabeza', name: 'Cabeza y cerebro', image: 'cabeza-lateral.png',
    metrics: ['sleep', 'stress'], note: 'Acceso a sueño y bienestar. Estos registros no miden actividad cerebral ni cognición.'},
].map(r => Object.freeze({...r, metrics: Object.freeze(r.metrics)})));
export const SCENARIOS = Object.freeze([
  {id: 'nominal', name: 'Referencia estable', description: 'Variación suave de indicadores relacionados.'},
  {id: 'respiratorio', name: 'Episodio respiratorio', description: 'Descenso preparado de SpO₂ con cambios relacionados de pulso y respiración.'},
  {id: 'desconexion', name: 'Desconexión del oxímetro', description: 'Interrupción y recuperación con nuevas observaciones; el historial se conserva.'},
  {id: 'calidad', name: 'Señal inválida', description: 'Lecturas inválidas para comprobar exclusión y estado técnico.'},
  {id: 'recorrido', name: 'Recorrido completo', description: 'Episodio respiratorio, desconexión y señal de baja calidad.'},
].map(Object.freeze));

export const hasReference = metric => metric?.referenceKind !== 'none' && Number.isFinite(metric?.lo) && Number.isFinite(metric?.hi);
export function condition(metric, value) {
  if (value == null || !Number.isFinite(value) || !hasReference(metric)) return 'unknown';
  return value < metric.lo || value > metric.hi ? 'outside' : 'inside';
}
export const CONDITION_LABEL = {inside: 'Dentro de referencia demo', outside: 'Fuera de referencia demo', unknown: 'Sin condición evaluable'};
