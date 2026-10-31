import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',future='00000000-0000-4000-8000-000000000003';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;insert into auth.users(id) values('${uid}'),('${other}');`);
for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
const get=async(id=uid)=>(await query('select public.get_player_skills($1) as result',[id]))[0].result;
const forbidden=async sql=>assert.rejects(db.transaction(tx=>tx.exec(sql)),/permission denied/);
test('account skill storage, initialization and rune requirements',async t=>{
 t.after(()=>db.close());
 await t.test('existing accounts have seven zeroed professions and twenty-one zeroed paths',async()=>{
  assert.equal((await query('select * from public.player_skills')).length,14);
  assert.equal((await query('select * from public.player_skill_specializations')).length,42);
  const {skills}=await get();assert.equal(skills.length,7);
  for(const skill of skills){assert.equal(skill.level,0);assert.equal(skill.xp,0);assert.equal(skill.completedActivities,0);assert.equal(skill.trainingSeconds,0);assert.equal(skill.specializations.length,3);for(const path of skill.specializations){assert.equal(path.level,0);assert.equal(path.xp,0);assert.equal(path.requiredLevel,30)}}
 });
 await t.test('activities use real rune types; an unset cost is never interpreted as free',async()=>{
  const expected={
   fishing:{primary:['air','water'],secondary:['mind','nature','death','soul']},
   farming:{primary:['water','nature','soul'],secondary:['mind','fire','death','blood']},
   mining:{primary:['nature','death','blood'],secondary:['air','water','fire','soul']},
   smithing:{primary:['fire','death','blood','soul'],secondary:['air','mind','nature']},
   crafting:{primary:['air','mind','nature','blood','soul'],secondary:['water','fire','death']},
   enchanting:{primary:['air','mind','water','fire','nature','death','blood','soul'],secondary:[]},
   cooking:{primary:['water','fire','nature','soul'],secondary:['mind','blood']}
  };
  for(const skill of (await get()).skills){assert.equal(skill.activities.length,1);const activity=skill.activities[0];assert.equal(activity.status,'planned');assert.equal(activity.requiredLevel,0);assert.deepEqual(activity.runes,[]);for(const usage of ['primary','secondary'])assert.deepEqual(skill.runeUsage.filter(r=>r.usage===usage).map(r=>r.id),expected[skill.id][usage]);assert(skill.runeUsage.every(r=>r.purpose&&r.description&&r.holdingDays>0));}
  assert.equal((await query('select * from public.skill_rune_usage')).length,49);
  assert.equal((await query("select * from public.skill_rune_usage where usage='primary'")).length,29);

 });
 await t.test('reads never reset earned skill or path progress and update timestamps are maintained',async()=>{
  await db.query("update public.player_skills set level=4,xp=44,completed_activities=1,training_seconds=15,updated_at='2000-01-01' where user_id=$1 and skill_id='cooking'",[uid]);
  await db.query("update public.player_skill_specializations set level=2,xp=12 where user_id=$1 and skill_id='cooking' and specialization_id='master-chef'",[uid]);
  for(let i=0;i<2;i++){const cooking=(await get()).skills.find(s=>s.id==='cooking');assert.equal(cooking.level,4);assert.equal(cooking.xp,44);assert.equal(cooking.completedActivities,1);assert.equal(cooking.trainingSeconds,15);assert.equal(cooking.specializations[2].xp,12);assert(new Date(cooking.updatedAt)>new Date('2000-01-01'));}
 });
 await t.test('new accounts initialize once without requiring a wallet',async()=>{
  await db.query('insert into auth.users(id) values($1)',[future]);const s=await get(future);assert.equal(s.skills.length,7);assert(s.skills.every(s=>s.level===0&&s.xp===0));await get(future);assert.equal((await query('select * from public.player_skills where user_id=$1',[future])).length,7);
  await assert.rejects(get('00000000-0000-4000-8000-000000000099'),/foreign key/);
 });
 await t.test('row-level security isolates player progress and clients cannot award XP or change costs',async()=>{
  await db.transaction(async tx=>{await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${other}',true)`);assert.equal((await tx.query('select * from public.player_skills')).rows.length,7);assert((await tx.query('select * from public.player_skills')).rows.every(s=>s.user_id===other));assert.equal((await tx.query('select * from public.player_skill_specializations')).rows.length,21);assert.equal((await tx.query('select * from public.skill_activity_runes')).rows.length,0);assert.equal((await tx.query('select * from public.skill_rune_usage')).rows.length,49)});
  for(const sql of ['update public.player_skills set xp=999','delete from public.player_skills','update public.player_skill_specializations set level=99',"update public.skill_activity_runes set quantity=1","update public.skill_rune_usage set usage='primary'",`select public.get_player_skills('${uid}')`,`insert into public.player_skills(user_id,skill_id) values('${uid}','cooking')`])await forbidden('set local role authenticated;'+sql);
  await forbidden('set local role anon;select * from public.player_skills');await forbidden('set local role anon;select * from public.skill_activity_runes');
  await db.transaction(async tx=>{await tx.exec('set local role service_role');assert.equal((await tx.query('select public.get_player_skills($1) as result',[uid])).rows[0].result.skills.length,7)});
 });
 await t.test('invalid levels, negative XP, invalid runes, and mismatched paths are rejected',async()=>{
  for(const sql of ['update public.player_skills set level=-1','update public.player_skills set level=100','update public.player_skills set xp=-1','update public.player_skills set completed_activities=-1','update public.player_skill_specializations set xp=-1',"insert into public.skill_activity_runes(activity_id,rune_id,quantity) values('cook-meals','fire',0)","insert into public.skill_activity_runes(activity_id,rune_id) values('cook-meals','earth')","update public.skill_rune_usage set usage='invalid'",`insert into public.player_skill_specializations(user_id,skill_id,specialization_id) values('${uid}','fishing','master-chef')`])await assert.rejects(db.transaction(tx=>tx.exec(sql)),/check constraint|foreign key/);
 });
 await t.test('skill reads preserve rune inventory and deleting an account cleans up owned progress',async()=>{
  await db.query('insert into public.player_rune_production(user_id) values($1)',[uid]);await db.query("insert into public.player_rune_inventory(user_id,rune_id,balance_ticks) values($1,'air',360000000000)",[uid]);await get();assert.equal((await query('select balance_ticks from public.player_rune_inventory where user_id=$1',[uid]))[0].balance_ticks,'360000000000');
  await db.query('delete from auth.users where id=$1',[future]);assert.equal((await query('select * from public.player_skills where user_id=$1',[future])).length,0);assert.equal((await query('select * from public.player_skill_specializations where user_id=$1',[future])).length,0);assert.equal((await query('select * from public.skill_types')).length,7);
 });
});
