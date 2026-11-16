import {t, html, getLocale, getLanguage, setLanguage, languageButton} from './i18n.js';
import {REGIONS, INDICATORS, isSensorMetric, hasReference, HISTORY_STEP_SEC} from '/shared/catalog.js';
import {buildIndex, observationAt, summarize} from '/shared/results.js';
import {ICONOS} from './data/navegacion-original.js';
import {escapar as esc} from './core/utilidades.js';
import {formatDuration, formatTimestamp, timeMarkup} from './core/formatos.js';
import {chart} from './chart.js';
import {recordsTable} from './records.js';
import {isShowcase, showcaseFetch} from './showcase.js';
import {crewOf, memberView, activitySubject, hasCrewAccess} from '/shared/crew.js';
import {DEVICES, deviceStatus, DEVICE_STATE, LOW_BATTERY} from '/shared/devices.js';
import {INDICATOR_GUIDE, HAZARDS, RISKS, REGION_FUNCTION, GUIDANCE_LEVEL, GUIDE_DISCLAIMER, guidance} from '/shared/health-guide.js';
import {NAV, CREW_ONLY_VIEWS, REFERENCE_LABEL, SOURCE_LABEL, REGION_NOTE, referenceText, eventLabel, assistantAnswer} from './presentation.js';
import {sleepPage, wellbeingPage, assistantPage, medicalPage, researchPage, researchRows, researchCrewCSV, chatView, crewPage, crewCards} from './sections.js';
import {workflowPanel, communication, profiles} from './workflows.js';

// full: resultado recibido (toda la tripulación o, sin acceso de tripulación, solo la vista propia).
// envelope.result: vista del tripulante consultado (subjectId). allActivity: actividad visible para la sesión.
const state = {view: 'inicio', settingsTab: 'general', chat: [], activity: [], allActivity: [], eventFilter: 'all', meta: null, runs: [], warnings: [], envelope: null,
  full: null, raw: null, me: null, crew: [], roles: {}, subjectId: null, researchMetric: 'all',
  chartWindows: {daily: 'all', vital: '86400'}, historyPage: 0, index: {}, region: 'cuerpo', metric: 'hr', elapsed: 0, playing: false, speed: 60,
  mode: 'detail', zoom: 1, panX: 0, panY: 0, busy: false};
const crewAccess = () => hasCrewAccess(state.me);
const roleName = () => t(state.roles[state.me?.role]?.name || '');
const allowedView = view => crewAccess() || !CREW_ONLY_VIEWS.includes(view);
const QUALITY = {valid: 'Válida', low_quality: 'Baja calidad', invalid: 'Inválida', missing: 'Sin lectura'};
const AVAILABILITY = {available: 'Disponible', disconnected: 'Desconectada', stale: 'Desactualizada', no_data: 'Sin datos'};
let lastPlayback = 0, preciseTime = 0, noticeTimer;
const $ = selector => document.querySelector(selector);
const result = () => state.envelope?.result;
const metric = id => result()?.indicators.find(m => m.clave === (id || state.metric));
const total = () => (result()?.config.durationMinutes || 0) * 60;
// Inicio del historial previo (tiempo negativo) o 0 si la ejecución no tiene historial.
const startSec = () => -(result()?.config.historyDays || 0) * 86400;
const missionInstant = seconds => new Date(Date.parse(result().config.startTime) + seconds * 1000).toISOString();
const stamp = r => formatTimestamp(r.timestamp, {date: r.timestamp.slice(0, 10) !== missionInstant(state.elapsed).slice(0, 10), seconds: r.timestamp.slice(0, 10) === missionInstant(state.elapsed).slice(0, 10)});
const CHART_WINDOWS = [['all', 'Todo'], ['1209600', '14 días'], ['259200', '3 días'], ['86400', '24 h'], ['3600', '1 h']];
const time = seconds => `${formatTimestamp(missionInstant(seconds), {seconds: true})} UTC`;
function updateClockTime() {
  const clock = $('#headerTime');
  if (!clock) return;
  const iso = result() ? missionInstant(state.elapsed) : null;
  clock.textContent = iso ? formatTimestamp(iso, {date: false, seconds: true}) : '';
  if (iso) { clock.dateTime = iso; clock.title = iso; }
  const date = $('#missionDate');
  if (date) date.textContent = iso ? `${formatTimestamp(iso, {time: false, year: true})} UTC` : '';
}
const display = (value, m) => value == null ? '—' : Number(value).toFixed(m.decimals);
const observation = id => observationAt(result(), state.index, id, state.elapsed);

async function api(route, options) {
  let response;
  try { response = await (isShowcase ? showcaseFetch(route, options) : fetch(route, options)); }
  catch { throw new Error(isShowcase ? t('No se pudo conectar con el servicio de simulación. Intentá nuevamente.') : t('No se pudo conectar con el almacenamiento local. Comprobá que SIMISA siga abierto e intentá nuevamente.')); }
  if (response.status === 401) { renderLogin(); throw new Error(t('Identificate como tripulante para continuar.')); }
  let data;
  try { data = await response.json(); }
  catch { throw new Error(response.ok ? t('Respuesta inesperada del servidor.') : html`El servidor respondió ${response.status}.`); }
  if (!response.ok) throw new Error(data.error || t('No se pudo completar la operación.'));
  return data;
}
function notice(message) {
  const el = $('#notice');
  el.textContent = t(message); el.classList.add('on');
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => el.classList.remove('on'), 5000);
}
function feedback(error) {
  const el = $('#feedback');
  if (el) { el.innerHTML = `<p class="error" role="alert">${esc(t(error.message))}</p>`; el.scrollIntoView({block: 'nearest'}); }
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
  state.raw = envelope; state.full = envelope.result; state.allActivity = []; state.elapsed = 0;
  const ids = crewOf(state.full).map(m => m.id);
  state.subjectId = ids.includes(state.subjectId) ? state.subjectId : ids.includes(state.me.id) ? state.me.id : ids[0];
  applyView();
  await refreshActivity();
  state.elapsed = demoStart();
  state.metric = 'hr'; state.region = 'cuerpo'; resetZoom(); remember(id);
  navigate(goTo);
}
/** Vista del tripulante consultado: resultado, actividad, índice y conversación. */
function applyView() {
  if (!state.full) return;
  state.historyPage = 0;
  state.envelope = {...state.raw, result: memberView(state.full, state.subjectId)};
  state.activity = state.allActivity.filter(e => activitySubject(e, state.full) === state.subjectId);
  state.index = buildIndex(result(), state.activity);
  state.chat = state.activity.filter(e=>e.type==='chat').flatMap(e=>[{author:'user',text:e.payload.question},{author:'assistant',text:answerFor(e.payload.question, e.elapsedSec),time:e.observedAt}]);
}
function crewViews() {
  if (!state.full) return [];
  return crewOf(state.full).map(member => {
    const view = memberView(state.full, member.id);
    const activity = state.allActivity.filter(e => activitySubject(e, state.full) === member.id);
    return {member, result: view, index: buildIndex(view, activity), activity};
  });
}
function selectSubject(id, goTo = state.view) {
  if (!crewOf(state.full).some(m => m.id === id) || (!crewAccess() && id !== state.me.id)) return;
  state.subjectId = id; applyView();
  navigate(goTo === 'tripulacion' ? 'inicio' : goTo);
}
/** Momento inicial del reloj de misión: 2 minutos antes del primer evento de la ejecución, o su inicio. */
function demoStart() {
  const first = state.full.events.find(e => e.elapsedSec > 0);
  return first ? Math.max(0, first.elapsedSec - 120) : 0;
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
  if ($('#play')) { $('#play').textContent = state.playing ? t('Pausar') : t('Reproducir'); $('#play').setAttribute('aria-pressed', String(state.playing)); }
  const clock = $('#missionClock');
  if (clock) {
    clock.classList.toggle('playing', state.playing);
    clock.hidden = !result();
    const button = $('#clockPlay');
    button.setAttribute('aria-pressed', String(state.playing));
    button.setAttribute('aria-label', state.playing ? t('Pausar reloj de misión') : t('Reproducir reloj de misión'));
    button.innerHTML = state.playing ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
    $('#clockState').textContent = state.playing ? html`En curso · ${state.speed}×` : state.elapsed < 0 ? t('Historial') : t('En pausa');
  }
}
function setTime(value) {
  state.historyPage = 0;
  state.elapsed = Math.max(startSec(), Math.min(total(), Number(value)));
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
  state.historyPage = 0;
  if (view === 'simulaciones') { view = 'config'; state.settingsTab = 'simulation'; }
  state.view = NAV.some(n => n[0] === view) && allowedView(view) ? view : 'inicio';
  if (state.view === 'config' && !crewAccess()) state.settingsTab = 'general';
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
  if (!controls) return '';
  return html`<div class="card timeline"><div class="row between"><label for="timeSlider" class="hint">${controls ? t('Reloj de misión') : t('Momento consultado')}</label><span class="clock" id="timeReadout">${time(state.elapsed)}</span></div>
    <input id="timeSlider" type="range" min="${startSec()}" max="${total()}" step="${result().config.stepSec}" value="${state.elapsed}" aria-label="Reloj de misión">
    ${controls ? html`<div class="controls"><button class="btn" id="play" data-action="play" aria-pressed="false">Reproducir</button><button class="btn ghost" data-action="begin">Inicio de la ejecución</button>${startSec() < 0 ? html('<button class="btn ghost" data-action="historyStart">Inicio del historial</button>') : ''}<button class="btn ghost" data-action="advance">+1 min</button>
    <label class="row small">Velocidad <select id="speed" aria-label="Velocidad de exploración">${[1, 10, 60].map(v => `<option ${v === state.speed ? 'selected' : ''} value="${v}">${v}×</option>`).join('')}</select></label>
    <button class="btn ghost" data-action="episode">Ir al primer evento</button></div>` : ''}</div>`;
}
function readingCard(id) {
  const m = metric(id), o = observation(id);
  if (!m) return '';
  const valid = o.current, sensor = isSensorMetric(id);
  const tone = valid && hasReference(m) ? o.condition === 'outside' ? 'warn' : 'ok' : 'neutral';
  const status = valid ? !hasReference(m) ? t('Lectura disponible') : o.condition === 'outside' ? t('Fuera de rango') : t('En rango') : sensor ? (o.availability === 'disconnected' ? t('Desconectado') : QUALITY[o.quality]) : t('Sin chequeo');
  const when = valid ? timeMarkup(valid.timestamp, {date: valid.timestamp.slice(0, 10) !== missionInstant(state.elapsed).slice(0, 10)}) : '';
  // Solo se explica lo que no es normal: lectura ausente, calidad baja o chequeo sintético.
  const note = sensor
    ? (!valid ? (o.lastValid ? html`Última válida: ${display(o.lastValid.value, m)} ${esc(t(m.unidad))} · ${esc(stamp(o.lastValid))} UTC` : t('Sin observaciones válidas')) : '')
    : (valid?.synthetic ? t('Historial sintético') : valid ? t('Autoinforme') : t('Sin chequeos registrados'));
  return `<article class="card reading tone-${tone} ${state.metric === id ? 'selected' : ''}"><button class="metric-button" data-action="metric" data-metric="${id}" aria-pressed="${state.metric === id}">
    <div class="reading-top"><h3>${esc(t(m.nombre))}</h3><span class="dot ${tone}" aria-hidden="true"></span></div>
    <div class="kv">${display(valid?.value, m)}<span class="ku">${esc(t(m.unidad))}</span></div>
    <div class="reading-foot"><span class="pill ${tone}">${t(status)}</span><small>${when}</small></div></button>
    ${note ? `<small class="reading-note">${note}</small>` : ''}</article>`;
}
/** Período de la gráfica: se recuerda por separado para indicadores diarios y continuos. */
const windowKey = m => m.periodSec >= 86400 ? 'daily' : 'vital';
const chartFromSec = m => state.chartWindows[windowKey(m)] === 'all' ? startSec()
  : Math.max(startSec(), state.elapsed - Number(state.chartWindows[windowKey(m)]));
function chartBlock() {
  const m = metric(), rows = state.index[m.clave];
  const choice = state.chartWindows[windowKey(m)];
  const fromSec = chartFromSec(m);
  const stats = summarize(result(), state.index, m.clave, state.elapsed, fromSec);
  const windows = startSec() < 0 || total() > 3600 ? html`<label class="inline-select">Período<select id="chartWindow">${CHART_WINDOWS.map(([v, l]) => `<option value="${v}" ${v === choice ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label>` : '';
  return html`<div class="chart-head"><div><h3>${esc(t(m.nombre))}</h3><small class="hint">${esc(referenceText(m))}</small></div>${windows}</div>
    ${chart(rows, {...m, effectivePeriod: Math.max(m.periodSec, result().config.stepSec)}, state.elapsed, {fromSec, startTime: result().config.startTime, width: state.view === 'graficas' ? 900 : 560})}
    <div class="stats"><span>Mín. <strong>${display(stats.min, m)}</strong></span><span>Máx. <strong>${display(stats.max, m)}</strong></span><span>Media <strong>${display(stats.mean, m)}</strong></span><span><strong>${stats.count.toLocaleString(getLocale())}</strong> lecturas válidas</span></div>`;
}
/** Qué hacer ahora con el indicador seleccionado, y por qué importa en el espacio (NASA HRP). */
function guideBlock() {
  const m = metric(), guide = INDICATOR_GUIDE[m.clave];
  if (!guide) return '';
  const g = guidance(m.clave, observation(m.clave), state.index[m.clave] || [], state.elapsed, {sensor: isSensorMetric(m.clave), periodSec: m.periodSec});
  const level = GUIDANCE_LEVEL[g.level];
  const link = (item, cls = '') => `<a class="${cls}" href="${item.url}" target="_blank" rel="noreferrer">${esc(t(item.name))}</a>`;
  return html`<div class="guide-head"><div><div class="eyebrow">Qué hacer ahora</div><h3>${esc(t(m.nombre))}</h3></div><span class="pill ${level.tone}">${t(level.label)}</span></div>
    <ol class="guide-steps">${g.steps.map(s => `<li>${esc(t(s))}</li>`).join('')}</ol>
    <details class="guide-more"><summary>Por qué se mide en el espacio</summary>
      <p>${esc(t(guide.why))}</p><p class="hint"><strong>Cómo se mide:</strong> ${esc(t(guide.measure))}</p>
      <div class="hazard-chips"><span class="hint">Peligros relacionados:</span>${guide.hazards.map(h => link(HAZARDS[h], 'chip-link')).join('')}</div>
      <ul class="risk-list">${guide.risks.map(r => `<li>${link(RISKS[r])}: ${esc(t(RISKS[r].text))}</li>`).join('')}</ul></details>
    <p class="hint guide-source">${t(GUIDE_DISCLAIMER)}</p>`;
}
function metricSelector() {
  return html`<label class="inline-select section-toolbar">Indicador<select id="metricSelector">${result().indicators.map(m => `<option value="${m.clave}" ${m.clave === state.metric ? 'selected' : ''}>${esc(t(m.nombre))} · ${esc(t(m.unidad))}</option>`).join('')}</select></label>`;
}
function eventRows(limit = 40, all = false) {
  const events = result().events.filter(e => (all || e.elapsedSec <= state.elapsed) && (state.eventFilter === 'all' || e.type === state.eventFilter)).slice(-limit).reverse();
  return events.length ? events.map(e => html`<div class="event-item"><div><span class="tag ${e.type === 'technical' ? 'info' : e.state === 'outside' ? 'warn' : 'ok'}">${e.type === 'technical' ? t('Técnico') : t('Indicador')}</span>
    <p>${esc(t(metric(e.indicator).nombre))} · ${esc(eventLabel(e))}</p><small>${timeMarkup(e.timestamp)}</small></div>
    <div class="row"><button class="btn ghost" data-action="event" data-time="${e.elapsedSec}" data-metric="${e.indicator}">Explorar momento</button>${state.activity.some(a=>a.type==='acknowledge'&&a.payload.eventId===e.id)?html('<span class="tag info">Revisada</span>'):html`<button class="btn" data-action="ack" data-id="${esc(e.id)}">Marcar revisada</button>`}</div></div>`).join('') : html('<p class="empty">Sin eventos registrados hasta la hora de misión.</p>');
}
function historyTable() {
  const table = recordsTable({rows: state.index[state.metric] || [], metric: metric(),
    elapsedSec: state.elapsed, fromSec: chartFromSec(metric()), page: state.historyPage, referenceTime: missionInstant(state.elapsed)});
  state.historyPage = table.page;
  return table.html;
}
function simulationsPage() {
  const d = state.meta.defaults;
  return html`<div class="row between section-toolbar"><h2>Simulación</h2><button class="btn ghost" data-action="refresh">${isShowcase ? t('Actualizar lista') : t('Actualizar archivos')}</button></div>` +
    html`<div class="two-columns"><form id="simulationForm" class="card"><h2>Nueva simulación</h2><p class="csub">Una semilla y configuración idénticas producen el mismo resultado. ${isShowcase ? t('Los resultados nuevos permanecen en esta pestaña hasta recargarla.') : t('El guardado se verifica antes de abrirlo.')}</p>
    <div class="form-grid"><label class="span-two">Nombre de la ejecución<input name="name" value="${esc(t(d.name))}" maxlength="80" required></label>
    <label class="span-two">Escenario<select name="scenario">${state.meta.scenarios.map(s => `<option value="${s.id}" ${s.id === d.scenario ? 'selected' : ''}>${esc(t(s.name))}</option>`).join('')}</select></label>
    <p class="hint span-two" id="scenarioDescription">${esc(t(state.meta.scenarios.find(s => s.id === d.scenario).description))}</p>
    <label>Semilla<input type="number" name="seed" min="0" max="4294967295" step="1" value="${d.seed}" required></label>
    <label>Duración (min)<input type="number" name="durationMinutes" min="1" max="1440" step="1" value="${d.durationMinutes}" required></label>
    <label>Historial previo (días)<input type="number" name="historyDays" min="0" max="30" step="1" value="${d.historyDays || 14}" required></label>
    <label>Paso del reloj<select name="stepSec">${[5, 10, 30, 60].map(n => `<option value="${n}" ${n === d.stepSec ? 'selected' : ''}>${formatDuration(n)}</option>`).join('')}</select></label>
    <label>Inicio (UTC)<input name="startTime" type="datetime-local" step="1" value="${d.startTime.slice(0, 19)}" required></label></div>
    <div class="form-footer"><button type="submit" class="btn primary" ${state.busy ? 'disabled' : ''}>${state.busy ? t('Calculando…') : isShowcase ? t('Ejecutar simulación') : t('Ejecutar y guardar')}</button><p class="hint">Las fuentes mantienen sus frecuencias propias. Hueso y sueño no se convierten en señales continuas. El estrés percibido no se simula: proviene del chequeo psicológico.</p></div></form>
    <div class="card"><div class="row between"><h2>${isShowcase ? t('Resultados disponibles') : t('Resultados guardados')}</h2><span class="tag cyan">${state.runs.length} archivos</span></div><p class="hint">${isShowcase ? t('Historiales incluidos y simulaciones creadas en esta pestaña.') : t('Se leen desde disco. También aparecen las ejecuciones creadas con el simulador independiente.')}</p>
    <div class="run-list">${state.runs.length ? state.runs.map(r => html`<article class="run-item ${result()?.id === r.id ? 'selected' : ''}"><h3>${esc(r.config.name)}</h3><div class="run-meta">${esc(t(state.meta.scenarios.find(s => s.id === r.config.scenario)?.name || r.config.scenario))} · Semilla ${r.config.seed}<br>${r.config.durationMinutes} min · ${r.count.toLocaleString(getLocale())} registros · ${r.eventCount} eventos<br><span class="mono">${r.id}</span></div><div class="row"><button class="btn" data-action="open" data-id="${r.id}">Explorar anatomía</button><a class="btn ghost" href="/api/runs/${r.id}/file">Descargar JSON</a></div></article>`).join('') : html('<p class="empty">Todavía no hay simulaciones. Creá la primera con el formulario.</p>')}</div></div></div>`;
}
function anatomyPage() {
  const region = REGIONS.find(r => r.id === state.region);
  const metrics = region.metrics.filter(id => metric(id));
  const full = state.region === 'cuerpo' || state.mode === 'body';
  const image = full ? 'cuerpo-holografico-v2.png' : region.image;
  const hotspots = [['cabeza', 512, 105, 70, t('Cabeza')], ['pulmones', 414, 324, 65, t('Pulmones')],
    ['pecho', 562, 398, 49, t('Corazón')], ['abdomen', 512, 613, 86, 'Abdomen'], ['huesos', 568, 1050, 76, t('Huesos')]];
  return heading(t('Salud corporal'), state.subjectId === state.me.id ? t('Explorá tus indicadores por región.') : html`Indicadores de ${esc(result().subject.name)} por región.`) +
    html`<div class="region-list" role="group" aria-label="Regiones anatómicas">${REGIONS.map(r => `<button class="chip ${r.id === state.region ? 'on' : ''}" data-action="region" data-region="${r.id}" aria-pressed="${r.id === state.region}">${t(r.name)}</button>`).join('')}</div>
    <div class="explorer-layout"><div class="stack anatomy-column"><div class="card anatomy-card"><div class="anatomy-toolbar"><strong>${t(region.name)}</strong><div class="row"><button class="btn ghost" data-action="bodyMode" ${state.region === 'cuerpo' ? 'disabled' : ''}>${state.mode === 'body' ? t('Ver detalle') : t('En el cuerpo')}</button></div></div>
    <div class="anatomy-stage" id="anatomyStage" tabindex="0" role="group" aria-label="Vista anatómica. Usá más y menos para zoom, flechas para desplazar, cero para restablecer.">
    <div class="anatomy-transform"><img class="anatomy-image ${full ? '' : 'detail'}" src="/assets/${image}" alt="Vista anatómica: ${t(region.name)}." draggable="false">
    ${full ? html`<svg class="body-map" viewBox="0 0 1024 1536" aria-label="Regiones del cuerpo">${hotspots.map(([id, x, y, r, name]) => html`<a href="#cuerpo" data-action="region" data-region="${id}" aria-label="Explorar ${name}"><circle class="${id === state.region ? 'selected' : ''}" cx="${x}" cy="${y}" r="${r}"/><text x="${x + r + 14}" y="${y + 5}">${name}</text></a>`).join('')}</svg>` : ''}</div></div>
    <div class="row between anatomy-toolbar"><button class="btn ghost" data-action="fullbody">Cuerpo completo</button><div class="row"><button class="btn ghost" data-action="zoomOut" aria-label="Alejar anatomía">−</button><span class="hint" id="zoomLabel">100 %</span><button class="btn ghost" data-action="zoomIn" aria-label="Acercar anatomía">+</button><button class="btn ghost" data-action="resetZoom">Restablecer</button></div></div>
    <div class="anatomy-footer">Arrastrá para desplazar al ampliar. Usá + y − para acercar o alejar, y 0 para restablecer.</div></div>
    <div class="card guide-card" id="guideBlock">${guideBlock()}</div></div>
    <div class="stack"><div><div class="eyebrow">${t(region.name)}</div><p class="region-function">${esc(t(REGION_FUNCTION[region.id] || ''))}</p><p class="hint">${t(REGION_NOTE[region.id])}</p></div><div class="kpi-grid" id="readings" data-metrics="${metrics.join(',')}">${metrics.map(readingCard).join('')}</div><div class="card" id="chartBlock">${chartBlock()}</div></div></div>` + timeline();
}
function overviewPage() {
  const own = state.subjectId === state.me.id;
  return heading(t('Panel general'), own ? t('Tus indicadores y los cambios más recientes.') : html`Indicadores de ${esc(result().subject.name)} y sus cambios más recientes.`, html('<button class="btn primary" data-action="goBody">Explorar el cuerpo</button>')) +
    `<div class="kpi-grid overview-metrics" id="readings" data-metrics="${result().indicators.map(m => m.clave).join(',')}">${result().indicators.map(m => readingCard(m.clave)).join('')}</div>` + timeline() +
    html`<div class="two-columns dashboard-split section-gap"><div class="stack"><div class="card" id="chartBlock">${chartBlock()}</div><div class="card guide-card" id="guideBlock">${guideBlock()}</div></div><div class="card"><div class="row between"><h2>Últimos eventos</h2>${allowedView('alertas') ? html('<button class="btn ghost small-btn" data-action="nav" data-view="alertas">Ver todos</button>') : ''}</div><div id="eventList">${eventRows(3)}</div></div></div>`;
}
function historyPage() {
  return heading(t('Gráficas e historial'), t('Consultá la evolución y el detalle de tus mediciones.')) + metricSelector() + timeline() +
    html`<div class="stack"><div class="card" id="chartBlock">${chartBlock()}</div><div class="card guide-card" id="guideBlock">${guideBlock()}</div><div class="card"><div class="row between"><h2>Últimos registros</h2><a class="btn ghost" href="/api/runs/${result().id}/file">Descargar historial</a></div><div id="historyBlock">${historyTable()}</div></div></div>`;
}
/** "hace 4 s", "hace 2 h 14 min", "hace 3 días": antigüedad respecto de la hora de misión. */
function ago(sec) {
  if (sec < 5) return t('ahora');
  return html`hace ${formatDuration(sec)}`;
}
const meter = (value, tone) => value == null ? '<span class="hint">—</span>' : `<div class="meter ${tone}"><span style="width:${value}%"></span></div><small>${value} %</small>`;
const toneOf = v => v == null ? 'neutral' : v < 10 ? 'bad' : v < LOW_BATTERY ? 'warn' : v < 50 ? 'mid' : 'ok';
function sensorPanel() {
  const devices = deviceStatus(result(), state.index, state.elapsed);
  const count = s => devices.filter(d => s.includes(d.state)).length;
  const lowBattery = devices.filter(d => d.battery != null && d.battery < LOW_BATTERY).length;
  const issues = devices.flatMap(d => d.issues.map(i => ({...i, device: d})))
    .sort((a, b) => (a.level === 'bad' ? 0 : 1) - (b.level === 'bad' ? 0 : 1));
  const kpi = (label, value, note, tone) => `<div class="card sensor-kpi tone-${tone}"><small>${label}</small><b>${value}</b><span>${note}</span></div>`;
  const rows = devices.map(d => {
    // Último dato útil: la última lectura válida (una muestra vacía de desconexión no cuenta).
    const st = DEVICE_STATE[d.state], latest = d.observation.lastValid || d.latest;
    const extra = d.metrics.map(m => m.nombre).filter(n => n !== d.device.type);
    const flag = d.issues.length ? `<span class="dot ${d.issues.some(i => i.level === 'bad') ? 'bad' : 'warn'}" title="${esc(d.issues.map(i => t(i.text)).join(' '))}"></span>` : '';
    const interval = Math.max(d.metrics[0].periodSec, d.latest?.elapsedSec < 0 ? HISTORY_STEP_SEC : result().config.stepSec);
    return html`<tr class="${d.issues.length ? 'has-issue' : ''}"><td><div class="device-name">${flag}<div><b>${esc(t(d.device.name))}</b><small>${esc(t(d.device.type))}${extra.length ? ' · ' + extra.map(value => esc(t(value))).join(', ') : ''}</small><small>Cada ${formatDuration(interval)}</small></div></div></td>
      <td><span class="pill ${st.tone === 'bad' ? 'bad' : st.tone}">${t(st.text)}</span></td>
      <td class="time-cell"><span>${latest ? ago(state.elapsed - latest.elapsedSec) : '—'}</span><small class="block-hint">${latest ? timeMarkup(latest.timestamp) : ''}</small></td>
      <td class="meter-cell">${meter(d.quality, d.quality == null ? 'neutral' : d.quality < 60 ? 'bad' : d.quality < 80 ? 'warn' : 'ok')}</td>
      <td class="meter-cell">${meter(d.battery, toneOf(d.battery))}</td>
      <td><button class="btn ghost small-btn" data-action="sensorHistory" data-metric="${d.metrics[0].clave}">Registros</button></td></tr>`;
  }).join('');
  return html`<div class="sensor-kpis">${kpi(t('Dispositivos'), devices.length, t('En el inventario'), 'neutral')}${kpi(t('Conectados'), count(['ok']), t('Transmitiendo ahora'), 'ok')}${kpi(t('Con advertencias'), count(['stale', 'low']) + lowBattery, t('Señal débil, datos viejos o batería baja'), 'warn')}${kpi(t('Sin señal'), count(['off', 'nodata', 'invalid']), t('Requieren revisión'), 'bad')}</div>
    <div class="card section-gap issues-card ${issues.length ? 'has-issues' : ''}"><div class="row between"><h2>Posibles problemas</h2><span class="pill ${issues.length ? 'warn' : 'ok'}">${issues.length ? `${issues.length} ${t(issues.length === 1 ? 'detectado' : 'detectados')}` : t('Sin problemas')}</span></div>
      ${issues.length ? `<ul class="issue-list">${issues.map(i => `<li class="${i.level}"><b>${esc(t(i.device.device.name))}</b><span>${esc(t(i.text))}</span></li>`).join('')}</ul>` : html('<p class="hint">Todos los dispositivos transmiten con buena calidad de señal y batería suficiente.</p>')}</div>
    <div class="card section-gap"><h2>Inventario de dispositivos</h2><p class="hint">Calidad: lecturas válidas entre las últimas 12 de cada dispositivo. Batería: estimación simulada con recarga diaria.</p>
      <div class="table-scroll section-gap"><table class="device-table"><thead><tr><th>Dispositivo</th><th>Estado</th><th>Último dato</th><th>Calidad de señal</th><th>Batería</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function sensorsPage() {
  return heading(t('Estado de sensores'), state.subjectId === state.me.id ? t('Tus dispositivos: conexión, calidad de señal y batería.') : html`Dispositivos de ${esc(result().subject.name)}: conexión, calidad de señal y batería.`) + `<div id="sensorPanel">${sensorPanel()}</div>`;
}
function eventsPage() {
  return heading(t('Alertas'), t('Cambios en los indicadores y estado de las fuentes.')) + timeline() +
    html`<div class="card"><div class="row between"><h2>Eventos registrados</h2><label class="inline-select">Tipo<select id="eventFilter"><option value="all">Todos</option><option value="indicator" ${state.eventFilter==='indicator'?'selected':''}>Indicadores</option><option value="technical" ${state.eventFilter==='technical'?'selected':''}>Técnicos</option></select></label></div><div id="eventList">${eventRows(80)}</div></div>`;
}
function pageContext() {
  return {result: result(), index: state.index, elapsed: state.elapsed, chat: state.chat, activity: state.activity,
    me: state.me, subject: result()?.subject, roleName: roleName(), crewAccess: crewAccess(), roles: state.roles, showcase: isShowcase,
    crew: state.full ? crewOf(state.full) : [state.me], crewViews, researchMetric: state.researchMetric, observationAt, isSensorMetric, time,
    indicators: result()?.indicators || INDICATORS, heading, timeline, readingCard, chartBlock, historyTable};
}
function settingsPage() {
  const tabs = crewAccess() ? html`<div class="settings-tabs" role="group" aria-label="Secciones de configuración"><button class="chip ${state.settingsTab === 'general' ? 'on' : ''}" data-action="settingsTab" data-tab="general" aria-pressed="${state.settingsTab === 'general'}">Preferencias</button><button class="chip ${state.settingsTab === 'simulation' ? 'on' : ''}" data-action="settingsTab" data-tab="simulation" aria-pressed="${state.settingsTab === 'simulation'}">Simulación</button></div>` : '';
  const general = html`<div class="stack"><div class="card"><h2>Accesibilidad</h2><label class="row"><input type="checkbox" id="reduceMotion" ${document.documentElement.dataset.reduced === 'true' ? 'checked' : ''}> Reducir movimiento</label><p class="hint">Se respeta también la preferencia del sistema.</p></div><div class="card"><h2>Historial</h2><p>${isShowcase ? t('Los historiales incluidos están siempre disponibles. Las simulaciones y acciones nuevas se reinician al recargar esta pestaña; podés descargarlas antes.') : t('Los registros se conservan al cerrar y volver a abrir la aplicación.')}</p>${result() ? html`<a class="btn section-gap" href="/api/runs/${result().id}/file">Descargar historial</a>` : html('<p class="hint">No hay un historial seleccionado.</p>')}</div></div>`;
  const simulation = state.settingsTab === 'simulation' ? simulationsPage() + (result() ? timeline({controls: true}) : '') +
    html`<details class="card sources section-gap"><summary>Acerca de los datos y recursos</summary><div class="stack section-gap"><p>Los valores y las relaciones entre indicadores son sintéticos. Los escenarios y las referencias numéricas permiten probar la aplicación; no tienen validación fisiológica o clínica. Las imágenes son ilustraciones 2D generadas con IA y pendientes de revisión anatómica profesional.</p><p>Las unidades y escalas siguen a SIMISA_entrega: presión sistólica y diastólica en mmHg, densidad ósea en g/cm², sueño en horas y estrés de 0 a 10.</p><p>Los signos vitales y el sueño provienen exclusivamente de sensores; la aplicación no admite cargarlos a mano. El estado de ánimo y el estrés percibido se registran en el chequeo psicológico, que completa el astronauta.</p><p>${isShowcase ? t('Esta web de muestra incluye historiales ficticios. Las nuevas simulaciones, chequeos e informes se mantienen solo en la memoria de la pestaña y se reinician al recargar. No hay autenticación real ni almacenamiento remoto.') : t('La interfaz recupera los resultados desde archivos. El simulador independiente puede ejecutarse sin abrir la web. El navegador recuerda solamente la selección y las preferencias.')}</p><p>El asistente responde mediante consultas locales guiadas. No utiliza un modelo de IA externo. La conexión con equipos, las cuentas con permisos y el enlace con Tierra requieren una integración adicional.</p><p><a href="/docs/${getLanguage()}/${getLanguage() === 'en' ? 'illustration-provenance.md' : 'procedencia-ilustraciones.md'}" target="_blank">Procedencia de las ilustraciones</a> · <a href="/assets/PROMPTS.json" target="_blank">Prompts originales</a></p>
    <p>El dosímetro personal registra tasa de dosis en µSv/h y se agrupa en Abdomen como categoría de navegación. Las nuevas simulaciones usan como escala de exposición el perfil ISS/LEO: 0,4–1,1 mSv/día, equivalente a medias de 16,67–45,83 µSv/h. La variación por semilla, día y tripulante es sintética, sin predicción orbital ni de exposición lunar. No se calcula dosis acumulada ni riesgo individual. Los 100 mSv son contexto epidemiológico de dosis, no un umbral anual automático. Las fuentes y su alcance se explican en Información médica.</p>
    ${result() ? html`<div><h3>Resultado seleccionado</h3><p class="mono identity">${esc(result().id)}<br>${esc(result().engineVersion)} · ${esc(result().catalogVersion)}<br>SHA-256: ${state.envelope.checksum}</p><pre class="run-meta">${esc(JSON.stringify(result().config, null, 2))}</pre></div>` : ''}</div></details>` : '';
  const documentation = html`<div class="card section-gap"><h2>Documentación</h2><p class="hint">Guías y referencias, organizadas por idioma.</p><div class="row section-gap"><a class="btn" href="/docs/en/README.md" lang="en" target="_blank" rel="noreferrer">English</a><a class="btn" href="/docs/es/README.md" lang="es" target="_blank" rel="noreferrer">Español</a></div></div>`;
  return heading(t('Configuración'), t('Preferencias y administración de datos.')) + tabs + (state.settingsTab === 'simulation' ? simulation : general + documentation);
}

function render() {
  const content = $('#content');
  const c = pageContext();
  const pages = {tripulacion: () => crewPage(c), inicio: overviewPage, cuerpo: anatomyPage, sueno: () => sleepPage(c), mente: () => wellbeingPage(c),
    graficas: historyPage, sensores: sensorsPage, alertas: eventsPage, asistente: () => assistantPage(c),
    medica: () => medicalPage(c), tierra: () => communication(c), perfiles: () => profiles(c),
    inves: () => researchPage(c), config: settingsPage};
  const needsRun = !['medica', 'config'].includes(state.view);
  const warnings = state.warnings.map(w => html`<p class="banner warning" role="alert">${esc(w.file)} · ${esc(w.message)} El archivo original se conserva.</p>`).join('');
  const empty = crewAccess() ? heading(t('Sin registros disponibles'), t('Elegí un historial desde Configuración para comenzar.'), html('<button class="btn primary" data-action="goRuns">Abrir configuración</button>'))
    : heading(t('Sin registros disponibles'), t('Todavía no hay una ejecución con tus registros. Pedí al comandante o a la médica que inicien una simulación.'));
  content.innerHTML = `<section><div id="feedback"></div>${crewAccess() ? warnings : ''}${needsRun && !result() ? empty : pages[state.view]() + (result() ? workflowPanel(c, state.view) : '')}</section>`;
  $('#tbTitle').textContent = t(NAV.find(n => n[0] === state.view)[1]);
  const subject = result()?.subject;
  $('#tbCrumb').textContent = !subject ? t('Monitoreo integral de salud') : state.view === 'tripulacion' ? html`${crewOf(state.full).length} tripulantes` : subject.id === state.me.id ? html`${subject.name} · tus datos` : html`Consultando a ${subject.name}`;
  updateClockTime();
  updatePlayButton();
  const picker = $('#subjectPicker');
  if (picker) picker.innerHTML = crewAccess() && state.full ? html`<label class="row small">Tripulante <select id="subjectSelector" aria-label="Tripulante consultado">${crewOf(state.full).map(m => `<option value="${esc(m.id)}" ${m.id === state.subjectId ? 'selected' : ''}>${esc(m.code)} · ${esc(m.name)}${m.id === state.me.id ? t(' (vos)') : ''}</option>`).join('')}</select></label>` : '';
  document.querySelectorAll('.nav-item').forEach(el => { el.hidden = !allowedView(el.dataset.view); });
  document.querySelectorAll('.nav-item').forEach(el => { el.classList.toggle('on', el.dataset.view === state.view); if (el.dataset.view === state.view) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  updatePlayButton(); transformAnatomy(); setupAnatomy();
}
function updateLive() {
  if (!result()) return;
  if ($('#timeReadout')) $('#timeReadout').textContent = time(state.elapsed);
  if ($('#timeSlider')) $('#timeSlider').value = state.elapsed;
  updateClockTime();
  if ($('#clockState') && !state.playing) $('#clockState').textContent = state.elapsed < 0 ? t('Historial') : t('En pausa');
  const readings = $('#readings');
  if (readings) {
    const focusedMetric = readings.contains(document.activeElement) ? document.activeElement.dataset.metric : null;
    readings.innerHTML = readings.dataset.metrics.split(',').map(readingCard).join('');
    if (focusedMetric) readings.querySelector(`[data-metric="${focusedMetric}"]`)?.focus({preventScroll: true});
  }
  if ($('#chartBlock')) $('#chartBlock').innerHTML = chartBlock();
  if ($('#guideBlock')) { const open = $('#guideBlock details')?.open; $('#guideBlock').innerHTML = guideBlock(); if (open) $('#guideBlock details').open = true; }
  if ($('#historyBlock')) {
    const focus = $('#historyBlock').contains(document.activeElement) ? document.activeElement.id : null;
    $('#historyBlock').innerHTML = historyTable();
    if (focus) {
      const control = document.getElementById(focus);
      (control && !control.disabled ? control : $('#historyPageNumber'))?.focus({preventScroll: true});
    }
  }
  if ($('#eventList')) $('#eventList').innerHTML = eventRows(state.view === 'inicio' ? 3 : 80);
  if ($('#sensorPanel')) $('#sensorPanel').innerHTML = sensorPanel();
  if ($('#researchRows')) $('#researchRows').innerHTML = researchRows(pageContext());
  if ($('#crewGrid')) $('#crewGrid').innerHTML = crewCards(pageContext());
}
function selectMetric(id) {
  if (!metric(id)) return;
  state.historyPage = 0;
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
    stage.insertAdjacentHTML('beforeend', html('<p class="anatomy-failure" role="alert">No se pudo cargar la ilustración. Los resultados siguen disponibles. Volvé al cuerpo completo o comprobá los archivos de imágenes.</p>'));
  });
}

async function refreshActivity() {
  state.allActivity = await api(`/api/runs/${result().id}/activity`);
  applyView();
  const pref=state.allActivity.filter(e=>e.type==='preferences'&&activitySubject(e, state.full)===state.me.id).at(-1);
  if(pref) document.documentElement.dataset.reduced=String(pref.payload.reducedMotion);
}
async function record(type, payload, subjectId = state.subjectId) {
  await api(`/api/runs/${result().id}/activity`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,payload,subjectId,elapsedSec:state.elapsed})});
  await refreshActivity();
}
function downloadJSON(value, name) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function ask(question) {
  const text = String(question || '').trim().slice(0, 500);
  if (!text || !result()) return;
  const answer = answerFor(text);
  await record('chat', {question:text,answer});
  $('#conversation').innerHTML = chatView(state.chat);
  $('#conversation').scrollTop = $('#conversation').scrollHeight;
  $('#assistantInput').value = ''; $('#assistantInput').focus();
}

function answerFor(question, elapsed = state.elapsed) {
  let answer = assistantAnswer(question, {result: result(), index: state.index, elapsed, observationAt, summarize});
  if (/estrés|estres|ánimo|animo|bienestar|stress|mood|wellbeing/i.test(question)) {
    const last = (state.index.stress || []).filter(row => row.elapsedSec <= elapsed).at(-1);
    if (last) answer += html`\nÚltimo chequeo psicológico: ${t(last.mood)}, estrés percibido ${last.value}/10 (${last.timestamp}).`;
  }
  return answer;
}

function renderNavigation() {
  $('#nav').innerHTML = NAV.map(([view, label, icon]) => `<button class="nav-item" data-action="nav" data-view="${view}" ${allowedView(view) ? '' : 'hidden'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${ICONOS[icon]}</svg>${t(label)}</button>`).join('');
}
function updateLanguageChrome() {
  $('#languageControl').innerHTML = languageButton();
  $('#sidebar .brand-txt small').textContent = t('Monitoreo de salud');
  $('#sidebar .nav-label').textContent = t('Principal');
  $('#uRole').textContent = `${roleName()} · ${state.me.code}`;
  $('.logout').title = t('Cambiar de tripulante');
  $('.logout').setAttribute('aria-label', t('Cambiar de tripulante'));
  $('.skip').textContent = t('Saltar al contenido');
  $('.burger').setAttribute('aria-label', t('Abrir menú'));
  $('#headerTime').setAttribute('aria-label', t('Hora de misión'));
  renderNavigation();
}
async function switchLanguage() {
  if (state.busy) return;
  setLanguage(getLanguage() === 'en' ? 'es' : 'en');
  if (!state.me || !$('#content')) {
    await renderLogin();
    $('.language-toggle')?.focus({preventScroll: true});
    return;
  }
  const content = $('#content'), scroll = content.scrollTop;
  const drafts = [...content.querySelectorAll('input, select, textarea')].map(control => ({
    id: control.id, name: control.name, value: control.value, checked: control.checked
  }));
  const expanded = [...content.querySelectorAll('details')].map(detail => detail.open);
  updateLanguageChrome();
  const page = state.historyPage;
  if (result()) applyView();
  state.historyPage = page;
  render();
  for (const draft of drafts) {
    const control = draft.id ? document.getElementById(draft.id) : [...content.querySelectorAll('[name]')].find(el => el.name === draft.name);
    if (control) { control.value = draft.value; control.checked = draft.checked; }
  }
  content.querySelectorAll('details').forEach((detail, index) => { detail.open = expanded[index] || false; });
  const scenario = content.querySelector('[name="scenario"]');
  if (scenario) $('#scenarioDescription').textContent = t(state.meta.scenarios.find(item => item.id === scenario.value).description);
  const search = $('#librarySearch');
  if (search?.value) search.dispatchEvent(new Event('input', {bubbles: true}));
  content.scrollTop = scroll;
  $('#notice').classList.remove('on');
  $('.language-toggle').focus({preventScroll: true});
}

document.addEventListener('click', async e => {
  const fileLink = isShowcase && e.target.closest('a[href^="/api/runs/"][href$="/file"]');
  if (fileLink) {
    e.preventDefault();
    try { downloadJSON(await api(new URL(fileLink.href).pathname), 'simisa-historial.json'); }
    catch (error) { feedback(error); }
    return;
  }
  const button = e.target.closest('[data-action]');
  if (!button) return;
  e.preventDefault();
  try {
    switch (button.dataset.action) {
      case 'language': await switchLanguage(); break;
      case 'nav': navigate(button.dataset.view); break;
      case 'menu': $('#sidebar').classList.toggle('open'); syncSidebar(); break;
      case 'goRuns': navigate('simulaciones'); break;
      case 'goBody': navigate('cuerpo'); break;
      case 'settingsTab': state.settingsTab = button.dataset.tab === 'simulation' && crewAccess() ? 'simulation' : 'general'; render(); break;
      case 'open': await loadRun(button.dataset.id, 'tripulacion'); notice(t('Historial cargado.')); break;
      case 'ask': await ask(button.dataset.question); break;
      case 'viewMember': selectSubject(button.dataset.id, button.dataset.go || 'inicio'); break;
      case 'pickLogin': loginPick = button.dataset.id; await renderLogin(); break;
      case 'login': await login(button.dataset.id); break;
      case 'logout': case 'cerrar-sesion': await api('/api/session', {method: 'DELETE'}); location.hash = ''; location.reload(); break;
      case 'prepareReport': await record('report',{}); render(); break;
      case 'dispatchReport': await record('dispatch',{reportId:button.dataset.id}); render(); break;
      case 'downloadReport': {
        const report=state.activity.find(e=>e.id===button.dataset.id&&e.type==='report');
        if (!report || !result()) { notice(t('El informe ya no está disponible. Actualizá los archivos.')); break; }
        // Solo mediciones de sensores: el estrés proviene de los chequeos (incluidos en activity), no de la telemetría.
        downloadJSON({report,subject:result().subject,indicators:result().indicators,measurements:result().measurements.filter(r=>r.elapsedSec<=report.elapsedSec&&isSensorMetric(r.indicator)),events:result().events.filter(r=>r.elapsedSec<=report.elapsedSec),activity:state.activity.filter(r=>r.elapsedSec<=report.elapsedSec)},'simisa-informe.json'); break;
      }
      case 'ack': await record('acknowledge',{eventId:button.dataset.id}); render(); break;
      case 'sensorHistory': selectMetric(button.dataset.metric); navigate('graficas'); break;
      case 'historyPage': pause(); state.historyPage = Number(button.dataset.page); updateLive(); break;
      case 'exportResearch': {
        const blob = new Blob([researchCrewCSV(crewViews(), state.elapsed)], {type: 'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob), anchor = document.createElement('a');
        anchor.href = url; anchor.download = 'simisa-investigacion.csv'; document.body.append(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000); break;
      }
      case 'refresh': {
        const id = result()?.id;
        await refreshRuns();
        if (id && state.runs.some(r => r.id === id)) await loadRun(id);
        else { pause(); state.envelope = null; state.index = {}; render(); }
        notice(isShowcase ? t('Lista de resultados actualizada.') : t('Listado recuperado desde los archivos locales.')); break;
      }
      case 'play': togglePlay(); break;
      case 'begin': pause(); setTime(0); break;
      case 'historyStart': pause(); setTime(startSec()); break;
      case 'advance': pause(); setTime(state.elapsed + 60); break;
      case 'episode': {
        pause();
        const event = result().events[0];
        if (event) { selectMetric(event.indicator); setTime(event.elapsedSec); }
        else notice(t('La ejecución no contiene eventos.'));
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
    if (e.target.id === 'subjectSelector') selectSubject(e.target.value);
    if (e.target.id === 'chartWindow') { state.chartWindows[windowKey(metric())] = e.target.value; state.historyPage = 0; updateLive(); }
    if (e.target.id === 'historyPageNumber') { pause(); state.historyPage = Number(e.target.value) - 1; updateLive(); }
    if (e.target.id === 'researchMetric') { state.researchMetric = e.target.value; updateLive(); }
    if (e.target.id === 'runSelector') await loadRun(e.target.value);
    if (e.target.id === 'metricSelector') selectMetric(e.target.value);
    if (e.target.id === 'speed') { state.speed = Number(e.target.value); preciseTime = state.elapsed; lastPlayback = performance.now(); updatePlayButton(); }
    if (e.target.name === 'scenario') $('#scenarioDescription').textContent = t(state.meta.scenarios.find(s => s.id === e.target.value).description);
    if (e.target.id === 'reduceMotion') {
      document.documentElement.dataset.reduced = String(e.target.checked);
      try { localStorage.setItem('simisa.files.reducedMotion', String(e.target.checked)); } catch {}
      if(result() && crewOf(state.full).some(m => m.id === state.me.id)) await record('preferences',{reducedMotion:e.target.checked}, state.me.id);
    }
  } catch (error) { feedback(error); }
});
document.addEventListener('submit', async e => {
  if (e.target.dataset.workflow) {
    e.preventDefault(); const form=e.target, button=form.querySelector('button');button.disabled=true;
    try {
      const data=Object.fromEntries(new FormData(form));
      // Acepta coma decimal ("4,5") por si el navegador entrega el texto sin normalizar.
      if ('stress' in data) data.stress=Number(String(data.stress).replace(',', '.'));
      await record(form.dataset.workflow,data,state.me.id); render(); notice(t('Chequeo psicológico guardado.'));
    }catch(error){feedback(error);button.disabled=false;} return;
  }
  if (e.target.id === 'assistantForm') { e.preventDefault(); try{await ask(new FormData(e.target).get('question'));}catch(error){feedback(error);} return; }
  if (e.target.id !== 'simulationForm') return;
  e.preventDefault(); if (state.busy) return;
  const form = e.target, data = Object.fromEntries(new FormData(form));
  for (const key of ['seed', 'durationMinutes', 'stepSec', 'historyDays']) data[key] = Number(data[key]);
  data.startTime = `${data.startTime.length === 16 ? data.startTime + ':00' : data.startTime}Z`;
  state.busy = true;
  const submit = form.querySelector('[type=submit]'); submit.disabled = true; submit.textContent = isShowcase ? t('Calculando…') : t('Calculando y guardando…');
  try {
    const created = await api('/api/runs', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    await refreshRuns(); await loadRun(created.id, 'cuerpo');
    notice(isShowcase ? (created.reused ? t('Resultado idéntico recuperado.') : t('Simulación lista para explorar en esta pestaña.')) : created.reused ? t('La ejecución idéntica ya estaba guardada. Se recuperó su archivo.') : t('Simulación ejecutada, guardada y leída desde disco.'));
  } catch (error) { feedback(error); }
  finally { state.busy = false; if (submit.isConnected) { submit.disabled = false; submit.textContent = t('Ejecutar y guardar'); } }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('keydown', e => {
  if (e.target.classList?.contains('crew-option') && ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
    e.preventDefault();
    const i = state.crew.findIndex(m => m.id === loginPick), step = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1;
    loginPick = state.crew[(i + step + state.crew.length) % state.crew.length].id; renderLogin(); return;
  }
  if (e.target.classList?.contains('crew-option') && e.key === 'Enter' && e.target.getAttribute('aria-checked') === 'true') { e.preventDefault(); login(loginPick).catch(feedback); return; }
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

let loginPick = null, loginLogo = '';
const initials = name => name.split(' ').map(w => w[0]).join('').slice(0, 2);
const ROLE_ICON = {
  commander: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
  medical: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  specialist: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'};
async function renderLogin() {
  pause();
  if (!loginLogo) {
    // Comparte el logo de assets con la barra lateral.
    try { loginLogo = new DOMParser().parseFromString(await (await fetch('/views/lateral.html')).text(), 'text/html').querySelector('.brand-logo svg')?.outerHTML || ''; } catch {}
  }
  loginPick ??= state.crew[0]?.id;
  const picked = state.crew.find(m => m.id === loginPick), role = state.roles[picked.role];
  const scope = role.crewAccess ? t('Verá el estado de salud de los 4 tripulantes, alertas, investigación y simulación.') : t('Verá únicamente su propia información de salud.');
  $('#app').innerHTML = html`<main class="login-screen"><div class="login-wrap">
    <section class="login-art" aria-hidden="true"><div class="planet"></div><div class="ring"></div><div class="ring r2"></div>
      <div class="la-top"><div class="brand-logo xl">${loginLogo}</div><div class="brand-txt"><b>SIMISA</b><small>Sistema de Monitoreo Integral de Salud</small></div></div>
      <div class="la-bottom"><span class="la-eyebrow"><i></i>Misión Artemis · Órbita lunar</span>
        <h2>Centro de control de salud<br>de la <em>tripulación</em></h2>
        <p>Signos vitales, sensores y chequeos psicológicos de cada tripulante, con acceso según su rol a bordo.</p>
        <div class="la-metrics"><div><b>${state.crew.length}</b><small>Tripulantes</small></div><div><b>${Object.keys(DEVICES).length}</b><small>Sensores</small></div><div><b>${REGIONS.length}</b><small>Zonas corporales</small></div></div></div>
    </section>
    <section class="login-form"><div class="login-language">${languageButton()}</div><h1>Acceso a la plataforma</h1><p class="sub">Elegí tu perfil de tripulante</p>
      <div class="crew-pick" role="radiogroup" aria-label="Tripulante">${state.crew.map(m => `<button type="button" class="crew-option ${m.id === loginPick ? 'on' : ''}" role="radio" aria-checked="${m.id === loginPick}" data-action="pickLogin" data-id="${esc(m.id)}">
        <span class="crew-avatar ${esc(m.role)}">${esc(initials(m.name))}</span><span class="crew-who"><b>${esc(m.name)}</b><small>${esc(t(state.roles[m.role].name))}</small></span>
        <span class="crew-code">${esc(m.code)}</span><svg class="crew-role" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${ROLE_ICON[m.role] || ''}</svg></button>`).join('')}</div>
      <p class="login-scope"><span class="tag ${role.crewAccess ? 'cyan' : 'neutral'}">${role.crewAccess ? t('Acceso a la tripulación') : t('Acceso personal')}</span>${esc(scope)}</p>
      <button class="btn-main" data-action="login" data-id="${esc(picked.id)}">Ingresar como ${esc(picked.name.split(' ')[0])}</button>
      <p class="login-note">Identificación de demostración, sin contraseña. Tripulación y datos ficticios; no es un sistema médico validado.</p>
    </section></div></main>`;
  $('.crew-option.on')?.focus({preventScroll: true});
}
async function login(id) {
  await api('/api/session', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({memberId: id})});
  location.reload();
}
async function boot() {
  const [{crew, roles}, session] = await Promise.all([api('/api/crew'), api('/api/session')]);
  state.crew = crew; state.roles = roles;
  if (!session.member) return renderLogin();
  state.me = session.member; state.subjectId = state.me.id;
  const response = await fetch('/views/lateral.html');
  if (!response.ok) throw new Error(t('No se pudo cargar la navegación de SIMISA.'));
  const lateral = html(await response.text());
  $('#app').innerHTML = lateral + html`<div class="main"><a class="btn skip" href="#content">Saltar al contenido</a><header class="topbar"><button class="icon-btn burger" data-action="menu" aria-label="Abrir menú">☰</button><div><div id="tbTitle" class="tb-title">SIMISA</div><div id="tbCrumb" class="tb-crumb">Monitoreo integral de salud</div></div><div class="tb-right"><div id="subjectPicker"></div><div class="mission-clock" id="missionClock" hidden><button class="clock-play" id="clockPlay" data-action="play" aria-pressed="false"></button><div class="clock-detail"><small><span id="missionDate"></span> · <span id="clockState">En pausa</span></small><time id="headerTime" class="header-time" aria-label="Hora de misión"></time></div></div></div></header><main class="content" id="content"></main></div>`;
  $('#uName').textContent = state.me.name;
  $('#uAvatar').textContent = state.me.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  $('.tb-right').insertAdjacentHTML('beforeend', '<div id="languageControl"></div>');
  updateLanguageChrome();
  syncSidebar();
  try { document.documentElement.dataset.reduced = localStorage.getItem('simisa.files.reducedMotion') || 'false'; } catch {}
  state.meta = await api('/api/meta'); await refreshRuns();
  let view = location.hash.slice(1);
  if (view === 'simulaciones') { view = 'config'; state.settingsTab = 'simulation'; }
  const selected = remembered();
  const start = NAV.some(n => n[0] === view) && allowedView(view) ? view : crewAccess() ? 'tripulacion' : 'inicio';
  if (state.runs.length) await loadRun(state.runs.some(r => r.id === selected) ? selected : state.runs[0].id, start);
  else navigate(crewAccess() ? (view || 'simulaciones') : 'inicio');
}
boot().catch(error => {
  $('#app').innerHTML = html`<div class="card error-full"><h1>No se pudo abrir SIMISA</h1><p class="error" role="alert">${esc(t(error.message))}</p><p class="hint">${isShowcase ? t('Los historiales incluidos siguen disponibles. Volvé a cargar esta página para reintentarlo.') : t('Las ejecuciones guardadas permanecen en sus archivos. Comprobá que la aplicación local esté iniciada y volvé a cargar esta página.')}</p><a class="btn" href="/">Reintentar</a></div>`;
});
