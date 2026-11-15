import {readFile} from 'node:fs/promises';
import {simulate} from './engine/simulator.js';
import {saveRun, DEFAULT_DATA_DIR} from './storage/files.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('SIMISA: simulador independiente de la web\nnode cli.js --config examples/recorrido.json [--out carpeta]\nnode cli.js [--seed 2026] [--scenario recorrido] [--duration 60] [--step 10] [--name Nombre] [--start 2026-11-14T12:00:00.000Z] [--history 14]');
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--config', '--out', '--seed', '--scenario', '--duration', '--step', '--name', '--start', '--history'].includes(args[i]) || args[i + 1] == null) throw new Error('Argumentos inválidos. Consulte --help.');
    options[args[i]] = args[i + 1];
  }
  const config = options['--config'] ? JSON.parse((await readFile(options['--config'], 'utf8')).replace(/^\uFEFF/, '')) : {};
  const mapping = {'--seed': 'seed', '--scenario': 'scenario', '--duration': 'durationMinutes', '--step': 'stepSec', '--name': 'name', '--start': 'startTime', '--history': 'historyDays'};
  for (const [flag, key] of Object.entries(mapping)) if (flag in options) config[key] = ['seed', 'durationMinutes', 'stepSec', 'historyDays'].includes(key) ? Number(options[flag]) : options[flag];
  const saved = await saveRun(simulate(config), options['--out'] || DEFAULT_DATA_DIR);
  console.log(JSON.stringify({id: saved.envelope.result.id, file: saved.path, checksum: saved.envelope.checksum,
    measurements: saved.envelope.result.measurements.length, reused: saved.reused}, null, 2));
}
main().catch(error => { console.error(`No se guardó la simulación: ${error.message}`); process.exitCode = 1; });
