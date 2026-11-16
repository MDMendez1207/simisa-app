import {t, html} from './i18n.js';
import {escapar as esc} from './core/utilidades.js';
import {timeMarkup} from './core/formatos.js';
import {METRIC_DESCRIPTION, referenceText} from './presentation.js';
import {hasReference} from '../../shared/catalog.js';
import {summarize} from '../../shared/results.js';
import {deviceStatus, LOW_BATTERY} from '../../shared/devices.js';
import {HAZARDS, RISKS, INDICATOR_GUIDE, GUIDE_DISCLAIMER} from '../../shared/health-guide.js';

export function sleepPage(c) {
  return c.heading(t('Sueño y descanso'), t('Duración del descanso informada por el sensor de sueño.')) + c.timeline() +
    html`<div class="two-columns sleep-layout"><div id="readings" data-metrics="sleep">${c.readingCard('sleep')}</div>
    <div class="card" id="chartBlock">${c.chartBlock()}</div></div><div class="card section-gap"><h2>Historial de descanso</h2><div id="historyBlock">${c.historyTable()}</div></div>`;
}

export function wellbeingPage(c) {
  const last=(c.index.stress||[]).filter(r=>r.elapsedSec<=c.elapsed).at(-1);
  return c.heading(t('Bienestar psicológico'), t('Chequeo psicológico del tripulante y descanso medido por sensor.')) + c.timeline() +
    html`<div class="two-columns wellbeing-layout"><div class="card" id="chartBlock">${c.chartBlock()}</div><div class="stack"><div class="kpi-grid" id="readings" data-metrics="stress,sleep">${['stress', 'sleep'].map(c.readingCard).join('')}</div><div class="card"><div class="row between"><h2>Último chequeo</h2>${last?timeMarkup(last.timestamp):''}</div><p>${last?html`${esc(t(last.mood))} · Estrés ${last.value}/10`:t('Sin chequeos registrados')}</p>${last?.note?`<p class="hint">${esc(last.note)}</p>`:''}</div></div></div>`;
}

export function chatView(messages) {
  return messages.length ? messages.map(m => `<article class="conversation-message ${m.author === 'user' ? 'from-user' : ''}"><strong>${m.author === 'user' ? t('Vos') : 'SIMISA'}</strong><p>${esc(m.text)}</p>${m.time ? `<small>${timeMarkup(m.time)}</small>` : ''}</article>`).join('') : html('<div class="conversation-welcome"><h2>¿Qué querés consultar?</h2><p>Revisá tus lecturas, cambios y disponibilidad de sensores.</p></div>');
}

export function assistantPage(c) {
  return c.heading(t('Asistente inteligente'), t('Consultá tus indicadores y su evolución.')) + html`<div class="card assistant-panel"><div id="conversation" class="conversation" role="log" aria-label="Conversación">${chatView(c.chat)}</div>
    <div class="row suggestions"><button class="chip" data-action="ask" data-question="Resumen de mis indicadores">Resumen de mis indicadores</button><button class="chip" data-action="ask" data-question="¿Qué sensores están sin lectura?">Estado de sensores</button><button class="chip" data-action="ask" data-question="Tendencia de saturación">Tendencia de saturación</button></div>
    <form id="assistantForm" class="assistant-form"><label class="sr-only" for="assistantInput">Tu consulta</label><input id="assistantInput" name="question" placeholder="Escribí tu consulta…" maxlength="500" required><button class="btn primary" type="submit">Consultar</button></form></div>`;
}

const ext = (item, cls = '') => `<a class="${cls}" href="${item.url}" target="_blank" rel="noreferrer">${esc(t(item.name))}</a>`;

/** Información médica: peligros del vuelo (NASA HRP) y guía de cada indicador con sus fuentes. */
export function medicalPage(c) {
  const hazards = Object.values(HAZARDS).map(h => `<article class="card hazard-card"><h3>${ext(h)}</h3><p class="hint">${esc(t(h.text))}</p></article>`).join('');
  const card = m => {
    const g = INDICATOR_GUIDE[m.clave];
    return html`<article class="card library-card" data-library><div class="eyebrow">${esc(t(m.sistema))}</div><h2>${esc(t(m.nombre))}</h2><p>${esc(t(METRIC_DESCRIPTION[m.clave] || ''))}</p>
      ${g ? html`<p class="section-gap"><strong>Por qué se mide en el espacio.</strong> ${esc(t(g.why))}</p>
      <div class="hazard-chips">${g.hazards.map(h => ext(HAZARDS[h], 'chip-link')).join('')}</div>
      <p class="hint section-gap"><strong>Cómo se mide:</strong> ${esc(t(g.measure))}<br>${esc(referenceText(m))}${hasReference(m) ? t(' (ilustrativa)') : ''}</p>
      ${g.context ? html`<details class="guide-more"><summary>Contexto de exposición y evidencia</summary><p>${esc(t(g.context))}</p><p>${esc(t(g.evidence))}</p><ul>${g.sources.map(source => `<li>${ext(source)}</li>`).join('')}</ul></details>` : ''}
      <details class="guide-more"><summary>Prevención y riesgos relacionados</summary><ul>${g.prevent.map(p => `<li>${esc(t(p))}</li>`).join('')}</ul>
        <ul class="risk-list">${g.risks.map(r => `<li>${ext(RISKS[r])}: ${esc(t(RISKS[r].text))}</li>`).join('')}</ul></details>` : ''}
      <details class="guide-more"><summary>Consultar registro</summary>${c.result ? c.readingCard(m.clave) : html('<p>Elegí un historial para consultar mediciones.</p>')}</details></article>`;
  };
  return c.heading(t('Información médica'), t('Cómo afecta el vuelo espacial a la salud, qué se mide y qué hacer.')) +
    html`<div class="card escalation"><h2>¿A quién recurrir?</h2><ol class="escalation-steps">
      <li class="ok"><b>Autocuidado</b><span>Indicador en rango: mantener la rutina preventiva (ejercicio, descanso, alimentación, chequeo diario).</span></li>
      <li class="warn"><b>Médica de tripulación</b><span>Un valor fuera de referencia: repetir la medición, anotar síntomas y avisarle.</span></li>
      <li class="bad"><b>Médicos de vuelo en Tierra</b><span>Si se mantiene fuera de referencia, la médica de tripulación evalúa la consulta, teniendo en cuenta la demora de comunicación.</span></li></ol>
      <p class="hint">${esc(t(GUIDE_DISCLAIMER))}</p></div>
    <h2 class="section-gap">Los cinco peligros del vuelo espacial</h2><div class="hazard-grid">${hazards}</div>
    <div class="row between section-gap"><h2>Indicadores</h2><label class="inline-select">Buscar<input id="librarySearch" type="search" placeholder="Indicador o sistema corporal"></label></div>
    <div class="quality-grid sources">${c.indicators.map(card).join('')}</div>
    <div class="card section-gap sources"><h2>Fuentes</h2><ul>
      <li>${ext({name: 'NASA HRP · 5 Hazards of Human Spaceflight', url: 'https://www.nasa.gov/hrp/hazards/'})}</li>
      <li>${ext({name: 'NASA HRP · Risks of Human Spaceflight', url: 'https://www.nasa.gov/hrp/risks/'})}</li>
      <li>${ext({name: 'NASA HRP · Ongoing HRP Research in Space', url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/'})}</li>
      <li>${ext({name: 'CSA · Monitoring Radiation for Astronaut Health', url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp'})}</li>
      <li>${ext({name: 'CSA · Why Do We Conduct Science Experiments in Space?', url: 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp'})}</li>
      <li>${ext({name: 'OpenStax · The Lungs', url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-2-the-lungs'})}</li></ul>
      <p class="hint">No se incorporaron protocolos clínicos: la orientación es general y no indica tratamientos ni dosis.</p></div>`;
}

export function researchData(result, index, elapsed) {
  return result.indicators.map(m => ({id: m.clave, indicator: t(m.nombre), unit: t(m.unidad), decimals: m.decimals,
    ...summarize(result, index, m.clave, elapsed)}));
}
/** Estadísticas de toda la tripulación. `views`: [{member, result, index}] (una vista por tripulante). */
export function researchCrewData(views, elapsed) {
  return views.flatMap(v => researchData(v.result, v.index, elapsed).map(r => ({...r, member: v.member})));
}
export function researchRows(c) {
  const fmt = (v, d) => v == null ? '—' : v.toFixed(d);
  return researchCrewData(c.crewViews(), c.elapsed).filter(r => c.researchMetric === 'all' || r.id === c.researchMetric)
    .map(row => `<tr><td>${esc(row.member.name)}</td><td>${esc(t(row.indicator))}</td><td>${row.count}</td><td>${fmt(row.min, row.decimals)}</td><td>${fmt(row.mean, row.decimals)}</td><td>${fmt(row.max, row.decimals)}</td><td>${esc(t(row.unit))}</td></tr>`).join('');
}
export function researchPage(c) {
  return c.heading(t('Investigación'), t('Estadísticas de la tripulación hasta la hora de misión actual.'), html('<button class="btn" data-action="exportResearch">Exportar tabla</button>')) + c.timeline() +
    html`<div class="card"><div class="row between"><h2>Resumen por tripulante e indicador</h2><span class="tag info">${c.crew.length} tripulantes</span></div>
    <label class="inline-select section-gap">Indicador<select id="researchMetric"><option value="all">Todos</option>${c.indicators.map(m => `<option value="${m.clave}" ${c.researchMetric === m.clave ? 'selected' : ''}>${esc(t(m.nombre))}</option>`).join('')}</select></label>
    <div class="table-scroll section-gap"><table><thead><tr><th>Tripulante</th><th>Indicador</th><th>Lecturas válidas</th><th>Mínimo</th><th>Media</th><th>Máximo</th><th>Unidad</th></tr></thead><tbody id="researchRows">${researchRows(c)}</tbody></table></div></div>`;
}
export function researchCrewCSV(views, elapsed) {
  const fields = [t('Tripulante'), t('Indicador'), t('Unidad'), t('Lecturas válidas'), t('Mínimo'), t('Media'), t('Máximo'), t('Origen de los datos')];
  const origin = (v, id) => [...new Set((v.index[id] || []).map(row => row.captureMethod))].join(', ') || '—';
  const rows = views.flatMap(v => researchData(v.result, v.index, elapsed).map(r => [v.member.name, r.indicator, r.unit, r.count, r.min, r.mean, r.max, origin(v, r.id)]));
  return '\uFEFF' + [fields, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

/** Centro de tripulación: estado general de cada tripulante en el momento consultado. */
const CREW_METRICS = ['hr', 'spo2', 'rr', 'temp', 'sys'];
export function crewCards(c) {
  return c.crewViews().map(({member, result, index, activity}) => {
    const at = id => c.observationAt(result, index, id, c.elapsed);
    const sensors = result.indicators.filter(m => c.isSensorMetric(m.clave));
    const outside = sensors.filter(m => at(m.clave).current && at(m.clave).condition === 'outside');
    const offline = sensors.filter(m => !at(m.clave).current && m.periodSec <= 300);
    const lowBattery = deviceStatus(result, index, c.elapsed).filter(d => d.battery != null && d.battery < LOW_BATTERY);
    const reviewed = new Set(activity.filter(a => a.type === 'acknowledge').map(a => a.payload.eventId));
    const pending = result.events.filter(e => e.elapsedSec <= c.elapsed && e.type === 'indicator' && e.state === 'outside' && !reviewed.has(e.id)).length;
    const last = (index.stress || []).filter(r => r.elapsedSec <= c.elapsed).at(-1);
    const check = last && {payload: {mood: last.mood, stress: last.value}};
    const status = outside.length || offline.length || lowBattery.length ? ['warn', t('Requiere atención')] : ['ok', t('Estable')];
    const value = id => { const m = result.indicators.find(i => i.clave === id), o = at(id); return `<div><small>${esc(t(m.nombre))}</small><strong class="${o.current && o.condition === 'outside' ? 'warn-text' : ''}">${o.current ? o.current.value.toFixed(m.decimals) : '—'}</strong> <span class="ku">${esc(t(m.unidad))}</span></div>`; };
    return html`<article class="card crew-card tone-${status[0]} ${member.id === c.subject.id ? 'selected' : ''}"><div class="crew-head"><span class="crew-avatar ${esc(member.role)}">${esc(member.name.split(' ').map(w => w[0]).join(''))}</span><div><h2>${esc(member.name)}</h2><small>${esc(member.code)} · ${esc(t(c.roles[member.role].name))}</small></div></div><span class="pill ${status[0]} crew-status">${t(status[1])}</span>
      <div class="crew-values section-gap">${CREW_METRICS.map(value).join('')}</div>
      <p class="hint crew-notes">${outside.length ? html`Fuera de referencia: ${outside.map(m => esc(t(m.nombre))).join(', ')}. ` : ''}${offline.length ? html`Sin lectura: ${offline.map(m => esc(t(m.nombre))).join(', ')}. ` : ''}${lowBattery.length ? html`Batería baja: ${lowBattery.map(d => `${esc(t(d.device.name))} (${d.battery} %)`).join(', ')}. ` : ''}${pending ? html`${pending} alerta(s) sin revisar. ` : ''}${check ? html`Último chequeo: ${esc(t(check.payload.mood))}, estrés ${check.payload.stress}/10.` : t('Sin chequeo psicológico.')}</p>
      <div class="row crew-actions"><button class="btn" data-action="viewMember" data-id="${esc(member.id)}">Ver detalle</button><button class="btn ghost" data-action="viewMember" data-id="${esc(member.id)}" data-go="alertas">Alertas</button></div></article>`;
  }).join('');
}
export function crewPage(c) {
  return c.heading(t('Centro de tripulación'), t('Estado general de salud de cada tripulante a la hora de misión actual.')) + c.timeline() +
    `<div class="quality-grid" id="crewGrid">${crewCards(c)}</div>`;
}

export function researchCSV(result, index, elapsed) {
  const fields = [t('Indicador'), t('Unidad'), t('Lecturas válidas'), t('Mínimo'), t('Media'), t('Máximo'), t('Origen de los datos')];
  const origin = id => [...new Set((index[id] || []).map(row => row.captureMethod))].join(', ') || '—';
  const rows = researchData(result, index, elapsed).map(r => [r.indicator, r.unit, r.count, r.min, r.mean, r.max, origin(r.id)]);
  return '\uFEFF' + [fields, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
