import test from 'node:test';
import assert from 'node:assert/strict';
import {recipes,materials,commonRunes,uncommonRunes,rareRunes} from './recipe-catalog.mjs';
import {simulateEconomy,economyScenarios} from './economy-simulation.mjs';
test('35 draft recipes give every skill two rune-free entry points and reachable materials',()=>{
 assert.equal(recipes.length,35);assert.equal(new Set(recipes.map(r=>r.id)).size,35);
 for(const skill of new Set(recipes.map(r=>r.skill))){const rows=recipes.filter(r=>r.skill===skill);assert.equal(rows.length,5);assert.equal(rows.filter(r=>r.tier==='basic').length,2);assert.equal(rows.filter(r=>r.tier==='intermediate').length,2);assert.equal(rows.filter(r=>r.tier==='advanced').length,1);}
 const outputs=new Set(recipes.flatMap(r=>Object.keys(r.outputs)));
 for(const r of recipes){assert(r.seconds>0&&r.xp>0);for(const m of Object.keys(r.inputs))assert(outputs.has(m),`${m} must be obtainable`);if(r.tier==='basic'){assert.equal(r.level,0);assert.deepEqual(r.runes,{})}else if(r.tier==='intermediate')assert(Object.keys(r.runes).every(id=>[...commonRunes,...uncommonRunes].includes(id)));else{assert(Object.keys(r.runes).some(id=>rareRunes.includes(id)));assert(Object.keys(r.runes).length>=2);assert(Object.keys(r.inputs).length>0)}}
 // Verify dependency chains can bootstrap from free gathering, with no circular prerequisites.
 const reached=new Set();let changed=true;while(changed){changed=false;for(const r of recipes)if(Object.keys(r.inputs).every(x=>reached.has(x)))for(const m of Object.keys(r.outputs))if(!reached.has(m)){reached.add(m);changed=true;}}
 assert.equal(reached.size,materials.length);
});
test('a new player completes basic work without a wallet, runes, or production',()=>{
 const result=simulateEconomy(economyScenarios[0]);assert.equal(result.producedRunes,0);assert.equal(result.completedBatches,840);assert.equal(result.completedBatches,result.requestedBatches);
});
test('allocation changes support different outputs, while unmet demand and stockpiles remain possible',()=>{
 const results=economyScenarios.map(simulateEconomy);
 assert(results[2].recipes.filter(r=>r.completed>0).length>results[1].recipes.filter(r=>r.completed>0).length);
 assert.equal(results[3].recipes.find(r=>r.id==='prepare-harvest-meal').completed,0);
 assert(results[4].recipes.find(r=>r.id==='prepare-harvest-meal').completed>0);
 assert(results[5].remainingRunes.fire>0);
 assert(results[6].completedBatches<results[6].requestedBatches);
 for(const result of results){assert(Object.values(result.remainingRunes).every(n=>n>=0));assert(result.activityHours<=24*result.days);const consumed=result.recipes.reduce((n,r)=>n+r.completed*Object.values(recipes.find(x=>x.id===r.id).runes).reduce((a,b)=>a+b,0),0);assert.equal(consumed+Object.values(result.remainingRunes).reduce((a,b)=>a+b,0),result.producedRunes);}
});
test('simulations respect fixed capacity, unlocks, profession levels, and activity time',()=>{
 assert.throws(()=>simulateEconomy({...economyScenarios[1],allocation:{fire:11}}));
 assert.throws(()=>simulateEconomy({...economyScenarios[1],allocation:{soul:10}}));
 const limited=simulateEconomy({...economyScenarios[0],demand:{'catch-shrimp':2000}});assert.equal(limited.completedBatches,1440*7);
 const locked=simulateEconomy({...economyScenarios[1],professionLevel:0,demand:{'smith-steel-bars':20}});assert.equal(locked.completedBatches,0);assert.equal(locked.recipes[0].blockedByUnlock,140);
});

test('proposed capacity costs distinguish rarity and accumulate fractional hourly output',()=>{const results=economyScenarios.map(simulateEconomy);assert.equal(results[7].producedRunes,1680);assert.equal(results[8].producedRunes,14);assert.equal(results[9].producedRunes,210);assert.equal(results[9].producedRunes/7/24,1.25);});

test('Soul production matches the proposed two per day and meaningful legendary consumption',()=>{const scenario=economyScenarios[8];assert.equal(simulateEconomy({...scenario,days:30}).producedRunes,60);assert.equal(simulateEconomy({...scenario,days:365}).producedRunes,730);const legendary=recipes.find(r=>r.id==='seasonal-enchantment');assert.equal(legendary.runes.soul,10);assert(legendary.level>=80);assert(legendary.seconds>=86400);assert.equal(legendary.runes.soul/2,5);});

test('fractional allocations reach exact craft thresholds without rounding delays',()=>{const r=simulateEconomy({...economyScenarios.at(-1),days:25});assert.equal(r.recipes[0].completed,4);assert.equal(r.remainingRunes.soul,0);});
