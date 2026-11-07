import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {skillJobAction} from './skill-job.mjs';
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
test('skill requests accept intent only and bind identity to the authenticated user',()=>{
 const body={action:'start-skill',revision:1,item:'fishing-v4-shrimp',quantity:2,timeLimit:3600,selections:{'Small Net':'small-fishing-net'}};
 assert.equal(skillJobAction(body,{id:uid}).p_user_id,uid);
 for(const b of [{...body,user_id:other},{...body,xp:999},{...body,quantity:1.5},{...body,quantity:-1},{...body,quantity:10001},{...body,timeLimit:5},{...body,confirmed:'yes'},{...body,selections:[]}])assert.throws(()=>skillJobAction(b,{id:uid}));
});
test('profession jobs atomically reserve, persist, collect XP/items once, refund and enforce owner permissions',async t=>{
 const db=new PGlite();t.after(()=>db.close());const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users(id) values('${uid}'),('${other}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
 const get=async(id=uid)=>(await q('select public.player_profile_snapshot($1) as data',[id]))[0].data;
 const run=async(action,revision,item=null,quantity=1,time=3600,selections={},confirmed=false,id=uid)=>(await q('select public.execute_player_skill_job($1,$2,$3,$4,$5,$6,$7,$8) as data',[id,action,revision,item,quantity,time,JSON.stringify(selections),confirmed]))[0].data;
 const air=async()=>BigInt((await q("select balance_ticks::text as n from public.player_rune_inventory where user_id=$1 and rune_id='air'",[uid]))[0].n)/3600000000n;
 const ready=()=>q("update public.player_skill_jobs set started_at=clock_timestamp()-interval '1 day',ends_at=clock_timestamp()-interval '1 second' where user_id=$1 and status='running'",[uid]);
 for(const id of [uid,other])await q("select public.update_player_profile($1,'initialize')",[id]);
 let p=await get();const rev=p.revision;assert.equal(await air(),50n);
 let result=await run('start-skill',rev,'fishing-v4-shrimp',2,3600,{'Small Net':'small-fishing-net'});assert(!result.error,result.error);p=result;assert.equal(p.state.activity.quantity,2);assert.equal(p.state.activity.type,'skill');assert.equal(await air(),48n);assert.equal(p.state.producedItems.length,0);
 assert.equal((await run('start-skill',rev,'fishing-v4-shrimp',2,3600,{'Small Net':'small-fishing-net'})).status,409);
 assert.equal((await run('start-skill',p.revision,'fishing-v4-shrimp',1,3600,{'Small Net':'small-fishing-net'})).status,400);
 assert.equal((await q("select public.update_player_profile($1,'start',$2,'service') as data",[uid,p.revision]))[0].data.status,409);
 assert.equal((await run('collect-skill',p.revision)).status,400);assert.equal(await air(),48n);
 assert.equal((await get()).state.activity.id,p.state.activity.id);
 await ready();p=await run('collect-skill',p.revision);assert(!p.error,p.error);assert.equal(p.state.activity,null);assert.equal(p.state.producedItems.find(i=>i.name==='Shrimp').quantity,2);
 let skill=(await q("select * from public.player_skills where user_id=$1 and skill_id='fishing'",[uid]))[0];assert.equal(skill.xp,50);assert.equal(skill.completed_activities,2);assert.equal(skill.training_seconds,720);
 assert.equal((await run('collect-skill',p.revision)).status,400);assert.equal((await get()).state.producedItems[0].quantity,2);
 // Real Fishing output supplies the Cooking master list by exact item name.
 p=await run('start-skill',p.revision,'cook-grilled-shrimp',1);assert(!p.error,p.error);assert.equal(await air(),47n);assert.equal(p.state.producedItems.length,0);
 p=await run('cancel-skill',p.revision);assert(!p.error,p.error);assert.equal(await air(),48n);assert.equal(p.state.producedItems[0].quantity,2);
 assert.equal((await run('cancel-skill',p.revision)).status,400);assert.equal(await air(),48n);
 const before=p.revision;result=await run('start-skill',before,'cook-grilled-shrimp',2);assert.match(result.error,/Not enough Shrimp/);assert.equal(await air(),48n);assert.equal((await get()).revision,before);assert.equal((await get()).state.producedItems[0].quantity,2);
 p=await run('start-skill',before,'cook-grilled-shrimp',1);await ready();p=await run('collect-skill',p.revision);assert.equal(p.state.producedItems.find(i=>i.name==='Grilled Shrimp').quantity,2);assert.equal((await q("select xp from public.player_skills where user_id=$1 and skill_id='cooking'",[uid]))[0].xp,40);
 assert.match((await run('start-skill',p.revision,'fishing-v4-shrimp',1,3600,{})).error,/equipment/);
 assert.match((await run('start-skill',p.revision,'fishing-v4-shrimp',100,900,{'Small Net':'small-fishing-net'})).error,/time limit/);
 assert.match((await run('start-skill',p.revision,'fishing-v4-sardine',1,3600,{'Fishing Rod':'production:Fishing Rod',Bait:'basic-bait'})).error,/level/);
 assert.match((await run('start-skill',p.revision,'forged-client-recipe')).error,/not available/);
 // Mining checks holding-based rune access as well as owned runes.
 assert.match((await run('start-skill',p.revision,'MIN-001',1,3600,{'Bronze Pickaxe':'bronze-pickaxe'})).error,/unlocked/);
 const wallet=(await q('select * from public.link_player_wallet($1,$2,now(),$3)',[uid,'11111111111111111111111111111111','a'.repeat(64)]))[0];
 await q("insert into public.wallet_gp_history(user_id,link_version,status,summary,completed_at) values($1,$2,'complete',$3,now())",[uid,wallet.link_version,JSON.stringify({longestDays:365})]);
 // Every profession's first recipe executes with valid materials and equipment.
 for(const name of ['mining','farming','smithing','crafting']){
  const recipe=(await q(`select public.${name}_master_catalog() as data`))[0].data[0];
  const equipment={};for(const tool of recipe.equipment||[]){const found=(await q('select id from public.starter_item_types where name=$1 or id=public.skill_starter_equivalent($1)',[tool]))[0];if(found)equipment[tool]=found.id;else {await q("insert into public.player_skill_inventory values($1,$2,'crafting',1,now()) on conflict(user_id,item_name) do update set quantity=1",[uid,tool]);equipment[tool]='production:'+tool;}}
  for(const m of recipe.materials||[])await q('insert into public.player_skill_inventory values($1,$2,$3,$4,now()) on conflict(user_id,item_name) do update set quantity=excluded.quantity',[uid,m.name,name,m.quantity]);
  p=await get();p=await run('start-skill',p.revision,recipe.id,1,28800,equipment);assert(!p.error,name+': '+p.error);await ready();p=await run('collect-skill',p.revision);assert(!p.error,p.error);assert(p.state.producedItems.some(i=>i.name===recipe.outputs[0].name));
 }
 // Branch completion awards only the selected specialization's XP.
 await q("update public.player_skills set xp=184 where user_id=$1 and skill_id='fishing'",[uid]);
 const branchRecipe=(await q("select public.fishing_master_catalog() as data"))[0].data.find(r=>r.category==='commercial');
 for(const rune of branchRecipe.runes)await q('insert into public.player_rune_inventory values($1,$2,360000000000) on conflict(user_id,rune_id) do update set balance_ticks=360000000000',[uid,rune.id]);
 const branchEquipment={};for(const tool of branchRecipe.equipment){await q("insert into public.player_skill_inventory values($1,$2,'crafting',1,now()) on conflict do nothing",[uid,tool]);branchEquipment[tool]='production:'+tool;}
 p=await get();p=await run('start-skill',p.revision,branchRecipe.id,1,28800,branchEquipment);assert(!p.error,p.error);await ready();p=await run('collect-skill',p.revision);assert(!p.error,p.error);
 const branches=await q("select specialization_id,xp from public.player_skill_specializations where user_id=$1 and skill_id='fishing'",[uid]);assert.equal(branches.find(b=>b.specialization_id===branchRecipe.specializationId).xp,branchRecipe.branchXpReward);assert(branches.filter(b=>b.specialization_id!==branchRecipe.specializationId).every(b=>b.xp===0));
 // All catalog recipes resolve from the authoritative functions, not a client copy.
 for(const name of ['fishing','farming','mining','cooking','smithing','crafting']){
  const rows=(await q(`select public.${name}_master_catalog() as data`))[0].data;assert.equal(rows.length,50);
  for(const r of rows){const recipe=(await q('select public.skill_recipe_for_execution($1) as data',[r.id]))[0].data;assert.equal(recipe.skillId,name);assert(recipe.outputs.length);}
 }
 for(const sql of ['update public.player_skill_inventory set quantity=999','delete from public.player_skill_jobs',`select public.execute_player_skill_job('${uid}','collect-skill',1)`,`select public.skill_recipe_for_execution('fishing-v4-shrimp')`])await assert.rejects(db.transaction(tx=>tx.exec('set local role authenticated;'+sql)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${other}',true)`);assert.equal((await tx.query('select * from public.player_skill_inventory')).rows.length,0);assert.equal((await tx.query('select * from public.player_skill_jobs')).rows.length,0)});
 await db.transaction(async tx=>{await tx.exec('set local role service_role');const s=(await tx.query('select public.get_player_skills($1) as data',[uid])).rows[0].data;assert.equal(s.productionAvailable,true)});
 // Two requests using the same revision can never reserve twice.
 p=await get();const concurrent=await Promise.all([run('start-skill',p.revision,'fishing-v4-shrimp',1,3600,{'Small Net':'small-fishing-net'}),run('start-skill',p.revision,'fishing-v4-shrimp',1,3600,{'Small Net':'small-fishing-net'})]);assert.equal(concurrent.filter(r=>!r.error).length,1);
 assert.equal((await q("select count(*)::int as n from public.player_skill_jobs where user_id=$1 and status='running'",[uid]))[0].n,1);
});
