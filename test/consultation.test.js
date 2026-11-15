import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../engine/simulator.js';
import {buildIndex, observationAt, summarize} from '../shared/results.js';
import {assistantAnswer} from '../web/js/presentation.js';
import {researchData, researchCSV} from '../web/js/sections.js';
import {memberView, SCENARIO_SUBJECT} from '../shared/crew.js';

test('el asistente consulta la lectura y el momento elegidos, incluyendo señal ausente', () => {
  const result = memberView(simulate({seed: 31415}), SCENARIO_SUBJECT), index = buildIndex(result);
  const context = elapsed => ({result, index, elapsed, observationAt, summarize});
  const expected = observationAt(result, index, 'spo2', 1060).current;
  const answer = assistantAnswer('¿Cómo está mi saturación?', context(1060));
  assert.ok(answer.includes(expected.value.toFixed(1) + ' %'));
  assert.ok(answer.includes(expected.timestamp.slice(11, 19)));
  const disconnected = assistantAnswer('¿Qué sensores están sin lectura?', context(2340));
  assert.match(disconnected, /sin lectura actual/);
  assert.match(disconnected, /Última lectura válida/);
  const radiation = observationAt(result, index, 'rad', 1060).current;
  const dosimeter = assistantAnswer('Promedio de radiación del dosímetro', context(1060));
  assert.ok(dosimeter.includes(radiation.value.toFixed(2) + ' µSv/h'));
  assert.match(dosimeter, /media/);
  assert.match(dosimeter, /Sin umbral/);
  assert.match(assistantAnswer('Tasa de dosis de radiación', context(1060)), /µSv\/h/);
  assert.match(assistantAnswer('Dosis acumulada', context(1060)), /no calcula la dosis acumulada/);
  const old = {...result, indicators: result.indicators.filter(m => m.clave !== 'rad')};
  assert.match(assistantAnswer('Radiación', {...context(1060), result: old}), /no contiene lecturas/);
});

test('la tabla de investigación excluye valores inválidos y conserva origen en su exportación', () => {
  const result = memberView(simulate({scenario: 'calidad'}), SCENARIO_SUBJECT), index = buildIndex(result);
  const rows = researchData(result, index, 1800), oxygen = rows.find(r => r.unit === '%');
  const valid = index.spo2.filter(r => r.elapsedSec <= 1800 && r.quality === 'valid');
  assert.equal(oxygen.count, valid.length);
  assert.ok(oxygen.max <= 100);
  const csv = researchCSV(result, index, 1800);
  assert.ok(csv.includes('Origen de los datos'));
  assert.ok(csv.includes('synthetic'));
  assert.ok(csv.includes('Saturación O₂'));
  assert.ok(csv.includes('Tasa de dosis de radiación'));
  assert.equal(rows.find(r => r.id === 'rad').count, index.rad.filter(r => r.elapsedSec <= 1800).length);
});

test('estado de sensores: desconexión, señal inválida y batería baja como posibles problemas', async () => {
  const {deviceStatus} = await import('../shared/devices.js');
  const result = memberView(simulate(), SCENARIO_SUBJECT), index = buildIndex(result);
  const oximeter = elapsed => deviceStatus(result, index, elapsed).find(d => d.source.id === 'oximetria');
  assert.equal(oximeter(600).state, 'ok');
  assert.equal(oximeter(2400).state, 'off');
  assert.ok(oximeter(2400).issues.some(i => i.level === 'bad' && /Sin señal/.test(i.text)));
  assert.ok(oximeter(940).battery < 20 && oximeter(940).issues.some(i => /Batería baja/.test(i.text)));
  assert.equal(oximeter(3100).state, 'low');
  const invalid = memberView(simulate({scenario: 'calidad'}), SCENARIO_SUBJECT);
  assert.equal(deviceStatus(invalid, buildIndex(invalid), 1500).find(d => d.source.id === 'oximetria').state, 'invalid');
  const devices = deviceStatus(result, index, 600);
  assert.equal(devices.length, 9);
  const dosimeter = devices.find(d => d.source.id === 'radiacion');
  assert.equal(dosimeter.device.name, 'Dosímetro personal');
  assert.equal(dosimeter.metrics[0].clave, 'rad');
  assert.equal(dosimeter.latest.unit, 'µSv/h');
  assert.equal(dosimeter.state, 'ok');
  assert.equal(dosimeter.observation.condition, 'unknown');
});

test('guía de salud: autocuidado en rango, revisar dispositivo sin lectura, escalamiento si persiste', async () => {
  const {guidance, INDICATOR_GUIDE, HAZARDS, RISKS} = await import('../shared/health-guide.js');
  const result = memberView(simulate(), SCENARIO_SUBJECT), index = buildIndex(result);
  const at = (id, sec) => guidance(id, observationAt(result, index, id, sec), index[id], sec, {periodSec: result.indicators.find(m => m.clave === id).periodSec});
  assert.equal(at('spo2', 600).level, 'ok');
  assert.equal(at('spo2', 2400).level, 'device');
  assert.equal(at('rad', 600).level, 'info');
  const outsideTimes = index.spo2.filter(r => r.quality === 'valid' && r.condition === 'outside').map(r => r.elapsedSec);
  assert.ok(outsideTimes.length);
  assert.equal(at('spo2', outsideTimes[0]).level, 'crew');
  const late = outsideTimes.find(t => t - outsideTimes[0] >= 600);
  if (late) assert.equal(at('spo2', late).level, 'ground');
  // Cada indicador cita peligros y riesgos existentes de NASA HRP.
  for (const m of result.indicators) {
    const g = INDICATOR_GUIDE[m.clave];
    assert.ok(g && g.hazards.every(h => HAZARDS[h]?.url.startsWith('https://www.nasa.gov/')) && g.risks.every(r => RISKS[r]?.url.startsWith('https://www.nasa.gov/')));
  }
});
