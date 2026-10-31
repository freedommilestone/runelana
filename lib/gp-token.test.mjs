import test from 'node:test';
import assert from 'node:assert/strict';
import { GP_MINT, GP_PROGRAM, formatGP, sumGPAccounts } from './gp-token.mjs';
import { readGPBalance, appOrigin, requireSameOrigin } from './wallet-server.mjs';
const address='owner';
const entry=(pubkey,amount)=>({pubkey,account:{owner:GP_PROGRAM,data:{parsed:{type:'account',info:{owner:address,mint:GP_MINT,tokenAmount:{amount,decimals:6}}}}}});
test('GP display keeps all six decimal places and amounts larger than safe JS integers',()=>{
 assert.equal(formatGP('0'),'0');assert.equal(formatGP('1'),'0.000001');assert.equal(formatGP('1234567890'),'1,234.56789');assert.equal(formatGP('18446744073709551615'),'18,446,744,073,709.551615');assert.throws(()=>formatGP(null));assert.throws(()=>formatGP('-1'));
});
test('all token accounts for the exact GP mint are summed; no accounts is a real zero',()=>{
 const total=sumGPAccounts({context:{slot:123},value:[entry('a','1234567890'),entry('b','1')]},address);assert.equal(total.amount,'1,234.567891');assert.equal(total.hasGP,true);assert.equal(sumGPAccounts({context:{slot:124},value:[]},address).hasGP,false);
});
test('wrong token, owner, decimals, duplicate accounts or malformed response never report a balance',()=>{
 for(const mutate of [a=>a.account.data.parsed.info.mint='fake',a=>a.account.data.parsed.info.owner='other',a=>a.account.data.parsed.info.tokenAmount.decimals=9,a=>a.account.owner='wrong-program',a=>a.account.data.parsed.info.tokenAmount.amount='NaN',a=>a.account.data.parsed.info.tokenAmount.amount=10,a=>a.account.data.parsed.info.tokenAmount.amount='18446744073709551616']){const a=entry('a','10');mutate(a);assert.throws(()=>sumGPAccounts({context:{slot:1},value:[a]},address));}
 const a=entry('a','10');assert.throws(()=>sumGPAccounts({context:{slot:1},value:[a,a]},address));assert.throws(()=>sumGPAccounts(null,address));
});
test('RPC errors remain unavailable instead of turning into zero',async()=>{
 await assert.rejects(readGPBalance(address,async()=>({ok:false})),/unavailable/);
 await assert.rejects(readGPBalance(address,async()=>({ok:true,json:async()=>({error:{message:'rate limit'}})})),/unavailable/);
 const balance=await readGPBalance(address,async(_url,options)=>{const request=JSON.parse(options.body);assert.equal(request.params[1].mint,GP_MINT);return {ok:true,json:async()=>({result:{context:{slot:1},value:[]}})};});assert.equal(balance.amount,'0');
});

test('same-origin checks use the public Host when Next.js supplies an internal URL',()=>{
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try {
  const request=new Request('http://localhost:3000/api/wallet',{headers:{Host:'www.runelana.com',Origin:'https://www.runelana.com'}});
  assert.equal(appOrigin(request),'https://www.runelana.com');assert.doesNotThrow(()=>requireSameOrigin(request));
  assert.throws(()=>requireSameOrigin(new Request('http://localhost:3000/api/wallet',{headers:{Host:'www.runelana.com',Origin:'https://attacker.invalid'}})));
  assert.throws(()=>appOrigin(new Request('http://localhost:3000/api/wallet',{headers:{Host:'attacker.invalid',Origin:'https://attacker.invalid'}})));
 }finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
