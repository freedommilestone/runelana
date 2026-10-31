import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,restore} from './game.mjs';
import {startActivity,finishActivity,cancelActivity} from './activity.mjs';
test('smithing charges once, completes only when due, and cannot be collected twice',()=>{
 const started=startActivity(initialState,'smith',1000);
 assert.equal(started.runes,100);assert.equal(startActivity(started,'service',2000),started);
 assert.equal(finishActivity(started,120999),started);
 const complete=finishActivity(started,121000);assert.equal(complete.steelBars,10);assert.equal(complete.xp,10);
 assert.equal(finishActivity(complete,122000),complete);
});
test('cancel refunds materials, insufficient funds cannot start',()=>{
 assert.equal(cancelActivity(startActivity(initialState,'smith',1)).runes,120);
 const poor={...initialState,runes:5};assert.equal(startActivity(poor,'smith',1),poor);
});
test('service rewards and in-progress activities survive save restore',()=>{
 const active=startActivity(initialState,'service',1000);
 assert.deepEqual(restore(JSON.stringify(active)),active);
 const complete=finishActivity(active,91000);assert.equal(complete.gp,40);assert.equal(complete.xp,5);
 assert.deepEqual(restore(JSON.stringify(complete)),complete);
});
