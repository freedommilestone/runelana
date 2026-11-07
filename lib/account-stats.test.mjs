import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {holdingDuration,statsDate,accountStatRows,displayedHolding} from './account-stats.mjs';

test('account stat display distinguishes unknown, zero, partial days, and changed wallets',()=>{
 assert.equal(holdingDuration(null),'—');assert.equal(holdingDuration(-1),'—');assert.equal(holdingDuration(0),'0 days');assert.equal(holdingDuration(86400+7200),'1d 2h');assert.equal(holdingDuration(60),'< 1 hour');assert.equal(statsDate(null),'—');assert.equal(statsDate('2026-10-01T00:00:00Z'),'Oct 1, 2026');
 const stats={skillsTrained:0,skillsTotal:7,equipmentCollected:0,servicesCompleted:0,holding:{status:'current',walletAddress:'A',totalSeconds:86400,currentSeconds:86400,longestSeconds:86400}};
 assert.equal(accountStatRows(stats).find(x=>x[1]==='Skills Trained')[2],'0 / 7');assert.equal(accountStatRows(null).find(x=>x[1]==='Services Completed')[2],'—');
 assert.equal(displayedHolding(stats,null),stats.holding);assert.equal(displayedHolding(stats,{wallet:{address:'A'}}),stats.holding);
 assert.deepEqual(displayedHolding(stats,{wallet:null}),{status:'unverified'});assert.deepEqual(displayedHolding(stats,{wallet:{address:'B'}}),{status:'pending'});
});

test('account stats reconcile source records, preserve rewards, and isolate player data',async t=>{
 const db=new PGlite();t.after(()=>db.close());const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',future='00000000-0000-4000-8000-000000000003';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users(id,created_at) values('${uid}','2026-01-02'),('${other}','2026-03-04');`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort(),index=files.findIndex(f=>f.endsWith('_player_account_stats.sql'));
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const get=async(id=uid)=>(await q('select public.player_profile_snapshot($1) as data',[id]))[0].data;
 const act=async(action,revision=null,item=null,id=uid)=>(await q('select public.update_player_profile($1,$2,$3,$4) as data',[id,action,revision,item]))[0].data;
 for(const f of files.slice(0,index))await db.exec(await readFile(new URL(f,dir),'utf8'));
 await act('initialize');await act('initialize',null,null,other);await q('select public.get_player_skills($1)',[uid]);await q('select public.get_player_skills($1)',[other]);
 const before=(await get()).state;for(const f of files.slice(index))await db.exec(await readFile(new URL(f,dir),'utf8'));
 const after=(await get()).state;for(const key of Object.keys(before))assert.deepEqual(after[key],before[key]);assert.equal(after.starterItems.length,16);assert.equal((await q('select * from public.player_account_stats')).length,2);
 let stats=(await get()).accountStats;assert.equal(stats.memberSince,'2026-01-02T00:00:00+00:00');assert.equal(stats.skillsTrained,0);assert.equal(stats.skillsTotal,7);assert.equal(stats.equipmentCollected,12);assert.equal(stats.servicesCompleted,0);assert.equal(stats.holding.status,'unverified');assert.equal(stats.holding.totalSeconds,null);
 await db.transaction(async tx=>{await tx.exec('set local role service_role');assert.equal((await tx.query('select public.player_profile_snapshot($1) as data',[uid])).rows[0].data.accountStats.skillsTrained,0)});
 await q("update public.player_skills set xp=25 where user_id=$1 and skill_id='fishing'",[uid]);await q("update public.player_skills set completed_activities=1 where user_id=$1 and skill_id='cooking'",[uid]);await q("update public.player_skills set training_seconds=60 where user_id=$1 and skill_id='mining'",[uid]);
 assert.equal((await q('select skills_trained from public.player_account_stats where user_id=$1',[uid]))[0].skills_trained,3);
 await q("update public.player_skills set level=50 where user_id=$1 and skill_id='crafting'",[uid]);assert.equal((await get()).accountStats.skillsTrained,3);
 let p=await get();p=await act('buy',p.revision,'cape');assert.equal(p.accountStats.equipmentCollected,13);p=await act('buy',p.revision,'cape');assert.equal(p.accountStats.equipmentCollected,13);p=await act('equip',p.revision,null);assert.equal(p.accountStats.equipmentCollected,13);
 p=await act('start',p.revision,'service');assert.equal(p.accountStats.servicesCompleted,0);assert.equal((await act('collect',p.revision)).status,400);p=await act('cancel',p.revision);assert.equal(p.accountStats.servicesCompleted,0);
 p=await act('start',p.revision,'service');await q("update public.player_skill_jobs set started_at=now()-interval '100 seconds',ends_at=now()-interval '10 seconds' where user_id=$1 and status='running'",[uid]);const revision=p.revision;p=await act('collect',revision);assert.equal(p.accountStats.servicesCompleted,1);assert.equal((await act('collect',revision)).status,409);assert.equal((await get()).accountStats.servicesCompleted,1);
 const version='00000000-0000-4000-8000-000000000010',now=Math.floor(Date.now()/1000);
 await q("insert into public.player_wallets(user_id,wallet_address,verified_at,link_version,last_slot,gp_raw_balance) values($1,'11111111111111111111111111111111',now(),$2,100,'1')",[uid,version]);
 assert.equal((await get()).accountStats.holding.status,'pending');
 const summary={status:'complete',totalSeconds:15*86400,currentSeconds:5*86400,longestSeconds:10*86400,throughTime:now,throughSlot:100,rawBalance:'1'};
 await q("insert into public.wallet_gp_history(user_id,link_version,status,summary,completed_at) values($1,$2,'complete',$3,now())",[uid,version,summary]);
 stats=(await get()).accountStats;assert.equal(stats.holding.status,'current');assert.equal(stats.holding.totalSeconds,15*86400);assert.equal(stats.holding.currentSeconds,5*86400);assert.equal(stats.holding.longestSeconds,10*86400);
 const stored=(await q('select total_holding_seconds,current_streak_seconds from public.player_account_stats where user_id=$1',[uid]))[0];assert.deepEqual(stored,{total_holding_seconds:15*86400,current_streak_seconds:5*86400});
 await q("update public.wallet_gp_history set status='error' where user_id=$1",[uid]);assert.equal((await get()).accountStats.holding.status,'stale');assert.equal((await get()).accountStats.holding.currentSeconds,5*86400);
 await q("update public.wallet_gp_history set status='complete',completed_at=now()-interval '37 hours' where user_id=$1",[uid]);assert.equal((await get()).accountStats.holding.status,'stale');
 await q("update public.wallet_gp_history set completed_at=now() where user_id=$1",[uid]);await q("update public.player_wallets set gp_raw_balance='0',last_slot=101 where user_id=$1",[uid]);assert.equal((await get()).accountStats.holding.status,'stale');
 await q("update public.wallet_gp_history set summary=$2 where user_id=$1",[uid,{...summary,currentSeconds:0,throughSlot:101,rawBalance:'0'}]);assert.equal((await get()).accountStats.holding.currentSeconds,0);assert.equal((await get()).accountStats.holding.longestSeconds,10*86400);
 await q("update public.wallet_gp_history set summary=$2 where user_id=$1",[uid,{...summary,currentSeconds:20*86400}]);assert.equal((await get()).accountStats.holding.status,'error');assert.equal((await get()).accountStats.holding.totalSeconds,null);
 await q("update public.player_wallets set wallet_address=null,link_version=gen_random_uuid() where user_id=$1",[uid]);assert.equal((await get()).accountStats.holding.status,'unverified');assert.equal((await get()).accountStats.holding.longestSeconds,null);
 await q("update public.player_wallets set wallet_address='22222222222222222222222222222222',verified_at=now() where user_id=$1",[uid]);assert.equal((await get()).accountStats.holding.status,'pending');assert.equal((await get()).accountStats.holding.totalSeconds,null);
 // Read reconciliation repairs derived counters without modifying any authoritative records.
 await q('update public.player_account_stats set equipment_collected=99 where user_id=$1',[uid]);assert.equal((await get()).accountStats.equipmentCollected,13);
 const sourceState=(await get()).state;await get();assert.deepEqual((await get()).state,sourceState);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;set local request.jwt.claim.sub='${other}'`);const rows=(await tx.query('select * from public.player_account_stats')).rows;assert.equal(rows.length,1);assert.equal(rows[0].user_id,other)});
 for(const role of ['anon','authenticated'])for(const sql of ['update public.player_account_stats set services_completed=999','delete from public.player_account_stats','truncate public.player_account_stats',`insert into public.player_account_stats(user_id,services_tracked_since) values('${future}',now())`,`select public.refresh_player_account_stats('${uid}')`,`select public.player_profile_snapshot('${uid}')`,`select public.player_profile_state_snapshot('${uid}')`])await assert.rejects(db.transaction(tx=>tx.exec(`set local role ${role};${sql}`)),/permission denied/);
 assert.equal((await q("select relrowsecurity from pg_class where oid='public.player_account_stats'::regclass"))[0].relrowsecurity,true);
 await q('insert into auth.users(id) values($1)',[future]);assert.equal(await get(future),null);const fresh=await act('initialize',null,null,future);assert.equal(fresh.accountStats.skillsTrained,0);assert.equal(fresh.accountStats.equipmentCollected,12);assert.equal(fresh.accountStats.servicesCompleted,0);assert.equal(fresh.accountStats.skillsTotal,7);
 await q('delete from auth.users where id=$1',[uid]);assert.equal((await q('select * from public.player_account_stats where user_id=$1',[uid])).length,0);assert.equal(await get(),null);
});
