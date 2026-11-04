import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;insert into auth.users(id) values('${uid}'),('${other}');`);
for(const file of ['20261031050202_wallet_holdings.sql','20261031053500_gp_holding_history.sql','20261031055159_rune_production.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const query=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
const sync=async(id=uid)=>(await query('select public.sync_player_runes($1) as s',[id])).s;
const allocate=async(a,r)=>(await query('select public.allocate_player_runes($1,$2,$3) as s',[uid,a,r])).s;
const rewind=async(hours)=>db.query("update public.player_rune_production set last_accrued_at=statement_timestamp()-($2*interval '1 hour') where user_id=$1",[uid,hours]);
const whole=(s,id)=>BigInt(s.inventoryTicks[id])/3600000000n;
test('automatic server rune production and separate inventory',async t=>{
 t.after(()=>db.close());
 await t.test('verified history starts production without a menu visit; new players cannot produce',async()=>{
  assert.equal((await sync(other)).active,false);
  const w=await query('select * from public.link_player_wallet($1,$2,now(),$3)',[uid,'11111111111111111111111111111111','a'.repeat(64)]);
  await db.query("insert into public.wallet_gp_history(user_id,link_version,status,summary,completed_at) values($1,$2,'complete',$3,now())",[uid,w.link_version,{longestDays:8}]);
  const raw=await query('select * from public.player_rune_production where user_id=$1',[uid]);assert.equal(raw.allocations.air,10);
  const s=await sync();assert.deepEqual(s.unlocked,['air','mind']);assert.equal(s.characterLevel,5);assert.equal(whole(s,'air'),0n);
 });
 await t.test('offline accrual has no 8-hour cap and reads never double-credit',async()=>{
  await rewind(48);let s=await sync();assert.equal(whole(s,'air'),480n);
  const again=await sync();assert.equal(whole(again,'air'),480n);
 });
 await t.test('fractional progress survives changes; old allocations settle before the new rates start',async()=>{
  await rewind(.05);const before=await sync();assert(BigInt(before.inventoryTicks.air)>480n*3600000000n);
  const a={...before.allocations,air:5,mind:5};const changed=await allocate(a,before.revision);assert.equal(changed.allocations.mind,5);
  await rewind(2);const after=await sync();assert.equal(whole(after,'air'),490n);assert.equal(whole(after,'mind'),10n);
  assert(BigInt(after.inventoryTicks.air)%3600000000n>1700000000n);
 });
 await t.test('capacity, locked runes, malformed rates, stale revisions and retries are enforced',async()=>{
  let s=await sync();assert.equal((await allocate({...s.allocations,air:4},s.revision)).status,400);
  assert.equal((await allocate({...s.allocations,air:4,fire:1},s.revision)).status,403);
  assert.equal((await allocate({...s.allocations,air:4.5,mind:5.5},s.revision)).status,400);
  assert.equal((await allocate({...s.allocations,air:-1,mind:11},s.revision)).status,400);
  assert.equal((await allocate({...s.allocations,air:10,mind:0},0)).status,409);
  const next=await allocate({...s.allocations,air:10,mind:0},s.revision);
  assert.equal((await allocate(next.allocations,s.revision)).revision,next.revision);
 });
 await t.test('players cannot alter balances, call admin functions, or read another inventory',async()=>{
  await db.transaction(async tx=>{await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${other}',true)`);assert.equal((await tx.query('select * from public.player_rune_inventory where user_id=$1',[uid])).rows.length,0)});
  await assert.rejects(db.transaction(async tx=>{await tx.exec("set local role authenticated;update public.player_rune_inventory set balance_ticks=999999999999")}),/permission denied/);
  await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role authenticated;select public.sync_player_runes('${uid}')`)}),/permission denied/);
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon;select * from public.player_rune_inventory')}),/permission denied/);
  await db.transaction(async tx=>{await tx.exec('set local role service_role');assert.equal((await tx.query('select public.sync_player_runes($1) as s',[uid])).rows[0].s.active,true)});
 });
 await t.test('unlink settles up to unlink time, then stops accrual without deleting runes',async()=>{
  await rewind(1);await db.query('select public.unlink_player_wallet($1)',[uid]);const old=await sync();assert.equal(old.active,false);assert.equal(old.allocations.air,0);assert(whole(old,'air')>=500n);
  await rewind(24);const next=await sync();assert.deepEqual(next.inventoryTicks,old.inventoryTicks);
 });
 await t.test('new wallet needs its own verified history; background batch safely settles accounts',async()=>{
  await db.query('select public.link_player_wallet($1,$2,now(),$3)',[uid,'22222222222222222222222222222222','b'.repeat(64)]);assert.equal((await sync()).active,false);
  await rewind(1);assert.equal((await query('select public.settle_rune_batch(200) as n')).n,1);
 });
});
