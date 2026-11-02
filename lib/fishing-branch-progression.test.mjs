import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {fishingBranchLevels,fishingBranchProgress,fishingLevelGuideRows,skillProgressPercent,skillXpLabel} from './fishing-progression.mjs';
import {guideArticles,searchGuide} from './player-guide.mjs';

test('V2 branch thresholds are contiguous, match key PDF totals, and handle every level boundary',()=>{
 assert.equal(fishingBranchLevels.length,99);
 for(const [i,r] of fishingBranchLevels.entries()){
  assert.equal(r.level,i+1);assert.equal(fishingBranchProgress(r.totalXp).level,r.level);
  if(i){assert.equal(fishingBranchProgress(r.totalXp-1).level,r.level-1);assert.equal(fishingBranchLevels[i-1].totalXp+fishingBranchLevels[i-1].xpToNext,r.totalXp);}
 }
 assert.deepEqual([1,10,25,30,50,75,90,99].map(l=>fishingBranchLevels[l-1].totalXp),[0,100,500,731,3500,22000,65000,125000]);
 // The PDF has deliberate drops in per-level costs; preserve exact rows, not a fitted formula.
 assert.deepEqual([9,10,24,25,49,50,74,75,89,90].map(l=>fishingBranchLevels[l-1].xpToNext),[23,9,58,39,267,241,1645,960,6208,2337]);
 assert.equal(fishingBranchLevels.at(-1).xpToNext,null);
 const progress=fishingBranchProgress(55);assert.equal(progress.level,7);assert.equal(progress.xpIntoLevel,11);assert.equal(progress.xpRemaining,4);
 assert.equal(skillProgressPercent({level:7,xp:55,progression:progress}),11/15*100);
 assert.equal(skillXpLabel({level:7,xp:55,progression:progress}),'55 / 59 XP · 4 XP to level 8');
 assert.equal(fishingBranchProgress(Number.MAX_SAFE_INTEGER).percent,100);
 for(const xp of [-1,1.5,NaN,Infinity,'20',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>fishingBranchProgress(xp),RangeError);
 const guide=guideArticles.find(a=>a.id==='fishing-leveling');assert.deepEqual(guide.table.rows,fishingLevelGuideRows);
 assert.deepEqual(guide.table.rows.map(r=>Number(r[3].replaceAll(',',''))),fishingBranchLevels.map(r=>r.totalXp));
 for(const q of ['125000','switching','branch XP','3500'])assert(searchGuide(q).some(a=>a.id==='fishing-leveling'));
});

test('V2 migration derives independent branch levels, preserves XP and archived progress, and secures the curve',async t=>{
 const db=new PGlite();t.after(()=>db.close());const uid='00000000-0000-4000-8000-000000000001',future='00000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to service_role;insert into auth.users values('${uid}','{}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort(),index=files.findIndex(f=>f.endsWith('_fishing_level_system_v2.sql'));assert(index>0);
 for(const f of files.slice(0,index))await db.exec(await readFile(new URL(f,dir),'utf8'));
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const snapshot=async(id=uid)=>(await query('select public.get_player_skills($1) as result',[id]))[0].result;
 await snapshot();
 await db.exec(`update public.player_skills set xp=1428,completed_activities=9,training_seconds=123 where skill_id='fishing';update public.player_skill_specializations set level=2,xp=case specialization_id when 'commercial-fishing' then 55 when 'treasure-fishing' then 100 when 'trophy-fishing' then 125000 else 88 end;insert into public.player_rune_production(user_id) values('${uid}');insert into public.player_rune_inventory(user_id,rune_id,balance_ticks) values('${uid}','air',12345);`);
 const protectedSnapshot=async()=>(await query(`select (select jsonb_agg(to_jsonb(p) order by p.skill_id) from public.player_skills p) as skills,(select jsonb_agg(to_jsonb(i) order by i.rune_id) from public.player_rune_inventory i) as runes,(select jsonb_agg(to_jsonb(a) order by a.id) from public.fishing_activities a) as activities,(select jsonb_agg(to_jsonb(p) order by p.skill_id,p.specialization_id) from public.player_skill_specializations p where not(skill_id='fishing' and specialization_id in('commercial-fishing','treasure-fishing','trophy-fishing'))) as other_paths`))[0];
 const before=await protectedSnapshot();
 for(const f of files.slice(index,index+1))await db.exec(await readFile(new URL(f,dir),'utf8'));
 assert.deepEqual(await protectedSnapshot(),before);
 let fish=(await snapshot()).skills.find(s=>s.id==='fishing');assert.equal(fish.xp,1428);assert.equal(fish.level,30);assert.equal(fish.progression.curve,'fishing-v2');
 assert.deepEqual(fish.specializations.map(p=>[p.id,p.level,p.xp]),[['commercial-fishing',7,55],['treasure-fishing',10,100],['trophy-fishing',99,125000]]);
 assert.equal(fish.specializations[0].progression.xpRemaining,4);assert.equal(fish.specializations[1].progression.nextLevelXp,109);assert.equal(fish.specializations[2].progression.atMaxLevel,true);
 assert((await snapshot()).skills.filter(s=>s.id!=='fishing').every(s=>s.specializations.every(p=>p.progression===null)));
 assert.deepEqual((await query('select * from public.fishing_branch_xp_levels order by level')).map(r=>[r.level,Number(r.total_xp),r.xp_to_next===null?null:Number(r.xp_to_next)]),fishingBranchLevels.map(r=>[r.level,r.totalXp,r.xpToNext]));
 for(const id of ['commercial-fishing','treasure-fishing','trophy-fishing']){
  const otherBefore=await query('select specialization_id,xp,level from public.player_skill_specializations where user_id=$1 and specialization_id<>$2 order by specialization_id',[uid,id]);
  await db.transaction(async tx=>{
   await tx.exec('set local role service_role');
   for(const r of fishingBranchLevels)for(const xp of [r.totalXp,Math.max(0,r.totalXp-1)]){
    const row=(await tx.query("update public.player_skill_specializations set xp=$1,level=0 where user_id=$2 and specialization_id=$3 returning level,xp",[xp,uid,id])).rows[0];assert.equal(row.level,fishingBranchProgress(xp).level);assert.equal(Number(row.xp),xp);
   }
   await tx.query('update public.player_skill_specializations set xp=9007199254740991 where user_id=$1 and specialization_id=$2',[uid,id]);
  });
  assert.deepEqual(await query('select specialization_id,xp,level from public.player_skill_specializations where user_id=$1 and specialization_id<>$2 order by specialization_id',[uid,id]),otherBefore);
 }
 fish=(await snapshot()).skills.find(s=>s.id==='fishing');assert(fish.specializations.every(p=>p.level===99&&p.progression.nextLevelXp===null&&p.progression.xpRemaining===0));assert.equal(fish.xp,1428);
 const pathsBefore=await query('select * from public.player_skill_specializations order by specialization_id');await snapshot();await snapshot();assert.deepEqual(await query('select * from public.player_skill_specializations order by specialization_id'),pathsBefore);
 await db.exec(`insert into auth.users values('${future}','{}')`);const fresh=(await snapshot(future)).skills.find(s=>s.id==='fishing');assert(fresh.specializations.every(p=>p.level===1&&p.xp===0&&p.progression.xpRemaining===4));
 for(const role of ['anon','authenticated','service_role'])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};update public.fishing_branch_xp_levels set total_xp=999`)),/permission denied/);
 for(const role of ['anon','authenticated'])for(const sql of ['select public.fishing_branch_level_for_xp(55)',"update public.player_skill_specializations set xp=55"])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};${sql}`)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;set local request.jwt.claim.sub='${uid}'`);assert.equal((await tx.query('select * from public.fishing_branch_xp_levels')).rows.length,99);assert((await tx.query('select user_id from public.player_skill_specializations')).rows.every(r=>r.user_id===uid));});
 await assert.rejects(db.transaction(tx=>tx.exec("update public.player_skill_specializations set xp=-1 where specialization_id='commercial-fishing'")),/check constraint/);
 assert.equal((await query("select relrowsecurity from pg_class where oid='public.fishing_branch_xp_levels'::regclass"))[0].relrowsecurity,true);
});
