/* =============================================================
   SIMISA · Catálogo de indicadores de salud
   -------------------------------------------------------------
   Única fuente de verdad sobre los indicadores que maneja el
   sistema. Nadie fuera de este módulo debe conocer los valores
   de referencia: se consultan con getIndicador() / listarIndicadores().
   ============================================================= */

const INDICADORES = {
  hr:    { nombre:'Frecuencia cardíaca',    unidad:'lpm',    color:'#00f2ff', base:71,    amplitud:7,     min:58,   max:88,   lo:55,   hi:90,   sistema:'Cardiovascular' },
  sys:   { nombre:'Presión sistólica',      unidad:'mmHg',   color:'#3b82f6', base:118,   amplitud:6,     min:104,  max:132,  lo:95,   hi:130,  sistema:'Cardiovascular' },
  dia:   { nombre:'Presión diastólica',     unidad:'mmHg',   color:'#6366f1', base:76,    amplitud:5,     min:66,   max:86,   lo:60,   hi:84,   sistema:'Cardiovascular' },
  rr:    { nombre:'Frecuencia respiratoria',unidad:'rpm',    color:'#22d3ee', base:15,    amplitud:2,     min:12,   max:20,   lo:10,   hi:22,   sistema:'Respiratorio' },
  spo2:  { nombre:'Saturación O₂',          unidad:'%',      color:'#2ecc71', base:97,    amplitud:1.2,   min:93,   max:99,   lo:94,   hi:100,  sistema:'Respiratorio' },
  temp:  { nombre:'Temperatura corporal',   unidad:'°C',     color:'#f39c12', base:36.6,  amplitud:0.3,   min:36.1, max:37.3, lo:35.8, hi:37.5, sistema:'Integral' },
  gluc:  { nombre:'Glucosa',                unidad:'mg/dL',  color:'#8b5cf6', base:92,    amplitud:9,     min:74,   max:114,  lo:70,   hi:140,  sistema:'Metabólico' },
  bmd:   { nombre:'Densidad ósea',          unidad:'g/cm²',  color:'#14b8a6', base:1.19,  amplitud:0.03,  min:1.10, max:1.24, lo:1.05, hi:1.30, sistema:'Óseo' },
  sleep: { nombre:'Horas de sueño',         unidad:'h',      color:'#818cf8', base:7.1,   amplitud:0.9,   min:5.4,  max:8.4,  lo:6,    hi:9,    sistema:'Sueño' },
  stress:{ nombre:'Estrés percibido',       unidad:'/10',    color:'#f472b6', base:3.4,   amplitud:1.4,   min:1.5,  max:6.8,  lo:0,    hi:6,    sistema:'Psicológico' }
};

/** Devuelve una copia del indicador para evitar mutaciones externas. */
export function getIndicador(clave) {
  const m = INDICADORES[clave];
  return m ? { ...m, clave } : null;
}

/** Lista de claves disponibles. */
export function clavesIndicadores() {
  return Object.keys(INDICADORES);
}

/** Lista completa de fichas de indicador (cada una incluye su clave). */
export function listarIndicadores() {
  return Object.entries(INDICADORES).map(([clave, m]) => ({ ...m, clave }));
}

/** Ajusta la línea base de un indicador con la última medición. */
export function reajustarBase(clave, valor, peso = 0.3) {
  const m = INDICADORES[clave];
  if (!m) return;
  m.base = Math.round((m.base * (1 - peso) + valor * peso) * 10) / 10;
}
