import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {simulate, normalizeConfig, DEFAULT_CONFIG} from './engine/simulator.js';
import {SCENARIOS} from './shared/catalog.js';
import {saveRun, readRun, listRuns, DEFAULT_DATA_DIR} from './storage/files.js';
import {readActivity, addActivity} from './storage/activity.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8'};

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

export function createAppServer({dataDir = DEFAULT_DATA_DIR} = {}) {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    try {
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return json(res, 403, {error: 'Servidor exclusivamente local.'});
      const url = new URL(req.url, `http://${host}`);
      const route = decodeURIComponent(url.pathname);
      if (req.method === 'GET' && route === '/api/health') return json(res, 200, {status: 'ok'});
      if (req.method === 'GET' && route === '/api/meta') return json(res, 200, {defaults: DEFAULT_CONFIG, scenarios: SCENARIOS});
      if (req.method === 'GET' && route === '/api/runs') return json(res, 200, await listRuns(dataDir));
      const activity = route.match(/^\/api\/runs\/([a-f0-9]{24})\/activity$/);
      if (activity && req.method === 'GET') return json(res, 200, await readActivity(activity[1], dataDir));
      if (activity && req.method === 'POST') {
        if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(res, 403, {error: 'Origen no autorizado.'});
        if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, {error: 'Se requiere JSON.'});
        try { return json(res, 201, await addActivity(activity[1], await readBody(req), dataDir)); }
        catch (error) { return json(res, 400, {error: error.message}); }
      }
      const match = route.match(/^\/api\/runs\/([a-f0-9]{24})(\/file)?$/);
      if (req.method === 'GET' && match) return json(res, 200, await readRun(match[1], dataDir), match[2] ? {'Content-Disposition': `attachment; filename="simisa-${match[1]}.json"`} : {});
      if (req.method === 'POST' && route === '/api/runs') {
        if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(res, 403, {error: 'Origen no autorizado.'});
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
      const base = path.join(root, shared ? 'shared' : 'web');
      const relative = shared ? route.slice(8) : route === '/' ? 'index.html' : route.slice(1);
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
  const server = createAppServer({dataDir: process.env.SIMISA_DATA_DIR || DEFAULT_DATA_DIR});
  server.on('error', error => { console.error(`No se pudo iniciar SIMISA: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`SIMISA: http://127.0.0.1:${server.address().port}\nResultados locales: ${process.env.SIMISA_DATA_DIR || fileURLToPath(DEFAULT_DATA_DIR)}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
