/* =============================================================
   SIMISA · Definición de la navegación principal
   -------------------------------------------------------------
   El orden de este arreglo es el orden de las secciones en la
   barra lateral. Cada entrada apunta a una página registrada con
   registrarPagina(clave, render, cargar).
   ============================================================= */

/** Iconos SVG (solo el contenido del <path>). */
export const ICONOS = {
  inicio:    '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  cuerpo:    '<circle cx="12" cy="4.6" r="2.2"/><path d="M12 7v7m0 0-2.6 7m2.6-7 2.6 7M6.4 10.5h11.2"/>',
  sueno:     '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  mente:     '<path d="M12 20s-6-3.6-6-8a4 4 0 0 1 6-3.4A4 4 0 0 1 18 12c0 4.4-6 8-6 8Z"/>',
  sensor:    '<path d="M5 12a7 7 0 0 1 7-7"/><path d="M5 12a7 7 0 0 0 7 7"/><circle cx="12" cy="12" r="2.4"/><path d="M19 8a9 9 0 0 1 0 8"/><path d="M5 8a9 9 0 0 0 0 8"/>',
  graficas:  '<path d="M4 19V5m0 14h16"/><path d="M8 15l3-5 3 3 4-7"/>',
  alertas:   '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  asistente: '<rect x="3" y="6" width="18" height="13" rx="4"/><circle cx="9" cy="12.5" r="1.2"/><circle cx="15" cy="12.5" r="1.2"/><path d="M12 3v3"/>',
  medico:    '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M12 11v6m-3-3h6"/>',
  tierra:    '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a14 14 0 0 1 0 16 14 14 0 0 1 0-16"/>',
  perfiles:  '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 5.2a3.2 3.2 0 0 1 0 5.6M18 14.4a6 6 0 0 1 3.5 5.6"/>',
  inves:     '<path d="M9 3h6v4l4 10a3 3 0 0 1-2.8 4H7.8A3 3 0 0 1 5 17L9 7z"/><path d="M9.5 13h5"/>',
  config:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};

export const SECCIONES = [
  { id:'inicio',    titulo:'Panel general',        icono:'inicio',    sub:'Inicio' },
  { id:'cuerpo',    titulo:'Salud corporal',       icono:'cuerpo',    sub:'Figura humana' },
  { id:'sueno',     titulo:'Sueño y descanso',     icono:'sueno',     sub:'Descanso' },
  { id:'mente',     titulo:'Bienestar psicológico', icono:'mente',    sub:'Bienestar' },
  { id:'sensores',  titulo:'Estado de sensores',   icono:'sensor',    sub:'Sensores' },
  { id:'graficas',  titulo:'Gráficas e historial', icono:'graficas',  sub:'Historial' },
  { id:'alertas',   titulo:'Alertas',              icono:'alertas',   sub:'Alertas', badge:4 },
  { id:'asistente', titulo:'Asistente inteligente',icono:'asistente', sub:'Asistente' },
  { id:'medica',    titulo:'Información médica',   icono:'medico',    sub:'Biblioteca' },
  { id:'tierra',    titulo:'Comunicación Tierra',  icono:'tierra',    sub:'Comunicación' },
  { id:'perfiles',  titulo:'Perfiles y permisos',  icono:'perfiles',  sub:'Perfiles' },
  { id:'inves',     titulo:'Investigación',        icono:'inves',     sub:'Investigación' },
  { id:'config',    titulo:'Configuración',        icono:'config',    sub:'Ajustes' }
];

/** Busca la definición de una sección por id. */
export function getSeccion(id) {
  return SECCIONES.find(s => s.id === id) || SECCIONES[0];
}
