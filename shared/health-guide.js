// Guía de salud basada en los recursos del desafío: NASA Human Research Program (HRP),
// "5 Hazards of Human Spaceflight" y "Risks of Human Spaceflight".
// Es orientación general para la demostración: no es un protocolo clínico ni indica tratamientos o dosis.

const HRP = 'https://www.nasa.gov';

/** Los cinco peligros del vuelo espacial (NASA HRP). */
export const HAZARDS = Object.freeze({
  radiation: {name: 'Radiación espacial', url: `${HRP}/hrp/hazard-space-radiation/`,
    text: 'Invisible y considerada uno de los aspectos más peligrosos del vuelo espacial.'},
  isolation: {name: 'Aislamiento y confinamiento', url: `${HRP}/hrp/hazard-isolation-and-confinement/`,
    text: 'Grupos aislados en espacios reducidos durante largos períodos presentan respuestas conductuales.'},
  distance: {name: 'Distancia a la Tierra', url: `${HRP}/hrp/hazard-distance-from-earth/`,
    text: 'Instrucciones, suministros y atención médica desde la Tierra se vuelven más difíciles; la autosuficiencia es clave.'},
  gravity: {name: 'Campos de gravedad', url: `${HRP}/hrp/hazard-gravity-fields/`,
    text: 'Músculos, huesos, oído interno y órganos deben adaptarse a cada cambio de gravedad.'},
  environment: {name: 'Ambiente cerrado y hostil', url: `${HRP}/hrp/hazard-hostile-closed-environments/`,
    text: 'Temperatura, presión, iluminación, ruido, microbios y respuesta inmunológica deben controlarse dentro de la nave.'},
});

/** Riesgos del HRP citados por la guía (resumen de la página "Risks of Human Spaceflight"). */
export const RISKS = Object.freeze({
  cardiovascular: {name: 'Adaptaciones cardiovasculares', url: `${HRP}/reference/risk-of-cardiovascular-adaptations/`,
    text: 'La ingravidez altera la circulación y el funcionamiento del corazón y los vasos, lo que puede aumentar el riesgo de eventos cardiovasculares.'},
  fitness: {name: 'Menor aptitud cardiorrespiratoria y musculoesquelética', url: `${HRP}/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/`,
    text: 'Todos los astronautas hacen ejercicio durante la misión para contrarrestar la pérdida de densidad ósea, fuerza muscular y rendimiento cardiovascular.'},
  hypoxia: {name: 'Hipoxia', url: `${HRP}/reference/risk-of-hypoxia/`,
    text: 'Los procedimientos para evitar la enfermedad descompresiva en caminatas espaciales elevan el riesgo de hipoxia leve: menos oxígeno del normal en los tejidos.'},
  immune: {name: 'Respuesta inmunológica alterada', url: `${HRP}/reference/risk-of-altered-immune-system-responses/`,
    text: 'El estrés del vuelo puede reactivar virus latentes y causar erupciones y otros síntomas.'},
  nutrition: {name: 'Alimentación y nutrición inadecuadas', url: `${HRP}/reference/risk-of-inadequate-food-and-nutrition/`,
    text: 'Una dieta sana y equilibrada es esencial para la salud y el desempeño de la tripulación.'},
  bone: {name: 'Cambios óseos inducidos por el vuelo', url: `${HRP}/reference/risk-of-spaceflight-induced-bone-changes/`,
    text: 'Sin gravedad, los huesos se degradan y se vuelven más frágiles; la dieta, el ejercicio y la medicación ayudan a preservar su fuerza.'},
  sleep: {name: 'Sueño insuficiente y horarios irregulares', url: `${HRP}/reference/risk-from-inadequate-sleep-and-irregular-schedules/`,
    text: 'Pérdida crónica de sueño, demandas de trabajo constantes e irregularidades del reloj biológico.'},
  behavior: {name: 'Cambios conductuales y trastornos psiquiátricos', url: `${HRP}/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/`,
    text: 'El aislamiento, la radiación, la distancia y otros factores de estrés pueden afectar la salud mental de la tripulación.'},
  teamwork: {name: 'Trabajo en equipo inadecuado', url: `${HRP}/reference/risk-of-inadequate-teamwork/`,
    text: 'Equipos en aislamiento prolongado necesitan funcionar con eficiencia y recuperarse rápido de los contratiempos.'},
});

/** Función de cada región de la figura anatómica (texto general de anatomía). */
export const REGION_FUNCTION = Object.freeze({
  cuerpo: 'Vista general: temperatura, pulso y oxigenación resumen el estado del organismo.',
  pecho: 'El corazón bombea la sangre que lleva oxígeno y nutrientes a todo el cuerpo; la presión arterial refleja la fuerza de ese bombeo sobre los vasos.',
  pulmones: 'Los pulmones intercambian gases: incorporan oxígeno a la sangre y eliminan dióxido de carbono.',
  abdomen: 'El sistema digestivo transforma los alimentos en energía; la glucosa en sangre muestra cómo se usa y regula esa energía.',
  huesos: 'El esqueleto sostiene el cuerpo, permite el movimiento junto con los músculos y almacena calcio.',
  cabeza: 'El cerebro regula el sueño, el ánimo y la atención, claves para el desempeño en la misión.',
});

/**
 * Guía por indicador: por qué importa en el espacio, peligros y riesgos HRP relacionados,
 * cómo se mide en SIMISA y medidas preventivas generales mencionadas por la NASA.
 */
export const INDICATOR_GUIDE = Object.freeze({
  hr: {why: 'La ingravidez cambia cómo trabajan el corazón y los vasos. El pulso ayuda a detectar esfuerzo, estrés o cambios cardiovasculares.',
    hazards: ['gravity', 'isolation'], risks: ['cardiovascular', 'fitness'], measure: 'ECG con parche torácico, cada 10 s. Comparar siempre en reposo.',
    prevent: ['Cumplir la sesión diaria de ejercicio programada.', 'Mantener horarios de descanso regulares.']},
  sys: {why: 'La redistribución de líquidos en microgravedad modifica la presión arterial y la adaptación del corazón.',
    hazards: ['gravity'], risks: ['cardiovascular', 'fitness'], measure: 'Tensiómetro biométrico, cada 5 min; sistólica y diastólica se miden juntas, sentado y en reposo.',
    prevent: ['Cumplir el ejercicio cardiovascular programado.', 'Medir siempre en las mismas condiciones para comparar.']},
  dia: {why: 'Junto con la sistólica, muestra cómo se adaptan los vasos sanguíneos a la microgravedad.',
    hazards: ['gravity'], risks: ['cardiovascular'], measure: 'Tensiómetro biométrico, junto con la sistólica.',
    prevent: ['Cumplir el ejercicio cardiovascular programado.']},
  rr: {why: 'La respiración responde al esfuerzo, a la calidad del aire de cabina y a la oxigenación.',
    hazards: ['environment'], risks: ['hypoxia'], measure: 'Banda respiratoria, cada 10 s.',
    prevent: ['Informar molestias respiratorias o cambios en el aire de cabina.']},
  spo2: {why: 'Indica cuánto oxígeno transporta la sangre. Interesa especialmente alrededor de las caminatas espaciales y ante cambios en la atmósfera de la nave.',
    hazards: ['environment'], risks: ['hypoxia'], measure: 'Oxímetro de pulso, cada 10 s. El movimiento o mal contacto generan lecturas de baja calidad.',
    prevent: ['Seguir los procedimientos de preparación para caminatas espaciales.', 'Mantener el oxímetro bien colocado y con batería.']},
  temp: {why: 'La temperatura puede reflejar respuestas del sistema inmunológico y también la habitabilidad del ambiente cerrado.',
    hazards: ['environment'], risks: ['immune'], measure: 'Sensor térmico dérmico, cada minuto (temperatura de la piel, no central).',
    prevent: ['Registrar cualquier síntoma (erupciones, malestar) junto con la lectura.']},
  gluc: {why: 'Refleja la alimentación y el metabolismo, ligados al riesgo de nutrición inadecuada en misiones largas.',
    hazards: ['distance', 'environment'], risks: ['nutrition'], measure: 'Biosensor metabólico, cada 5 min, en mg/dL.',
    prevent: ['Seguir el plan de comidas de la misión.', 'Registrar comidas omitidas o cambios de apetito.']},
  bmd: {why: 'Sin gravedad los huesos se degradan y se vuelven más frágiles; la pérdida es lenta y se sigue con mediciones periódicas.',
    hazards: ['gravity'], risks: ['bone', 'fitness'], measure: 'Densitómetro óseo portátil, cada 28 días, en g/cm².',
    prevent: ['Cumplir el ejercicio de resistencia diario.', 'Seguir la dieta indicada; la medicación la decide el equipo médico.']},
  sleep: {why: 'La pérdida crónica de sueño y los horarios irregulares afectan la salud y la seguridad de la tripulación.',
    hazards: ['isolation', 'distance'], risks: ['sleep'], measure: 'Actígrafo de sueño, una lectura diaria de horas dormidas.',
    prevent: ['Respetar el horario de descanso planificado.', 'Reducir luz y ruido en el área de descanso.']},
  stress: {why: 'El aislamiento, la distancia y la carga de trabajo pueden afectar la salud mental y el trabajo en equipo.',
    hazards: ['isolation', 'distance', 'radiation'], risks: ['behavior', 'teamwork', 'sleep'], measure: 'Chequeo psicológico diario: el propio tripulante informa ánimo y estrés (0–10).',
    prevent: ['Completar el chequeo psicológico cada día.', 'Mantener tiempo de descanso y comunicación con la tripulación y la familia.']},
  rad: {why: 'La radiación espacial es uno de los peligros identificados por NASA HRP. El dosímetro permite consultar la evolución de la exposición registrada junto a la persona.',
    hazards: ['radiation'], risks: [], measure: 'Dosímetro personal, una lectura por minuto de la tasa de dosis en µSv/h. Se consulta en Abdomen como categoría de navegación, sin atribuir la exposición a ese órgano.',
    context: 'Para ISS/LEO, NASA publicó un rango de 0,4–1,1 mSv/día de dosis equivalente a órganos hematopoyéticos (informe de 2002); una publicación de NASA de 2023 cita un orden de 0,5 mSv/día. El rango orienta la escala de datos sintéticos y no equivale a calibrar el dosímetro ni a calcular dosis efectiva individual.',
    evidence: 'La OMS informa evidencia epidemiológica de aumento del riesgo de cáncer por encima de 100 mSv de dosis. No establece un umbral anual universal ni ausencia de riesgo por debajo; SIMISA no calcula riesgo de cáncer.',
    sources: [
      {name: 'NASA · Exposición histórica en ISS (2002, sección 2.3)', url: 'https://ntrs.nasa.gov/api/citations/20020073167/downloads/20020073167.pdf'},
      {name: 'NASA · Space Radiation Health Standard (2023)', url: 'https://www.nasa.gov/wp-content/uploads/2023/10/lsah-newsletter-2023-vol28-issue2.pdf'},
      {name: 'OMS · Radiación ionizante y efectos en la salud', url: 'https://www.who.int/news-room/fact-sheets/detail/ionizing-radiation-and-health-effects'},
    ],
    prevent: ['Revisar la tendencia y el período de adquisición del dosímetro.', 'La interpretación de la exposición corresponde al equipo responsable de protección radiológica de la misión.']},
});

export const GUIDANCE_LEVEL = Object.freeze({
  info: {label: 'Seguimiento de exposición', tone: 'neutral'},
  ok: {label: 'Autocuidado', tone: 'ok'},
  device: {label: 'Revisar la medición', tone: 'neutral'},
  crew: {label: 'Avisar a la médica de tripulación', tone: 'warn'},
  ground: {label: 'Médica de tripulación + consulta a Tierra', tone: 'bad'},
});

/** Racha actual de lecturas válidas fuera de referencia: cantidad y minutos desde la primera. */
export function outsideStreak(rows, elapsedSec) {
  let start = null, count = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.elapsedSec > elapsedSec || r.quality !== 'valid') continue;
    if (r.condition !== 'outside') break;
    start = r.elapsedSec; count++;
  }
  return {count, minutes: start == null ? 0 : (elapsedSec - start) / 60};
}

/**
 * Orientación según el estado actual de un indicador.
 * `o` es el resultado de observationAt; `rows` las lecturas del indicador.
 * Escala: autocuidado → médica de tripulación → la médica evalúa consultar a los médicos de vuelo en Tierra.
 */
export function guidance(id, o, rows, elapsedSec, {sensor = true, periodSec = 0} = {}) {
  const guide = INDICATOR_GUIDE[id];
  if (!guide) return null;
  if (!o.current) {
    return sensor
      ? {level: 'device', steps: ['No hay una lectura válida: revisar el dispositivo en Estado de sensores (colocación, conexión y batería).', 'Repetir la medición antes de sacar conclusiones.']}
      : {level: 'device', steps: ['Completar el chequeo psicológico para tener un registro actual.']};
  }
  if (id === 'rad') return {level: 'info', steps: guide.prevent};
  if (o.condition !== 'outside') return {level: 'ok', steps: guide.prevent};
  const streak = outsideStreak(rows, elapsedSec);
  const steps = sensor
    ? ['Repetir la medición en reposo y confirmar que el dispositivo esté bien colocado.', 'Anotar síntomas y avisar a la médica de tripulación.']
    : ['Hablar con la médica de tripulación o con alguien de confianza de la tripulación.', 'Priorizar descanso y pausas en la jornada.'];
  // Persistencia (regla de la demo): 10 minutos seguidos fuera en indicadores continuos,
  // o dos registros seguidos fuera en indicadores diarios o periódicos.
  const persistent = periodSec >= 86400 ? streak.count >= 2 : streak.minutes >= 10;
  if (persistent) steps.push('Se mantiene fuera de referencia: la médica de tripulación evalúa consultar a los médicos de vuelo en Tierra (considerar la demora de comunicación).');
  return {level: persistent ? 'ground' : 'crew', minutes: Math.round(streak.minutes), count: streak.count, steps};
}

export const GUIDE_DISCLAIMER = 'Orientación general basada en NASA Human Research Program. No es un protocolo clínico ni reemplaza el criterio del equipo médico.';
