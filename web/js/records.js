import {escapar as esc} from './core/utilidades.js';
import {timeMarkup} from './core/formatos.js';

const PAGE_SIZE = 10;

/** Tabla del período consultado, con los registros más recientes primero. No modifica las filas. */
export function recordsTable({rows = [], metric, elapsedSec, fromSec, page = 0, referenceTime}) {
  const visible = rows.filter(r => r.elapsedSec >= fromSec && r.elapsedSec <= elapsedSec);
  const count = visible.length, pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const current = Math.max(0, Math.min(pages - 1, Math.trunc(Number(page)) || 0));
  const end = count - current * PAGE_SIZE;
  const selected = visible.slice(Math.max(0, end - PAGE_SIZE), end).reverse();
  const body = selected.map(r => {
    const hasValue = Number.isFinite(r.value);
    const value = hasValue ? `${r.value.toFixed(metric.decimals)} <span class="record-unit">${esc(r.unit)}</span>` : '—';
    const issue = r.availability === 'disconnected' ? ['Sin señal', 'warn', 'El sensor no transmitió una lectura en este momento.']
      : r.quality === 'invalid' ? ['Descartada', 'bad', 'Lectura inválida: se excluye de la gráfica y de los cálculos.']
      : r.quality === 'low_quality' ? ['Señal débil', 'warn', 'Lectura de baja calidad: se excluye de la gráfica y de los cálculos.']
      : !hasValue ? ['Sin lectura', 'neutral', 'No hay un valor registrado; no se interpreta como cero.']
      : r.captureMethod === 'self_report' && r.synthetic ? ['Historial sintético', 'neutral', 'Chequeo generado en el historial previo.'] : null;
    return `<tr><td class="time-cell">${timeMarkup(r.timestamp, {seconds: true, year: r.timestamp.slice(0, 4) !== referenceTime.slice(0, 4)})}</td>
      <td><div class="record-value"><span>${value}</span>${issue ? `<span class="tag ${issue[1]}" title="${esc(issue[2])}">${issue[0]}</span>` : ''}</div></td></tr>`;
  }).join('') || '<tr><td colspan="2" class="empty">Sin registros en el período seleccionado.</td></tr>';
  const first = count ? current * PAGE_SIZE + 1 : 0, last = Math.min(count, (current + 1) * PAGE_SIZE);
  const fmt = n => n.toLocaleString('es-AR');
  return {page: current, html: `<div class="table-scroll records-scroll"><table class="records-table"><thead><tr><th scope="col">Fecha y hora (UTC)</th><th scope="col">Valor</th></tr></thead><tbody id="historyRows">${body}</tbody></table></div>
    <div class="history-pagination"><span class="hint">${fmt(first)}–${fmt(last)} de ${fmt(count)} registros · ${PAGE_SIZE} por página</span>
      <nav class="row" aria-label="Paginación de registros">
        <button class="btn ghost small-btn" id="historyPrevious" data-action="historyPage" data-page="${current - 1}" ${current === 0 ? 'disabled' : ''}>Anterior</button>
        <label class="history-page-label">Página <input id="historyPageNumber" type="number" min="1" max="${pages}" step="1" value="${current + 1}" aria-label="Página de registros" ${!count ? 'disabled' : ''}> de ${fmt(pages)}</label>
        <button class="btn ghost small-btn" id="historyNext" data-action="historyPage" data-page="${current + 1}" ${current >= pages - 1 ? 'disabled' : ''}>Siguiente</button>
      </nav></div>`};
}
