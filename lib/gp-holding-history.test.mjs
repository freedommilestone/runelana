import test from 'node:test';
import assert from 'node:assert/strict';
import { GP_MINT, GP_DECIMALS, GP_PROGRAM } from './gp-token.mjs';
import { reconstructGPHoldings, historicalRuneEligibility } from './gp-holding-history.mjs';
const wallet='wallet',day=86400;
const b=(i,raw,owner=wallet)=>({accountIndex:i,mint:GP_MINT,owner,programId:GP_PROGRAM,uiTokenAmount:{amount:String(raw),decimals:GP_DECIMALS}});
const tx=(n,d,pre,post)=>({slot:n,blockTime:d*day,transaction:{signatures:['tx'+n],message:{accountKeys:['a','b']}},meta:{err:null,preTokenBalances:pre,postTokenBalances:post}});
const calculate=(transactions,raw='10',time=18,extra={})=>reconstructGPHoldings({wallet,transactions,coverageComplete:true,throughSlot:100,throughTime:time*day,expectedRawBalance:raw,...extra});
test('historical holdings count cumulative, current and longest periods independently and exclude zero time',()=>{
 const result=calculate([tx(1,0,[],[b(0,10)]),tx(2,10,[b(0,10)],[]),tx(3,13,[],[b(0,10)])]);
 assert.equal(result.firstReceivedAt,0);assert.equal(result.totalDays,15);assert.equal(result.currentDays,5);assert.equal(result.longestDays,10);assert.equal(result.zeroSeconds,3*day);
});
test('moving GP between owned accounts does not reset the wallet period; all accounts must be empty to reset',()=>{
 const result=calculate([tx(1,0,[],[b(0,10)]),tx(2,2,[b(0,10)],[b(0,4),b(1,6)]),tx(3,3,[b(0,4)],[]),tx(4,4,[b(1,6)],[b(1,10)])]);
 assert.equal(result.totalDays,18);assert.equal(result.currentDays,18);assert.equal(result.zeroPeriods.length,0);
});
test('failed transactions, duplicate pages and sub-day zero gaps do not manufacture holding time',()=>{
 const first=tx(1,0,[],[b(0,10)]),failed=tx(2,1,[b(0,10)],[]);failed.meta.err={InstructionError:[0,'Failed']};
 const result=calculate([first,first,failed,tx(3,1.5,[b(0,10)],[]),tx(4,2,[],[b(0,10)])],'10',3);
 assert.equal(result.totalSeconds,2.5*day);assert.equal(result.totalDays,2);assert.equal(result.longestDays,1);
});
test('incomplete coverage, missing transactions and balance mismatches fail closed',()=>{
 assert.throws(()=>calculate([], '0',18,{coverageComplete:false}),/Complete wallet history/);
 assert.throws(()=>calculate([tx(1,0,[b(0,5)],[b(0,10)])]),/missing transactions/);
 assert.throws(()=>calculate([tx(1,0,[],[b(0,5)])]),/does not match/);
 assert.throws(()=>calculate([tx(2,1,[],[b(0,10)]),tx(1,0,[b(0,10)],[b(0,10)])]),/chronological/);
 const missing=tx(1,0,[],[b(0,10)]);delete missing.meta.postTokenBalances[0].owner;assert.throws(()=>calculate([missing]),/ownership/);
});
test('account ownership changes and closed accounts affect total wallet holdings',()=>{
 const result=calculate([tx(1,0,[b(0,10,'other')],[b(0,10)]),tx(2,8,[b(0,10)],[b(0,10,'other')])],'0');
 assert.equal(result.totalDays,8);assert.equal(result.currentDays,0);assert.equal(result.zeroSeconds,10*day);
});
test('rune eligibility requires complete history, configured thresholds and a positive balance for production',()=>{
 const tiers=[{id:'air',days:0},{id:'mind',days:5},{id:'water',days:10},{id:'fire',days:20}];
 const history=calculate([tx(1,0,[],[b(0,10)]),tx(2,10,[b(0,10)],[]),tx(3,13,[],[b(0,10)])]);
 assert.deepEqual(historicalRuneEligibility(history,'current',tiers).unlocked,['air','mind']);
 assert.deepEqual(historicalRuneEligibility(history,'total',tiers).unlocked,['air','mind','water']);
 assert.equal(historicalRuneEligibility(null,'total',tiers).ready,false);
 assert.equal(historicalRuneEligibility({...history,rawBalance:'0'},'total',tiers).canProduce,false);
});
