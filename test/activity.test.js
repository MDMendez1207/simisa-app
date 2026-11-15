import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {simulate} from '../engine/simulator.js';
import {saveRun} from '../storage/files.js';
import {addActivity, readActivity} from '../storage/activity.js';
import {createAppServer} from '../server.js';

test('acciones persistentes sin modificar resultados; informe limitado al instante consultado', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'simisa-actions-')), result=simulate();
  const saved=await saveRun(result,dir), before=await readFile(saved.path,'utf8');
  for(const [type,payload] of [ ['wellbeing',{mood:'Bien',stress:3,note:'Registro de prueba'}],['acknowledge',{eventId:result.events[0].id}],['chat',{question:'Pulso',answer:'75'}],['profile',{role:'Equipo médico'}],['preferences',{reducedMotion:true}] ]) await addActivity(result.id,{type,payload,elapsedSec:1200},dir);
  const report=await addActivity(result.id,{type:'report',payload:{},elapsedSec:1200},dir);
  assert.equal(report.payload.observations,result.measurements.filter(r=>r.elapsedSec<=1200).length);
  await addActivity(result.id,{type:'dispatch',payload:{reportId:report.id},elapsedSec:1200},dir);
  await assert.rejects(addActivity(result.id,{type:'dispatch',payload:{reportId:report.id},elapsedSec:1200},dir));
  assert.equal((await readActivity(result.id,dir)).length,7);
  assert.equal(await readFile(saved.path,'utf8'),before);
  for(const payload of [{mood:'Feliz',stress:3},{mood:'Bien',stress:11},{mood:'Bien',stress:-1}]) await assert.rejects(addActivity(result.id,{type:'wellbeing',payload,elapsedSec:0},dir));
  for(let i=0;i<2;i++){
    const server=createAppServer({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try{const response=await fetch(`http://127.0.0.1:${server.address().port}/api/runs/${result.id}/activity`);assert.equal(response.status,200);assert.equal((await response.json()).length,7);}
    finally{await new Promise(r=>server.close(r));}
  }
});

test('signos vitales y sueño no admiten carga manual; el chequeo psicológico sí', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'simisa-sensors-')), result=simulate({durationMinutes:5});
  await saveRun(result,dir);
  for(const [type,payload] of [['measurement',{indicator:'hr',value:75}],['measurement',{indicator:'sys',value:120}],['sleep',{hours:7.5,interruptions:2}]])
    await assert.rejects(addActivity(result.id,{type,payload,elapsedSec:60},dir),/exclusivamente de sensores/);
  const server=createAppServer({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const post=body=>fetch(`http://127.0.0.1:${server.address().port}/api/runs/${result.id}/activity`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await post({type:'measurement',payload:{indicator:'spo2',value:98},elapsedSec:60})).status,400);
    assert.equal((await post({type:'wellbeing',payload:{mood:'Neutro',stress:4.5},elapsedSec:60})).status,201);
  } finally{await new Promise(r=>server.close(r));}
  assert.deepEqual((await readActivity(result.id,dir)).map(e=>e.type),['wellbeing']);
});
