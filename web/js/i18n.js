import {EN} from './locales/en.js';
import {HEALTH_EN} from './locales/health-en.js';

const messages = Object.freeze({...EN, ...HEALTH_EN});
const preferenceKey = 'simisa.language';
// Node imports do not have browser storage. First visits always use English.
let language = 'en';
try { if (globalThis.localStorage?.getItem(preferenceKey) === 'es') language = 'es'; } catch {}
export const getLanguage = () => language;
export const getLocale = () => language === 'es' ? 'es-AR' : 'en-GB';
export function setLanguage(value) {
  language = value === 'es' ? 'es' : 'en';
  try { globalThis.localStorage?.setItem(preferenceKey, language); } catch {}
  if (globalThis.document) {
    document.documentElement.lang = language;
    document.title = `SIMISA · ${t('Monitoreo integral de salud')}`;
  }
}

const normalize = text => text.replace(/\s+/g, ' ').trim();
const escapeRE = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(messages).filter(([source]) => /\{\d+\}/.test(source)).map(([source, target]) => {
  const ids = [];
  const parts = source.split(/(\{\d+\})/).map(part => {
    if (!/^\{\d+\}$/.test(part)) return escapeRE(part);
    ids.push(Number(part.slice(1, -1))); return '(.*?)';
  });
  return {source, target, ids, regex: new RegExp(`^${parts.join('')}$`)};
});

/** Translate authored labels and server messages. Never pass user-entered prose. */
export function t(value) {
  if (typeof value !== 'string' || language === 'es') return value;
  const key = normalize(value);
  let translated = Object.hasOwn(messages, key) ? messages[key] : undefined;
  if (translated == null) {
    for (const pattern of patterns) {
      const match = key.match(pattern.regex);
      if (!match) continue;
      const args = [];
      pattern.ids.forEach((id, index) => { args[id] = t(match[index + 1]); });
      translated = pattern.target.replace(/\{(\d+)\}/g, (_, id) => args[id]);
      break;
    }
  }
  if (translated == null) return value;
  return value.match(/^\s*/)[0] + translated + value.match(/\s*$/)[0];
}

// Translate template text before inserting values. Interpolated HTML, user notes,
// identifiers, form values and measurements are never scanned or rewritten.
const compiled = new WeakMap();
function translatePart(part) {
  const ids = [];
  const source = part.replace(/\uE000(\d+)\uE001/g, (_, id) => {
    if (!ids.includes(id)) ids.push(id);
    return `{${ids.indexOf(id)}}`;
  });
  return t(source).replace(/\{(\d+)\}/g, (match, id) => ids[id] == null ? match : `\uE000${ids[id]}\uE001`);
}
export function html(strings, ...values) {
  const literal = typeof strings === 'string';
  let source = literal ? strings : compiled.get(strings)?.[language];
  if (source == null) {
    source = strings.reduce((text, part, index) => text + (index ? `\uE000${index - 1}\uE001` : '') + part, '');
  }
  if (literal || !compiled.get(strings)?.[language]) {
    source = source.split(/(<[^>]*>)/g).map(part => part.startsWith('<')
      ? part.replace(/\b(title|placeholder|aria-label|alt|data-question)=("|')(.*?)\2/g, (_, name, quote, text) => `${name}=${quote}${translatePart(text)}${quote}`)
      : translatePart(part)).join('');
    if (!literal) compiled.set(strings, {...compiled.get(strings), [language]: source});
  }
  return literal ? source : source.replace(/\uE000(\d+)\uE001/g, (_, id) => String(values[id]));
}

export function languageButton() {
  const next = language === 'en' ? 'es' : 'en';
  const label = next === 'es' ? 'Cambiar a español' : 'Switch to English';
  return `<button type="button" class="btn language-toggle" data-action="language" lang="${next}" title="${label}" aria-label="${label}"><span aria-hidden="true">◎</span> ${next.toUpperCase()}</button>`;
}
setLanguage(language);
