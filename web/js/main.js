import {REGIONS, INDICATORS, isSensorMetric} from '/shared/catalog.js';
import {buildIndex, observationAt, summarize} from '/shared/results.js';
import {ICONOS} from './data/navegacion-original.js';
import {escapar as esc} from './core/utilidades.js';
import {chart} from './chart.js';
import {NAV, REFERENCE_LABEL, SOURCE_LABEL, REGION_NOTE, eventLabel, assistantAnswer} from './presentation.js';
import {sleepPage, wellbeingPage, assistantPage, medicalPage, earthPage, profilesPage, researchPage, researchRows, researchCSV, chatView} from './sections.js';
import {workflowPanel, communication, profiles} from './workflows.js';

const state = {view: 'inicio', settingsTab: 'general', chat: [], activity: [], role: 'Astronauta', eventFilter: 'all', meta: null, runs: [], warnings: [], envelope: null,
  index: {}, region: 'cuerpo', metric: 'hr', elapsed: 0, playing: false, speed: 60,
  mode: 'detail', zoom: 1, panX: 0, panY: 0, busy: false};
const QUALITY = {valid: 'Válida', low_quality: 'Baja calidad', invalid: 'Inválida', missing: 'Sin lectura'};
const AVAILABILITY = {available: 'Disponible', disconnected: 'Desconectada', stale: 'Desactualizada', no_data: 'Sin datos'};
let lastPlayback = 0, preciseTime = 0, noticeTimer;
const $ = selector => document.querySelector(selector);
const result = () => state.envelope?.result;
const metric = id => result()?.indicators.find(m => m.clave === (id || state.metric));
const total = () => (result()?.config.durationMinutes || 0) * 60;
const time = seconds => new Date(Date.parse(result().config.startTime) + seconds * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
const display = (value, m) => value == null ? '—' : Number(value).toFixed(m.decimals);
const observation = id => observationAt(result(), state.index, id, state.elapsed);

async function api(route, options) {
  let response;
  try { response = await fetch(route, options); }
  catch { throw new Error('No se pudo conectar con el almacenamiento local. Comprobá que SIMISA siga abierto e intentá nuevamente.'); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}
function notice(message) {
  const el = $('#notice');
  el.textContent = message; el.classList.add('on');
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => el.classList.remove('on'), 5000);
}
function feedback(error) {
  const el = $('#feedback');
  if (el) { el.innerHTML = `<p class="error" role="alert">${esc(error.message)}</p>`; el.scrollIntoView({block: 'nearest'}); }
}
function remember(id) { try { localStorage.setItem('simisa.files.selectedRun', id); } catch {} }
function remembered() { try { return localStorage.getItem('simisa.files.selectedRun'); } catch { return null; } }

async function refreshRuns() {
  const listing = await api('/api/runs');
  state.runs = listing.runs; state.warnings = listing.warnings;
}
async function loadRun(id, goTo = state.view) {
  const envelope = await api(`/api/runs/${id}`);
  pause();
  state.envelope = envelope; state.activity = []; state.index = buildIndex(envelope.result); state.elapsed = 0;
  await refreshActivity();
  state.elapsed = Math.max(0, ...state.activity.map(e=>e.elapsedSec));
  state.metric = 'hr'; state.region = 'cuerpo'; resetZoom(); remember(id);
  navigate(goTo);
}
function pause() { state.playing = false; updatePlayButton(); }
function togglePlay() {
  if (!result()) return;
  if (state.playing) return pause();
  if (state.elapsed >= total()) state.elapsed = 0;
  state.playing = true; preciseTime = state.elapsed; lastPlayback = performance.now();
  updateLive(); updatePlayButton();
}
function updatePlayButton() {
  if ($('#play')) { $('#play').textContent = state.playing ? 'Pausar' : 'Reproducir'; $('#play').setAttribute('aria-pressed', String(state.playing)); }
}
function setTime(value) {
  state.elapsed = Math.max(0, Math.min(total(), Number(value)));
  preciseTime = state.elapsed; lastPlayback = performance.now(); updateLive();
}
function resetZoom() { state.zoom = 1; state.panX = 0; state.panY = 0; }
function syncSidebar() {
  const sidebar = $('#sidebar'), menu = $('.burger');
  if (!sidebar || !menu) return;
  const mobile = matchMedia('(max-width:960px)').matches;
  sidebar.inert = mobile && !sidebar.classList.contains('open');
  menu.setAttribute('aria-expanded', String(mobile && sidebar.classList.contains('open')));
}
function transformAnatomy() {
  const el = $('.anatomy-transform');
  if (el) el.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  if ($('#zoomLabel')) $('#zoomLabel').textContent = `${Math.round(state.zoom * 100)} %`;
}
function zoomBy(factor) {
  const limit = state.region !== 'cuerpo' && state.mode === 'detail' ? 2 : 2.5;
  state.zoom = Math.max(1, Math.min(limit, state.zoom * factor));
  if (state.zoom === 1) { state.panX = 0; state.panY = 0; }
  transformAnatomy();
}
function navigate(view) {
  if (view === 'simulaciones') { view = 'config'; state.settingsTab = 'simulation'; }
  state.view = NAV.some(n => n[0] === view) ? view : 'inicio';
  if (state.view === 'sueno') state.metric = 'sleep';
  if (state.view === 'mente') state.metric = 'stress';
  if (state.view === 'cuerpo' && result() && !REGIONS.find(r => r.id === state.region).metrics.includes(state.metric)) {
    state.region = REGIONS.find(r => r.id !== 'cuerpo' && r.metrics.includes(state.metric))?.id || 'cuerpo';
    state.mode = 'detail'; resetZoom();
  }
  history.replaceState(null, '', `#${state.view}`);
  $('#sidebar')?.classList.remove('open');
  syncSidebar();
  render();
  $('#content').scrollTop = 0;
}
function heading(title, description, extra = '') {
  return `<div class="sec-head"><div><h1 tabindex="-1">${title}</h1><p>${description}</p></div>${extra ? `<div class="sp">${extra}</div>` : ''}</div>`;
}
function timeline({controls = false} = {}) {
  return `<div class="card timeline"><div class="row between"><label for="timeSlider" class="hint">${controls ? 'Reloj de simulación' : 'Momento consultado'}</label><span class="clock" id="timeReadout">${time(state.elapsed)}</span></div>
    <input id="timeSlider" type="range" min="0" max="${total()}" step="${result().config.stepSec}" value="${state.elapsed}" aria-label="Momento consultado">
    ${controls ? `<div class="controls"><button class="btn" id="play" data-action="play" aria-pressed="false">Reproducir</button><button class="btn ghost" data-action="begin">Volver al inicio</button><button class="btn ghost" data-action="advance">+1 min</button>
    <label class="row small">Velocidad <select id="speed" aria-label="Velocidad de exploración">${[1, 10, 60].map(v => `<option ${v === state.speed ? 'selected' : ''} value="${v}">${v}×</option>`).join('')}</select></label>
    <button class="btn ghost" data-action="episode">Ir al primer evento</button></div>` : ''}</div>`;
}
function readingCard(id) {
  const m = metric(id), o = observation(id);
  const valid = o.current;
  const badge = valid ? o.condition === 'outside' ? 'warn' : 'ok' : 'neutral';
  const sensor = isSensorMetric(id);
  const detail = sensor
    ? `${valid ? `Adquisición: ${esc(valid.timestamp.slice(11, 19))} UTC` : o.lastValid ? `Última válida: ${display(o.lastValid.value, m)} ${esc(m.unidad)} · ${o.lastValid.timestamp.slice(11, 19)} UTC` : 'Sin observaciones válidas'}<br>Calidad: ${QUALITY[o.quality]} · ${AVAILABILITY[o.availability]}`
    : valid ? `Chequeo psicológico: ${esc(valid.timestamp.slice(11, 19))} UTC<br>Autoinforme del astronauta` : 'Sin chequeos psicológicos registrados';
  return `<article class="card reading ${state.metric === id ? 'selected' : ''}"><button class="metric-button" data-action="metric" data-metric="${id}" aria-pressed="${state.metric === id}"><h3>${esc(m.nombre)}</h3>
    <div class="kv">${display(valid?.value, m)}<span class="ku">${esc(m.unidad)}</span></div>
    <span class="tag ${badge}">${valid ? REFERENCE_LABEL[o.condition] : sensor ? QUALITY[o.quality] : 'Sin chequeo'}</span></button>
    <small>${detail}</small></article>`;
}
function chartBlock() {
  const m = metric(), rows = state.index[m.clave];
  const stats = summarize(result(), state.index, m.clave, state.elapsed);
  return `<div class="row between"><h3>${esc(m.nombre)}</h3><span class="tag info">${esc(m.unidad)}</span></div>
    ${chart(rows, {...m, effectivePeriod: Math.max(m.periodSec, result().config.stepSec)}, state.elapsed)}
    <div class="stats"><span>Mín. <strong>${display(stats.min, m)}</strong></span><span>Máx. <strong>${display(stats.max, m)}</strong></span><span>Media <strong>${display(stats.mean, m)}</strong></span><span><strong>${stats.count}</strong> válidas</span></div>
    <p class="hint">Referencia configurada: ${m.lo}–${m.hi} ${esc(m.unidad)}.</p>`;
}
function metricSelector() {
  return `<label>Indicador<select id="metricSelector">${result().indicators.map(m => `<option value="${m.clave}" ${m.clave === state.metric ? 'selected' : ''}>${esc(m.nombre)} · ${esc(m.unidad)}</option>`).join('')}</select></label>`;
}
function eventRows(limit = 40, all = false) {
  const events = result().events.filter(e => (all || e.elapsedSec <= state.elapsed) && (state.eventFilter === 'all' || e.type === state.eventFilter)).slice(-limit).reverse();
  return events.length ? events.map(e => `<div class="event-item"><div><span class="tag ${e.type === 'technical' ? 'info' : e.state === 'outside' ? 'warn' : 'ok'}">${e.type === 'technical' ? 'Técnico' : 'Indicador'}</span>
    <p>${esc(metric(e.indicator).nombre)} · ${esc(eventLabel(e))}</p><small>${esc(e.timestamp.replace('T', ' ').replace('.000Z', ' UTC'))}</small></div>
    <div class="row"><button class="btn ghost" data-action="event" data-time="${e.elapsedSec}" data-metric="${e.indicator}">Explorar momento</button>${state.activity.some(a=>a.type==='acknowledge'&&a.payload.eventId===e.id)?'<span class="tag info">Revisada</span>':`<button class="btn" data-action="ack" data-id="${esc(e.id)}">Marcar revisada</button>`}</div></div>`).join('') : '<p class="empty">Sin eventos hasta el momento elegido.</p>';
}
function tableRows() {
  const rows = (state.index[state.metric] || []).filter(r => r.elapsedSec <= state.elapsed).slice(-100).reverse();
  const m = metric();
  return rows.map(r => `<tr><td class="mono">${r.timestamp.replace('T', ' ').replace('.000Z', '')}</td><td>${display(r.value, m)}</td><td>${esc(r.unit)}</td><td>${r.captureMethod === 'self_report' ? 'Autoinforme' : QUALITY[r.quality]}</td><td>${r.captureMethod === 'self_report' ? 'Chequeo psicológico' : AVAILABILITY[r.availability]}</td></tr>`).join('') || '<tr><td colspan="5">Sin registros.</td></tr>';
}
function simulationsPage() {
  const d = state.meta.defaults;
  return `<div class="row between section-toolbar"><h2>Simulación</h2><button class="btn ghost" data-action="refresh">Actualizar archivos</button></div>` +
    `<div class="two-columns"><form id="simulationForm" class="card"><h2>Nueva simulación</h2><p class="csub">Una semilla y configuración idénticas producen el mismo resultado. El guardado se verifica antes de abrirlo.</p>
    <div class="form-grid"><label class="span-two">Nombre de la ejecución<input name="name" value="${esc(d.name)}" maxlength="80" required></label>
    <label class="span-two">Escenario<select name="scenario">${state.meta.scenarios.map(s => `<option value="${s.id}" ${s.id === d.scenario ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
    <p class="hint span-two" id="scenarioDescription">${esc(state.meta.scenarios.find(s => s.id === d.scenario).description)}</p>
    <label>Semilla<input type="number" name="seed" min="0" max="4294967295" step="1" value="${d.seed}" required></label>
    <label>Duración (min)<input type="number" name="durationMinutes" min="1" max="1440" step="1" value="${d.durationMinutes}" required></label>
    <label>Paso del reloj<select name="stepSec">${[5, 10, 30, 60].map(n => `<option value="${n}" ${n === d.stepSec ? 'selected' : ''}>${n} segundos</option>`).join('')}</select></label>
    <label>Inicio (UTC)<input name="startTime" type="datetime-local" step="1" value="${d.startTime.slice(0, 19)}" required></label></div>
    <div class="form-footer"><button type="submit" class="btn primary" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Calculando y guardando…' : 'Ejecutar y guardar'}</button><p class="hint">Las fuentes mantienen sus frecuencias propias. Hueso y sueño no se convierten en señales continuas. El estrés percibido no se simula: proviene del chequeo psicológico.</p></div></form>
    <div class="card"><div class="row between"><h2>Resultados guardados</h2><span class="tag cyan">${state.runs.length} archivos</span></div><p class="hint">Se leen desde disco. También aparecen las ejecuciones creadas con el simulador independiente.</p>
    <div class="run-list">${state.runs.length ? state.runs.map(r => `<article class="run-item ${result()?.id === r.id ? 'selected' : ''}"><h3>${esc(r.config.name)}</h3><div class="run-meta">${esc(state.meta.scenarios.find(s => s.id === r.config.scenario)?.name || r.config.scenario)} · Semilla ${r.config.seed}<br>${r.config.durationMinutes} min · ${r.count.toLocaleString('es-AR')} registros · ${r.eventCount} eventos<br><span class="mono">${r.id}</span></div><div class="row"><button class="btn" data-action="open" data-id="${r.id}">Explorar anatomía</button><a class="btn ghost" href="/api/runs/${r.id}/file">Descargar JSON</a></div></article>`).join('') : '<p class="empty">Todavía no hay simulaciones. Creá la primera con el formulario.</p>'}</div></div></div>`;
}
function anatomyPage() {
  const region = REGIONS.find(r => r.id === state.region);
  const full = state.region === 'cuerpo' || state.mode === 'body';
  const image = full ? 'cuerpo-holografico-v2.png' : region.image;
  const hotspots = [['cabeza', 512, 105, 70, 'Cabeza'], ['pulmones', 414, 324, 65, 'Pulmones'],
    ['pecho', 562, 398, 49, 'Corazón'], ['abdomen', 512, 613, 86, 'Abdomen'], ['huesos', 568, 1050, 76, 'Huesos']];
  return heading('Salud corporal', 'Explorá tus indicadores por región.') +
    `<div class="region-list" role="group" aria-label="Regiones anatómicas">${REGIONS.map(r => `<button class="chip ${r.id === state.region ? 'on' : ''}" data-action="region" data-region="${r.id}" aria-pressed="${r.id === state.region}">${r.name}</button>`).join('')}</div>
    <div class="explorer-layout"><div class="card anatomy-card"><div class="anatomy-toolbar"><strong>${region.name}</strong><div class="row"><button class="btn ghost" data-action="bodyMode" ${state.region === 'cuerpo' ? 'disabled' : ''}>${state.mode === 'body' ? 'Ver detalle' : 'En el cuerpo'}</button><span class="tag cyan">HD · 2D</span></div></div>
    <div class="anatomy-stage" id="anatomyStage" tabindex="0" role="group" aria-label="Vista anatómica. Usá más y menos para zoom, flechas para desplazar, cero para restablecer.">
    <div class="anatomy-transform"><img class="anatomy-image ${full ? '' : 'detail'}" src="/assets/${image}" alt="Vista anatómica: ${region.name}." draggable="false">
    ${full ? `<svg class="body-map" viewBox="0 0 1024 1536" aria-label="Regiones del cuerpo">${hotspots.map(([id, x, y, r, name]) => `<a href="#cuerpo" data-action="region" data-region="${id}" aria-label="Explorar ${name}"><circle class="${id === state.region ? 'selected' : ''}" cx="${x}" cy="${y}" r="${r}"/><text x="${x + r + 14}" y="${y + 5}">${name}</text></a>`).join('')}</svg>` : ''}</div></div>
    <div class="row between anatomy-toolbar"><button class="btn ghost" data-action="fullbody">Cuerpo completo</button><div class="row"><button class="btn ghost" data-action="zoomOut" aria-label="Alejar anatomía">−</button><span class="hint" id="zoomLabel">100 %</span><button class="btn ghost" data-action="zoomIn" aria-label="Acercar anatomía">+</button><button class="btn ghost" data-action="resetZoom">Restablecer</button></div></div>
    <div class="anatomy-footer">Arrastrá para desplazar al ampliar. Usá + y − para acercar o alejar, y 0 para restablecer.</div></div>
    <div class="stack"><div><div class="eyebrow">${region.name}</div><p class="hint">${REGION_NOTE[region.id]}</p></div><div class="kpi-grid" id="readings" data-metrics="${region.metrics.join(',')}">${region.metrics.map(readingCard).join('')}</div><div class="card" id="chartBlock">${chartBlock()}</div></div></div>` + timeline();
}
function overviewPage() {
  return heading('Panel general', 'Tus indicadores y los cambios más recientes.', '<button class="btn primary" data-action="goBody">Explorar el cuerpo</button>') +
    `<div class="kpi-grid" id="readings" data-metrics="${result().indicators.map(m => m.clave).join(',')}">${result().indicators.map(m => readingCard(m.clave)).join('')}</div>` + timeline() +
    `<div class="two-columns"><div class="card" id="chartBlock">${chartBlock()}</div><div class="card"><h2>Actividad hasta este momento</h2><div id="eventList">${eventRows(5)}</div></div></div>`;
}
function historyPage() {
  return heading('Gráficas e historial', 'Consultá la evolución y el detalle de tus mediciones.') + metricSelector() + timeline() +
    `<div class="stack"><div class="card" id="chartBlock">${chartBlock()}</div><div class="card"><div class="row between"><h2>Últimos registros</h2><a class="btn ghost" href="/api/runs/${result().id}/file">Descargar historial</a></div><div class="table-scroll"><table><thead><tr><th>Adquisición UTC</th><th>Valor</th><th>Unidad</th><th>Calidad</th><th>Disponibilidad</th></tr></thead><tbody id="historyRows">${tableRows()}</tbody></table></div></div></div>`;
}
function sourceCards() {
  return result().sources.map(source => {
    const metrics = result().indicators.filter(m => m.sourceId === source.id);
    if (!metrics.length || !metrics.every(m => isSensorMetric(m.clave))) return '';
    const o = observation(metrics[0].clave), latest = o.latest;
    return `<article class="card source-card"><h3>${esc(SOURCE_LABEL[source.id] || source.name)}</h3><p class="csub">${metrics.map(m => esc(m.nombre)).join(' · ')}</p><dl><dt>Disponibilidad</dt><dd>${AVAILABILITY[o.availability]}</dd><dt>Calidad</dt><dd>${QUALITY[o.quality]}</dd><dt>Última adquisición</dt><dd>${latest ? latest.timestamp.slice(11, 19) + ' UTC' : 'Sin datos'}</dd><dt>Intervalo</dt><dd>${Math.max(metrics[0].periodSec, result().config.stepSec).toLocaleString('es-AR')} s</dd></dl><button class="btn section-gap" data-action="sensorHistory" data-metric="${metrics[0].clave}">Ver registros</button></article>`;
  }).join('');
}
function sensorsPage() {
  return heading('Estado de sensores', 'Conexión, calidad y última adquisición de cada fuente.') + timeline() + `<div class="quality-grid" id="sourceCards">${sourceCards()}</div>`;
}
function eventsPage() {
  return heading('Alertas', 'Cambios en los indicadores y estado de las fuentes.') + timeline() +
    `<div class="card"><h2>Actividad hasta el momento consultado</h2><label>Tipo<select id="eventFilter"><option value="all">Todos</option><option value="indicator" ${state.eventFilter==='indicator'?'selected':''}>Indicadores</option><option value="technical" ${state.eventFilter==='technical'?'selected':''}>Técnicos</option></select></label><div id="eventList">${eventRows(80)}</div></div>`;
}
function pageContext() {
  return {result: result(), index: state.index, elapsed: state.elapsed, chat: state.chat, activity: state.activity, role: state.role,
    indicators: result()?.indicators || INDICATORS, heading, timeline, readingCard, chartBlock, tableRows};
}
function settingsPage() {
  const tabs = `<div class="settings-tabs" role="group" aria-label="Secciones de configuración"><button class="chip ${state.settingsTab === 'general' ? 'on' : ''}" data-action="settingsTab" data-tab="general" aria-pressed="${state.settingsTab === 'general'}">Preferencias</button><button class="chip ${state.settingsTab === 'simulation' ? 'on' : ''}" data-action="settingsTab" data-tab="simulation" aria-pressed="${state.settingsTab === 'simulation'}">Simulación</button></div>`;
  const general = `<div class="stack"><div class="card"><h2>Accesibilidad</h2><label class="row"><input type="checkbox" id="reduceMotion" ${document.documentElement.dataset.reduced === 'true' ? 'checked' : ''}> Reducir movimiento</label><p class="hint">Se respeta también la preferencia del sistema.</p></div><div class="card"><h2>Historial</h2><p>Los registros se conservan al cerrar y volver a abrir la aplicación.</p>${result() ? `<a class="btn section-gap" href="/api/runs/${result().id}/file">Descargar historial</a>` : '<p class="hint">No hay un historial seleccionado.</p>'}</div></div>`;
  const simulation = state.settingsTab === 'simulation' ? simulationsPage() + (result() ? timeline({controls: true}) : '') +
    `<details class="card sources section-gap"><summary>Acerca de los datos y recursos</summary><div class="stack section-gap"><p>Los valores y las relaciones entre indicadores son sintéticos. Los escenarios y las referencias numéricas permiten probar la aplicación; no tienen validación fisiológica o clínica. Las imágenes son ilustraciones 2D generadas con IA y pendientes de revisión anatómica profesional.</p><p>Las unidades y escalas siguen a SIMISA_entrega: presión sistólica y diastólica en mmHg, densidad ósea en g/cm², sueño en horas y estrés de 0 a 10.</p><p>Los signos vitales y el sueño provienen exclusivamente de sensores; la aplicación no admite cargarlos a mano. El estado de ánimo y el estrés percibido se registran en el chequeo psicológico, que completa el astronauta.</p><p>La interfaz recupera los resultados desde archivos. El simulador independiente puede ejecutarse sin abrir la web. El navegador recuerda solamente la selección y las preferencias.</p><p>El asistente responde mediante consultas locales guiadas. No utiliza un modelo de IA externo. La conexión con equipos, las cuentas con permisos y el enlace con Tierra requieren una integración adicional.</p><p><a href="/assets/PROCEDENCIA.md" target="_blank">Procedencia de las ilustraciones</a> · <a href="/assets/PROMPTS.json" target="_blank">Prompts originales</a></p>
    ${result() ? `<div><h3>Resultado seleccionado</h3><p class="mono identity">${esc(result().id)}<br>${esc(result().engineVersion)} · ${esc(result().catalogVersion)}<br>SHA-256: ${state.envelope.checksum}</p><pre class="run-meta">${esc(JSON.stringify(result().config, null, 2))}</pre></div>` : ''}</div></details>` : '';
  return heading('Configuración', 'Preferencias y administración de datos.') + tabs + (state.settingsTab === 'simulation' ? simulation : general);
}

function render() {
  const content = $('#content');
  const c = pageContext();
  const pages = {inicio: overviewPage, cuerpo: anatomyPage, sueno: () => sleepPage(c), mente: () => wellbeingPage(c),
    graficas: historyPage, sensores: sensorsPage, alertas: eventsPage, asistente: () => assistantPage(c),
    medica: () => medicalPage(c), tierra: () => communication(c), perfiles: () => profiles(c),
    inves: () => researchPage(c), config: settingsPage};
  const needsRun = !['medica', 'config'].includes(state.view);
  const warnings = state.warnings.map(w => `<p class="banner warning" role="alert">${esc(w.file)} · ${esc(w.message)} El archivo original se conserva.</p>`).join('');
  const restricted = state.role === 'Investigador' && !['inves','medica','config','perfiles'].includes(state.view);
  content.innerHTML = `<section><div id="feedback"></div>${warnings}${restricted ? heading('Acceso de investigación', 'Este perfil consulta estadísticas agregadas.', '<button class="btn" data-action="nav" data-view="inves">Abrir investigación</button>') : needsRun && !result() ? heading('Sin registros disponibles', 'Elegí un historial desde Configuración para comenzar.', '<button class="btn primary" data-action="goRuns">Abrir configuración</button>') : pages[state.view]() + (result() ? workflowPanel(c, state.view) : '')}</section>`;
  $('#tbTitle').textContent = NAV.find(n => n[0] === state.view)[1];
  $('#tbCrumb').textContent = result()?.subject.name || 'Monitoreo integral de salud';
  $('#headerTime').textContent = result() ? time(state.elapsed) : '';
  $('#uName').textContent = result()?.subject.name || 'Ana Torres';
  $('#uRole').textContent = state.role;
  document.querySelectorAll('.nav-item').forEach(el => { el.classList.toggle('on', el.dataset.view === state.view); if (el.dataset.view === state.view) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  updatePlayButton(); transformAnatomy(); setupAnatomy();
}
function updateLive() {
  if (!result()) return;
  if ($('#timeReadout')) $('#timeReadout').textContent = time(state.elapsed);
  if ($('#timeSlider')) $('#timeSlider').value = state.elapsed;
  if ($('#headerTime')) $('#headerTime').textContent = time(state.elapsed);
  const readings = $('#readings');
  if (readings) {
    const focusedMetric = readings.contains(document.activeElement) ? document.activeElement.dataset.metric : null;
    readings.innerHTML = readings.dataset.metrics.split(',').map(readingCard).join('');
    if (focusedMetric) readings.querySelector(`[data-metric="${focusedMetric}"]`)?.focus({preventScroll: true});
  }
  if ($('#chartBlock')) $('#chartBlock').innerHTML = chartBlock();
  if ($('#historyRows')) $('#historyRows').innerHTML = tableRows();
  if ($('#eventList')) $('#eventList').innerHTML = eventRows(state.view === 'inicio' ? 5 : 80);
  if ($('#sourceCards')) $('#sourceCards').innerHTML = sourceCards();
  if ($('#researchRows')) $('#researchRows').innerHTML = researchRows(pageContext());
}
function selectMetric(id) {
  if (!metric(id)) return;
  state.metric = id;
  if (state.view === 'cuerpo' && !REGIONS.find(r => r.id === state.region).metrics.includes(id)) {
    state.region = REGIONS.find(r => r.id !== 'cuerpo' && r.metrics.includes(id))?.id || 'cuerpo';
    state.mode = 'detail'; resetZoom(); render();
    return;
  }
  if ($('#metricSelector')) $('#metricSelector').value = id;
  updateLive();
}
function selectRegion(id) {
  const region = REGIONS.find(r => r.id === id);
  if (!region) return;
  state.region = id; state.metric = region.metrics[0]; state.mode = 'detail'; resetZoom();
  if (state.view !== 'cuerpo') navigate('cuerpo'); else render();
}
function setupAnatomy() {
  const stage = $('#anatomyStage');
  if (!stage) return;
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (state.zoom <= 1 || e.target.closest('a')) return;
    drag = {x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY};
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const limit = stage.clientHeight * (state.zoom - 1) / 2;
    state.panX = Math.max(-limit, Math.min(limit, drag.panX + e.clientX - drag.x));
    state.panY = Math.max(-limit, Math.min(limit, drag.panY + e.clientY - drag.y)); transformAnatomy();
  });
  stage.addEventListener('pointerup', () => { drag = null; });
  stage.addEventListener('pointercancel', () => { drag = null; });
  stage.addEventListener('keydown', e => {
    if (e.target !== stage) return;
    if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    if (['+', '='].includes(e.key)) zoomBy(1.2);
    if (e.key === '-') zoomBy(1 / 1.2);
    if (e.key === '0') { resetZoom(); transformAnatomy(); }
    if (state.zoom > 1) {
      const limit = stage.clientHeight * (state.zoom - 1) / 2;
      if (e.key === 'ArrowLeft') state.panX = Math.min(limit, state.panX + 25);
      if (e.key === 'ArrowRight') state.panX = Math.max(-limit, state.panX - 25);
      if (e.key === 'ArrowUp') state.panY = Math.min(limit, state.panY + 25);
      if (e.key === 'ArrowDown') state.panY = Math.max(-limit, state.panY - 25);
      transformAnatomy();
    }
  });
  $('.anatomy-image').addEventListener('error', () => {
    stage.insertAdjacentHTML('beforeend', '<p class="anatomy-failure" role="alert">No se pudo cargar la ilustración. Los resultados siguen disponibles. Volvé al cuerpo completo o comprobá los archivos de imágenes.</p>');
  });
}

async function refreshActivity() {
  state.activity = await api(`/api/runs/${result().id}/activity`);
  state.index = buildIndex(result(), state.activity);
  state.role = state.activity.filter(e=>e.type==='profile').at(-1)?.payload.role || 'Astronauta';
  state.chat = state.activity.filter(e=>e.type==='chat').flatMap(e=>[{author:'user',text:e.payload.question},{author:'assistant',text:e.payload.answer,time:e.observedAt}]);
  const pref=state.activity.filter(e=>e.type==='preferences').at(-1);
  if(pref) document.documentElement.dataset.reduced=String(pref.payload.reducedMotion);
}
async function record(type, payload) {
  await api(`/api/runs/${result().id}/activity`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,payload,elapsedSec:state.elapsed})});
  await refreshActivity();
}
function downloadJSON(value, name) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function ask(question) {
  const text = String(question || '').trim().slice(0, 500);
  if (!text || !result()) return;
  let answer = assistantAnswer(text, {result: result(), index: state.index, elapsed: state.elapsed, observationAt, summarize});
  const personal=state.activity.filter(e=>e.type==='wellbeing'&&e.elapsedSec<=state.elapsed);
  if(/estrés|estres|ánimo|animo|bienestar/i.test(text)){const last=personal.at(-1);if(last)answer+=`\nÚltimo chequeo psicológico: ${last.payload.mood}, estrés percibido ${last.payload.stress}/10 (${last.observedAt}).`;}
  await record('chat', {question:text,answer});
  $('#conversation').innerHTML = chatView(state.chat);
  $('#conversation').scrollTop = $('#conversation').scrollHeight;
  $('#assistantInput').value = ''; $('#assistantInput').focus();
}

document.addEventListener('click', async e => {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  e.preventDefault();
  try {
    switch (button.dataset.action) {
      case 'nav': navigate(button.dataset.view); break;
      case 'menu': $('#sidebar').classList.toggle('open'); syncSidebar(); break;
      case 'goRuns': navigate('simulaciones'); break;
      case 'goBody': navigate('cuerpo'); break;
      case 'settingsTab': state.settingsTab = button.dataset.tab === 'simulation' ? 'simulation' : 'general'; render(); break;
      case 'open': await loadRun(button.dataset.id, 'cuerpo'); notice('Historial cargado.'); break;
      case 'ask': await ask(button.dataset.question); break;
      case 'profile': await record('profile',{role:button.dataset.role}); render(); break;
      case 'prepareReport': await record('report',{}); render(); break;
      case 'dispatchReport': await record('dispatch',{reportId:button.dataset.id}); render(); break;
      case 'downloadReport': {
        const report=state.activity.find(e=>e.id===button.dataset.id&&e.type==='report');
        downloadJSON({report,subject:result().subject,indicators:result().indicators,measurements:result().measurements.filter(r=>r.elapsedSec<=report.elapsedSec),events:result().events.filter(r=>r.elapsedSec<=report.elapsedSec),activity:state.activity.filter(r=>r.elapsedSec<=report.elapsedSec)},'simisa-informe.json'); break;
      }
      case 'ack': await record('acknowledge',{eventId:button.dataset.id}); render(); break;
      case 'sensorHistory': selectMetric(button.dataset.metric); navigate('graficas'); break;
      case 'exportResearch': {
        const blob = new Blob([researchCSV(result(), state.index, state.elapsed)], {type: 'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob), anchor = document.createElement('a');
        anchor.href = url; anchor.download = 'simisa-investigacion.csv'; document.body.append(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000); break;
      }
      case 'refresh': {
        const id = result()?.id;
        await refreshRuns();
        if (id && state.runs.some(r => r.id === id)) await loadRun(id);
        else { pause(); state.envelope = null; state.index = {}; render(); }
        notice('Listado recuperado desde los archivos locales.'); break;
      }
      case 'play': togglePlay(); break;
      case 'begin': pause(); setTime(0); break;
      case 'advance': pause(); setTime(state.elapsed + 60); break;
      case 'episode': {
        pause();
        const event = result().events[0];
        if (event) { selectMetric(event.indicator); setTime(event.elapsedSec); }
        else notice('La ejecución no contiene eventos.');
        break;
      }
      case 'event': pause(); selectMetric(button.dataset.metric); setTime(Number(button.dataset.time)); break;
      case 'metric': selectMetric(button.dataset.metric); break;
      case 'region': selectRegion(button.dataset.region); break;
      case 'fullbody': selectRegion('cuerpo'); break;
      case 'bodyMode': state.mode = state.mode === 'body' ? 'detail' : 'body'; resetZoom(); render(); break;
      case 'zoomIn': zoomBy(1.2); break;
      case 'zoomOut': zoomBy(1 / 1.2); break;
      case 'resetZoom': resetZoom(); transformAnatomy(); break;
    }
  } catch (error) { feedback(error); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'timeSlider') { pause(); setTime(e.target.value); }
  if (e.target.id === 'librarySearch') document.querySelectorAll('[data-library]').forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(e.target.value.toLowerCase());});
});
document.addEventListener('change', async e => {
  try {
    if(e.target.id==='eventFilter'){state.eventFilter=e.target.value;updateLive();}
    if (e.target.id === 'runSelector') await loadRun(e.target.value);
    if (e.target.id === 'metricSelector') selectMetric(e.target.value);
    if (e.target.id === 'speed') { state.speed = Number(e.target.value); preciseTime = state.elapsed; lastPlayback = performance.now(); }
    if (e.target.name === 'scenario') $('#scenarioDescription').textContent = state.meta.scenarios.find(s => s.id === e.target.value).description;
    if (e.target.id === 'reduceMotion') {
      document.documentElement.dataset.reduced = String(e.target.checked);
      try { localStorage.setItem('simisa.files.reducedMotion', String(e.target.checked)); } catch {}
      if(result()) await record('preferences',{reducedMotion:e.target.checked});
    }
  } catch (error) { feedback(error); }
});
document.addEventListener('submit', async e => {
  if (e.target.dataset.workflow) {
    e.preventDefault(); const form=e.target, button=form.querySelector('button');button.disabled=true;
    try { const data=Object.fromEntries(new FormData(form));for(const k of ['stress']) if(k in data)data[k]=Number(data[k]); await record(form.dataset.workflow,data); render(); notice('Registro guardado.'); }catch(error){feedback(error);button.disabled=false;} return;
  }
  if (e.target.id === 'assistantForm') { e.preventDefault(); try{await ask(new FormData(e.target).get('question'));}catch(error){feedback(error);} return; }
  if (e.target.id !== 'simulationForm') return;
  e.preventDefault(); if (state.busy) return;
  const form = e.target, data = Object.fromEntries(new FormData(form));
  for (const key of ['seed', 'durationMinutes', 'stepSec']) data[key] = Number(data[key]);
  data.startTime = `${data.startTime.length === 16 ? data.startTime + ':00' : data.startTime}Z`;
  state.busy = true;
  const submit = form.querySelector('[type=submit]'); submit.disabled = true; submit.textContent = 'Calculando y guardando…';
  try {
    const created = await api('/api/runs', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    await refreshRuns(); await loadRun(created.id, 'cuerpo');
    notice(created.reused ? 'La ejecución idéntica ya estaba guardada. Se recuperó su archivo.' : 'Simulación ejecutada, guardada y leída desde disco.');
  } catch (error) { feedback(error); }
  finally { state.busy = false; if (submit.isConnected) { submit.disabled = false; submit.textContent = 'Ejecutar y guardar'; } }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#sidebar')?.classList.contains('open')) {
    $('#sidebar').classList.remove('open'); syncSidebar(); $('.burger').focus();
  }
});
window.addEventListener('resize', syncSidebar);
setInterval(() => {
  if (!state.playing || !result()) return;
  const now = performance.now();
  preciseTime += Math.min(1, (now - lastPlayback) / 1000) * state.speed; lastPlayback = now;
  const next = Math.min(total(), Math.floor(preciseTime / result().config.stepSec) * result().config.stepSec);
  if (next !== state.elapsed) { state.elapsed = next; updateLive(); }
  if (state.elapsed >= total()) pause();
}, 250);

async function boot() {
  const response = await fetch('/views/lateral.html');
  if (!response.ok) throw new Error('No se pudo cargar la navegación de SIMISA.');
  const lateral = await response.text();
  $('#app').innerHTML = lateral + `<div class="main"><a class="btn skip" href="#content">Saltar al contenido</a><header class="topbar"><button class="icon-btn burger" data-action="menu" aria-label="Abrir menú">☰</button><div><div id="tbTitle" class="tb-title">SIMISA</div><div id="tbCrumb" class="tb-crumb">Monitoreo integral de salud</div></div><div class="tb-right"><time id="headerTime" class="header-time"></time></div></header><main class="content" id="content"></main></div>`;
  $('.logout')?.remove(); $('#uRole').textContent = 'Astronauta · CDR-01';
  $('#nav').innerHTML = NAV.map(([view, label, icon]) => `<button class="nav-item" data-action="nav" data-view="${view}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${ICONOS[icon]}</svg>${label}</button>`).join('');
  syncSidebar();
  try { document.documentElement.dataset.reduced = localStorage.getItem('simisa.files.reducedMotion') || 'false'; } catch {}
  state.meta = await api('/api/meta'); await refreshRuns();
  let view = location.hash.slice(1);
  if (view === 'simulaciones') { view = 'config'; state.settingsTab = 'simulation'; }
  const selected = remembered();
  if (state.runs.length) await loadRun(state.runs.some(r => r.id === selected) ? selected : state.runs[0].id, NAV.some(n => n[0] === view) ? view : 'cuerpo');
  else navigate(view || 'simulaciones');
}
boot().catch(error => {
  $('#app').innerHTML = `<div class="card error-full"><h1>No se pudo abrir SIMISA</h1><p class="error" role="alert">${esc(error.message)}</p><p class="hint">Las ejecuciones guardadas permanecen en sus archivos. Comprobá que la aplicación local esté iniciada y volvé a cargar esta página.</p><a class="btn" href="/">Reintentar</a></div>`;
});
