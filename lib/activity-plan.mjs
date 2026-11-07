import {playerInventory} from './player-inventory.mjs';

const ticksPerRune=3600000000n;
const limit=1000000;
// Only explicit catalog/starter equivalents. A rake is not a hoe, and a
// generic rod is not a replacement for a higher-tier activity's equipment.
const equivalents={'Small Net':'small-fishing-net','Basic Crafting Kit':'basic-crafting-toolkit','Wheat Seed':'wheat-seeds','Potato Seed':'potato-seeds','Bait':'basic-bait'};
export function wholeRunes(ticks){
 try{return Number(BigInt(ticks||0)/ticksPerRune>BigInt(limit)?BigInt(limit):BigInt(ticks||0)/ticksPerRune);}catch{return 0;}
}
export function formatActivityTime(seconds){
 const n=Math.max(0,Math.floor(seconds));
 return [n>=3600?`${Math.floor(n/3600)}h`:null,n>=60?`${Math.floor(n%3600/60)}m`:null,n%60||!n?`${n%60}s`:null].filter(Boolean).join(' ');
}
export function activityResources(activity,state,runeData){
 const owned=playerInventory(state);
 const match=(name,id)=>owned.filter(i=>i.id===id||i.id===equivalents[name]||i.name===name);
 const runes=(activity.runes||[]).map(r=>({...r,owned:runeData?wholeRunes(runeData.inventoryTicks?.[r.id]):null,access:activity.skillId==='mining'?Boolean(runeData?.unlocked?.includes(r.id)):true}));
 const materials=(activity.materials||[]).map(m=>({...m,owned:match(m.name,m.id).reduce((n,i)=>n+i.quantity,0)}));
 const equipment=(activity.equipment||[]).flatMap(e=>e.split(/\s*\+\s*/)).map(name=>({name,options:match(name),consumable:name==='Bait'}));
 return {runes,materials,equipment};
}
export function planActivity({activity,record,state,resources,timeLimit=3600,quantity=1,selections={}}){
 const issues=[];
 const path=record?.specializations?.find(p=>p.id===activity.specializationId);
 const required=Math.max(activity.requiredLevel||0,path?.requiredLevel||0);
 if(!activity.live){
  if(!record)issues.push('Skill progress is unavailable.');
  else if(record.level<required)issues.push(`Requires overall level ${required}; you are level ${record.level}.`);
  if(activity.requiredBranchLevel!=null&&(!path||path.level<activity.requiredBranchLevel))issues.push(`Requires ${activity.branchName||'branch'} level ${activity.requiredBranchLevel}.`);
 }
 if(state.activity)issues.push('Finish or cancel your current activity first.');
 if(!Number.isSafeInteger(activity.durationSeconds)||activity.durationSeconds<=0)issues.push('Activity timing is not configured yet.');
 if(!activity.live&&!activity.runeRequirementsConfigured)issues.push('Rune requirements are not configured yet.');
 let resourceMaximum=activity.live?1:10000;
 for(const r of [...resources.runes,...resources.materials]){
  if(r.access===false){issues.push(`Mining requires unlocked ${r.name} rune access.`);resourceMaximum=0;}
  if(r.owned===null){issues.push('Rune inventory is unavailable.');resourceMaximum=0;continue;}
  if(!Number.isSafeInteger(r.quantity)||r.quantity<=0){issues.push(`${r.name} cost is not configured yet.`);resourceMaximum=0;continue;}
  resourceMaximum=Math.min(resourceMaximum,Math.floor(r.owned/r.quantity));
  if(r.owned<r.quantity)issues.push(`Not enough ${r.name}${resources.runes.includes(r)?' runes':''}.`);
 }
 for(const e of resources.equipment){
  const chosen=e.options.find(o=>o.id===selections[e.name]);
  if(!chosen){issues.push(`Requires ${e.name} from your inventory.`);resourceMaximum=0;}
  if(e.consumable){issues.push(`${e.name} consumption per batch is not specified in the master list.`);resourceMaximum=0;}
 }
 const timeMaximum=activity.durationSeconds>0?Math.floor(timeLimit/activity.durationSeconds):0;
 const maximum=issues.length?0:Math.max(0,Math.min(resourceMaximum,timeMaximum));
 const batches=Math.min(maximum,Math.max(0,Math.floor(Number(quantity)||0)));
 const outputs=activity.outputs?.length?activity.outputs:[{name:activity.name,quantity:1}];
 return {maximum,resourceMaximum,timeMaximum,batches,seconds:batches*(activity.durationSeconds||0),issues:[...new Set(issues)],
  runes:resources.runes.map(r=>({...r,total:r.quantity*batches})),materials:resources.materials.map(r=>({...r,total:r.quantity*batches})),
  outputs:outputs.map(o=>({...o,total:o.quantity*batches})),xp:(activity.xpReward||0)*batches};
}
