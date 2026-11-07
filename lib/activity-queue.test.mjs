import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
test('activity queues reserve resources, reorder, refund, auto-advance offline and award exactly once',async t=>{
 const db=new PGlite();t.after(()=>db.close());const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users(id) values('${uid}'),('${other}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url);let upgradeJob;
 for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort()){
  if(file.endsWith('_activity_queue.sql')){
   await q("select public.update_player_profile($1,'initialize')",[other]);
   const before=(await q('select public.player_profile_snapshot($1) as data',[other]))[0].data;
   upgradeJob=(await q("select public.execute_player_skill_job($1,'start-skill',$2,'fishing-v4-shrimp',1,3600,'{\"Small Net\":\"small-fishing-net\"}') as data",[other,before.revision]))[0].data.state.activity;
  }
  await db.exec(await readFile(new URL(file,dir),'utf8'));
 }
 const get=async(id=uid)=>(await q('select public.player_profile_snapshot($1) as data',[id]))[0].data;
 const run=async(action,rev,{recipe='fishing-v4-shrimp',quantity=1,jobId=null,order=null,id=uid}={})=>(await q('select public.execute_player_skill_job($1,$2,$3,$4,$5,3600,$6,false,$7,$8) as data',[id,action,rev,recipe,quantity,JSON.stringify({'Small Net':'small-fishing-net'}),jobId,order]))[0].data;
 const air=async()=>BigInt((await q("select balance_ticks::text as n from public.player_rune_inventory where user_id=$1 and rune_id='air'",[uid]))[0].n)/3600000000n;
 const add=async(quantity=1,recipe='fishing-v4-shrimp')=>{const p=await get();const r=await run('start-skill',p.revision,{quantity,recipe});assert(!r.error,r.error);return r;};
 for(const id of [uid,other])await q("select public.update_player_profile($1,'initialize')",[id]);
 const upgraded=await get(other);assert.equal(upgraded.state.activity.id,upgradeJob.id);assert.equal(upgraded.state.activity.endsAt,upgradeJob.endsAt);
 assert(!(await run('cancel-skill',upgraded.revision,{id:other,jobId:upgradeJob.id})).error);
 let p=await add(1);const running=p.state.activity.id,firstEnd=p.state.activity.endsAt;
 p=await add(2);const a=p.state.activityQueue[0].id;p=await add(3);const b=p.state.activityQueue[1].id;
 assert.equal(await air(),44n);assert.equal(p.state.activity.id,running);assert.equal(p.state.activityQueue.length,2);
 let rev=p.revision;p=await run('reorder-skill',rev,{order:[b,a]});assert(!p.error,p.error);assert.deepEqual(p.state.activityQueue.map(j=>j.id),[b,a]);assert.equal(p.state.activity.endsAt,firstEnd);
 assert.equal((await run('reorder-skill',rev,{order:[a,b]})).status,409);
 for(const order of [[a,a],[running,a],[],[a,'00000000-0000-4000-8000-000000000099']])assert.equal((await run('reorder-skill',p.revision,{order})).status,409);
 assert.equal((await run('cancel-skill',(await get(other)).revision,{id:other,jobId:a})).status,409);assert.equal(await air(),44n);
 p=await run('cancel-skill',p.revision,{jobId:a});assert(!p.error,p.error);assert.equal(await air(),46n);assert.deepEqual(p.state.activityQueue.map(j=>j.id),[b]);
 assert.equal((await run('cancel-skill',p.revision,{jobId:a})).status,409);assert.equal(await air(),46n);
 // Finish first task while the next one should still be running; no polling delay added to its start.
 await q("update public.player_skill_jobs set started_at=clock_timestamp()-interval '7 minutes',ends_at=clock_timestamp()-interval '1 minute' where id=$1",[running]);
 const expectedStart=(await q('select extract(epoch from ends_at)*1000 as n from public.player_skill_jobs where id=$1',[running]))[0].n;
 p=await get();assert.equal(p.state.activity.id,b);assert.equal(p.state.activity.startedAt,Number(expectedStart));assert.equal(p.state.producedItems.find(i=>i.name==='Shrimp').quantity,1);
 assert.equal((await q("select xp from public.player_skills where user_id=$1 and skill_id='fishing'",[uid]))[0].xp,25);
 // A stale cancel of the completed task can never cancel the newly started task.
 assert.equal((await run('cancel-skill',p.revision,{jobId:running})).status,409);assert.equal((await get()).state.activity.id,b);
 p=await run('cancel-skill',p.revision,{jobId:b});assert(!p.error,p.error);assert.equal(await air(),49n);assert.equal(p.state.activity,null);
 // All reserved queued work catches up while offline, preserving the requested order.
 p=await add(1);const j1=p.state.activity.id;p=await add(2);const j2=p.state.activityQueue[0].id;p=await add(3);const j3=p.state.activityQueue[1].id;
 p=await run('reorder-skill',p.revision,{order:[j3,j2]});assert(!p.error,p.error);
 await q("update public.player_skill_jobs set started_at=clock_timestamp()-interval '3 hours',ends_at=clock_timestamp()-interval '2 hours' where id=$1",[j1]);
 const worker=(await q('select public.process_player_skill_queues() as data'))[0].data;assert.equal(worker.failed,0);assert.equal(worker.processed,1);
 p=await get();assert.equal(p.state.activity,null);assert.equal(p.state.activityQueue.length,0);assert.equal(p.state.producedItems.find(i=>i.name==='Shrimp').quantity,7);
 const finished=await q('select id,started_at,ends_at,status from public.player_skill_jobs where id=any($1) order by started_at',[[j1,j2,j3]]);assert.deepEqual(finished.map(j=>j.id),[j1,j3,j2]);assert.equal(+new Date(finished[1].started_at),+new Date(finished[0].ends_at));assert.equal(+new Date(finished[2].started_at),+new Date(finished[1].ends_at));
 const xp=(await q("select xp,completed_activities,training_seconds from public.player_skills where user_id=$1 and skill_id='fishing'",[uid]))[0];assert.deepEqual(xp,{xp:175,completed_activities:7,training_seconds:2520});
 await q('select public.process_player_skill_queues()');await get();assert.equal((await get()).state.producedItems.find(i=>i.name==='Shrimp').quantity,7);
 // Insufficient inputs roll back entirely; queued output is not spendable until completed.
 const before=await air();const bad=await run('start-skill',p.revision,{recipe:'cook-grilled-shrimp',quantity:5});assert.match(bad.error,/Not enough Shrimp/);assert.equal(await air(),before);
 p=await add(1,'cook-grilled-shrimp');assert.equal(p.state.producedItems.find(i=>i.name==='Shrimp').quantity,5);p=await run('cancel-skill',p.revision,{jobId:p.state.activity.id});assert.equal(p.state.producedItems.find(i=>i.name==='Shrimp').quantity,7);
 // Merchant service uses the same queue and automatic reward system.
 p=await add();p=(await q("select public.update_player_profile($1,'start',$2,'service') as data",[uid,p.revision]))[0].data;assert(!p.error,p.error);assert.equal(p.state.activityQueue[0].name,'Merchant Service');
 p=await run('cancel-skill',p.revision,{jobId:p.state.activity.id});assert.equal(p.state.activity.name,'Merchant Service');
 await q("update public.player_skill_jobs set started_at=clock_timestamp()-interval '2 minutes',ends_at=clock_timestamp()-interval '1 second' where id=$1",[p.state.activity.id]);p=await get();assert.equal(p.state.servicesCompleted,1);assert.equal(p.state.gp,40);assert.equal(p.state.xp,5);
 await q("update public.player_profiles set activity_type='service',activity_started_at=clock_timestamp()-interval '2 minutes',activity_ends_at=clock_timestamp()-interval '1 second' where user_id=$1",[uid]);
 assert.equal((await q('select public.process_player_skill_queues() as data'))[0].data.failed,0);p=await get();assert.equal(p.state.servicesCompleted,2);assert.equal(p.state.gp,80);
 // Queue cap and duplicate submissions cannot over-reserve.
 for(let i=0;i<20;i++)p=await add();assert.equal(p.state.activityQueue.length,19);assert.match((await run('start-skill',p.revision)).error,/full/);
 p=await run('cancel-skill',p.revision,{jobId:p.state.activityQueue[0].id});const simultaneous=await Promise.all([run('start-skill',p.revision),run('start-skill',p.revision)]);assert.equal(simultaneous.filter(r=>!r.error).length,1);
 // Owner reads, no direct client mutation or queue worker access.
 for(const sql of ['update public.player_skill_jobs set queue_position=1',`select public.settle_player_skill_queue('${uid}')`,'select public.process_player_skill_queues()'])await assert.rejects(db.transaction(tx=>tx.exec('set local role authenticated;'+sql)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${other}',true)`);assert((await tx.query('select * from public.player_skill_jobs')).rows.every(j=>j.user_id===other))});
 await db.transaction(async tx=>{await tx.exec('set local role service_role');const s=(await tx.query('select public.player_profile_snapshot($1) as data',[uid])).rows[0].data;assert.equal(s.queueAvailable,true)});
});
