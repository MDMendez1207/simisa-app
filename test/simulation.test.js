import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {simulate, normalizeConfig} from '../engine/simulator.js';
import {saveRun, readRun, listRuns, validateResult} from '../storage/files.js';
import {buildIndex, observationAt} from '../shared/results.js';
import {createAppServer} from '../server.js';
import {memberView, SCENARIO_SUBJECT} from '../shared/crew.js';
import {RADIATION_MODEL} from '../shared/catalog.js';

const CDR = {Cookie: 'simisa_member=ana-torres'};

test('misma configuración reproduce exactamente el contenido, aun después de otras ejecuciones', () => {
  const first = simulate({seed: 42});
  simulate({seed: 500, scenario: 'calidad'});
  assert.deepEqual(simulate({seed: 42}), first);
  assert.notDeepEqual(simulate({seed: 43}).measurements, first.measurements);
});

test('se conservan las definiciones de entrega y los intervalos de medición', () => {
  const run = simulate({durationMinutes: 1440, stepSec: 60});
  const index = buildIndex(run), catalog = Object.fromEntries(run.indicators.map(m => [m.clave, m]));
  assert.equal(catalog.bmd.unidad, 'g/cm²'); assert.equal(catalog.stress.unidad, '/10');
  assert.equal(catalog.gluc.unidad, 'mg/dL');
  assert.equal(catalog.rad.unidad, 'µSv/h');
  assert.equal(catalog.rad.sourceId, 'radiacion');
  assert.equal(catalog.rad.periodSec, 60);
  assert.equal(catalog.rad.referenceKind, 'none');
  assert.equal(index.rad.length, 1441);
  assert.ok(index.rad.every(r => r.condition === 'unknown' && r.quality === 'valid'));
  assert.ok(!run.events.some(e => e.indicator === 'rad' && e.type === 'indicator'));
  assert.deepEqual(run.radiationModel, RADIATION_MODEL);
  // La integral temporal de las tasas durante 24 h produce una dosis en el intervalo ISS/LEO.
  // Se calcula sobre las lecturas guardadas, sin usar la media por punto ni sumar tasas como dosis.
  for (const member of run.crew) {
    const readings = run.measurements.filter(r => r.subjectId === member.id && r.indicator === 'rad');
    let doseMsv = 0;
    for (let i = 1; i < readings.length; i++) {
      doseMsv += (readings[i - 1].value + readings[i].value) / 2 * (readings[i].elapsedSec - readings[i - 1].elapsedSec) / 3600000;
    }
    assert.ok(doseMsv >= 0.4 && doseMsv <= 1.1, `${member.id}: ${doseMsv} mSv/día`);
  }
  assert.equal(index.bmd.length, 1); assert.equal(index.sleep.length, 2);
  // El estrés percibido no se simula: solo proviene del chequeo psicológico.
  assert.equal(index.stress.length, 0);
  assert.ok(run.measurements.every(r => r.indicator !== 'stress'));
  assert.equal(catalog.stress.capture, 'self_report'); assert.equal(catalog.hr.capture, 'sensor');
  assert.equal(index.sys.length, index.dia.length);
  for (let i = 0; i < index.sys.length; i++) {
    assert.equal(index.sys[i].timestamp, index.dia[i].timestamp);
    assert.ok(index.sys[i].value > index.dia[i].value);
  }
  for (const row of run.measurements) {
    assert.equal(row.isDemo, true); assert.equal(row.captureMethod, 'synthetic');
    if (row.quality === 'valid') assert.ok(row.value >= catalog[row.indicator].domain[0] && row.value <= catalog[row.indicator].domain[1]);
  }
});

test('episodio correlacionado, huecos y recuperación preservan historia y última condición', () => {
  const run = memberView(simulate(), SCENARIO_SUBJECT), index = buildIndex(run);
  const at = (id, sec) => observationAt(run, index, id, sec);
  assert.ok(at('spo2', 1440).current.value < at('spo2', 0).current.value - 5);
  assert.ok(at('rr', 1440).current.value > at('rr', 0).current.value + 3);
  assert.equal(at('spo2', 2400).current, null);
  assert.equal(at('spo2', 2400).availability, 'disconnected');
  assert.ok(at('spo2', 2400).lastValid.elapsedSec < 2340);
  assert.equal(at('spo2', 2900).current.quality, 'valid');
  assert.equal(at('spo2', 3100).quality, 'low_quality');
  assert.equal(at('spo2', 3100).current, null);
  const oldCount = run.measurements.length;
  at('hr', 120); at('spo2', 2400); at('bmd', 3600);
  assert.equal(run.measurements.length, oldCount);
  assert.equal(index.spo2.find(r => r.elapsedSec === 2400).value, null);
  assert.ok(run.events.every(e => run.measurements.some(r => r.id === e.evidenceId)));
});

test('señal inválida no se convierte en condición médica ni contamina consultas', () => {
  const run = memberView(simulate({scenario: 'calidad'}), SCENARIO_SUBJECT), index = buildIndex(run);
  const reading = observationAt(run, index, 'spo2', 1500);
  assert.equal(reading.latest.value, 105); assert.equal(reading.latest.quality, 'invalid');
  assert.equal(reading.current, null); assert.equal(reading.condition, 'inside');
  assert.equal(run.events.filter(e => e.type === 'indicator' && e.indicator === 'spo2').length, 0);
});

test('configuración inválida y versiones incompatibles se rechazan', () => {
  for (const config of [{seed: -1}, {seed: 0.1}, {durationMinutes: 0}, {durationMinutes: 1441},
    {stepSec: 0}, {scenario: 'unknown'}, {startTime: '2026-02-30T12:00:00Z'}, {startTime: '2026-01-01'}, {name: ''}, {unknown: true}]) {
    assert.throws(() => normalizeConfig(config));
  }
  const run = simulate({durationMinutes: 1});
  assert.throws(() => validateResult({...run, schemaVersion: 3}));
  assert.throws(() => validateResult({...run, engineVersion: 'future'}));
  assert.throws(() => validateResult({...run, catalogVersion: 'future'}));
});

const rehash = payload => ({id: createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24), ...payload});

test('la telemetría rechaza estrés simulado; resultados 1.0.0 se leen sin presentar su estrés sintético', () => {
  const {id, ...payload} = simulate({durationMinutes: 1});
  const stressRow = {...payload.measurements.find(r => r.indicator === 'hr'), id: 'stress:0', indicator: 'stress', value: 3.4, unit: '/10', sourceId: 'bienestar', condition: 'inside'};
  const withStress = {...payload, measurements: [stressRow, ...payload.measurements]};
  assert.throws(() => validateResult(rehash(withStress)), /autoinforme/);
  const {crew, ...single} = withStress, mine = r => r.subjectId === 'ana-torres';
  const legacy = rehash({...single, schemaVersion: 1, engineVersion: 'synthetic-1.0.0', catalogVersion: 'entrega-1.0.0',
    subject: {id: 'ana-torres', name: 'Ana Torres', fictional: true}, measurements: single.measurements.filter(mine), events: single.events.filter(e => mine(e))});
  assert.equal(validateResult(legacy), legacy);
  assert.equal(buildIndex(legacy).stress.length, 0);
  const {radiationModel, ...priorDosimeter} = payload;
  assert.ok(validateResult(rehash({...priorDosimeter, engineVersion: 'synthetic-2.2.0', catalogVersion: 'entrega-1.2.0'})));
  // El catálogo ampliado no impide abrir ejecuciones de tripulación sin dosímetro.
  for (const engineVersion of ['synthetic-2.0.0', 'synthetic-2.1.0']) {
    const previous = rehash({...payload, engineVersion, catalogVersion: 'entrega-1.1.0',
      indicators: payload.indicators.filter(m => m.clave !== 'rad'),
      sources: payload.sources.filter(s => s.id !== 'radiacion'),
      measurements: payload.measurements.filter(r => r.indicator !== 'rad'),
      events: payload.events.filter(e => e.indicator !== 'rad')});
    assert.equal(validateResult(previous), previous);
    assert.equal(buildIndex(previous).rad, undefined);
  }
});

test('el estrés percibido se consulta desde los chequeos psicológicos', () => {
  const run = simulate({durationMinutes: 60});
  const check = (sec, stress, mood = 'Bien') => ({id: `c${sec}`, type: 'wellbeing', elapsedSec: sec, createdAt: `2026-11-14T22:00:${String(sec % 60).padStart(2, '0')}.000Z`,
    observedAt: new Date(Date.parse(run.config.startTime) + sec * 1000).toISOString(), payload: {mood, stress, note: ''}});
  const activity = [check(1800, 7.5, 'Bajo'), check(600, 3), {type: 'chat', elapsedSec: 0, payload: {}}];
  const index = buildIndex(run, activity);
  assert.deepEqual(index.stress.map(r => r.value), [3, 7.5]);
  assert.ok(index.stress.every(r => r.captureMethod === 'self_report' && r.sourceId === 'bienestar'));
  assert.equal(observationAt(run, index, 'stress', 300).current, null);
  assert.equal(observationAt(run, index, 'stress', 900).current.value, 3);
  assert.equal(observationAt(run, index, 'stress', 2000).condition, 'outside');
  assert.deepEqual(index.hr, buildIndex(run).hr);
});

test('archivo verificado, guardado idempotente y corrupción visible sin sobrescribir', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'simisa-files-'));
  const run = simulate({durationMinutes: 2});
  const first = await saveRun(run, dir);
  const bytes = await readFile(first.path, 'utf8');
  const duplicate = await saveRun(run, dir);
  assert.equal(duplicate.reused, true); assert.equal(await readFile(first.path, 'utf8'), bytes);
  assert.deepEqual((await readRun(run.id, dir)).result, run);
  assert.equal((await readdir(dir)).filter(n => n.endsWith('.tmp')).length, 0);
  await writeFile(first.path, bytes.replace('"quality": "valid"', '"quality": "invalid"'));
  const damaged = await readFile(first.path, 'utf8');
  await assert.rejects(readRun(run.id, dir)); await assert.rejects(saveRun(run, dir));
  assert.equal(await readFile(first.path, 'utf8'), damaged);
  const listing = await listRuns(dir); assert.equal(listing.runs.length, 0); assert.equal(listing.warnings.length, 1);
  await assert.rejects(readRun('../outside', dir));
});

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) { await new Promise(resolve => server.close(resolve)); }

test('API guarda, reinicia el servicio y vuelve a leer exactamente el archivo', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'simisa-restart-'));
  let server = createAppServer({dataDir: dir}), url = await listen(server);
  let original;
  try {
    const response = await fetch(url + '/api/runs', {method: 'POST', headers: {'Content-Type': 'application/json', ...CDR}, body: JSON.stringify({durationMinutes: 2})});
    assert.equal(response.status, 201);
    const {id} = await response.json();
    original = await (await fetch(url + '/api/runs/' + id, {headers: CDR})).json();
    assert.deepEqual(original, JSON.parse(await readFile(path.join(dir, id + '.json'), 'utf8')));
    assert.equal((await fetch(url + '/server.js')).status, 404);
    assert.equal((await fetch(url + '/api/runs', {method: 'POST', headers: {'Content-Type': 'application/json', Origin: 'https://example.org', ...CDR}, body: '{}'})).status, 403);
    assert.equal((await fetch(url + '/shared/catalog.js')).status, 200);
    const landing = await (await fetch(url + '/')).text();
    assert.match(landing, /<html lang="en">/);
    assert.equal((await fetch(url + '/js/i18n.js')).status, 200);
    for (const language of ['en', 'es']) {
      const documentation = await fetch(url + `/docs/${language}/README.md`);
      assert.equal(documentation.status, 200);
      assert.match(await documentation.text(), /SIMISA/);
    }
    assert.equal((await fetch(url + '/docs/%2e%2e%5cserver.js')).status, 403);
    assert.equal((await fetch(url + '/assets/corazon-oblicuo.png')).headers.get('content-type'), 'image/png');
  } finally { await close(server); }
  server = createAppServer({dataDir: dir}); url = await listen(server);
  try {
    const listing = await (await fetch(url + '/api/runs', {headers: CDR})).json();
    assert.equal(listing.runs[0].id, original.result.id);
    assert.deepEqual(await (await fetch(url + '/api/runs/' + original.result.id, {headers: CDR})).json(), original);
  } finally { await close(server); }
});

test('simulador independiente produce un archivo que la web recupera tras reiniciar el proceso', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'simisa-cli-'));
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const cliOutput = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['cli.js', '--name', 'Prueba independiente', '--duration', '2', '--out', dir], {cwd, windowsHide: true});
    let out = '', error = '';
    child.stdout.on('data', b => { out += b; }); child.stderr.on('data', b => { error += b; });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(JSON.parse(out)) : reject(new Error(error)));
  });
  const disk = JSON.parse(await readFile(cliOutput.file, 'utf8'));
  const launch = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.js'], {cwd, env: {...process.env, PORT: '0', SIMISA_DATA_DIR: dir}, windowsHide: true});
    let output = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error('El servidor no inició.')); }, 8000);
    child.on('error', reject);
    child.stdout.on('data', b => {
      output += b;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timeout); resolve({child, url: match[0]}); }
    });
  });
  for (let i = 0; i < 2; i++) {
    const {child, url} = await launch();
    try {
      const listing = await (await fetch(url + '/api/runs', {headers: CDR})).json();
      assert.equal(listing.runs[0].id, disk.result.id);
      const recovered = await (await fetch(url + '/api/runs/' + disk.result.id, {headers: CDR})).json();
      assert.deepEqual(recovered, disk);
      const index = buildIndex(recovered.result);
      assert.equal(observationAt(recovered.result, index, 'hr', 0).current.value, disk.result.measurements.find(r => r.indicator === 'hr').value);
      assert.equal(observationAt(recovered.result, index, 'rad', 0).current.value, disk.result.measurements.find(r => r.indicator === 'rad').value);
    } finally {
      const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited;
    }
  }
});

test('historial previo: lecturas espaciadas antes del inicio, chequeos sintéticos y validación', async () => {
  const run = simulate({durationMinutes: 10, historyDays: 14});
  validateResult(run);
  const kenji = memberView(run, SCENARIO_SUBJECT), index = buildIndex(kenji);
  const past = index.hr.filter(r => r.elapsedSec < 0);
  assert.equal(past[0].elapsedSec, -14 * 86400);
  assert.equal(past[1].elapsedSec - past[0].elapsedSec, 1800);
  assert.equal(index.rad[0].elapsedSec, -14 * 86400);
  assert.equal(index.rad[1].elapsedSec - index.rad[0].elapsedSec, 1800);
  assert.equal(index.sleep.filter(r => r.elapsedSec < 0).length, 14);
  // Una lectura del historial no queda "desactualizada" por su espaciado de 30 minutos.
  assert.ok(observationAt(kenji, index, 'hr', -86400 + 900).current);
  // Chequeos sintéticos diarios, marcados y por tripulante; el estrés de Kenji aumenta hacia el inicio.
  assert.equal(kenji.checkins.length, 14);
  assert.ok(index.stress.every(r => r.synthetic && r.captureMethod === 'self_report'));
  assert.ok(index.stress.at(-1).value > index.stress[0].value);
  assert.ok(run.measurements.every(r => r.indicator !== 'stress'));
  assert.throws(() => normalizeConfig({historyDays: 31}));
  const {id, ...payload} = run;
  const forged = {...payload, checkins: [{...payload.checkins[0], synthetic: false}]};
  assert.throws(() => validateResult(rehash(forged)), /sintético/);
});
