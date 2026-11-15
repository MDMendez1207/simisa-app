/* =============================================================
   SIMISA · Utilidades transversales (sin DOM, sin estado)
   ============================================================= */

/** Redondea a un decimal. */
export const unDecimal = v => Math.round(v * 10) / 10;

/** Dos dígitos con cero a la izquierda. */
export const dos = v => String(v).padStart(2, '0');

/** Hora actual HH:MM. */
export function horaActual(fecha = new Date()) {
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** Marca temporal legible para un registro. */
export function ahora(fecha = new Date()) {
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)} ${horaActual(fecha)}`;
}

/** Escapa texto antes de inyectarlo como HTML. */
export function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Recorta un identificador largo para mostrarlo en pantalla. */
export function idCorto(clave) {
  return { frecuencia: 'FC', spo2: 'SpO₂', presion: 'PA', temperatura: 'T°' }[clave] || clave.toUpperCase();
}

/** Limita un número a un intervalo. */
export function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}
