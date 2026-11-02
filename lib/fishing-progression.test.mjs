import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {fishingLevels,fishingProgress,skillProgressPercent,skillXpLabel} from './fishing-progression.mjs';
import {guideArticles,searchGuide} from './player-guide.mjs';

test('all 99 PDF thresholds match the per-level rounded formula and milestones',()=>{
 let cumulative=0;
 assert.equal(fishingLevels.length,99);
 for(const [i,row] of fishingLevels.entries()){
  assert.equal(row.level,i+1);assert.equal(row.totalXp,cumulative);
  const step=Math.round(15*1.075**i);
  assert.equal(row.xpToNext,i===98?null:step);
  assert.equal(fishingProgress(row.totalXp).level,row.level);
  if(i)assert.equal(fishingProgress(row.totalXp-1).level,row.level-1);
  cumulative+=step;
 }
 assert.equal(fishingLevels[9].totalXp,184);assert.equal(fishingLevels[29].totalXp,1428);assert.equal(fishingLevels[98].totalXp,239164);
 assert.equal(fishingProgress(20).xpIntoLevel,5);assert.equal(fishingProgress(20).xpRemaining,11);
 assert.equal(fishingProgress(239164).percent,100);assert.equal(fishingProgress(Number.MAX_SAFE_INTEGER).level,99);
 for(const xp of [-1,1.5,NaN,Infinity,'20',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>fishingProgress(xp),RangeError);
 const skill={xp:20,level:2,progression:fishingProgress(20)};
 assert.equal(skillProgressPercent(skill),31.25);assert.equal(skillXpLabel(skill),'20 / 31 XP · 11 XP to level 3');
});

test('guide exposes the complete curve, searchable milestones, and honest training status',()=>{
 const article=guideArticles.find(a=>a.id==='fishing-leveling');
 assert.equal(article.status,'live');assert.equal(article.table.rows.length,99);
 assert.deepEqual(article.table.rows.map(r=>Number(r[1].replaceAll(',',''))),fishingLevels.map(r=>r.totalXp));
 assert(article.paragraphs.join(' ').includes('remain previews'));
 for(const q of ['Fishing leveling','239164','Commercial','1.075'])assert(searchGuide(q).some(a=>a.id==='fishing-leveling'));
});

test('database migration preserves XP, derives levels, secures the curve, and returns progress',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 const uid='00000000-0000-4000-8000-000000000001',future='00000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;insert into auth.users(id) values('${uid}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
 const curveIndex=files.findIndex(f=>f.endsWith('_fishing_xp_progression.sql'));
 for(const file of files.slice(0,curveIndex))await db.exec(await readFile(new URL(file,dir),'utf8'));
 await db.exec('alter default privileges in schema public grant all on tables to service_role');
 await db.exec(`update public.player_skills set xp=20,level=50,completed_activities=2,training_seconds=120 where skill_id='fishing';update public.player_skill_specializations set level=3,xp=100 where skill_id='fishing' and specialization_id='river-angler';update public.player_skills set level=7,xp=88 where skill_id='cooking';`);
 for(const file of files.slice(curveIndex))await db.exec(await readFile(new URL(file,dir),'utf8'));
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const snapshot=async(id=uid)=>(await query('select public.get_player_skills($1) as result',[id]))[0].result;
 let result=await snapshot(),fish=result.skills.find(s=>s.id==='fishing');
 assert.equal(fish.xp,20);assert.equal(fish.level,2);assert.equal(fish.completedActivities,2);assert.equal(fish.trainingSeconds,120);
 assert.equal(fish.progression.xpRemaining,11);assert.equal(fish.progression.nextLevelXp,31);
 const archived=(await query("select xp,level from public.player_skill_specializations where user_id=$1 and skill_id='fishing' and specialization_id='river-angler'",[uid]))[0];assert.equal(Number(archived.xp),100);assert.equal(archived.level,3);
 assert.deepEqual(fish.specializations.map(s=>s.requiredLevel),[10,30,30]);
 assert.equal(result.skills.find(s=>s.id==='cooking').level,7);
 assert.equal(result.skills.find(s=>s.id==='cooking').progression,null);
 const table=await query("select level,total_xp,xp_to_next from public.skill_xp_levels where skill_id='fishing' order by level");
 assert.deepEqual(table.map(r=>[r.level,Number(r.total_xp),r.xp_to_next===null?null:Number(r.xp_to_next)]),fishingLevels.map(r=>[r.level,r.totalXp,r.xpToNext]));
 await db.transaction(async tx=>{
  await tx.exec('set local role service_role');
  for(const row of fishingLevels){for(const xp of [row.totalXp,Math.max(0,row.totalXp-1)]){
   const saved=(await tx.query("update public.player_skills set xp=$1,level=0 where user_id=$2 and skill_id='fishing' returning xp,level",[xp,uid])).rows[0];
   assert.equal(saved.level,fishingProgress(xp).level);assert.equal(Number(saved.xp),xp);
  }}
  await tx.query("update public.player_skills set xp=9007199254740991 where user_id=$1 and skill_id='fishing'",[uid]);
  const max=(await tx.query('select public.get_player_skills($1) as result',[uid])).rows[0].result.skills.find(s=>s.id==='fishing');
  assert.equal(max.level,99);assert.equal(max.progression.atMaxLevel,true);assert.equal(max.progression.nextLevelXp,null);assert.equal(max.progression.xpRemaining,0);
 });
 await db.exec(`insert into auth.users(id) values('${future}')`);
 result=await snapshot(future);assert.equal(result.skills.find(s=>s.id==='fishing').level,1);assert.equal(result.skills.find(s=>s.id==='fishing').xp,0);
 for(const role of ['anon','authenticated'])for(const sql of ["update public.player_skills set xp=1000", "update public.skill_xp_levels set total_xp=0", "select public.fishing_level_for_xp(1000)"]){
  await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};${sql}`)),/permission denied/);
 }
 await assert.rejects(db.transaction(tx=>tx.exec("set local role service_role;update public.skill_xp_levels set total_xp=1")),/permission denied/);
 await assert.rejects(db.transaction(tx=>tx.exec("update public.player_skills set xp=-1 where skill_id='fishing'")),/check constraint/);
 await db.transaction(async tx=>{await tx.exec('set local role authenticated');assert.equal((await tx.query("select * from public.skill_xp_levels where skill_id='fishing'")).rows.length,99);});
 assert.equal((await query("select relrowsecurity from pg_class where oid='public.skill_xp_levels'::regclass"))[0].relrowsecurity,true);
});
