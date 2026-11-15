// Tripulación ficticia y reglas de acceso. Lo usan el motor, el servidor (que aplica los permisos) y la web.

export const ROLES = Object.freeze({
  commander: Object.freeze({name: 'Comandante', crewAccess: true,
    description: 'Supervisa el estado general de toda la tripulación.'}),
  medical: Object.freeze({name: 'Médica de tripulación', crewAccess: true,
    description: 'Consulta indicadores, chequeos y alertas de toda la tripulación.'}),
  specialist: Object.freeze({name: 'Especialista de misión', crewAccess: false,
    description: 'Consulta exclusivamente su propia información.'}),
});

// Pequeñas diferencias de línea base por tripulante (sintéticas, dentro de las referencias).
export const CREW = Object.freeze([
  {id: 'ana-torres', name: 'Ana Torres', code: 'CDR', role: 'commander', offsets: {hr: 0, sys: 0, dia: 0, rr: 0, temp: 0, gluc: 0, bmd: 0, sleep: 0}},
  {id: 'lucia-ferreyra', name: 'Lucía Ferreyra', code: 'CMO', role: 'medical', offsets: {hr: -4, sys: -5, dia: -3, rr: -1, temp: -0.1, gluc: -4, bmd: 0.02, sleep: 0.4}},
  {id: 'kenji-mori', name: 'Kenji Mori', code: 'MS1', role: 'specialist', offsets: {hr: 3, sys: 1, dia: 2, rr: 0.5, temp: 0.1, gluc: 5, bmd: -0.03, sleep: -0.5}},
  {id: 'omar-haddad', name: 'Omar Haddad', code: 'MS2', role: 'specialist', offsets: {hr: -2, sys: 2, dia: 1, rr: 0, temp: 0, gluc: 2, bmd: 0.04, sleep: 0.2}},
].map(m => Object.freeze({...m, fictional: true, offsets: Object.freeze(m.offsets)})));

/** Tripulante afectado por los episodios preparados de los escenarios. */
export const SCENARIO_SUBJECT = 'kenji-mori';

export const publicMember = ({id, name, code, role}) => ({id, name, code, role, fictional: true});
export const findMember = id => CREW.find(m => m.id === id) || null;
export const hasCrewAccess = member => Boolean(member && ROLES[member.role]?.crewAccess);
/** Un tripulante ve sus propios datos; comandante y médica ven los de todos. */
export const canView = (viewer, subjectId) => Boolean(viewer && (viewer.id === subjectId || hasCrewAccess(viewer)));

/** Tripulación del resultado. Los resultados de versión 1 tienen un único sujeto. */
export function crewOf(result) {
  if (Array.isArray(result.crew)) return result.crew;
  return [{...result.subject, code: 'CDR', role: 'commander'}];
}
export const defaultSubject = result => crewOf(result)[0].id;

/** Vista de un tripulante: misma forma que un resultado individual (subject, measurements, events). */
export function memberView(result, memberId) {
  const crew = crewOf(result);
  const subject = crew.find(m => m.id === memberId);
  if (!subject) throw new Error('Tripulante desconocido.');
  if (!Array.isArray(result.crew)) return result;
  return {...result, subject, crew,
    measurements: result.measurements.filter(r => r.subjectId === memberId),
    events: result.events.filter(e => e.subjectId === memberId),
    ...(result.checkins ? {checkins: result.checkins.filter(c => c.subjectId === memberId)} : {})};
}

/** Actividad registrada sobre un tripulante; los registros antiguos sin sujeto pertenecen al primero. */
export const activitySubject = (entry, result) => entry.subjectId ?? defaultSubject(result);
