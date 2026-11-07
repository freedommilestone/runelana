import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {fishingCatalog,fishingCategories,fishingGuideRow} from './fishing-catalog.mjs';
import {guideArticles,searchGuide} from './player-guide.mjs';

test('V7 has 50 unique activities, explicit costs, equipment, and per-batch rewards',()=>{
 assert.equal(fishingCatalog.length,50);assert.equal(new Set(fishingCatalog.map(r=>r.id)).size,50);
 assert.deepEqual(fishingCategories.map(([id])=>fishingCatalog.filter(r=>r.category===id).length),[20,10,10,10]);
 for(const r of fishingCatalog){
  assert(r.requiredLevel>=1&&r.requiredLevel<=99);assert(r.equipment);assert(r.durationSeconds>0);assert(r.xpReward>0);
  assert(Object.keys(r.runes).length>0);assert(Object.values(r.runes).every(n=>Number.isInteger(n)&&n>0));
  if(r.category==='standard'){assert.equal(r.requiredBranchLevel,null);assert.equal(r.branchXpReward,0)}else{assert(r.requiredLevel>=10);assert(r.requiredBranchLevel>=1);assert(r.branchXpReward>0)}
  assert.equal(r.batchSize,r.name.includes('Bundle x5')?5:null);
 }
 assert.equal(fishingCatalog.filter(r=>r.referenceUrl).length,39);
 assert.equal(fishingCatalog.filter(r=>!r.referenceUrl&&r.reference==='Original Runelana artwork needed').length,11);
 for(const r of fishingCatalog){
  if(['treasure','trophy'].includes(r.category))assert(r.requiredLevel>=30);
  if(r.referenceUrl){assert(r.referenceUrl.startsWith('https://oldschool.runescape.wiki/w/'));assert.equal(r.reference,'View OSRS item');}
 }
 for(const [name,path] of [['Freshwater Pearl','Pearl'],['Giant Clam','Giant_clam'],['Ancient Coral','Coral'],['Trophy Trout','Raw_trout'],['Giant Salmon','Raw_salmon'],['Giant Swordfish','Raw_swordfish'],['Golden Lobster','Raw_lobster'],['Albino Shark','Raw_shark'],['Ancient Manta Ray','Raw_manta_ray']])assert.equal(fishingCatalog.find(r=>r.name===name).referenceUrl,'https://oldschool.runescape.wiki/w/'+path);
 assert(searchGuide('View OSRS item').some(a=>a.id==='fishing-master-standard'));
 const shrimp=fishingCatalog.find(r=>r.name==='Shrimp'),bundle=fishingCatalog.find(r=>r.name==='Shrimp Bundle x5'),guardian=fishingCatalog.at(-1);
 assert.deepEqual([shrimp.requiredLevel,shrimp.runes,shrimp.equipment,shrimp.durationSeconds,shrimp.xpReward],[1,{air:1},'Small Net',360,25]);
 assert.deepEqual([bundle.durationSeconds,bundle.xpReward,bundle.branchXpReward,bundle.batchSize],[1500,90,55,5]);
 assert.deepEqual([guardian.requiredLevel,guardian.requiredBranchLevel,guardian.durationSeconds,guardian.xpReward,guardian.branchXpReward],[99,99,21600,1185,710]);
 for(const [id] of fishingCategories){const article=guideArticles.find(a=>a.id===`fishing-master-${id}`);assert.deepEqual(article.table.rows,fishingCatalog.filter(r=>r.category===id).map(fishingGuideRow));assert.equal(article.status,'live');}
 for(const query of ['Mythical Ocean Guardian','Small Net','1185','Shrimp Bundle'])assert(searchGuide(query).some(a=>a.id.startsWith('fishing-master')));
});

test('V7 database and API exactly match all source rows, preserve progress, and deny writes',async t=>{
 const db=new PGlite();t.after(()=>db.close());const uid='00000000-0000-4000-8000-000000000001',future='00000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to service_role;insert into auth.users(id,raw_user_meta_data) values('${uid}','{}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort(),index=files.findIndex(f=>f.endsWith('_fishing_master_v4.sql'));
 for(const f of files.slice(0,index))await db.exec(await readFile(new URL(f,dir),'utf8'));
 await db.exec(`update public.player_skills set xp=184,completed_activities=3 where skill_id='fishing';update public.player_skill_specializations set xp=567,level=8 where skill_id='fishing' and specialization_id='river-angler';`);
 let progressBeforeV7;
 for(const f of files.slice(index)){
  if(f.endsWith('_fishing_master_v7.sql')){
   await db.exec(`update public.player_skill_specializations set xp=99,level=2 where specialization_id='treasure-fishing';`);
   progressBeforeV7=(await querySnapshot(db));
  }
  await db.exec(await readFile(new URL(f,dir),'utf8'));
  if(f.endsWith('_fishing_master_v7.sql'))assert.deepEqual(await querySnapshot(db),progressBeforeV7);
 }

 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const get=async(id=uid)=>(await query('select public.get_player_skills($1) as result',[id]))[0].result.skills.find(s=>s.id==='fishing');
 const fish=await get();assert.equal(fish.xp,184);assert.equal(fish.level,10);assert.equal(fish.completedActivities,3);assert.equal(fish.progression.nextLevelXp,213);
 assert.deepEqual(fish.specializations.map(s=>[s.name,s.requiredLevel,s.level,s.xp]),[['Commercial Fisher',10,1,0],['Treasure Fisher',30,9,99],['Trophy Fisher',30,1,0]]);
 const legacy=(await query("select xp,level from public.player_skill_specializations where skill_id='fishing' and specialization_id='river-angler'"))[0];assert.equal(Number(legacy.xp),567);assert.equal(legacy.level,8);
 assert(fish.activities.every(r=>r.status==='disabled'));assert.equal(fish.fishingActivities.length,50);
 const normalized=fish.fishingActivities.map(r=>({id:r.id,name:r.name,category:r.category,requiredLevel:r.requiredLevel,requiredBranchLevel:r.requiredBranchLevel,runes:Object.fromEntries(r.runes.map(x=>[x.id,x.quantity])),equipment:r.equipment[0],durationSeconds:r.durationSeconds,xpReward:r.xpReward,branchXpReward:r.branchXpReward,reference:r.reference,referenceUrl:r.referenceUrl,batchSize:r.batchSize}));
 assert.deepEqual(normalized,fishingCatalog);
 assert(fish.fishingActivities.every(r=>r.status==='planned'&&r.balanceStatus==='draft'&&r.sourceVersion==='fishing-v7'));
 await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${future}','{}')`);assert.equal((await get(future)).specializations.length,3);assert.equal((await get(future)).specializations[0].level,1);
 assert.equal((await query("select count(*)::int as count from public.player_skill_specializations where user_id=$1 and skill_id='fishing'",[future]))[0].count,3);
 await db.transaction(async tx=>{await tx.exec('set local role service_role');assert.equal((await tx.query('select public.fishing_master_catalog() as catalog')).rows[0].catalog.length,50);});
 for(const role of ['anon','authenticated','service_role'])for(const sql of ["update public.fishing_activities set required_level=10 where category='treasure'","update public.fishing_activities set required_level=10 where category='trophy'","update public.fishing_activities set fishing_xp=9999",'delete from public.fishing_activity_runes'])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};${sql}`)),/permission denied/);
 for(const role of ['anon','authenticated'])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};select public.fishing_master_catalog()`)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec('set local role authenticated');assert.equal((await tx.query('select * from public.fishing_activities')).rows.length,50);});
 for(const sql of ["update public.fishing_activities set required_level=10 where category='treasure'","update public.fishing_activities set required_level=10 where category='trophy'","update public.fishing_activities set required_branch_level=null where category='commercial'","update public.fishing_activities set branch_xp=1 where category='standard'","update public.fishing_activity_runes set quantity=0","update public.fishing_activities set status='available'"])await assert.rejects(db.transaction(tx=>tx.exec(sql)),/check constraint/);
 assert.equal((await query("select count(*)::int as count from pg_class where oid in('public.fishing_activities'::regclass,'public.fishing_activity_runes'::regclass) and relrowsecurity"))[0].count,2);
});

async function querySnapshot(db){
 const result={};
 for(const table of ['player_skills','player_skill_specializations','player_rune_inventory'])result[table]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') as snapshot from public.${table} t`)).rows[0].snapshot;
 return result;
}
