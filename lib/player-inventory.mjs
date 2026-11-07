import {starterInventory} from './starter-kit.mjs';
import {gear} from './game.mjs';

// The saved profile currently owns these stacks. Catalog recipes and typed runes
// are deliberately not converted into owned items by the inventory view.
export function playerInventory(state) {
 const items=starterInventory(state);
 for(const item of state.producedItems||[])if(Number.isSafeInteger(item.quantity)&&item.quantity>0)items.push({...item,production:true,category:({fishing:'fish',cooking:'consumables',smithing:'smithing'})[item.skillId]||'materials',type:'Skill production item',description:`${item.name} earned from completed skill activities. Available as an ingredient where the master list requires this exact item.`,source:'Collected from a completed profession activity. Bundles remain bundles; they are not automatically converted into individual items.',art:({fishing:'665 911 51 45',cooking:'992 908 36 49',smithing:'821 918 57 36',mining:'747 909 48 50',farming:'586 909 48 49',crafting:'349 908 40 42'})[item.skillId]});
 const quantity=value=>Number.isFinite(value)&&value>0?Math.floor(value):0;
 if(quantity(state.steelBars))items.push({id:'steel-bars',name:'Steel Bar',quantity:quantity(state.steelBars),category:'smithing',type:'Smithing material',description:'Steel bars collected from completed Smithing activities.',source:'Smith Steel Bars produces 10 bars per completed activity.',art:'971 226 100 65'});
 for(const item of gear.filter(item=>state.owned?.includes(item.id)))items.push({...item,quantity:1,category:item.type==='Weapons'?'weapons':'armor',type:item.type==='Armor'?'Armor (Body)':item.type==='Hats'?'Armor (Head)':item.type==='Capes'?'Armor (Back)':'Weapon',equippable:true,equipped:state.equipped===item.name,description:`${item.name} is part of your saved equipment collection. Equip it to display it on your profile. Combat bonuses have not been assigned to this item.`,source:`Available from the prototype Marketplace for ${item.cost} crafting supplies.`,art:({armor:'531 550 81 78',helm:'995 551 80 76',blade:'382 550 85 77'})[item.id],legacyArt:item.id==='cape'?'553 838 92 64':null});
 return items;
}
