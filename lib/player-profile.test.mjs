import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {profileAction,legacyProfile} from './player-profile.mjs';
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant usage on schema public to service_role;insert into auth.users values('${uid}'),('${other}');`);
await db.exec(await readFile(new URL('../supabase/migrations/20261102031538_player_profile_inventory.sql',import.meta.url),'utf8'));
const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
const get=async(id=uid)=>(await query('select public.player_profile_snapshot($1) as result',[id]))[0].result;
const act=async(action,revision=null,item=null,legacy=null,id=uid)=>(await query('select public.update_player_profile($1,$2,$3,$4,$5) as result',[id,action,revision,item,legacy]))[0].result;
const denied=sql=>assert.rejects(db.transaction(tx=>tx.exec(sql)),/permission denied/);
test('account profile persistence and authoritative game actions',async t=>{
 t.after(()=>db.close());
 await t.test('legacy saves import once; later devices cannot overwrite equipment or progress',async()=>{
  assert.equal(await get(),null);
  const old={started:false,runes:400,xp:180,gp:80,steelBars:10,last:0,owned:['cape'],equipped:'Infernal Cape'};
  const a=await act('initialize',null,null,old);assert.equal(a.state.equipped,'Infernal Cape');assert.equal(a.state.xp,180);assert.equal(a.state.servicesCompleted,0);assert(a.imported);
  const b=await act('initialize',null,null,{...old,runes:99999,owned:['armor']});assert.deepEqual(b.state,a.state);assert.equal(b.revision,a.revision);
  const c=await act('initialize',null,null,null,other);assert.equal(c.state.runes,120);assert.equal(c.state.servicesCompleted,0);assert.equal(c.imported,false);
 });
 await t.test('shop is atomic, equip checks ownership, and retries cannot double-charge',async()=>{
  const old=await get();const a=await act('buy',old.revision,'helm');assert.equal(a.state.runes,280);assert.equal(a.state.equipped,'Abyssal Helm');assert.equal(a.state.owned.length,2);
  const stale=await act('buy',old.revision,'helm');assert.equal(stale.status,409);assert.equal(stale.state.runes,280);
  const equip=await act('equip',a.revision,'cape');assert.equal(equip.state.equipped,'Infernal Cape');assert.equal(equip.state.runes,280);
  const bad=await act('equip',equip.revision,'armor');assert.equal(bad.status,400);assert.equal((await get()).revision,equip.revision);
  const b=await act('buy',equip.revision,'armor');assert.equal(b.state.runes,40);
  assert.equal((await act('buy',b.revision,'blade')).status,400);assert.equal((await get()).state.owned.length,3);
 });
 await t.test('activity timers, cancellation refunds and completion rewards are server controlled',async()=>{
  let p=await get();p=await act('start',p.revision,'smith');assert.equal(p.state.runes,20);assert.equal(p.state.activity.endsAt-p.state.activity.startedAt,120000);
  assert.equal((await act('start',p.revision,'service')).status,400);
  assert.equal((await act('collect',p.revision)).status,400);
  p=await act('cancel',p.revision);assert.equal(p.state.runes,40);assert.equal((await act('cancel',p.revision)).status,400);
  p=await act('start',p.revision,'service');
  await query("update public.player_profiles set activity_started_at=now()-interval '100 seconds',activity_ends_at=now()-interval '10 seconds' where user_id=$1",[uid]);
  const complete=await act('collect',p.revision);assert.equal(complete.state.servicesCompleted,1);assert.equal(complete.state.gp,120);assert.equal(complete.state.xp,185);assert.equal(complete.state.activity,null);
  assert.equal((await act('collect',p.revision)).status,409);assert.equal((await get()).state.servicesCompleted,1);
  p=await act('start',complete.revision,'smith');await query("update public.player_profiles set activity_started_at=now()-interval '130 seconds',activity_ends_at=now()-interval '10 seconds' where user_id=$1",[uid]);
  p=await act('collect',p.revision);assert.equal(p.state.steelBars,20);assert.equal(p.state.xp,195);assert.equal(p.state.servicesCompleted,1);
 });
 await t.test('row ownership and function grants block client-awarded gear and cross-account reads',async()=>{
  await db.transaction(async tx=>{await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${other}',true)`);const rows=(await tx.query('select * from public.player_profiles')).rows;assert.equal(rows.length,1);assert.equal(rows[0].user_id,other);assert.equal((await tx.query('select * from public.player_equipment')).rows.length,0)});
  for(const sql of ['update public.player_profiles set game_gold=999',`insert into public.player_equipment values('${other}','armor',now(),'shop')`,`select public.update_player_profile('${uid}','initialize')`,`select public.player_profile_snapshot('${uid}')`])await denied('set local role authenticated;'+sql);
  await denied('set local role anon;select * from public.player_profiles');
  await db.transaction(async tx=>{await tx.exec('set local role service_role');assert((await tx.query('select public.player_profile_snapshot($1) as result',[uid])).rows[0].result.state.owned.includes('cape'))});
 });
 await t.test('constraints prevent invalid balances/equipment and deleted accounts clean up',async()=>{
  await assert.rejects(db.transaction(tx=>tx.exec('update public.player_profiles set crafting_supplies=-1')),/check constraint/);
  await assert.rejects(db.transaction(tx=>tx.exec(`update public.player_profiles set equipped_item_id='helm' where user_id='${other}'`)),/foreign key/);
  await query('delete from auth.users where id=$1',[uid]);assert.equal((await query('select * from public.player_equipment where user_id=$1',[uid])).length,0);assert.equal(await get(),null);
 });
});
test('request validation prevents identity/earned-stat edits and limits legacy migration',()=>{
 const user={id:uid,created_at:'2026-10-01'};
 assert.throws(()=>profileAction({action:'start',revision:1,item:'smith'},user),/retired/);
 assert.equal(profileAction({action:'start',revision:1,item:'service'},user).p_item,'service');
 assert.throws(()=>profileAction({action:'equip',revision:1,item:'cape',user_id:other},user),/Unsupported/);
 assert.throws(()=>profileAction({action:'equip',revision:1,item:'cape',xp:999},user),/Unsupported/);
 assert.throws(()=>profileAction({action:'buy',item:'cape'},user),/Refresh/);
 assert.throws(()=>profileAction({action:'collect',revision:1,legacy:{}},user),/first use/);
 const legacy={started:false,runes:120,xp:0,last:0,owned:['cape','cape','fake'],equipped:'Infernal Cape'};
 assert.deepEqual(legacyProfile(legacy).owned,['cape']);
 assert.throws(()=>legacyProfile({...legacy,runes:1e20}),/limits/);
 assert.equal(profileAction({action:'initialize',legacy},{...user,created_at:'2026-12-01'}).p_legacy,null);
 assert.equal(profileAction({action:'equip',revision:1,item:'cape'},user).p_user_id,uid);
});
