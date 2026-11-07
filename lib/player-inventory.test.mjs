import test from 'node:test';
import assert from 'node:assert/strict';
import {playerInventory} from './player-inventory.mjs';

test('inventory contains only positive saved stacks and owned equipment, never preview or rune balances',()=>{
 const items=playerInventory({steelBars:12,runes:30.75,inventoryTicks:{soul:'3600000000'},owned:['armor','armor','unknown'],equipped:'Royal Platebody'});
 assert.deepEqual(items.map(({id,quantity})=>[id,quantity]),[['steel-bars',12],['armor',1]]);
 assert.equal(items[1].equipped,true);
 assert.equal(items.filter(item=>item.equippable).length,1);
 assert.deepEqual(playerInventory({steelBars:0,runes:0,owned:[],equipped:"Traveler's cloak"}),[]);
});
test('equipment selection follows the saved equipped item and never grants unowned gear',()=>{
 const state={steelBars:0,runes:0,owned:['cape','blade'],equipped:'Dragon Blade'};
 assert.deepEqual(playerInventory(state).map(i=>[i.id,i.equipped]),[['cape',false],['blade',true]]);
 assert.equal(playerInventory({...state,equipped:'Royal Platebody'}).some(i=>i.equipped),false);
});

test('Basic Hoe is a reusable starter tool and placeholder supplies never appear',()=>{
 const items=playerInventory({runes:120,starterItems:[{id:'basic-hoe',quantity:1}]});
 assert.equal(items.length,1);assert.equal(items[0].name,'Basic Hoe');assert.equal(items[0].category,'tools');assert.equal(items[0].reusable,true);
});
