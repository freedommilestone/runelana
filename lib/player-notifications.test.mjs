import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
test('saved notifications follow real rewards, level changes, pagination and owner-only read receipts',async t=>{
 const db=new PGlite();t.after(()=>db.close());const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;insert into auth.users(id) values('${uid}'),('${other}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
 const rpc=async(name,args)=>(await q(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as data`,args))[0].data;
 for(const id of [uid,other]){await rpc('update_player_profile',[id,'initialize']);await rpc('get_player_skills',[id]);}
 const feed=(before=null,id=uid)=>rpc('player_notification_feed',[id,before]);
 let f=await feed();assert(f.events.some(e=>e.title==='Beginner starter kit received'));assert(f.events.every(e=>!e.readAt));
 const get=()=>rpc('player_profile_snapshot',[uid]);
 const start=async quantity=>{const p=await get();const result=await rpc('execute_player_skill_job',[uid,'start-skill',p.revision,'fishing-v4-shrimp',quantity,3600,JSON.stringify({'Small Net':'small-fishing-net'})]);assert(!result.error,result.error);return result;};
 let p=await start(1);const first=p.state.activity.id;p=await start(2);
 // Both tasks finish offline, the second starts at the first task's end.
 await q("update public.player_skill_jobs set started_at=clock_timestamp()-interval '2 hours',ends_at=clock_timestamp()-interval '1 hour' where id=$1",[first]);
 f=await feed();const jobs=f.events.filter(e=>e.kind==='activity_completed');assert.equal(jobs.length,2);assert.deepEqual(jobs.map(e=>e.details.items[0].quantity).sort(),[1,2]);assert(jobs.every(e=>e.details.items[0].name==='Shrimp'));
 assert.equal((await get()).state.producedItems.find(i=>i.name==='Shrimp').quantity,3);assert.equal((await feed()).events.filter(e=>e.kind==='activity_completed').length,2);
 // Cancelling and refunding does not masquerade as production or new loot.
 p=await start(1);await rpc('execute_player_skill_job',[uid,'cancel-skill',p.revision,null,1,3600,'{}',false,p.state.activity.id]);assert.equal((await feed()).events.filter(e=>e.kind==='activity_completed').length,2);
 // XP drives the stored level and its notification; unchanged XP produces no duplicate.
 await q("update public.player_skills set xp=1000 where user_id=$1 and skill_id='fishing'",[uid]);
 let levels=(await feed()).events.filter(e=>e.kind==='level_up');assert(levels.some(e=>e.title==='Fishing level up!'&&e.details.level>e.details.fromLevel));const count=levels.length;
 await q("update public.player_skills set xp=xp where user_id=$1 and skill_id='fishing'",[uid]);assert.equal((await feed()).events.filter(e=>e.kind==='level_up').length,count);
 await q("update public.player_skill_specializations set xp=1000 where user_id=$1 and skill_id='fishing'",[uid]);assert((await feed()).events.filter(e=>e.kind==='level_up').length>count);
 await q("insert into public.player_equipment(user_id,item_id,source) select $1,id,'shop' from public.equipment_types limit 1 on conflict do nothing",[uid]);assert((await feed()).events.some(e=>e.title==='Equipment obtained'));
 // Capture a displayed page; a concurrent new event and another user's IDs stay unread.
 f=await feed();const viewed=f.events.map(e=>e.id),foreign=(await feed(null,other)).events.map(e=>e.id);
 await q("update public.player_skills set xp=3000 where user_id=$1 and skill_id='fishing'",[uid]);
 const receipt=await rpc('read_player_notifications',[uid,[...viewed,...foreign]]);assert.equal(receipt.unreadCount,1);assert((await feed(null,other)).unreadCount>0);
 assert.equal((await rpc('read_player_notifications',[uid,viewed])).unreadCount,1);assert.equal((await get()).notificationUnread,1);
 // Paginate without duplicates, and preserve unread entries outside the displayed page.
 await q("insert into public.player_notifications(user_id,kind,title) select $1,'items_obtained','Test event '||n from generate_series(1,35) n",[uid]);
 f=await feed();assert.equal(f.events.length,30);assert(f.nextCursor);const older=await feed(f.nextCursor);assert(older.events.length>0);assert(older.events.every(e=>!f.events.some(first=>first.id===e.id)));
 await rpc('read_player_notifications',[uid,f.events.map(e=>e.id)]);assert.equal((await get()).notificationUnread,6);
 // Verified holding milestones generate one announcement, including subsequent scans.
 await q("insert into public.player_wallets(user_id,wallet_address) values($1,'11111111111111111111111111111111') on conflict(user_id) do update set wallet_address=excluded.wallet_address",[uid]);
 await q("insert into public.wallet_gp_history(user_id,link_version,status,summary) select user_id,link_version,'complete','{\"longestDays\":30}'::jsonb from public.player_wallets where user_id=$1",[uid]);
 let holding=(await feed()).events.filter(e=>e.kind==='rune_unlocked');assert.equal(holding.length,1);assert.equal(holding[0].details.level,20);assert.match(holding[0].details.message,/Fire Rune/);
 await rpc('sync_player_runes',[uid]);assert.equal((await feed()).events.filter(e=>e.kind==='rune_unlocked').length,1);
 await q("update public.wallet_gp_history set summary='{\"longestDays\":60}' where user_id=$1",[uid]);holding=(await feed()).events.filter(e=>e.kind==='rune_unlocked');assert.equal(holding.length,2);assert.equal(holding[0].details.level,35);
 // Atomic rollback of rewards also rolls back their events.
 const before=(await feed()).unreadCount;await assert.rejects(db.transaction(async tx=>{await tx.query("update public.player_skills set xp=10000 where user_id=$1 and skill_id='fishing'",[uid]);throw Error('rollback');}),/rollback/);assert.equal((await feed()).unreadCount,before);
 for(const sql of ['insert into public.player_notifications(user_id,kind,title) values(\''+uid+'\',\'items_obtained\',\'fake\')','update public.player_notifications set read_at=now()',`select public.player_notification_feed('${uid}')`,`select public.read_player_notifications('${uid}',array[1::bigint])`])await assert.rejects(db.transaction(tx=>tx.exec('set local role authenticated;'+sql)),/permission denied/);
 await db.transaction(async tx=>{await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${other}',true)`);assert((await tx.query('select * from public.player_notifications')).rows.every(e=>e.user_id===other));});
 await db.transaction(async tx=>{await tx.exec('set local role service_role');assert((await tx.query('select public.player_notification_feed($1) as data',[uid])).rows[0].data.events.length>0);});
});
