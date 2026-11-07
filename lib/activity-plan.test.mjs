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
test('time selections fill whole batches and respect resource caps and manual quantities',()=>{
 const resources=activityResources(activity,state,{inventoryTicks:{air:String(100n*3600000000n)}});
 for(const [timeLimit,batches,seconds] of [[900,2,720],[3600,10,3600],[14400,40,14400],[28800,80,28800]]){
  const p=plan({resources,timeLimit,quantity:1,fillTime:true});
  assert.equal(p.batches,batches);assert.equal(p.seconds,seconds);assert.equal(p.runes[0].total,batches);
 }
 const capped=plan({timeLimit:28800,fillTime:true});assert.equal(capped.batches,50);assert.equal(capped.seconds,18000);
 const manual=plan({resources,timeLimit:14400,fillTime:false,quantity:3});assert.equal(manual.batches,3);assert.equal(manual.seconds,1080);
 assert.equal(plan({resources,timeLimit:900,fillTime:true,quantity:0}).batches,2);
 assert.equal(plan({resources,activity:{...activity,durationSeconds:2100},timeLimit:900,fillTime:true}).batches,0);
 assert.equal(plan({resources,activity:{...activity,durationSeconds:2100},timeLimit:3600,fillTime:true}).batches,1);
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
 const recipe={...activity,equipment:[],materials:[{name:'Iron Ore',quantity:3}],outputs:[{name:'Bars',quantity:5}],durationSeconds:600};
 const resources=activityResources(recipe,{...state,producedItems:[{name:'Iron Ore',quantity:14,skillId:'mining'}]},runeData);
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

test('Basic Hoe satisfies the Wheat tool requirement with starter seeds',()=>{
 const wheat={id:'farming-wheat',skillId:'farming',name:'Wheat',requiredLevel:1,durationSeconds:720,runeRequirementsConfigured:true,runes:[],equipment:['Basic Hoe'],materials:[{name:'Wheat Seed',quantity:1}],outputs:[{name:'Wheat',quantity:3}],xpReward:45};
 const state={starterItems:[{id:'basic-hoe',quantity:1},{id:'wheat-seeds',quantity:10}],activityQueue:[]};
 const resources=activityResources(wheat,state,null);
 assert.equal(resources.equipment[0].options[0].id,'basic-hoe');
 const result=planActivity({activity:wheat,record:{level:1,specializations:[]},state,resources,timeLimit:3600,quantity:1,selections:{'Basic Hoe':'basic-hoe'}});
 assert.deepEqual(result.issues,[]);assert.equal(result.batches,1);assert.equal(result.outputs[0].total,3);
});
