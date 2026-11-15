import {cp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRun} from '../storage/files.js';
import {DEFAULT_CONFIG} from '../engine/simulator.js';
import {SCENARIOS} from '../shared/catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, 'public');
// Solo se limpia el directorio generado, nunca web/, shared/ ni los resultados.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'public') throw new Error('Directorio de salida no válido.');
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
const filter = src => !path.basename(src).startsWith('.') && !src.endsWith('.rar');
await cp(path.join(root, 'web'), output, {recursive: true, filter});
await cp(path.join(root, 'shared'), path.join(output, 'shared'), {recursive: true, filter});
const indexPath = path.join(output, 'index.html');
const html = await readFile(indexPath, 'utf8');
if (!html.includes('<html lang="es">')) throw new Error('No se encontró la plantilla de inicio.');
await writeFile(indexPath, html.replace('<html lang="es">', '<html lang="es" data-showcase="true">'));
const sourceDir = path.join(root, 'data', 'runs');
const targetDir = path.join(output, 'showcase', 'runs');
await mkdir(targetDir, {recursive: true});
const runs = [];
for (const name of (await readdir(sourceDir)).filter(n => /^[a-f0-9]{24}\.json$/.test(n)).sort()) {
  const id = name.slice(0, -5), envelope = await readRun(id, sourceDir), r = envelope.result;
  const url = `/showcase/runs/${id}.json`;
  // Solo los resultados ficticios verificados; ninguna actividad local de usuarios.
  await writeFile(path.join(targetDir, name), JSON.stringify(envelope));
  runs.push({id, createdAt: envelope.createdAt, checksum: envelope.checksum, config: r.config,
    count: r.measurements.length, eventCount: r.events.length, url});
}
if (!runs.length) throw new Error('No hay resultados incluidos para la web de muestra.');
runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
await writeFile(path.join(output, 'showcase', 'index.json'), JSON.stringify({runs, warnings: []}));
await writeFile(path.join(output, 'showcase', 'meta.json'), JSON.stringify({defaults: {...DEFAULT_CONFIG, historyDays: 14}, scenarios: SCENARIOS}));
console.log(`Web de muestra preparada en public/: ${runs.length} historiales. Las interacciones nuevas viven en cada pestaña.`);
