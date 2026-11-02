import test from 'node:test';
import assert from 'node:assert/strict';
import {allGuideEntries,searchGuide,guideArticles} from './player-guide.mjs';
import {runeProgression} from './rune-progression.mjs';
test('guide search finds mechanic details, tables, and common questions without requiring question filler',()=>{
 assert(searchGuide('HOW do I get Soul runes?').some(e=>e.id==='unlocks'));
 assert(searchGuide('localhost').some(e=>e.id==='account'));
 assert(searchGuide('365').some(e=>e.id==='unlocks'));
 assert(searchGuide('Can I play without GP?','faq').some(e=>e.id==='faq-free'));
 assert(searchGuide('merchant','items').every(e=>e.category==='items'));
 assert.equal(searchGuide('not-a-real-topic-xyz').length,0);
 assert.equal(searchGuide('"<img onerror=alert(1)>"').length,0);
 assert(searchGuide('','faq').every(e=>e.faq));
});
test('guide IDs and navigation destinations are valid and live/proposed tables stay separate',()=>{
 assert.equal(new Set(allGuideEntries.map(e=>e.id)).size,allGuideEntries.length);
 const destinations=new Set(['Settings','My Profile','Rune Production','Runes','Skills','Produce','Bank','Marketplace']);
 assert(allGuideEntries.every(e=>!e.action||destinations.has(e.action)));
 const unlocks=guideArticles.find(e=>e.id==='unlocks'),proposal=guideArticles.find(e=>e.id==='production-proposal');
 assert.equal(unlocks.status,'live');assert.equal(proposal.status,'proposal');
 assert.deepEqual(unlocks.table.rows.map(r=>r[2]),runeProgression.tiers.map(t=>`${t.holdingDays} days`));
 assert.deepEqual(proposal.table.rows.map(r=>r[2]),['240','240','240','120','120','30','12','2']);
});
