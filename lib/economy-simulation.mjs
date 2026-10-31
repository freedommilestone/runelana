import {proposedRuneCost} from './rune-economy.mjs';
import {recipes} from './recipe-catalog.mjs';
import {runeProgression} from './rune-progression.mjs';
// Supply-capacity experiment, not a market-price or profitability forecast.
// Materials are assumed available; a single activity slot is limited to 24h/day.
export function simulateEconomy({name,holdingDays,allocation,demand,days=7,professionLevel=99,productionModel='proposed-weighted'}){
 if(!['flat','proposed-weighted'].includes(productionModel)||!Number.isFinite(holdingDays)||holdingDays<0||!Number.isInteger(professionLevel)||professionLevel<0||professionLevel>99)throw Error('Invalid simulation configuration');
 const cost=id=>productionModel==='flat'?1:proposedRuneCost(id);
 if(!Number.isInteger(days)||days<1||days>365)throw Error('Invalid duration');
 const unlocked=runeProgression.tiers.filter(t=>t.holdingDays<=holdingDays).map(t=>t.id);
 const rate=Object.values(allocation).reduce((n,v)=>n+v,0);
 if(rate!==(unlocked.length?10:0)||Object.entries(allocation).some(([r,n])=>!unlocked.includes(r)||!Number.isInteger(n)||n<0))throw Error('Allocation must use unlocked types and the fixed capacity');
 const rows=Object.entries(demand).map(([id,perDay])=>{const recipe=recipes.find(r=>r.id===id);if(!recipe||!Number.isInteger(perDay)||perDay<0)throw Error('Invalid demand');return {recipe,perDay,requested:0,completed:0,blockedByUnlock:0,blockedByTime:0,blockedByRunes:0}});
 // 120 subunits per rune exactly represents every proposed fractional rate.
 const scale=120;
 const stock=Object.fromEntries(runeProgression.tiers.map(r=>[r.id,0]));let secondsUsed=0;
 for(let day=0;day<days;day++){
  let remaining=86400;
  for(const [r,n] of Object.entries(allocation))stock[r]+=24*n*scale/cost(r);
  for(const row of rows){
   const r=row.recipe;row.requested+=row.perDay;
   if(professionLevel<r.level||Object.keys(r.runes).some(id=>!unlocked.includes(id))){row.blockedByUnlock+=row.perDay;continue;}
   const timeCapacity=Math.min(row.perDay,Math.floor(remaining/r.seconds));
   const amount=Math.min(timeCapacity,...Object.entries(r.runes).map(([id,n])=>Math.floor(stock[id]/(n*scale))));
   for(const [id,n] of Object.entries(r.runes))stock[id]-=amount*n*scale;
   remaining-=amount*r.seconds;secondsUsed+=amount*r.seconds;row.completed+=amount;
   row.blockedByTime+=row.perDay-timeCapacity;row.blockedByRunes+=timeCapacity-amount;
  }
 }
 return {name,days,holdingDays,professionLevel,productionModel,allocation,capacityUnits:rate*24*days,producedRunes:Object.entries(allocation).reduce((n,[r,v])=>n+v*24*days*scale/cost(r),0)/scale,remainingRunes:Object.fromEntries(Object.entries(stock).map(([id,n])=>[id,n/scale])),activityHours:Number((secondsUsed/3600).toFixed(2)),requestedBatches:rows.reduce((n,r)=>n+r.requested,0),completedBatches:rows.reduce((n,r)=>n+r.completed,0),recipes:rows.map(({recipe,perDay,...r})=>({id:recipe.id,...r}))};
}
export const economyScenarios=[
 {name:'New player without GP or runes',holdingDays:0,professionLevel:0,allocation:{},demand:{'catch-shrimp':40,'grow-wheat':40,'mine-copper':40}},
 {name:'Day-30 Fire focus',holdingDays:30,allocation:{fire:10},demand:{'smith-steel-bars':60,'cook-specialty-stew':30,'irrigate-berries':30}},
 {name:'Day-30 common/uncommon mix',holdingDays:30,allocation:{fire:6,water:3,mind:1},demand:{'smith-steel-bars':60,'cook-specialty-stew':30,'irrigate-berries':30}},
 {name:'Day-60 Fire focus',holdingDays:60,allocation:{fire:10},demand:{'prepare-harvest-meal':10,'smith-steel-bars':60,'irrigate-berries':30}},
 {name:'Day-60 Nature diversification',holdingDays:60,allocation:{fire:5,water:2,mind:1,nature:2},demand:{'prepare-harvest-meal':10,'smith-steel-bars':60,'irrigate-berries':30}},
 {name:'Low requested production',holdingDays:30,allocation:{fire:10},demand:{'smith-steel-bars':10}},
 {name:'High requested production',holdingDays:30,allocation:{fire:10},demand:{'smith-steel-bars':150}},
 {name:'Soul focus under current flat production',holdingDays:365,allocation:{soul:10},demand:{},productionModel:'flat'},
 {name:'Soul focus under proposed capacity costs',holdingDays:365,allocation:{soul:10},demand:{}},
 {name:'Death focus with fractional hourly output',holdingDays:120,allocation:{death:10},demand:{}},
 {name:'Legendary resource accumulation over 30 days',holdingDays:365,days:30,allocation:{soul:10},demand:{}},
 {name:'Mixed legendary crafting over 30 days',holdingDays:365,days:30,allocation:{soul:8,blood:1,mind:1},demand:{'seasonal-enchantment':1}}
];
