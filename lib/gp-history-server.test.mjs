import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { scanGPHistory } from './gp-history-server.mjs';
import { GP_MINT, GP_PROGRAM } from './gp-token.mjs';
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',wallet='11111111111111111111111111111111';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now()); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; insert into auth.users(id) values('${uid}'),('${other}');`);
for(const path of ['20261031050202_wallet_holdings.sql','20261031053500_gp_holding_history.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${path}`,import.meta.url),'utf8'));
await db.query('select public.link_player_wallet($1,$2,now(),$3)',[uid,wallet,'a'.repeat(64)]);
async function call(name,args){return db.transaction(async tx=>{await tx.exec('set local role service_role');const entries=Object.entries(args);return (await tx.query(`select public.${name}(${entries.map(([key],i)=>`${key}=>$${i+1}`).join(',')}) as result`,entries.map(([,v])=>v))).rows[0].result;});}
const base=200000000,epoch=1700000000,day=86400;
const b=raw=>({accountIndex:0,owner:wallet,mint:GP_MINT,programId:GP_PROGRAM,uiTokenAmount:{amount:raw,decimals:6}});
const tx=(n,d,pre,post)=>({slot:base+n,transactionIndex:0,blockTime:epoch+d*day,transaction:{signatures:['signature'+n],message:{accountKeys:['gp-account']}},meta:{err:null,preTokenBalances:pre?[b(pre)]:[],postTokenBalances:post?[b(post)]:[]}});
let targetSlot=base+3,targetDay=18,targetRaw='10';
async function read(method,params){
 if(method==='getBlockTime')return epoch+targetDay*day;
 if(method==='getTokenAccountsByOwner')return {context:{slot:targetSlot},value:targetRaw==='0'?[]:[{pubkey:'gp-account',account:{owner:GP_PROGRAM,data:{parsed:{type:'account',info:{owner:wallet,mint:GP_MINT,tokenAmount:{amount:targetRaw,decimals:6}}}}}}]};
 if(params[0]===GP_MINT)return {data:[],paginationToken:null};
 assert.equal(params[1].filters.tokenAccounts,'all');assert.equal(params[1].commitment,'finalized');
 if(params[1].filters.slot.gte===base+4)return {data:[tx(4,20,'10',null)],paginationToken:null};
 return params[1].paginationToken ? {data:[tx(3,13,null,'10')],paginationToken:null} : {data:[tx(1,0,null,'10'),tx(2,10,'10',null)],paginationToken:'200000002:0'};
}
const get=async()=>(await db.query('select * from public.wallet_gp_history where user_id=$1',[uid])).rows[0];
test('historical scans use durable leases, paginate, reconcile balances, enforce ownership, and preserve records',async t=>{
 t.after(()=>db.close());
 await t.test('history resumes after a request budget without displaying partial totals',async()=>{
  assert.equal((await scanGPHistory(uid,{call,read,budgetMs:1})).status,'pending');
  const row=await get();assert.equal(row.summary,null);assert.equal(row.cursor,'200000002:0');assert.equal(row.lease_token,null);
  const completed=await scanGPHistory(uid,{call,read});assert.equal(completed.status,'complete');assert.equal(completed.summary.longestDays,10);assert.equal(completed.summary.totalDays,15);assert.equal(completed.summary.currentDays,5);
  assert.equal(await scanGPHistory(uid,{call,read}),null);
 });
 await t.test('only the owner can read history; clients cannot forge checkpoints or start admin scans',async()=>{
  await db.transaction(async tx=>{await tx.exec(`set local role authenticated; select set_config('request.jwt.claim.sub','${other}',true);`);assert.equal((await tx.query('select * from public.wallet_gp_history')).rows.length,0)});
  await db.transaction(async tx=>{await tx.exec(`set local role authenticated; select set_config('request.jwt.claim.sub','${uid}',true);`);assert.equal((await tx.query('select * from public.wallet_gp_history')).rows.length,1)});
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon;select * from public.wallet_gp_history')}),/permission denied/);
  await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role authenticated;update public.wallet_gp_history set summary='{}'`)}),/permission denied/);
  await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role authenticated;select public.claim_gp_history('${uid}')`)}),/permission denied/);
 });
 await t.test('provider failure preserves verified results and resumes from the durable checkpoint',async()=>{
  await db.exec("update public.wallet_gp_history set next_attempt_at=now()-interval '1 second'");
  const before=await get();assert.equal((await scanGPHistory(uid,{call,read:async()=>{throw Error('offline')}})).status,'error');
  const after=await get();assert.deepEqual(after.summary,before.summary);assert.deepEqual(after.checkpoint,before.checkpoint);assert.equal(after.error_code,'provider_unavailable');
 });
 await t.test('incremental scans detect a later zero while retaining the longest historical streak',async()=>{
  await db.exec("update public.wallet_gp_history set next_attempt_at=now()-interval '1 second'");
  targetRaw='0';targetSlot=base+4;targetDay=21;
  const result=await scanGPHistory(uid,{call,read});assert.equal(result.status,'complete');assert.equal(result.summary.longestDays,10);assert.equal(result.summary.currentDays,0);assert.equal(result.summary.totalDays,17);assert.equal(result.summary.zeroSeconds,4*day);
 });
 await t.test('leases prevent parallel jobs and unlink invalidates in-flight history writes and reads',async()=>{
  await db.exec("update public.wallet_gp_history set next_attempt_at=now()-interval '1 second'");
  const job=await call('claim_gp_history',{p_user_id:uid});assert(job);assert.equal(await call('claim_gp_history',{p_user_id:uid}),null);
  await db.query('select public.unlink_player_wallet($1)',[uid]);
  assert.equal(await call('save_gp_history',{p_user_id:uid,p_version:job.link_version,p_lease:job.lease_token,p_checkpoint:null,p_target:null,p_cursor:null,p_summary:{longestDays:999},p_error:null,p_release:true}),false);
  await db.transaction(async tx=>{await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${uid}',true);`);assert.equal((await tx.query('select * from public.wallet_gp_history')).rows.length,0)});
 });
});
