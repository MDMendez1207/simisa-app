import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import http from 'node:http';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {simulate} from '../engine/simulator.js';
import {saveRun} from '../storage/files.js';
import {addActivity, readActivity} from '../storage/activity.js';
import {createAppServer} from '../server.js';

test('acciones persistentes sin modificar resultados; informe limitado al instante consultado', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'simisa-actions-')), result=simulate();
  const saved=await saveRun(result,dir), before=await readFile(saved.path,'utf8');
  for(const [type,payload,subjectId] of [ ['wellbeing',{mood:'Bien',stress:3,note:'Registro de prueba'}],['acknowledge',{eventId:result.events.find(e=>e.subjectId==='ana-torres')?.id ?? result.events[0].id},result.events.find(e=>e.subjectId==='ana-torres')?.subjectId ?? result.events[0].subjectId],['chat',{question:'Pulso',answer:'75'}],['chat',{question:'Saturación',answer:'97'}],['preferences',{reducedMotion:true}] ]) await addActivity(result.id,{type,payload,subjectId,elapsedSec:1200},dir);
  const report=await addActivity(result.id,{type:'report',payload:{},elapsedSec:1200},dir);
  assert.equal(report.payload.observations,result.measurements.filter(r=>r.elapsedSec<=1200&&r.subjectId==='ana-torres').length);
  await addActivity(result.id,{type:'dispatch',payload:{reportId:report.id},elapsedSec:1200},dir);
  await assert.rejects(addActivity(result.id,{type:'dispatch',payload:{reportId:report.id},elapsedSec:1200},dir));
  assert.equal((await readActivity(result.id,dir)).length,7);
  assert.equal(await readFile(saved.path,'utf8'),before);
  for(const payload of [{mood:'Feliz',stress:3},{mood:'Bien',stress:11},{mood:'Bien',stress:-1}]) await assert.rejects(addActivity(result.id,{type:'wellbeing',payload,elapsedSec:0},dir));
  for(let i=0;i<2;i++){
    const server=createAppServer({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try{const response=await fetch(`http://127.0.0.1:${server.address().port}/api/runs/${result.id}/activity`,{headers:{Cookie:'simisa_member=ana-torres'}});assert.equal(response.status,200);assert.equal((await response.json()).length,7);}
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
    const post=body=>fetch(`http://127.0.0.1:${server.address().port}/api/runs/${result.id}/activity`,{method:'POST',headers:{'Content-Type':'application/json',Cookie:'simisa_member=ana-torres'},body:JSON.stringify(body)});
    assert.equal((await post({type:'measurement',payload:{indicator:'spo2',value:98},elapsedSec:60})).status,400);
    assert.equal((await post({type:'wellbeing',payload:{mood:'Neutro',stress:4.5},elapsedSec:60})).status,201);
  } finally{await new Promise(r=>server.close(r));}
  assert.deepEqual((await readActivity(result.id,dir)).map(e=>e.type),['wellbeing']);
});

test('envíos simultáneos registran uno solo y un archivo dañado no bloquea el registro', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'simisa-dispatch-')), result=simulate({durationMinutes:5});
  await saveRun(result,dir);
  const report=await addActivity(result.id,{type:'report',payload:{},elapsedSec:60},dir);
  const outcomes=await Promise.allSettled(Array.from({length:5},()=>addActivity(result.id,{type:'dispatch',payload:{reportId:report.id},elapsedSec:60},dir)));
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
  await writeFile(path.join(dir,result.id+'-activity','dañado.json'),'{no es json');
  assert.deepEqual((await readActivity(result.id,dir)).map(e=>e.type).sort(),['dispatch','report']);
});

test('túnel: solo hosts públicos configurados; modo lectura bloquea escrituras remotas', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'simisa-tunnel-')), result=simulate({durationMinutes:5});
  await saveRun(result,dir);
  const call=(server,host,method='GET',origin)=>new Promise((resolve,reject)=>{
    const body=JSON.stringify({type:'wellbeing',payload:{mood:'Bien',stress:2},elapsedSec:0});
    const req=http.request({host:'127.0.0.1',port:server.address().port,path:`/api/runs/${result.id}/activity`,method,
      headers:{Host:host,Cookie:'simisa_member=ana-torres',...(method==='POST'?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}),...(origin?{Origin:origin}:{})}},
      res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
    req.on('error',reject); req.end(method==='POST'?body:undefined);
  });
  for(const readOnly of [false,true]){
    const server=createAppServer({dataDir:dir,publicHosts:['*.trycloudflare.com'],readOnly});await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try{
      assert.equal(await call(server,'demo.trycloudflare.com'),200);
      assert.equal(await call(server,'evil.example.com'),403);
      assert.equal(await call(server,'trycloudflare.com'),403);
      assert.equal(await call(server,'demo.trycloudflare.com','POST','https://otro.trycloudflare.com'),403);
      assert.equal(await call(server,'demo.trycloudflare.com','POST','https://demo.trycloudflare.com'),readOnly?403:201);
      assert.equal(await call(server,'127.0.0.1','POST'),201);
    } finally{await new Promise(r=>server.close(r));}
  }
});

test('permisos de tripulación: comandante y médica ven a todos; especialistas solo a sí mismos', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'simisa-crew-')), result=simulate({durationMinutes:5});
  await saveRun(result,dir);
  const server=createAppServer({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const as=(member,route,body)=>fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(member?{Cookie:`simisa_member=${member}`}:{})},body:body&&JSON.stringify(body)});
  try{
    assert.equal((await as(null,`/api/runs/${result.id}`)).status,401);
    const full=await (await as('lucia-ferreyra',`/api/runs/${result.id}`)).json();
    assert.equal(new Set(full.result.measurements.map(r=>r.subjectId)).size,4);
    const own=await (await as('omar-haddad',`/api/runs/${result.id}`)).json();
    assert.equal(own.scope,'self'); assert.ok(own.result.measurements.every(r=>r.subjectId==='omar-haddad'));
    assert.ok(own.result.events.every(e=>e.subjectId==='omar-haddad'));
    // Cada uno completa su chequeo; nadie lo hace por otro.
    assert.equal((await as('omar-haddad',`/api/runs/${result.id}/activity`,{type:'wellbeing',payload:{mood:'Bien',stress:2},elapsedSec:60})).status,201);
    assert.equal((await as('kenji-mori',`/api/runs/${result.id}/activity`,{type:'wellbeing',payload:{mood:'Bien',stress:2},elapsedSec:60})).status,201);
    assert.equal((await as('ana-torres',`/api/runs/${result.id}/activity`,{type:'wellbeing',subjectId:'kenji-mori',payload:{mood:'Bajo',stress:9},elapsedSec:60})).status,403);
    assert.equal((await as('omar-haddad',`/api/runs/${result.id}/activity`,{type:'report',subjectId:'kenji-mori',payload:{},elapsedSec:60})).status,403);
    assert.equal((await as('ana-torres',`/api/runs/${result.id}/activity`,{type:'report',subjectId:'kenji-mori',payload:{},elapsedSec:60})).status,201);
    const seen=async m=>(await (await as(m,`/api/runs/${result.id}/activity`)).json()).map(e=>e.subjectId).sort();
    assert.deepEqual(await seen('omar-haddad'),['omar-haddad']);
    assert.deepEqual(await seen('lucia-ferreyra'),['kenji-mori','kenji-mori','omar-haddad']);
    assert.equal((await as('kenji-mori','/api/runs',{durationMinutes:1})).status,403);
  } finally{await new Promise(r=>server.close(r));}
});
