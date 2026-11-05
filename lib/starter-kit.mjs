import catalog from './starter-kit-v1.json' with {type:'json'};
export const starterKit=catalog;
export function starterInventory(state={}){
 const slots=state.equipmentSlots||{};
 return catalog.flatMap(item=>{
  if(item.storage==='runes')return [];
  const saved=state.starterItems?.find(s=>s.id===item.id);
  if(!saved||!Number.isSafeInteger(saved.quantity)||saved.quantity<=0)return [];
  return [{...item,quantity:saved.quantity,starter:true,equippable:item.kind==='combat_equipment',equipped:slots[item.slot]===item.id,
   category:item.storage==='tools'?'tools':item.slot==='weapon'?'weapons':item.slot?'armor':'consumables',
   type:item.kind==='profession_tool'?'Profession tool':item.kind==='combat_equipment'?`Equipment (${item.slot})`:'Starter supply',
   description:item.id==='beginner-food'?'Starter food reserved for a future activity-shortening effect. Its eligible activities and exact effect are still pending; it cannot be consumed yet.':item.notes,
   source:'Beginner Starter Kit V1 · granted once per character. Cannot be sold, transferred, or dropped.'}];
 });
}
