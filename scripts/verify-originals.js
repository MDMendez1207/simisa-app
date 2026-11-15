import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse((await readFile(new URL('../docs/fuentes-originales.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
const changed = [];
for (const entry of manifest) {
  try {
    const bytes = await readFile(path.join(root, entry.path));
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) changed.push(entry.path);
  } catch { changed.push(entry.path); }
}
if (changed.length) { console.error('Originales diferentes o ausentes:', changed); process.exitCode = 1; }
else console.log(`${manifest.length} archivos originales conservados, comprobados con SHA-256.`);
