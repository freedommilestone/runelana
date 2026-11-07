import test from 'node:test';
import assert from 'node:assert/strict';
import {activityResources,planActivity,formatActivityTime} from './activity-plan.mjs';
const activity={id:'fishing-v4-shrimp',name:'Shrimp',requiredLevel:1,runeRequirementsConfigured:true,runes:[{id:'air',name:'Air',quantity:1}],equipment:['Small Net'],durationSeconds:360,xpReward:25};
const record={level:1,specializations:[]};
const state={starterItems:[{id:'small-fishing-net',quantity:1}],activity:null};
const runeData={inventoryTicks:{air:String(50n*3600000000n)}};
const selections={'Small Net':'small-fishing-net'};
function plan(overrides={}){return planActivity({activity,record,state,resources:activityResources(activity,state,runeData),selections,quantity:10,timeLimit:3600,...overrides});}
test('Shrimp uses master-list rates, saved runes and reusable starter net',()=>{
 const p=plan();assert.equal(p.maximum,10);assert.equal(p.batches,10);assert.equal(p.seconds,3600);assert.equal(p.runes[0].total,10);assert.equal(p.outputs[0].total,10);assert.equal(p.xp,250);assert.deepEqual(p.issues,[]);
 assert.equal(plan({timeLimit:28800,quantity:100}).batches,50);
});
test('fractional runes never pay for another batch; missing data is not zero-owned',()=>{
 const resources=activityResources(activity,state,{inventoryTicks:{air:'7199999999'}});
 assert.equal(plan({resources}).maximum,1);
 assert.equal(activityResources(activity,state,null).runes[0].owned,null);
 assert.equal(plan({resources:activityResources(activity,state,null)}).maximum,0);
});
test('equipment and level gates are independent; queued activities can be planned until the queue is full',()=>{
 assert.equal(plan({selections:{}}).maximum,0);
 assert.equal(plan({record:{level:0}}).maximum,0);
 assert.equal(plan({state:{...state,activity:{type:'skill'},activityQueue:[]}}).maximum,10);
 assert.equal(plan({state:{...state,activity:{type:'skill'},activityQueue:Array(19).fill({})}}).maximum,0);
 assert.equal(plan({activity:{...activity,requiredBranchLevel:2,specializationId:'commercial'},record:{level:99,specializations:[{id:'commercial',requiredLevel:10,level:1}]}}).maximum,0);
});
test('batch output and material costs scale together, time presets do not shorten recipes',()=>{
 const recipe={...activity,equipment:[],materials:[{id:'crafting-supplies',name:'Crafting Supplies',quantity:3}],outputs:[{name:'Bars',quantity:5}],durationSeconds:600};
 const resources=activityResources(recipe,{...state,runes:14},runeData);
 const p=plan({activity:recipe,resources,quantity:50});assert.equal(p.batches,4);assert.equal(p.materials[0].total,12);assert.equal(p.outputs[0].total,20);assert.equal(p.seconds,2400);
 assert.equal(plan({activity:{...recipe,durationSeconds:18000},resources,timeLimit:14400}).maximum,0);
});
test('unknown bait quantities cannot produce a fabricated maximum',()=>{
 const recipe={...activity,equipment:['Bait']};const resources=activityResources(recipe,{starterItems:[{id:'basic-bait',quantity:20}]},runeData);
 assert.equal(plan({activity:recipe,resources,selections:{Bait:'basic-bait'}}).maximum,0);
});
test('prototype stays one batch, invalid quantity is sanitized, durations are readable',()=>{
 assert.equal(plan({activity:{...activity,live:true},quantity:100,timeLimit:28800}).batches,1);
 assert.equal(plan({quantity:'not a number'}).batches,0);
 assert.equal(plan({quantity:1.9}).batches,1);
 assert.equal(formatActivityTime(360), '6m');assert.equal(formatActivityTime(2480),'41m 20s');assert.equal(formatActivityTime(3600),'1h 0m');
});
