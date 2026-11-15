import {escapar as esc} from './core/utilidades.js';
import {timeMarkup} from './core/formatos.js';

// Única carga manual de la aplicación: el chequeo psicológico, que cada tripulante completa sobre sí mismo.
// Signos vitales y sueño provienen exclusivamente de sensores.
export const MOODS = ['Muy bien', 'Bien', 'Neutro', 'Bajo', 'Muy bajo'];

export function activityLog(c) {
  // Incluye los chequeos sintéticos del historial y los registrados por el tripulante (los más recientes primero).
  const rows = (c.index.stress || []).filter(r => r.elapsedSec <= c.elapsed).slice(-20).reverse();
  return rows.length ? rows.map(r => `<article class="run-item"><div class="row between">${timeMarkup(r.timestamp)}${r.synthetic ? '<span class="tag neutral">Historial sintético</span>' : '<span class="tag cyan">Registrado</span>'}</div><p>${esc(`${r.mood} · Estrés percibido ${r.value}/10`)}</p>${r.note ? `<p class="hint">${esc(r.note)}</p>` : ''}</article>`).join('') : '<p class="hint">Sin chequeos psicológicos en este período.</p>';
}
export function workflowPanel(c, view) {
  if (view !== 'mente') return '';
  const own = c.subject.id === c.me.id;
  const form = own ? `<form data-workflow="wellbeing" class="form-grid section-gap">
      <label>Estado de ánimo<select name="mood" required>${MOODS.map(s => `<option ${s === 'Bien' ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label>Estrés percibido (0–10)<input name="stress" type="number" min="0" max="10" step="0.1" placeholder="0 = nada · 10 = máximo" required></label>
      <label class="span-two">Observación (opcional)<input name="note" maxlength="1000" placeholder="¿Algo que quieras dejar registrado?"></label>
      <button class="btn primary" type="submit">Guardar chequeo</button></form>
      <p class="hint">Se registra en el momento consultado: ${esc(c.time(c.elapsed))}.</p>`
    : `<p class="hint section-gap">Solo ${esc(c.subject.name)} puede completar su propio chequeo. Como ${esc(c.roleName)} podés consultarlo.</p>`;
  return `<div class="card section-gap"><h2>Chequeo psicológico</h2><p class="hint">Autoinforme de estado de ánimo y estrés percibido. Es el único registro que se ingresa a mano; los signos vitales y el sueño provienen de sensores.</p>
    ${form}<h3 class="section-gap">Historial de chequeos</h3><div class="stack section-gap">${activityLog(c)}</div></div>`;
}
export function communication(c) {
  const reports = c.activity.filter(e=>e.type==='report');
  return c.heading('Comunicación Tierra', `Informes de seguimiento de ${esc(c.subject.name)}.`) + `<div class="card report-toolbar"><div><h2>Informes de seguimiento</h2><p class="hint">Observaciones y acciones hasta el momento consultado.</p></div><button class="btn primary" data-action="prepareReport">Preparar informe</button></div><div class="report-list section-gap">${reports.map(r=>{
    const received=c.activity.find(e=>e.type==='dispatch'&&e.payload.reportId===r.id);
    return `<article class="card"><div class="row between"><h3>Informe</h3>${timeMarkup(r.observedAt, {year: true})}</div><p>${r.payload.observations} observaciones · ${r.payload.events} eventos</p><span class="tag ${received?'ok':'info'}">${received?'Recibido en bandeja local':'Preparado'}</span><div class="row section-gap"><button class="btn" data-action="downloadReport" data-id="${r.id}">Descargar informe</button>${received?'':`<button class="btn" data-action="dispatchReport" data-id="${r.id}">Entregar en bandeja local</button>`}</div></article>`;
  }).join('') || '<p class="empty">Todavía no se prepararon informes.</p>'}</div>`;
}
export function profiles(c) {
  const visible = c.crewAccess ? c.crew : c.crew.filter(m => m.id === c.me.id);
  const card = m => `<article class="card ${m.id === c.me.id ? 'selected' : ''}"><div class="eyebrow">${esc(m.code)}</div><h2>${esc(m.name)}</h2><span class="tag ${c.roles[m.role].crewAccess ? 'cyan' : 'neutral'}">${esc(c.roles[m.role].name)}</span>
    <p class="section-gap">${esc(c.roles[m.role].description)}</p>${m.id === c.me.id ? '<p class="hint">Sesión actual</p>' : c.crewAccess ? `<button class="btn section-gap" data-action="viewMember" data-id="${esc(m.id)}">Ver su información</button>` : ''}</article>`;
  return c.heading('Perfiles y permisos', 'Tripulación de la misión y alcance de cada perfil.') + `<div class="quality-grid">${visible.map(card).join('')}</div>
    <div class="card section-gap permissions-card"><h2>Permisos</h2><ul><li><strong>Comandante</strong> y <strong>Médica de tripulación</strong>: estado de salud de toda la tripulación, alertas, investigación y simulación.</li><li><strong>Especialistas de misión</strong>: solamente su propia información.</li><li>Cada tripulante completa únicamente su propio chequeo psicológico.</li></ul>
    <p class="hint">Identificación de demostración sin contraseña: el servidor aplica los permisos del tripulante elegido.</p><button class="btn ghost section-gap" data-action="logout">Cambiar de tripulante</button></div>`;
}
