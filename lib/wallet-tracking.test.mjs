import test from 'node:test';
import assert from 'node:assert/strict';
import { trackingSnapshot, scanStoredWallet } from './wallet-tracking.mjs';
import { cronAuthorized, runDailyScans } from './daily-gp-scans.mjs';
import { adminHeaders } from './wallet-database.mjs';
const row={user_id:'player',wallet_address:'11111111111111111111111111111111',link_version:'version',verified_at:'2026-01-01T00:00:00Z',gp_raw_balance:'123456789123456789',holding_since:'2026-01-01T00:00:00Z',last_success_at:'2026-01-04T12:00:00Z',scan_error:null};
test('holding days stop at the last successful observation, not the current clock',()=>{
 const snapshot=trackingSnapshot(row,[],Date.parse('2026-01-10T00:00:00Z'));
 assert.equal(snapshot.tracking.observedDays,3);assert.equal(snapshot.balance.isStale,true);assert.equal(snapshot.balance.amount,'123,456,789,123.456789');assert(snapshot.balanceError);
 assert.equal(trackingSnapshot({...row,wallet_address:null}).wallet,null);
});
test('RPC failure records an error without inventing a zero balance',async()=>{
 const result=await scanStoredWallet(row,{readBalance:async()=>{throw Error('rate limit')},record:async(name,body)=>{assert.equal(name,'record_gp_scan');assert.equal(body.p_raw,null);assert.equal(body.p_error,'rpc_unavailable');assert.equal(body.p_version,'version');return{applied:false,wallet:row}}});
 assert.equal(result.wallet.gp_raw_balance,row.gp_raw_balance);
});
test('daily scheduler requires its secret and never accepts wallet auth as cron auth',()=>{
 const secret='s'.repeat(64);assert.equal(cronAuthorized('Bearer '+secret,secret),true);assert.equal(cronAuthorized(null,secret),false);assert.equal(cronAuthorized('Bearer user-session',secret),false);assert.equal(cronAuthorized('Bearer '+secret,''),false);
});
test('scheduler drains batches, records failures, and reports pending work instead of silently succeeding',async()=>{
 let batches=0;const writes=[];
 const result=await runDailyScans({secret:'s'.repeat(64),call:async(name)=>{if(name==='legacy_wallet_candidates')return[];if(name==='claim_daily_gp_scans')return ++batches<3?[{user_id:String(batches)}]:[];if(name==='remaining_daily_gp_scans')return 1;throw Error(name)},request:async(path,options)=>{writes.push(options.body);return path==='gp_scan_runs'?[{id:'run'}]:null},scan:async(w)=>({applied:w.user_id==='1'}),now:()=>100000});
 assert.equal(result.successful,1);assert.equal(result.failed,1);assert.equal(result.status,'partial');assert.equal(writes.at(-1).remaining,1);
});
test('scheduler errors finish the run as failed and propagate failure',async()=>{
 const writes=[];await assert.rejects(runDailyScans({secret:'s'.repeat(64),call:async()=>{throw Error('database unavailable')},request:async(path,options)=>{writes.push(options.body);return path==='gp_scan_runs'?[{id:'run'}]:null}}),/failed/);assert.equal(writes.at(-1).status,'failed');
});
test('new Supabase secret keys use apikey only and cannot be replaced with a public key',()=>{
 const previous=process.env.SUPABASE_SECRET_KEY;
 try{process.env.SUPABASE_SECRET_KEY='sb_secret_fixture';assert.equal(adminHeaders().Authorization,undefined);process.env.SUPABASE_SECRET_KEY='sb_publishable_fixture';assert.throws(()=>adminHeaders(),/not configured/)}finally{if(previous===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previous;}
});
