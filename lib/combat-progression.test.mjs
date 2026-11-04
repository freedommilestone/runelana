import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {combatLevels,combatProgress,combatBaseStats,combatTraining,combatEncounters} from './combat-progression.mjs';

test('combat V1 thresholds, independent formulas, and catalog preserve the source',()=>{
 assert.equal(combatLevels.length,99);assert.equal(combatTraining.length,32);assert.equal(combatEncounters.length,7);
 for(const [i,r] of combatLevels.entries()){assert.equal(r.level,i+1);assert.equal(combatProgress(r.totalXp).level,r.level);if(i)assert.equal(combatProgress(r.totalXp-1).level,i);if(i<98)assert.equal(r.totalXp+r.xpToNext,combatLevels[i+1].totalXp)}
 assert.equal(combatLevels[98].totalXp,318888);assert.equal(combatProgress(400000).level,99);assert.equal(combatProgress(400000).xp,400000);
 for(const xp of [-1,1.5,NaN,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>combatProgress(xp));
 assert.deepEqual(combatBaseStats({attack:99,strength:99,defense:99,endurance:99}),{combatLevel:99,accuracy:117.8,power:112.9,resistance:98.2,maxHp:296});
 assert.equal(combatBaseStats({attack:99,strength:1,defense:1,endurance:1}).combatLevel,25);
 for(const d of ['attack','strength','defense','endurance']){const rows=combatTraining.filter(r=>r.disciplineId===d);assert.deepEqual(rows.map(r=>r.requiredLevel),[1,5,15,30,45,60,75,90]);assert.deepEqual(rows.map(r=>r.xpReward),[35,85,190,360,560,1050,1650,3000]);assert.ok(rows.every(r=>r.status==='planned'))}
});

test('combat SQL preserves profiles, derives levels, persists HP, and restricts writes',async t=>{
 const db=new PGlite();t.after(()=>db.close());const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users(id) values('${uid}'),('${other}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort(),index=files.findIndex(f=>f.endsWith('_combat_master_v1.sql'));
 assert.ok(index>0);for(const f of files.slice(0,index))await db.exec(await readFile(new URL(f,dir),'utf8'));
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const get=async(id=uid)=>(await q('select public.player_profile_snapshot($1) as data',[id]))[0].data;
 await q("select public.update_player_profile($1,'initialize')",[uid]);await q('select public.get_player_skills($1)',[uid]);
 const before=(await get()).state,skills=await q('select * from player_skills order by skill_id');
 await db.exec(await readFile(new URL(files[index],dir),'utf8'));
 assert.deepEqual((await get()).state,before);assert.deepEqual(await q('select * from player_skills order by skill_id'),skills);
 let c=(await get()).combat;assert.equal(c.combatLevel,1);assert.equal(c.currentHp,100);assert.equal(c.disciplines.length,4);assert.ok(c.disciplines.every(d=>d.level===1&&d.xp===0));assert.equal(c.trainingEnabled,false);
 const levels=await q('select level,total_xp,xp_to_next from combat_xp_levels order by level');assert.deepEqual(levels.map(r=>({level:r.level,totalXp:Number(r.total_xp),xpToNext:r.xp_to_next===null?null:Number(r.xp_to_next)})),combatLevels);
 assert.deepEqual(await q(`select id,discipline_id as "disciplineId",name,required_level as "requiredLevel",duration_seconds as "durationSeconds",xp_reward::integer as "xpReward",listed_xp_per_hour as "listedXpPerHour",risk,status,source_version as "sourceVersion" from combat_training_activities order by sort_order`),combatTraining);
 assert.deepEqual(await q(`select id,name,required_combat_level as "requiredCombatLevel",duration_seconds as "durationSeconds",suggested_gear as "suggestedGear",risk,potential_loot as "potentialLoot",status,source_version as "sourceVersion" from combat_encounters order by sort_order`),combatEncounters);
 for(const r of combatLevels){assert.equal((await q('select combat_level_for_xp($1) as level',[r.totalXp]))[0].level,r.level);if(r.level>1)assert.equal((await q('select combat_level_for_xp($1) as level',[r.totalXp-1]))[0].level,r.level-1)}
 await q("update player_combat_xp set xp=318888,level=1 where user_id=$1 and discipline_id='attack'",[uid]);assert.equal((await get()).combat.combatLevel,25);
 await q('update player_combat_state set current_hp=37 where user_id=$1',[uid]);assert.equal((await get()).combat.currentHp,37);assert.equal((await get()).combat.currentHp,37);
 await q("update player_combat_xp set xp=318888 where user_id=$1 and discipline_id='endurance'",[uid]);c=(await get()).combat;assert.equal(c.maxHp,296);assert.equal(c.currentHp,37);
 await q('update player_combat_state set current_hp=296 where user_id=$1',[uid]);await q("update player_combat_xp set xp=0 where user_id=$1 and discipline_id='endurance'",[uid]);assert.equal((await get()).combat.currentHp,100);
 for(const hp of [-1,101])await assert.rejects(q('update player_combat_state set current_hp=$2 where user_id=$1',[uid,hp]));
 await q("update player_combat_xp set xp=318888 where user_id=$1 and discipline_id='endurance'",[uid]);await q('update player_combat_state set current_hp=296 where user_id=$1',[uid]);await q("delete from player_combat_xp where user_id=$1 and discipline_id='endurance'",[uid]);assert.equal((await get()).combat.currentHp,100);
 await assert.rejects(q("update player_combat_xp set xp=-1 where user_id=$1",[uid]));
 await q("select public.update_player_profile($1,'initialize')",[other]);assert.equal((await get(other)).combat.currentHp,100);
 await db.transaction(async tx=>{await tx.exec('set local role service_role');assert.equal((await tx.query('select player_profile_snapshot($1) as data',[uid])).rows[0].data.combat.combatLevel,25)});
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;set local request.jwt.claim.sub='${other}'`);assert.equal((await tx.query('select * from player_combat_xp')).rows.length,4);assert.ok((await tx.query('select * from player_combat_state')).rows.every(r=>r.user_id===other))});
 for(const role of ['anon','authenticated'])for(const sql of ['update player_combat_xp set xp=999','delete from player_combat_state',`insert into player_combat_xp(user_id,discipline_id) values('${uid}','attack')`,`select player_combat_snapshot('${uid}')`,`select initialize_player_combat('${uid}')`,'update combat_training_activities set xp_reward=1'])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};${sql}`)),/permission denied/);
 await assert.rejects(db.transaction(tx=>tx.exec('set local role service_role;update combat_xp_levels set total_xp=999 where level=99')),/permission denied/);
 assert.equal((await get()).accountStats.skillsTotal,7);assert.equal((await get()).accountStats.skillsTrained,0);assert.deepEqual((await get()).state,before);
 await q('delete from auth.users where id=$1',[uid]);assert.equal((await q('select * from player_combat_xp where user_id=$1',[uid])).length,0);
});
