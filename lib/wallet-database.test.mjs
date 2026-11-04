import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const uid='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
const address='11111111111111111111111111111111', address2='22222222222222222222222222222222';
const sql=await readFile(new URL('../supabase/migrations/20261031050202_wallet_holdings.sql',import.meta.url),'utf8');
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now()); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; insert into auth.users(id) values('${uid}'),('${other}');`);
await db.exec(sql);
const first=(r)=>JSON.parse(JSON.stringify(r.rows[0]));
const get=async()=>first(await db.query('select * from public.player_wallets where user_id=$1',[uid]));
let proof=0;
const link=async(a=address,legacy=false)=>first(await db.query('select * from public.link_player_wallet($1,$2,now(),$3,$4)',[uid,a,(++proof).toString(16).padStart(64,'0'),legacy]));
const at=hours=>new Date(Date.now()-hours*3600000).toISOString();
const record=async(row,raw,slot,hours=0,error=null,lease=null)=>first(await db.query('select public.record_gp_scan($1,$2,$3,$4,$5,$6,$7) as result',[uid,row.link_version,raw,slot,at(hours),error,lease])).result;

test('database migration, permissions, ownership, holding transitions and cron leases',async t=>{
 t.after(()=>db.close());
 await t.test('anonymous and other users cannot read links; authenticated owners cannot forge balances or call server functions',async()=>{
  await link();
  await db.transaction(async tx=>{await tx.exec('set local role service_role');assert.equal((await tx.query('select * from public.claim_daily_gp_scans(1)')).rows.length,1);assert.equal((await tx.query('select * from public.legacy_wallet_candidates()')).rows.length,0);await tx.query('update public.player_wallets set lease_token=null,lease_until=null,daily_attempts=0,daily_attempt_on=null');});
  await db.transaction(async tx=>{await tx.exec(`set local role authenticated; select set_config('request.jwt.claim.sub','${other}',true);`);assert.equal((await tx.query('select * from public.player_wallets')).rows.length,0)});
  await db.transaction(async tx=>{await tx.exec(`set local role authenticated; select set_config('request.jwt.claim.sub','${uid}',true);`);assert.equal((await tx.query('select * from public.player_wallets')).rows.length,1)});
  await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role authenticated; update public.player_wallets set gp_raw_balance='999';`)}),/permission denied/);
  await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role authenticated; select public.unlink_player_wallet('${uid}');`)}),/permission denied/);
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon; select * from public.player_wallets')}),/permission denied/);
 });
 await t.test('one wallet cannot link to two accounts, and a consumed proof cannot be replayed',async()=>{
  await assert.rejects(db.query('select public.link_player_wallet($1,$2,now(),$3)',[other,address,'a'.repeat(64)]),/unique/);
  await assert.rejects(db.query('select public.link_player_wallet($1,$2,now(),$3)',[uid,address,'1'.padStart(64,'0')]),/unique/);
 });
 await t.test('positive scans grow observed holding time; failures preserve history; zero resets the period',async()=>{
  await db.query("update public.player_wallets set linked_at=now()-interval '6 days' where user_id=$1",[uid]);
  let row=await get();
  await record(row,'1000001',1,120);row=await get();assert.equal(row.gp_raw_balance,'1000001');assert(row.holding_since);
  const start=row.holding_since;
  await record(row,'2000001',2,96);row=await get();assert.equal(row.holding_since,start);
  const success=row.last_success_at;
  await record(row,null,null,95,'rpc_unavailable');row=await get();assert.equal(row.gp_raw_balance,'2000001');assert.equal(row.last_success_at,success);assert.equal(row.holding_since,start);
  await record(row,'0',3,94);row=await get();assert.equal(row.holding_since,null);assert.equal(row.gp_raw_balance,'0');
  await record(row,'1',4,93);row=await get();assert.notEqual(row.holding_since,start);
  const beforeGap=row.holding_since;await record(row,'2',5,1);row=await get();assert.notEqual(row.holding_since,beforeGap);
  assert.equal((await db.query('select * from public.wallet_gp_snapshots')).rows.length,5);
 });
 await t.test('older RPC slots and timestamps cannot overwrite newer observations',async()=>{
  let row=await get();const old=row.gp_raw_balance;
  assert.equal((await record(row,'999',1,0.8)).applied,false);row=await get();assert.equal(row.gp_raw_balance,old);assert.equal(row.scan_error,'stale_slot');
  assert.equal((await record(row,'999',6,2)).applied,false);assert.equal((await get()).gp_raw_balance,old);
 });
 await t.test('same-wallet reverification preserves holding; changed and unlinked wallets reject in-flight scans and legacy resurrection',async()=>{
  let row=await get();let same=await link();assert.equal(same.holding_since,row.holding_since);assert.equal(same.link_version,row.link_version);
  await link(address2);assert.equal((await record(row,'999',9)).applied,false);row=await get();assert.equal(row.gp_raw_balance,null);assert.equal(row.holding_since,null);
  await db.query('select public.unlink_player_wallet($1)',[uid]);assert.equal((await record(row,'999',10)).applied,false);
  await link(address,true);assert.equal((await get()).wallet_address,null);
  await link(address);
 });
 await t.test('daily leases prevent duplicate work; failed RPC gets a bounded retry; success is idempotent for the UTC day',async()=>{
  const batch=(await db.query('select * from public.claim_daily_gp_scans(3)')).rows;assert.equal(batch.length,1);
  assert.equal((await db.query('select * from public.claim_daily_gp_scans(3)')).rows.length,0);
  await record(batch[0],null,null,0,'rpc_unavailable',batch[0].lease_token);
  const retry=(await db.query('select * from public.claim_daily_gp_scans(3)')).rows;assert.equal(retry.length,1);assert.notEqual(retry[0].lease_token,batch[0].lease_token);
  assert.equal((await record(batch[0],'99',11,0,null,batch[0].lease_token)).applied,false);
  await record(retry[0],'123456789123456789',12,0,null,retry[0].lease_token);
  assert.equal((await get()).gp_raw_balance,'123456789123456789');
  assert.equal((await db.query('select * from public.claim_daily_gp_scans(3)')).rows.length,0);
  assert.equal(first(await db.query('select public.remaining_daily_gp_scans() as n')).n,0);
 });
});
