import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {smithingCatalog,smithingCategories,smithingGuideRow} from './smithing-catalog.mjs';
import {smithingLevels,smithingBranchLevels,smithingLevelGuideRows} from './smithing-progression.mjs';
import {guideArticles,searchGuide} from './player-guide.mjs';

test('Smithing V1 catalog and guide retain all source requirements, yields, and 99 XP levels',()=>{
 assert.equal(smithingCatalog.length,50);assert.equal(new Set(smithingCatalog.map(r=>r.id)).size,50);
 assert.deepEqual(smithingCategories.map(([id])=>smithingCatalog.filter(r=>r.category===id).length),[20,10,10,10]);
 for(const curve of [smithingLevels,smithingBranchLevels]){assert.equal(curve.length,99);curve.forEach((r,i)=>{assert.equal(r.level,i+1);if(i)assert.equal(curve[i-1].totalXp+curve[i-1].xpToNext,r.totalXp);});assert.equal(curve.at(-1).xpToNext,null);}
 assert.deepEqual([smithingLevels.at(-1).totalXp,smithingBranchLevels.at(-1).totalXp],[239164,125000]);
 assert(smithingCatalog.every(r=>Object.keys(r.runes).length>0&&r.materials.length>0&&r.durationSeconds%60===0&&r.outputs[0].quantity===r.yieldQuantity));
 assert.deepEqual([smithingCatalog[0].name,smithingCatalog[0].durationSeconds,smithingCatalog[0].xpReward],['Copper Bar',720,40]);
 const last=smithingCatalog.at(-1);assert.deepEqual([last.name,last.durationSeconds,last.xpReward,last.branchXpReward],['Eternal Masterwork Kit',25200,1240,680]);
 const hook=smithingCatalog.find(r=>r.name==='Precision Metal Hook');assert.deepEqual([hook.yieldQuantity,hook.xpReward,hook.branchXpReward],[3,250,140]);
 for(const [id] of smithingCategories)assert.deepEqual(guideArticles.find(a=>a.id===`smithing-master-${id}`).table.rows,smithingCatalog.filter(r=>r.category===id).map(smithingGuideRow));
 assert.deepEqual(guideArticles.find(a=>a.id==='smithing-leveling').table.rows,smithingLevelGuideRows);
 for(const q of ['Eternal Masterwork Kit','Wood Handle','Precision Metal Hook'])assert(searchGuide(q).some(a=>a.id.startsWith('smithing-master')));
});

test('Smithing migration preserves XP, matches all 50 rows and curves, derives independent levels, and denies client writes',async t=>{
 const db=new PGlite();t.after(()=>db.close());const uid='00000000-0000-4000-8000-000000000001',future='00000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users values('${uid}','{}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort(),index=files.findIndex(f=>f.endsWith('_smithing_master_v1.sql'));assert(index>0);
 for(const f of files.slice(0,index))await db.exec(await readFile(new URL(f,dir),'utf8'));
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const get=async(id=uid)=>(await query('select public.get_player_skills($1) as result',[id]))[0].result;
 await get();
 await db.exec(`update public.player_skills set xp=1428,completed_activities=9,training_seconds=123 where skill_id='smithing';update public.player_skill_specializations set xp=88,level=4 where skill_id='smithing';`);
 const beforeOther=(await get()).skills.filter(s=>s.id!=='smithing').map(s=>({...s,smithingActivities:null}));
 await db.query('insert into public.player_rune_production(user_id) values($1)',[uid]);await db.query("insert into public.player_rune_inventory(user_id,rune_id,balance_ticks) values($1,'air',360000000000)",[uid]);
 const inventoryBefore=await query('select * from public.player_rune_inventory order by user_id,rune_id');
 const old=await query("select specialization_id,xp,created_at from public.player_skill_specializations where skill_id='smithing' order by specialization_id");
 for(const f of files.slice(index,index+1))await db.exec(await readFile(new URL(f,dir),'utf8'));
 assert.deepEqual((await get()).skills.filter(s=>s.id!=='smithing'),beforeOther);
 assert.deepEqual(await query('select * from public.player_rune_inventory order by user_id,rune_id'),inventoryBefore);
 assert.deepEqual(await query("select specialization_id,xp,created_at from public.player_skill_specializations where skill_id='smithing' and specialization_id in ('toolsmith','armorsmith','master-weaponsmith') order by specialization_id"),old);
 assert((await query("select level from public.player_skill_specializations where specialization_id in ('armorsmith','master-weaponsmith')")).every(r=>r.level===4));
 let smithing=(await get()).skills.find(s=>s.id==='smithing');assert.equal(smithing.xp,1428);assert.equal(smithing.level,30);assert.equal(smithing.completedActivities,9);assert.equal(smithing.trainingSeconds,123);
 assert.deepEqual(smithing.specializations.map(p=>[p.id,p.requiredLevel,p.xp]),[['toolsmith',10,88],['artisan-equipment',30,0],['masterwork-forging',30,0]]);
 assert.equal(smithing.smithingActivities.length,50);
 for(const [i,src] of smithingCatalog.entries()){
  const actual=smithing.smithingActivities[i];for(const key of ['id','name','category','specializationId','branchName','requiredLevel','requiredBranchLevel','durationSeconds','xpReward','branchXpReward','yieldQuantity','materials','outputs'])assert.deepEqual(actual[key],src[key],`${src.name}: ${key}`);
  assert.deepEqual(actual.equipment,src.equipment);assert.deepEqual(Object.fromEntries(actual.runes.map(x=>[x.id,x.quantity])),src.runes);assert.equal(actual.status,'planned');assert.equal(actual.sourceVersion,'smithing-v1');
 }
 for(const [table,curve,where] of [['skill_xp_levels',smithingLevels," where skill_id='smithing'"],['smithing_branch_xp_levels',smithingBranchLevels,'']])assert.deepEqual((await query(`select level,total_xp,xp_to_next from public.${table}${where} order by level`)).map(r=>[r.level,Number(r.total_xp),r.xp_to_next===null?null:Number(r.xp_to_next)]),curve.map(r=>[r.level,r.totalXp,r.xpToNext]));
 for(const [fn,curve] of [['smithing',smithingLevels],['smithing_branch',smithingBranchLevels]])for(const [i,row] of curve.entries()){
  assert.equal((await query(`select public.${fn}_level_for_xp($1) as level`,[row.totalXp]))[0].level,row.level);
  if(i)assert.equal((await query(`select public.${fn}_level_for_xp($1) as level`,[row.totalXp-1]))[0].level,row.level-1);
 }
 await db.exec("update public.player_skill_specializations set xp=55,level=0 where specialization_id='toolsmith';update public.player_skill_specializations set xp=125001 where specialization_id='masterwork-forging'");
 smithing=(await get()).skills.find(s=>s.id==='smithing');assert.equal(smithing.specializations[0].level,7);assert.equal(smithing.specializations[0].progression.xpRemaining,4);assert.equal(smithing.specializations[1].xp,0);assert.equal(smithing.specializations[2].level,99);assert.equal(smithing.specializations[2].progression.atMaxLevel,true);assert.equal(smithing.xp,1428);
 await db.transaction(async tx=>{await tx.exec('set local role service_role');await tx.query("update public.player_skills set xp=239165,level=0 where user_id=$1 and skill_id='smithing'",[uid]);});
 smithing=(await get()).skills.find(s=>s.id==='smithing');assert.equal(smithing.level,99);assert.equal(smithing.xp,239165);assert.equal(smithing.progression.atMaxLevel,true);
 const stable=await get();await get();assert.deepEqual(await get(),stable);
 await db.exec(`insert into auth.users values('${future}','{}')`);const fresh=(await get(future)).skills.find(s=>s.id==='smithing');assert.equal(fresh.level,1);assert.equal(fresh.xp,0);assert(fresh.specializations.every(p=>p.level===1&&p.xp===0));
 const tables=['smithing_catalog_items','smithing_activities','smithing_activity_inputs','smithing_activity_runes','smithing_branch_xp_levels'];
 for(const table of tables){assert.equal((await query('select relrowsecurity from pg_class where oid=$1::regclass',[`public.${table}`]))[0].relrowsecurity,true);for(const role of ['anon','authenticated','service_role'])for(const privilege of ['insert','update','delete','truncate'])assert.equal((await query('select has_table_privilege($1,$2,$3) as allowed',[role,`public.${table}`,privilege]))[0].allowed,false);}
 for(const role of ['anon','authenticated'])for(const sql of ['select public.smithing_master_catalog()',`select public.get_player_skills('${uid}')`,"update public.player_skills set xp=999 where skill_id='smithing'","update public.player_skill_specializations set xp=999 where skill_id='smithing'"])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};${sql}`)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;set local request.jwt.claim.sub='${uid}'`);assert.equal((await tx.query('select * from public.smithing_activities')).rows.length,50);assert((await tx.query('select user_id from public.player_skill_specializations')).rows.every(r=>r.user_id===uid));});
 for(const sql of ["update public.smithing_activities set required_level=10 where category='artisan'","update public.smithing_activities set branch_xp=1 where category='standard'","update public.smithing_activities set status='available'","update public.smithing_activities set yield_quantity=0","update public.smithing_activity_inputs set quantity=0","update public.smithing_activity_runes set quantity=0","update public.player_skills set xp=-1 where skill_id='smithing'"])await assert.rejects(db.transaction(tx=>tx.exec(sql)),/check constraint/);
});
