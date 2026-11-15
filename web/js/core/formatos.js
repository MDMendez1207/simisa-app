/** Formatos de presentación: siempre UTC y sin alterar los datos guardados. */
const pad = value => String(value).padStart(2, '0');

export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) < 0) return '—';
  let rest = Math.round(Number(seconds));
  if (rest < 60) return `${rest} s`;
  const units = rest >= 172800 ? [[86400, 'días'], [3600, 'h'], [60, 'min']]
    : [[3600, 'h'], [60, 'min']];
  const parts = [];
  for (const [size, label] of units) {
    const count = Math.floor(rest / size);
    rest %= size;
    if (count) parts.push(`${count} ${label === 'días' && count === 1 ? 'día' : label}`);
    if (parts.length === 2) break;
  }
  return parts.join(' ');
}

export function formatTimestamp(value, {date = true, time = true, seconds = false, year = false} = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '—';
  const day = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}${year ? '/' + d.getUTCFullYear() : ''}`;
  const clock = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}${seconds ? ':' + pad(d.getUTCSeconds()) : ''}`;
  return [date ? day : '', time ? clock : ''].filter(Boolean).join(' · ');
}

/** HTML compacto con la precisión completa disponible en el título y datetime. */
export function timeMarkup(value, options = {}) {
  const text = formatTimestamp(value, options);
  if (text === '—') return text;
  const iso = new Date(value).toISOString();
  return `<time class="timestamp" datetime="${iso}" title="${iso.replace('T', ' ').replace('.000Z', ' UTC')}">${text}</time>`;
}
