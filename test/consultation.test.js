import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../engine/simulator.js';
import {buildIndex, observationAt, summarize} from '../shared/results.js';
import {assistantAnswer} from '../web/js/presentation.js';
import {researchData, researchCSV} from '../web/js/sections.js';

test('el asistente consulta la lectura y el momento elegidos, incluyendo señal ausente', () => {
  const result = simulate({seed: 31415}), index = buildIndex(result);
  const context = elapsed => ({result, index, elapsed, observationAt, summarize});
  const expected = observationAt(result, index, 'spo2', 1060).current;
  const answer = assistantAnswer('¿Cómo está mi saturación?', context(1060));
  assert.ok(answer.includes(expected.value.toFixed(1) + ' %'));
  assert.ok(answer.includes(expected.timestamp.slice(11, 19)));
  const disconnected = assistantAnswer('¿Qué sensores están sin lectura?', context(2340));
  assert.match(disconnected, /sin lectura actual/);
  assert.match(disconnected, /Última lectura válida/);
});

test('la tabla de investigación excluye valores inválidos y conserva origen en su exportación', () => {
  const result = simulate({scenario: 'calidad'}), index = buildIndex(result);
  const rows = researchData(result, index, 1800), oxygen = rows.find(r => r.unit === '%');
  const valid = index.spo2.filter(r => r.elapsedSec <= 1800 && r.quality === 'valid');
  assert.equal(oxygen.count, valid.length);
  assert.ok(oxygen.max <= 100);
  const csv = researchCSV(result, index, 1800);
  assert.ok(csv.includes('Origen de los datos'));
  assert.ok(csv.includes('synthetic'));
  assert.ok(csv.includes('Saturación O₂'));
});
