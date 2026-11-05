import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {professionXpLevels,branchXpLevels,combatXpLevels,universalProgress,specializationUnlocks} from './universal-xp.mjs';
const curves={profession:professionXpLevels,branch:branchXpLevels,combat:combatXpLevels};
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
function csv(text){const [header,...rows]=text.trim().split(/\r?\n/).map(r=>r.split(','));return rows.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]])))}
test('every supplied track row and unlock matches the universal source; boundary and cap behavior',async()=>{
 const rows=csv(await readFile(new URL('../docs/sources/universal-xp-v1/Runelana_All_Skill_Branches_XP_V1.csv',import.meta.url),'utf8'));
 assert.equal(rows.length,3168);
 for(const r of rows){const curve=curves[{Profession:'profession',Specialization:'branch',Combat:'combat'}[r.curve]],row=curve[Number(r.level)-1];assert.equal(row.totalXp,Number(r.total_xp));assert.equal(row.xpToNext??0,Number(r.xp_to_next)||0)}
 const unlocks=csv(await readFile(new URL('../docs/sources/universal-xp-v1/Runelana_Specialization_Unlocks_V1.csv',import.meta.url),'utf8'));
 assert.deepEqual(specializationUnlocks.map(s=>[s.skill,s.name,s.requiredLevel]),unlocks.map(s=>[s.parent_skill,s.specialization,Number(s.parent_level_required)]));
 for(const [kind,curve] of Object.entries(curves))for(const row of curve){const p=universalProgress(kind,row.totalXp);assert.equal(p.level,row.level);assert.equal(p.xpRemaining,row.xpToNext??0);if(row.level>1)assert.equal(universalProgress(kind,row.totalXp-1).level,row.level-1)}
 for(const [kind,curve] of Object.entries(curves)){const p=universalProgress(kind,curve.at(-1).totalXp+1000);assert.equal(p.level,99);assert.equal(p.xpRemaining,0);assert.equal(p.nextLevelXp,null);assert.equal(p.xp,curve.at(-1).totalXp+1000)}
 for(const xp of [-1,1.2,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>universalProgress('profession',xp));
});
test('database migration preserves XP, derives every track, and restricts client mutations',async t=>{
 const db=new PGlite();t.after(()=>db.close());const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users(id) values('${uid}'),('${other}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort(),current=files.find(f=>f.includes('universal_xp_master'));
 for(const f of files.filter(f=>f<current))await db.exec(await readFile(new URL(f,dir),'utf8'));
 await q("select public.update_player_profile($1,'initialize')",[uid]);await q('select public.get_player_skills($1)',[uid]);
 await q("update public.player_skills set xp=1428 where user_id=$1 and skill_id in('fishing','enchanting')",[uid]);
 await q("update public.player_skill_specializations set xp=3500 where user_id=$1 and specialization_id in('commercial-fishing','rune-scholar')",[uid]);
 await q("update public.player_combat_xp set xp=318899 where user_id=$1 and discipline_id='attack'",[uid]);
 const totals=async()=>(await q("select (select sum(xp) from public.player_skills) as skills,(select sum(xp) from public.player_skill_specializations) as branches,(select sum(xp) from public.player_combat_xp) as combat"))[0];const before=await totals();
 await db.exec(await readFile(new URL(current,dir),'utf8'));assert.deepEqual(await totals(),before);
 assert.equal((await q('select count(*)::int as n from public.universal_xp_levels'))[0].n,297);
 assert.equal((await q('select count(*)::int as n from public.skill_specializations where not archived'))[0].n,21);
 for(const s of specializationUnlocks){const actual=(await q('select name,required_level from public.skill_specializations where skill_id=$1 and id=$2 and not archived',[s.skillId,s.id]))[0];assert.deepEqual(actual,{name:s.name,required_level:s.requiredLevel})}
 for(const [kind,curve] of Object.entries(curves))for(const row of curve){const p=(await q('select public.universal_level_for_xp($1,$2) as level,public.universal_xp_progress($1,$2) as progress',[kind,row.totalXp]))[0];assert.equal(p.level,row.level);assert.equal(p.progress.xpRemaining,row.xpToNext??0);if(row.level>1)assert.equal((await q('select public.universal_level_for_xp($1,$2) as level',[kind,row.totalXp-1]))[0].level,row.level-1)}
 let snapshot=(await q('select public.get_player_skills($1) as data',[uid]))[0].data;
 assert.equal(snapshot.curveVersion,'universal-xp-v1');assert.equal(snapshot.skills.length,7);
 const enchant=snapshot.skills.find(s=>s.id==='enchanting');assert.equal(enchant.level,30);assert.equal(enchant.xp,1428);assert.equal(enchant.progression.xpRemaining,122);assert.deepEqual(enchant.specializations.map(s=>[s.name,s.level,s.xp,s.requiredLevel]),[['Elemental Enchanting',1,0,10],['Advanced Enchanting',1,0,30],['Seasonal Enchanting',1,0,30]]);
 assert.equal(snapshot.skills.find(s=>s.id==='fishing').specializations[0].level,50);assert.equal((await q("select xp from public.player_skill_specializations where user_id=$1 and specialization_id='rune-scholar'",[uid]))[0].xp,3500);
 await q("update public.player_skills set xp=239200,level=2 where user_id=$1 and skill_id='enchanting'",[uid]);await q("update public.player_skill_specializations set xp=125050,level=2 where user_id=$1 and specialization_id='elemental-enchanting'",[uid]);
 snapshot=(await q('select public.get_player_skills($1) as data',[uid]))[0].data;const max=snapshot.skills.find(s=>s.id==='enchanting');assert.equal(max.level,99);assert.equal(max.xp,239200);assert.equal(max.specializations[0].level,99);assert.equal(max.specializations[0].xp,125050);
 const combat=(await q('select public.player_combat_snapshot($1) as data',[uid]))[0].data;assert.equal(combat.disciplines[0].level,99);assert.equal(combat.disciplines[0].xp,318899);assert.equal(combat.disciplines[0].progression.curve,'universal-combat-v1');
 const fresh=(await q('select public.get_player_skills($1) as data',[other]))[0].data;for(const s of fresh.skills){assert.equal(s.level,1);assert.equal(s.xp,0);assert.equal(s.progression.xpRemaining,15);for(const b of s.specializations){assert.equal(b.level,1);assert.equal(b.xp,0);assert.equal(b.progression.xpRemaining,4)}}
 for(const sql of ['update public.player_skills set xp=9999','update public.player_skill_specializations set xp=9999','update public.universal_xp_levels set total_xp=0',`select public.get_player_skills('${uid}')`,`select public.universal_xp_progress('branch',0)`])await assert.rejects(db.transaction(tx=>tx.exec('set local role authenticated;'+sql)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${other}',true)`);assert.equal((await tx.query('select * from public.universal_xp_levels')).rows.length,297);assert((await tx.query('select user_id from public.player_skills')).rows.every(r=>r.user_id===other))});
 await db.transaction(async tx=>{await tx.exec('set local role service_role');assert.equal((await tx.query('select public.get_player_skills($1) as data',[uid])).rows[0].data.skills.length,7)});
});
