import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {simulate, normalizeConfig, DEFAULT_CONFIG} from './engine/simulator.js';
import {SCENARIOS} from './shared/catalog.js';
import {saveRun, readRun, listRuns, DEFAULT_DATA_DIR} from './storage/files.js';
import {readActivity, addActivity, AccessError} from './storage/activity.js';
import {CREW, ROLES, publicMember, findMember, hasCrewAccess, crewOf, memberView} from './shared/crew.js';

// Identificación de demostración: la cookie guarda qué tripulante eligió el usuario (sin contraseña).
// El servidor aplica los permisos según ese tripulante; no es autenticación real.
const COOKIE = 'simisa_member';
function sessionMember(req) {
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-z-]+)`));
  return match ? findMember(match[1]) : null;
}

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8'};

function json(res, status, body, headers = {}) {
  res.writeHead(status, {'Content-Type': mime['.json'], ...headers});
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new Error('Configuración demasiado grande.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Hosts públicos admitidos (túnel). Acepta nombres exactos o comodines de subdominio: "*.trycloudflare.com".
export function parsePublicHosts(value = '') {
  return String(value).split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
}
function matchesPublic(host, patterns) {
  const name = host.toLowerCase().replace(/:\d+$/, '');
  return patterns.some(p => p.startsWith('*.') ? name.endsWith(p.slice(1)) && name.length > p.length - 1 : name === p);
}

export function createAppServer({dataDir = DEFAULT_DATA_DIR, publicHosts = [], readOnly = false} = {}) {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    try {
      const host = req.headers.host || '';
      const local = /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host);
      const remote = !local && matchesPublic(host, publicHosts);
      if (!local && !remote) return json(res, 403, {error: 'Servidor exclusivamente local.'});
      // Un túnel entrega HTTPS al navegador; el origen esperado depende del tipo de acceso.
      const origins = remote ? [`https://${host}`, `http://${host}`] : [`http://${host}`];
      const badOrigin = () => req.headers.origin && !origins.includes(req.headers.origin);
      const url = new URL(req.url, `http://${host}`);
      const route = decodeURIComponent(url.pathname);
      // En modo lectura solo se permite elegir tripulante (no escribe datos).
      if (req.method === 'POST' && readOnly && remote && route !== '/api/session') return json(res, 403, {error: 'Demostración pública en modo solo lectura.'});
      const me = sessionMember(req);
      const needsSession = () => !me && (json(res, 401, {error: 'Identificate como tripulante para continuar.'}), true);
      if (req.method === 'GET' && route === '/api/health') return json(res, 200, {status: 'ok'});
      if (req.method === 'GET' && route === '/api/meta') return json(res, 200, {defaults: DEFAULT_CONFIG, scenarios: SCENARIOS});
      if (req.method === 'GET' && route === '/api/crew') return json(res, 200, {crew: CREW.map(publicMember), roles: ROLES});
      if (route === '/api/session') {
        if (req.method === 'GET') return json(res, 200, {member: me ? publicMember(me) : null});
        if (!['POST', 'DELETE'].includes(req.method)) return json(res, 405, {error: 'Método no permitido.'});
        if (badOrigin()) return json(res, 403, {error: 'Origen no autorizado.'});
        if (req.method === 'DELETE') return json(res, 200, {member: null}, {'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`});
        if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, {error: 'Se requiere JSON.'});
        let member;
        try { member = findMember((await readBody(req)).memberId); } catch { member = null; }
        if (!member) return json(res, 400, {error: 'Tripulante desconocido.'});
        return json(res, 200, {member: publicMember(member)}, {'Set-Cookie': `${COOKIE}=${member.id}; Path=/; HttpOnly; SameSite=Strict`});
      }
      if (route.startsWith('/api/runs') && needsSession()) return;
      if (req.method === 'GET' && route === '/api/runs') return json(res, 200, await listRuns(dataDir));
      const activity = route.match(/^\/api\/runs\/([a-f0-9]{24})\/activity$/);
      if (activity && req.method === 'GET') return json(res, 200, await readActivity(activity[1], dataDir, me));
      if (activity && req.method === 'POST') {
        if (badOrigin()) return json(res, 403, {error: 'Origen no autorizado.'});
        if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, {error: 'Se requiere JSON.'});
        try { return json(res, 201, await addActivity(activity[1], await readBody(req), dataDir, me)); }
        catch (error) { return json(res, error instanceof AccessError ? 403 : 400, {error: error.message}); }
      }
      const match = route.match(/^\/api\/runs\/([a-f0-9]{24})(\/file)?$/);
      if (req.method === 'GET' && match) {
        const envelope = await readRun(match[1], dataDir);
        const disposition = match[2] ? {'Content-Disposition': `attachment; filename="simisa-${match[1]}.json"`} : {};
        if (hasCrewAccess(me)) return json(res, 200, envelope, disposition);
        // Sin acceso de tripulación: solo la vista propia. La huella corresponde al archivo completo.
        if (!crewOf(envelope.result).some(m => m.id === me.id)) return json(res, 403, {error: 'Esta ejecución no contiene tus registros.'});
        return json(res, 200, {...envelope, scope: 'self', result: memberView(envelope.result, me.id)}, disposition);
      }
      if (req.method === 'POST' && route === '/api/runs') {
        if (!hasCrewAccess(me)) return json(res, 403, {error: 'Solo comandante y médica de tripulación pueden ejecutar simulaciones.'});
        if (badOrigin()) return json(res, 403, {error: 'Origen no autorizado.'});
        if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, {error: 'Se requiere una configuración JSON.'});
        let config;
        try { config = await readBody(req); normalizeConfig(config); }
        catch (error) { return json(res, 400, {error: error.message}); }
        const saved = await saveRun(simulate(config), dataDir);
        return json(res, saved.reused ? 200 : 201, {id: saved.envelope.result.id, reused: saved.reused});
      }
      if (route.startsWith('/api/')) return json(res, 404, {error: 'Recurso no encontrado.'});
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, {error: 'Método no permitido.'});
      const shared = route.startsWith('/shared/');
      const docs = route.startsWith('/docs/');
      const base = path.join(root, shared ? 'shared' : docs ? 'docs' : 'web');
      const relative = shared ? route.slice(8) : docs ? route.slice(6) : route === '/' ? 'index.html' : route.slice(1);
      const filename = path.resolve(base, relative);
      if (!filename.startsWith(base + path.sep) || relative.split(/[\\/]/).some(p => p.startsWith('.'))) return json(res, 403, {error: 'Ruta no permitida.'});
      const body = await readFile(filename);
      res.writeHead(200, {'Content-Type': mime[path.extname(filename)] || 'application/octet-stream'});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      const status = error.code === 'ENOENT' ? 404 : error instanceof URIError ? 400 : 500;
      json(res, status, {error: status === 404 ? 'Archivo no encontrado.' : 'No se pudo leer o guardar el archivo. Revise el almacenamiento y la integridad del resultado.'});
      if (status === 500) console.error('[SIMISA]', error.message);
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4180);
  const publicHosts = parsePublicHosts(process.env.SIMISA_PUBLIC_HOSTS);
  const readOnly = process.env.SIMISA_READONLY === '1';
  const server = createAppServer({dataDir: process.env.SIMISA_DATA_DIR || DEFAULT_DATA_DIR, publicHosts, readOnly});
  server.on('error', error => { console.error(`No se pudo iniciar SIMISA: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => {
    console.log(`SIMISA: http://127.0.0.1:${server.address().port}\nResultados locales: ${process.env.SIMISA_DATA_DIR || fileURLToPath(DEFAULT_DATA_DIR)}`);
    if (publicHosts.length) console.log(`Acceso por túnel habilitado para: ${publicHosts.join(', ')}${readOnly ? ' (solo lectura)' : ''}`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
