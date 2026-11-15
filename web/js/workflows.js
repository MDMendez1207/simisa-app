import {escapar as esc} from './core/utilidades.js';

// Única carga manual de la aplicación: el chequeo psicológico del astronauta.
// Signos vitales y sueño provienen exclusivamente de sensores.
export const MOODS = ['Muy bien', 'Bien', 'Neutro', 'Bajo', 'Muy bajo'];

export function activityLog(c) {
  const rows = c.activity.filter(e => e.type === 'wellbeing' && e.elapsedSec <= c.elapsed).slice().reverse();
  return rows.length ? rows.map(e => `<article class="run-item"><strong>${esc(e.observedAt.replace('T', ' ').replace('.000Z', ' UTC'))}</strong><p>${esc(`${e.payload.mood} · Estrés percibido ${e.payload.stress}/10`)}</p><p class="hint">${esc(e.payload.note || '')}</p></article>`).join('') : '<p class="hint">Sin chequeos psicológicos en este período.</p>';
}
export function workflowPanel(c, view) {
  if (view !== 'mente') return '';
  const canAnswer = c.role === 'Astronauta';
  return `<div class="card section-gap"><h2>Chequeo psicológico</h2><p class="hint">Autoinforme del astronauta. Es el único registro que se ingresa a mano; los signos vitales y el sueño provienen de sensores.</p>
    <form data-workflow="wellbeing" class="form-grid section-gap"><label>Estado de ánimo<select name="mood" ${canAnswer ? '' : 'disabled'}>${MOODS.map(s => `<option>${s}</option>`).join('')}</select></label>
    <label>Estrés percibido (0–10)<input name="stress" type="number" min="0" max="10" step="0.1" required ${canAnswer ? '' : 'disabled'}></label>
    <label class="span-two">Observación<input name="note" maxlength="1000" ${canAnswer ? '' : 'disabled'}></label>
    <button class="btn primary" ${canAnswer ? '' : 'disabled'}>Guardar chequeo</button></form>
    ${canAnswer ? '' : '<p class="hint">Solo el perfil Astronauta completa su chequeo. Este perfil puede consultarlo.</p>'}
    <div class="stack section-gap">${activityLog(c)}</div></div>`;
}
export function communication(c) {
  const reports = c.activity.filter(e=>e.type==='report');
  return c.heading('Comunicación Tierra', 'Informes y seguimiento de entregas.') + `<div class="card"><h2>Preparar informe</h2><p>Se incluyen las observaciones hasta el momento consultado y las acciones registradas.</p><button class="btn primary section-gap" data-action="prepareReport">Preparar informe</button></div><div class="stack section-gap">${reports.map(r=>{
    const received=c.activity.find(e=>e.type==='dispatch'&&e.payload.reportId===r.id);
    return `<article class="card"><h3>Informe · ${esc(r.observedAt)}</h3><p>${r.payload.observations} observaciones · ${r.payload.events} eventos</p><span class="tag ${received?'ok':'info'}">${received?'Recibido en bandeja local':'Preparado'}</span><div class="row section-gap"><button class="btn" data-action="downloadReport" data-id="${r.id}">Descargar informe</button>${received?'':`<button class="btn" data-action="dispatchReport" data-id="${r.id}">Entregar en bandeja local</button>`}</div></article>`;
  }).join('') || '<p class="empty">Todavía no se prepararon informes.</p>'}</div>`;
}
export function profiles(c) {
  const description = {'Investigador': 'Estadísticas y exportación agregada.',
    'Equipo médico': 'Consulta de indicadores de sensores, chequeos psicológicos y seguimiento.',
    'Astronauta': 'Consulta personal de sus lecturas y chequeo psicológico.'};
  return c.heading('Perfiles y permisos', 'Selección de perfil y acceso local.') + `<div class="quality-grid">${['Astronauta','Equipo médico','Investigador'].map(role=>`<article class="card"><h2>${role}</h2><p>${description[role]}</p><button class="btn section-gap" data-action="profile" data-role="${role}" ${role===c.role?'disabled':''}>${role===c.role?'Perfil activo':'Seleccionar perfil'}</button></article>`).join('')}</div><div class="card section-gap"><h2>Perfil consultado</h2><p>${esc(c.result.subject.name)}</p><p class="hint">El perfil seleccionado se conserva al reiniciar.</p></div>`;
}
