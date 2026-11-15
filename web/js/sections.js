import {escapar as esc} from './core/utilidades.js';
import {METRIC_DESCRIPTION} from './presentation.js';
import {summarize} from '../../shared/results.js';

const historyTable = rows => `<div class="table-scroll"><table><thead><tr><th>Adquisición UTC</th><th>Valor</th><th>Unidad</th><th>Calidad</th><th>Disponibilidad</th></tr></thead><tbody id="historyRows">${rows}</tbody></table></div>`;

export function sleepPage(c) {
  return c.heading('Sueño y descanso', 'Duración del descanso informada por el sensor de sueño.') + c.timeline() +
    `<div class="two-columns"><div class="stack"><div id="readings" data-metrics="sleep">${c.readingCard('sleep')}</div><div class="card"><h2>Origen de los datos</h2><p class="hint">Las horas de sueño provienen del sensor de descanso y se conservan por fecha de adquisición. No se cargan a mano. Las fases del sueño y las interrupciones se mostrarán cuando un sensor las informe.</p></div></div>
    <div class="card" id="chartBlock">${c.chartBlock()}</div></div><div class="card section-gap"><h2>Historial de descanso</h2>${historyTable(c.tableRows())}</div>`;
}

export function wellbeingPage(c) {
  const last=c.activity?.filter(e=>e.type==='wellbeing'&&e.elapsedSec<=c.elapsed).at(-1);
  return c.heading('Bienestar psicológico', 'Chequeo psicológico del astronauta y descanso medido por sensor.') + c.timeline() +
    `<div class="kpi-grid" id="readings" data-metrics="stress,sleep">${['stress', 'sleep'].map(c.readingCard).join('')}</div><div class="two-columns section-gap"><div class="card" id="chartBlock">${c.chartBlock()}</div><div class="stack"><div class="card"><h2>Estado de ánimo</h2><p>${last?esc(last.payload.mood):'Sin chequeos registrados'}</p></div><div class="card"><h2>Último chequeo psicológico</h2><p>${last?`Estrés percibido ${last.payload.stress}/10${last.payload.note?` · ${esc(last.payload.note)}`:''}`:'Completá el chequeo psicológico para comenzar el seguimiento.'}</p></div></div></div>`;
}

export function chatView(messages) {
  return messages.length ? messages.map(m => `<article class="conversation-message ${m.author === 'user' ? 'from-user' : ''}"><strong>${m.author === 'user' ? 'Vos' : 'SIMISA'}</strong><p>${esc(m.text)}</p>${m.time ? `<small>${esc(m.time)}</small>` : ''}</article>`).join('') : '<div class="conversation-welcome"><h2>¿Qué querés consultar?</h2><p>Revisá tus lecturas, cambios y disponibilidad de sensores.</p></div>';
}

export function assistantPage(c) {
  return c.heading('Asistente inteligente', 'Consultá tus indicadores y su evolución.') + `<div class="card assistant-panel"><div id="conversation" class="conversation" role="log" aria-label="Conversación">${chatView(c.chat)}</div>
    <div class="row suggestions"><button class="chip" data-action="ask" data-question="Resumen de mis indicadores">Resumen de mis indicadores</button><button class="chip" data-action="ask" data-question="¿Qué sensores están sin lectura?">Estado de sensores</button><button class="chip" data-action="ask" data-question="Tendencia de saturación">Tendencia de saturación</button></div>
    <form id="assistantForm" class="assistant-form"><label class="sr-only" for="assistantInput">Tu consulta</label><input id="assistantInput" name="question" placeholder="Escribí tu consulta…" maxlength="500" required><button class="btn primary" type="submit">Consultar</button></form></div>`;
}

export function medicalPage(c) {
  return c.heading('Información médica', 'Indicadores, sistemas corporales y material de consulta.') + `<label class="section-toolbar">Buscar en la biblioteca<input id="librarySearch" type="search" placeholder="Indicador o sistema corporal"></label><div class="quality-grid sources section-gap">${c.indicators.map(m => `<article class="card" data-library><div class="eyebrow">${esc(m.sistema)}</div><h2>${esc(m.nombre)}</h2><p>${esc(METRIC_DESCRIPTION[m.clave] || '')}</p><p class="hint section-gap">Unidad: ${esc(m.unidad)}<br>Referencia configurada: ${m.lo}–${m.hi} ${esc(m.unidad)}</p><details class="section-gap"><summary>Consultar registro</summary><p>${c.result ? c.readingCard(m.clave) : 'Elegí un historial para consultar mediciones.'}</p></details></article>`).join('')}</div>
    <div class="two-columns section-gap sources"><div class="card"><h2>Biblioteca</h2><ul><li><a href="https://www.nasa.gov/hrp/hazards/" target="_blank" rel="noreferrer">NASA · Salud y riesgos del vuelo espacial</a></li><li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/22-2-the-lungs" target="_blank" rel="noreferrer">OpenStax · Anatomía de los pulmones</a></li><li><a href="https://www.nasa.gov/reference/nasa-std-3001v1/" target="_blank" rel="noreferrer">NASA-STD-3001 · Crew Health</a></li></ul></div><div class="card"><h2>Protocolos</h2><p class="hint">Todavía no se incorporaron documentos de protocolos a la biblioteca.</p></div></div>`;
}

export function earthPage(c) {
  return c.heading('Comunicación Tierra', 'Informes de seguimiento y estado del enlace.') + `<div class="two-columns"><div class="card"><h2>Estado del enlace</h2><span class="tag neutral">Sin destino vinculado</span><dl class="detail-list section-gap"><dt>Último envío</dt><dd>Sin envíos registrados</dd><dt>En tránsito</dt><dd>0 informes</dd><dt>Recibidos</dt><dd>0 confirmaciones</dd></dl></div><div class="card"><h2>Informe de seguimiento</h2><p>El historial de ${esc(c.result.subject.name)} reúne ${c.result.measurements.length.toLocaleString('es-AR')} observaciones y ${c.result.events.length} eventos.</p><p class="hint section-gap">Incluye indicadores, unidades, fechas y calidad de cada lectura.</p><a class="btn primary section-gap" href="/api/runs/${c.result.id}/file">Descargar informe</a></div></div><div class="card section-gap"><h2>Actividad de comunicación</h2><p class="empty">No hay transferencias registradas.</p></div>`;
}

export function profilesPage(c) {
  const initials = c.result.subject.name.split(' ').map(word => word[0]).join('');
  return c.heading('Perfiles y permisos', 'Perfil consultado y acceso a la información.') + `<div class="quality-grid"><article class="card profile-card"><div class="profile-avatar">${esc(initials)}</div><h2>${esc(c.result.subject.name)}</h2><span class="tag cyan">Astronauta</span><dl class="detail-list section-gap"><dt>Identificador</dt><dd>${esc(c.result.subject.id)}</dd><dt>Indicadores</dt><dd>${c.result.indicators.length}</dd><dt>Observaciones</dt><dd>${c.result.measurements.length.toLocaleString('es-AR')}</dd></dl></article>
    <article class="card"><h2>Equipo médico</h2><p class="hint">Sin usuarios asignados.</p></article><article class="card"><h2>Investigación</h2><p class="hint">Sin usuarios asignados.</p></article></div><div class="card section-gap"><h2>Administración de acceso</h2><p>No hay cuentas ni permisos configurados.</p></div>`;
}

export function researchData(result, index, elapsed) {
  return result.indicators.map(m => ({id: m.clave, indicator: m.nombre, unit: m.unidad, decimals: m.decimals,
    ...summarize(result, index, m.clave, elapsed)}));
}
export function researchRows(c) {
  return researchData(c.result, c.index, c.elapsed).map(row => `<tr><td>${esc(row.indicator)}</td><td>${row.count}</td><td>${row.min == null ? '—' : row.min.toFixed(row.decimals)}</td><td>${row.mean == null ? '—' : row.mean.toFixed(row.decimals)}</td><td>${row.max == null ? '—' : row.max.toFixed(row.decimals)}</td><td>${esc(row.unit)}</td></tr>`).join('');
}
export function researchPage(c) {
  return c.heading('Investigación', 'Estadísticas de los indicadores en el período consultado.', '<button class="btn" data-action="exportResearch">Exportar tabla</button>') + c.timeline() +
    `<div class="card"><div class="row between"><h2>Resumen por indicador</h2><span class="tag info">1 perfil</span></div><div class="table-scroll"><table><thead><tr><th>Indicador</th><th>Lecturas válidas</th><th>Mínimo</th><th>Media</th><th>Máximo</th><th>Unidad</th></tr></thead><tbody id="researchRows">${researchRows(c)}</tbody></table></div></div>`;
}

export function researchCSV(result, index, elapsed) {
  const fields = ['Indicador', 'Unidad', 'Lecturas válidas', 'Mínimo', 'Media', 'Máximo', 'Origen de los datos'];
  const origin = id => [...new Set((index[id] || []).map(row => row.captureMethod))].join(', ') || '—';
  const rows = researchData(result, index, elapsed).map(r => [r.indicator, r.unit, r.count, r.min, r.mean, r.max, origin(r.id)]);
  return '\uFEFF' + [fields, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
