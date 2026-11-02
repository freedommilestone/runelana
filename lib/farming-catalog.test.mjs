import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {farmingCatalog,farmingCategories,farmingGuideRow} from './farming-catalog.mjs';
import {farmingLevels,farmingBranchLevels,farmingLevelGuideRows} from './farming-progression.mjs';
import {guideArticles,searchGuide} from './player-guide.mjs';

test('Farming V1 catalog and guide retain all source requirements, yields, and 99 XP levels',()=>{
 assert.equal(farmingCatalog.length,50);assert.equal(new Set(farmingCatalog.map(r=>r.id)).size,50);
 assert.deepEqual(farmingCategories.map(([id])=>farmingCatalog.filter(r=>r.category===id).length),[20,10,10,10]);
 for(const curve of [farmingLevels,farmingBranchLevels]){assert.equal(curve.length,99);curve.forEach((r,i)=>{assert.equal(r.level,i+1);if(i)assert.equal(curve[i-1].totalXp+curve[i-1].xpToNext,r.totalXp);});assert.equal(curve.at(-1).xpToNext,null);}
 assert.deepEqual([farmingLevels.at(-1).totalXp,farmingBranchLevels.at(-1).totalXp],[239164,125000]);
 assert.deepEqual(farmingCatalog.filter(r=>!Object.keys(r.runes).length).map(r=>r.name),['Wheat']);
 for(const row of farmingCatalog){assert(row.materials.length);assert(row.yieldQuantity>0);assert.equal(row.outputs[0].quantity,row.yieldQuantity);assert.equal(row.durationSeconds%60,0);if(row.category==='standard'){assert.equal(row.branchXpReward,0);assert.equal(row.requiredBranchLevel,null);}else{assert(row.branchXpReward>0);assert(row.requiredLevel>=(row.category==='crop'?10:30));}}
 const bulk=farmingCatalog.find(r=>r.name==='Bulk Wheat');assert.deepEqual([bulk.durationSeconds,bulk.yieldQuantity,bulk.xpReward,bulk.branchXpReward,bulk.materials[0].quantity],[2100,12,100,60,3]);
 const last=farmingCatalog.at(-1);assert.deepEqual([last.name,last.durationSeconds,last.xpReward,last.branchXpReward],['World Tree Seedling',25200,940,565]);
 for(const [id] of farmingCategories)assert.deepEqual(guideArticles.find(a=>a.id===`farming-master-${id}`).table.rows,farmingCatalog.filter(r=>r.category===id).map(farmingGuideRow));
 assert.deepEqual(guideArticles.find(a=>a.id==='farming-leveling').table.rows,farmingLevelGuideRows);
 for(const q of ['World Tree Seedling','Compost Crop Seed','Eternal Bloom Herb','Legendary Gardening Kit'])assert(searchGuide(q).some(a=>a.id.startsWith('farming-master')));
});

test('Farming migration preserves XP, matches all 50 rows and curves, derives independent levels, and denies client writes',async t=>{
 const db=new PGlite();t.after(()=>db.close());const uid='00000000-0000-4000-8000-000000000001',future='00000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users values('${uid}','{}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort(),index=files.findIndex(f=>f.endsWith('_farming_master_v1.sql'));assert(index>0);
 for(const f of files.slice(0,index))await db.exec(await readFile(new URL(f,dir),'utf8'));
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const get=async(id=uid)=>(await query('select public.get_player_skills($1) as result',[id]))[0].result;
 await get();
 await db.exec(`update public.player_skills set xp=1428,completed_activities=9,training_seconds=123 where skill_id='farming';update public.player_skill_specializations set xp=88,level=4 where skill_id='farming';`);
 const beforeFish={...(await get()).skills.find(s=>s.id==='fishing'),farmingActivities:null};
 const old=await query("select * from public.player_skill_specializations where skill_id='farming' order by specialization_id");
 for(const f of files.slice(index,index+1))await db.exec(await readFile(new URL(f,dir),'utf8'));
 assert.deepEqual((await get()).skills.find(s=>s.id==='fishing'),beforeFish);
 assert.deepEqual(await query("select * from public.player_skill_specializations where skill_id='farming' and specialization_id in('market-gardener','herbalist','master-cultivator') order by specialization_id"),old);
 let farm=(await get()).skills.find(s=>s.id==='farming');assert.equal(farm.xp,1428);assert.equal(farm.level,30);assert.equal(farm.completedActivities,9);assert.equal(farm.trainingSeconds,123);
 assert.deepEqual(farm.specializations.map(p=>[p.id,p.requiredLevel,p.level,p.xp]),[['crop-farming',10,1,0],['herbalism',30,1,0],['rare-plant-cultivation',30,1,0]]);
 assert.equal(farm.farmingActivities.length,50);
 for(const [i,src] of farmingCatalog.entries()){
  const actual=farm.farmingActivities[i];for(const key of ['id','name','category','specializationId','branchName','requiredLevel','requiredBranchLevel','durationSeconds','xpReward','branchXpReward','yieldQuantity','materials','outputs'])assert.deepEqual(actual[key],src[key],`${src.name}: ${key}`);
  assert.deepEqual(actual.equipment,[src.equipment]);assert.deepEqual(Object.fromEntries(actual.runes.map(x=>[x.id,x.quantity])),src.runes);assert.equal(actual.status,'planned');assert.equal(actual.sourceVersion,'farming-v1');
 }
 for(const [table,curve,where] of [['skill_xp_levels',farmingLevels," where skill_id='farming'"],['farming_branch_xp_levels',farmingBranchLevels,'']])assert.deepEqual((await query(`select level,total_xp,xp_to_next from public.${table}${where} order by level`)).map(r=>[r.level,Number(r.total_xp),r.xp_to_next===null?null:Number(r.xp_to_next)]),curve.map(r=>[r.level,r.totalXp,r.xpToNext]));
 for(const [fn,curve] of [['farming',farmingLevels],['farming_branch',farmingBranchLevels]])for(const [i,row] of curve.entries()){
  assert.equal((await query(`select public.${fn}_level_for_xp($1) as level`,[row.totalXp]))[0].level,row.level);
  if(i)assert.equal((await query(`select public.${fn}_level_for_xp($1) as level`,[row.totalXp-1]))[0].level,row.level-1);
 }
 await db.exec("update public.player_skill_specializations set xp=55,level=0 where specialization_id='crop-farming';update public.player_skill_specializations set xp=125001 where specialization_id='rare-plant-cultivation'");
 farm=(await get()).skills.find(s=>s.id==='farming');assert.equal(farm.specializations[0].level,7);assert.equal(farm.specializations[0].progression.xpRemaining,4);assert.equal(farm.specializations[1].xp,0);assert.equal(farm.specializations[2].level,99);assert.equal(farm.specializations[2].progression.atMaxLevel,true);assert.equal(farm.xp,1428);
 await db.transaction(async tx=>{await tx.exec('set local role service_role');await tx.query("update public.player_skills set xp=239165,level=0 where user_id=$1 and skill_id='farming'",[uid]);});
 farm=(await get()).skills.find(s=>s.id==='farming');assert.equal(farm.level,99);assert.equal(farm.xp,239165);assert.equal(farm.progression.atMaxLevel,true);
 const stable=await get();await get();assert.deepEqual(await get(),stable);
 await db.exec(`insert into auth.users values('${future}','{}')`);const fresh=(await get(future)).skills.find(s=>s.id==='farming');assert.equal(fresh.level,1);assert.equal(fresh.xp,0);assert(fresh.specializations.every(p=>p.level===1&&p.xp===0));
 const tables=['farming_catalog_items','farming_activities','farming_activity_inputs','farming_activity_runes','farming_branch_xp_levels'];
 for(const table of tables){assert.equal((await query('select relrowsecurity from pg_class where oid=$1::regclass',[`public.${table}`]))[0].relrowsecurity,true);for(const role of ['anon','authenticated','service_role'])for(const privilege of ['insert','update','delete','truncate'])assert.equal((await query('select has_table_privilege($1,$2,$3) as allowed',[role,`public.${table}`,privilege]))[0].allowed,false);}
 for(const role of ['anon','authenticated'])for(const sql of ['select public.farming_master_catalog()',`select public.get_player_skills('${uid}')`,"update public.player_skills set xp=999 where skill_id='farming'","update public.player_skill_specializations set xp=999 where skill_id='farming'"])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};${sql}`)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;set local request.jwt.claim.sub='${uid}'`);assert.equal((await tx.query('select * from public.farming_activities')).rows.length,50);assert((await tx.query('select user_id from public.player_skill_specializations')).rows.every(r=>r.user_id===uid));});
 for(const sql of ["update public.farming_activities set required_level=10 where category='herbalism'","update public.farming_activities set branch_xp=1 where category='standard'","update public.farming_activities set status='available'","update public.farming_activities set yield_quantity=0","update public.farming_activity_inputs set quantity=0","update public.farming_activity_runes set quantity=0","update public.player_skills set xp=-1 where skill_id='farming'"])await assert.rejects(db.transaction(tx=>tx.exec(sql)),/check constraint/);
});
