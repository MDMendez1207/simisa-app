import {CREW, ROLES, publicMember, findMember, hasCrewAccess, crewOf, memberView, canView, activitySubject} from '../../shared/crew.js';
import {prepareActivity, AccessError} from '../../shared/activity.js';

export const isShowcase = typeof document !== 'undefined' && document.documentElement.dataset.showcase === 'true';

/** Adaptador de la web pública: resultados incluidos + cambios en memoria, aislados por pestaña. */
export function createShowcaseClient({fetcher = (...args) => fetch(...args), identity, uuid = () => crypto.randomUUID()} = {}) {
  const transient = new Map(), samples = new Map(), activities = new Map();
  let manifest;
  const json = (body, status = 200) => Response.json(body, {status});
  const fail = (message, status = 400) => { const e = new Error(message); e.status = status; throw e; };
  const listing = () => manifest ??= fetcher('/showcase/index.json').then(async r => {
    if (!r.ok) fail('No se pudieron abrir los historiales incluidos.', r.status);
    return r.json();
  }).catch(e => { manifest = null; throw e; });
  const envelope = async id => {
    if (transient.has(id)) return transient.get(id);
    if (samples.has(id)) return samples.get(id);
    const item = (await listing()).runs.find(r => r.id === id);
    if (!item) fail('El historial no está disponible. Las simulaciones temporales se reinician al recargar.', 404);
    const response = await fetcher(item.url);
    if (!response.ok) fail('No se pudo abrir el historial.', response.status);
    const value = await response.json(); samples.set(id, value); return value;
  };
  const summary = e => ({id: e.result.id, createdAt: e.createdAt, checksum: e.checksum, config: e.result.config,
    count: e.result.measurements.length, eventCount: e.result.events.length});

  return async function showcaseFetch(route, options = {}) {
    try {
      const method = options.method || 'GET', input = () => JSON.parse(options.body || '{}');
      const me = findMember(identity.get());
      if (route === '/api/crew' && method === 'GET') return json({crew: CREW.map(publicMember), roles: ROLES});
      if (route === '/api/meta' && method === 'GET') return fetcher('/showcase/meta.json');
      if (route === '/api/session') {
        if (method === 'GET') return json({member: me ? publicMember(me) : null});
        if (method === 'DELETE') { identity.set(null); return json({member: null}); }
        if (method === 'POST') {
          const member = findMember(input().memberId);
          if (!member) fail('Tripulante desconocido.');
          identity.set(member.id); return json({member: publicMember(member)});
        }
        return json({error: 'Método no permitido.'}, 405);
      }
      if (!me) return json({error: 'Identificate como tripulante para continuar.'}, 401);
      if (route === '/api/runs') {
        if (method === 'GET') {
          const list = new Map((await listing()).runs.map(r => [r.id, r]));
          for (const e of transient.values()) list.set(e.result.id, summary(e));
          return json({runs: [...list.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)), warnings: []});
        }
        if (method === 'POST') {
          if (!hasCrewAccess(me)) fail('Solo comandante y médica pueden ejecutar simulaciones.', 403);
          const response = await fetcher('/api/simulate', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-SIMISA-Member': me.id}, body: options.body});
          if (!response.ok) return response;
          const value = await response.json();
          const reused = transient.has(value.result.id) || (await listing()).runs.some(r => r.id === value.result.id);
          if (!reused) transient.set(value.result.id, value);
          return json({id: value.result.id, reused}, reused ? 200 : 201);
        }
      }
      const match = route.match(/^\/api\/runs\/([a-f0-9]{24})(\/(activity|file))?$/);
      if (!match) return json({error: 'Recurso no encontrado.'}, 404);
      const id = match[1], e = await envelope(id), result = e.result;
      if (!crewOf(result).some(m => m.id === me.id) && !hasCrewAccess(me)) fail('El historial no contiene tus registros.', 403);
      if (match[3] === 'activity') {
        const history = activities.get(id) || [];
        if (method === 'GET') return json(history.filter(entry => canView(me, activitySubject(entry, result))));
        if (method === 'POST') {
          const data = input();
          const prepared = prepareActivity(result, data, {actor: me, history});
          const entry = {id: uuid(), createdAt: new Date().toISOString(), elapsedSec: data.elapsedSec,
            observedAt: new Date(Date.parse(result.config.startTime) + data.elapsedSec * 1000).toISOString(), ...prepared};
          history.push(entry); activities.set(id, history);
          return json(entry, 201);
        }
      } else if (method === 'GET') {
        return json(hasCrewAccess(me) ? e : {...e, scope: 'self', result: memberView(result, me.id)});
      }
      return json({error: 'Método no permitido.'}, 405);
    } catch (e) {
      return json({error: e.message}, e instanceof AccessError ? 403 : e.status || 400);
    }
  };
}

let memberId = null;
const identity = {
  get() { try { return sessionStorage.getItem('simisa.showcase.member'); } catch { return memberId; } },
  set(id) { memberId = id; try { if (id) sessionStorage.setItem('simisa.showcase.member', id); else sessionStorage.removeItem('simisa.showcase.member'); } catch {} },
};
export const showcaseFetch = createShowcaseClient({identity});
