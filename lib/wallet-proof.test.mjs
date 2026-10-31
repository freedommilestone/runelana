import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import bs58 from 'bs58';
import { createChallenge, verifyChallenge, createReceipt, readReceipt, digest, validAddress, CHALLENGE_TTL } from './wallet-proof.mjs';
const secret='test-only-wallet-key-not-for-production-123456789';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const address=bs58.encode(publicKey.export({format:'der',type:'spki'}).subarray(-32));
const options={uid:'player-1',address,accessToken:'session-1',origin:'https://www.runelana.com',secret,now:1700000000000};
function signed(){const c=createChallenge(options);return {c,args:{...options,token:c.token,cookie:digest(c.token),signature:sign(null,Buffer.from(c.message),privateKey).toString('base64')}};}
test('real Ed25519 ownership proof is bound to a random server challenge',()=>{
 const {c,args}=signed();assert.equal(verifyChallenge(args).address,address);assert.notEqual(createChallenge(options).token,c.token);assert.match(c.message,/does not authorize any transaction/);assert(validAddress(address));assert(!validAddress('fake-wallet'));
});
test('challenge rejects wrong player, session, site, expiry, missing cookie, and forged signature',()=>{
 const {args}=signed();for(const overrides of [{uid:'player-2'},{accessToken:'session-2'},{origin:'https://evil.example'},{now:options.now+CHALLENGE_TTL},{now:options.now-1},{cookie:undefined},{token:args.token+'x'},{signature:Buffer.alloc(64).toString('base64')}])assert.throws(()=>verifyChallenge({...args,...overrides}));
});
test('tampered message and another wallet cannot verify ownership',()=>{
 const {args,c}=signed();const other=generateKeyPairSync('ed25519');assert.throws(()=>verifyChallenge({...args,signature:sign(null,Buffer.from(c.message+' changed'),privateKey).toString('base64')}));assert.throws(()=>verifyChallenge({...args,signature:sign(null,Buffer.from(c.message),other.privateKey).toString('base64')}));
});
test('stored verification cannot be forged in user metadata or reused by another account',()=>{
 const receipt=createReceipt({...options,verifiedAt:new Date(options.now).toISOString()});assert.equal(readReceipt(receipt,options.uid,secret).address,address);assert.equal(readReceipt(receipt,'other-player',secret),null);assert.equal(readReceipt(receipt+'x',options.uid,secret),null);assert.equal(readReceipt({address,verified:true},options.uid,secret),null);assert.equal(readReceipt(signed().c.token,options.uid,secret),null);
});
