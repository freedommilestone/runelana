import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {cookingCatalog,cookingCategories,cookingGuideRow} from './cooking-catalog.mjs';
import {cookingLevels,cookingBranchLevels,cookingLevelGuideRows} from './cooking-progression.mjs';
import {guideArticles,searchGuide} from './player-guide.mjs';

test('Cooking V1 catalog and guide retain all source requirements, yields, and 99 XP levels',()=>{
 assert.equal(cookingCatalog.length,50);assert.equal(new Set(cookingCatalog.map(r=>r.id)).size,50);
 assert.deepEqual(cookingCategories.map(([id])=>cookingCatalog.filter(r=>r.category===id).length),[20,10,10,10]);
 for(const curve of [cookingLevels,cookingBranchLevels]){assert.equal(curve.length,99);curve.forEach((r,i)=>{assert.equal(r.level,i+1);if(i)assert.equal(curve[i-1].totalXp+curve[i-1].xpToNext,r.totalXp);});assert.equal(curve.at(-1).xpToNext,null);}
 assert.deepEqual([cookingLevels.at(-1).totalXp,cookingBranchLevels.at(-1).totalXp],[239164,125000]);
 assert(cookingCatalog.every(r=>Object.keys(r.runes).length>0));assert.equal(cookingCatalog.filter(r=>r.foodEligibility==='pending-profession').length,10);assert(cookingCatalog.every(r=>r.eligibleSkillId===null));
 for(const row of cookingCatalog){assert(row.materials.length);assert(row.yieldQuantity>0);assert.equal(row.outputs[0].quantity,row.yieldQuantity);assert.equal(row.durationSeconds%60,0);if(row.category==='standard'){assert.equal(row.branchXpReward,0);assert.equal(row.requiredBranchLevel,null);}else{assert(row.branchXpReward>0);assert(row.requiredLevel>=(row.category==='everyday'?10:30));}}
 const bulk=cookingCatalog.find(r=>r.name==="Fisherman's Lunchbox");assert.deepEqual([bulk.durationSeconds,bulk.yieldQuantity,bulk.xpReward,bulk.branchXpReward,bulk.timeReductionPercent],[1320,3,90,50,4]);
 const last=cookingCatalog.at(-1);assert.deepEqual([last.name,last.durationSeconds,last.xpReward,last.branchXpReward],["Mythic Chef's Table",27000,1330,730]);
 const shrimp=cookingCatalog[0];assert.deepEqual([shrimp.name,shrimp.durationSeconds,shrimp.yieldQuantity,shrimp.xpReward,shrimp.timeReductionPercent,shrimp.runes],['Grilled Shrimp',720,2,40,3,{air:1}]);
 assert.deepEqual(shrimp.materials.map(m=>[m.name,m.quantity]),[['Shrimp',2]]);
 for(const name of ["Ocean King's Banquet","Grandmaster's Meal","Mythic Chef's Table"])assert(cookingCatalog.find(r=>r.name===name).materials.some(m=>m.name==='Legendary Spice'&&m.quantity===1));
 assert.equal(cookingCatalog.find(r=>r.name==="Mythic Chef's Table").timeReductionPercent,20);
 assert.equal(cookingCatalog.find(r=>r.name==="Miner's Energy Bowl").foodEligibility,'pending-profession');
 for(const [id] of cookingCategories)assert.deepEqual(guideArticles.find(a=>a.id===`cooking-master-${id}`).table.rows,cookingCatalog.filter(r=>r.category===id).map(cookingGuideRow));
 assert.deepEqual(guideArticles.find(a=>a.id==='cooking-leveling').table.rows,cookingLevelGuideRows);
 for(const q of ["Mythic Chef's Table",'Legendary Spice','Sea Salt',"Miner's Energy Bowl"])assert(searchGuide(q).some(a=>a.id.startsWith('cooking-master')));
});

test('Cooking migration preserves XP, matches all 50 rows and curves, derives independent levels, and denies client writes',async t=>{
 const db=new PGlite();t.after(()=>db.close());const uid='00000000-0000-4000-8000-000000000001',future='00000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users values('${uid}','{}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort(),index=files.findIndex(f=>f.endsWith('_cooking_master_v1.sql'));assert(index>0);
 for(const f of files.slice(0,index))await db.exec(await readFile(new URL(f,dir),'utf8'));
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const get=async(id=uid)=>(await query('select public.get_player_skills($1) as result',[id]))[0].result;
 await get();
 await db.exec(`update public.player_skills set xp=1428,completed_activities=9,training_seconds=123 where skill_id='cooking';update public.player_skill_specializations set xp=88,level=4 where skill_id='cooking';`);
 const beforeOther=(await get()).skills.filter(s=>s.id!=='cooking').map(s=>({...s,cookingActivities:null}));
 await db.query('insert into public.player_rune_production(user_id) values($1)',[uid]);await db.query("insert into public.player_rune_inventory(user_id,rune_id,balance_ticks) values($1,'air',360000000000)",[uid]);
 const inventoryBefore=await query('select * from public.player_rune_inventory order by user_id,rune_id');
 const old=await query("select specialization_id,xp,created_at from public.player_skill_specializations where skill_id='cooking' order by specialization_id");
 for(const f of files.slice(index,index+1))await db.exec(await readFile(new URL(f,dir),'utf8'));
 assert.deepEqual((await get()).skills.filter(s=>s.id!=='cooking'),beforeOther);
 assert.deepEqual(await query('select * from public.player_rune_inventory order by user_id,rune_id'),inventoryBefore);
 assert.deepEqual(await query("select specialization_id,xp,created_at from public.player_skill_specializations where skill_id='cooking' order by specialization_id"),old);
 let cooking=(await get()).skills.find(s=>s.id==='cooking');assert.equal(cooking.xp,1428);assert.equal(cooking.level,30);assert.equal(cooking.completedActivities,9);assert.equal(cooking.trainingSeconds,123);
 assert.deepEqual(cooking.specializations.map(p=>[p.id,p.requiredLevel,p.xp]),[['everyday-chef',10,88],['artisan-chef',30,88],['master-chef',30,88]]);
 assert.equal(cooking.cookingActivities.length,50);
 for(const [i,src] of cookingCatalog.entries()){
  const actual=cooking.cookingActivities[i];for(const key of ['id','name','category','specializationId','branchName','requiredLevel','requiredBranchLevel','durationSeconds','xpReward','branchXpReward','yieldQuantity','materials','outputs','timeReductionPercent','foodEligibility','eligibleSkillId'])assert.deepEqual(actual[key],src[key],`${src.name}: ${key}`);
  assert.deepEqual(actual.equipment,src.equipment);assert.deepEqual(Object.fromEntries(actual.runes.map(x=>[x.id,x.quantity])),src.runes);assert.equal(actual.status,'planned');assert.equal(actual.sourceVersion,'cooking-v1');
 }
 for(const [table,curve,where] of [['skill_xp_levels',cookingLevels," where skill_id='cooking'"],['cooking_branch_xp_levels',cookingBranchLevels,'']])assert.deepEqual((await query(`select level,total_xp,xp_to_next from public.${table}${where} order by level`)).map(r=>[r.level,Number(r.total_xp),r.xp_to_next===null?null:Number(r.xp_to_next)]),curve.map(r=>[r.level,r.totalXp,r.xpToNext]));
 for(const [fn,curve] of [['cooking',cookingLevels],['cooking_branch',cookingBranchLevels]])for(const [i,row] of curve.entries()){
  assert.equal((await query(`select public.${fn}_level_for_xp($1) as level`,[row.totalXp]))[0].level,row.level);
  if(i)assert.equal((await query(`select public.${fn}_level_for_xp($1) as level`,[row.totalXp-1]))[0].level,row.level-1);
 }
 await db.exec("update public.player_skill_specializations set xp=55,level=0 where specialization_id='everyday-chef';update public.player_skill_specializations set xp=125001 where specialization_id='master-chef'");
 cooking=(await get()).skills.find(s=>s.id==='cooking');assert.equal(cooking.specializations[0].level,7);assert.equal(cooking.specializations[0].progression.xpRemaining,4);assert.equal(cooking.specializations[1].xp,88);assert.equal(cooking.specializations[2].level,99);assert.equal(cooking.specializations[2].progression.atMaxLevel,true);assert.equal(cooking.xp,1428);
 await db.transaction(async tx=>{await tx.exec('set local role service_role');await tx.query("update public.player_skills set xp=239165,level=0 where user_id=$1 and skill_id='cooking'",[uid]);});
 cooking=(await get()).skills.find(s=>s.id==='cooking');assert.equal(cooking.level,99);assert.equal(cooking.xp,239165);assert.equal(cooking.progression.atMaxLevel,true);
 const stable=await get();await get();assert.deepEqual(await get(),stable);
 await db.exec(`insert into auth.users values('${future}','{}')`);const fresh=(await get(future)).skills.find(s=>s.id==='cooking');assert.equal(fresh.level,1);assert.equal(fresh.xp,0);assert(fresh.specializations.every(p=>p.level===1&&p.xp===0));
 const tables=['cooking_catalog_items','cooking_activities','cooking_activity_inputs','cooking_activity_runes','cooking_branch_xp_levels'];
 for(const table of tables){assert.equal((await query('select relrowsecurity from pg_class where oid=$1::regclass',[`public.${table}`]))[0].relrowsecurity,true);for(const role of ['anon','authenticated','service_role'])for(const privilege of ['insert','update','delete','truncate'])assert.equal((await query('select has_table_privilege($1,$2,$3) as allowed',[role,`public.${table}`,privilege]))[0].allowed,false);}
 for(const role of ['anon','authenticated'])for(const sql of ['select public.cooking_master_catalog()',`select public.get_player_skills('${uid}')`,"update public.player_skills set xp=999 where skill_id='cooking'","update public.player_skill_specializations set xp=999 where skill_id='cooking'"])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};${sql}`)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;set local request.jwt.claim.sub='${uid}'`);assert.equal((await tx.query('select * from public.cooking_activities')).rows.length,50);assert((await tx.query('select user_id from public.player_skill_specializations')).rows.every(r=>r.user_id===uid));});
 for(const sql of ["update public.cooking_activities set required_level=10 where category='artisan'","update public.cooking_activities set branch_xp=1 where category='standard'","update public.cooking_activities set status='available'","update public.cooking_activities set yield_quantity=0","update public.cooking_activities set time_reduction_percent=100","update public.cooking_activities set food_eligibility='general-activity' where category='artisan'","update public.cooking_activities set eligible_skill_id='mining'","update public.cooking_activity_inputs set quantity=0","update public.cooking_activity_runes set quantity=0","update public.player_skills set xp=-1 where skill_id='cooking'"])await assert.rejects(db.transaction(tx=>tx.exec(sql)),/check constraint/);
});
