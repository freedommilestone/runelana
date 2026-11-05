import {combatXpLevels as curve} from './universal-xp.mjs';
import catalog from './combat-master-v1.json' with {type:'json'};
export const combatLevels=Object.freeze(curve.map(Object.freeze));
export const combatDisciplines=Object.freeze(catalog.disciplines.map(Object.freeze));
export const combatTraining=Object.freeze(catalog.training.map(Object.freeze));
export const combatEncounters=Object.freeze(catalog.encounters.map(Object.freeze));
export function combatProgress(xp){
 if(!Number.isSafeInteger(xp)||xp<0)throw new RangeError('Combat XP must be a nonnegative safe integer.');
 const row=combatLevels.findLast(r=>r.totalXp<=xp),atMaxLevel=row.level===99;
 return {level:row.level,xp,levelStartXp:row.totalXp,nextLevelXp:atMaxLevel?null:row.totalXp+row.xpToNext,xpIntoLevel:atMaxLevel?0:xp-row.totalXp,xpForLevel:row.xpToNext,xpRemaining:atMaxLevel?0:row.totalXp+row.xpToNext-xp,atMaxLevel};
}
export function combatBaseStats(levels){
 if(combatDisciplines.some(d=>!Number.isInteger(levels[d.id])||levels[d.id]<1||levels[d.id]>99))throw new RangeError('All four combat levels must be 1–99.');
 return {combatLevel:Math.floor(combatDisciplines.reduce((n,d)=>n+levels[d.id],0)/4),accuracy:Number((10+1.10*(levels.attack-1)).toFixed(2)),power:Number((10+1.05*(levels.strength-1)).toFixed(2)),resistance:Number((10+0.90*(levels.defense-1)).toFixed(2)),maxHp:100+2*(levels.endurance-1)};
}
export const combatLevelHeaders=['Level','Total XP per discipline','XP to next','Illustrative hours at 250 XP/hour'];
export const combatLevelRows=combatLevels.map(r=>[String(r.level),r.totalXp.toLocaleString('en-US'),r.xpToNext?.toLocaleString('en-US')??'MAX',(r.totalXp/250).toFixed(1)]);
export const combatTrainingHeaders=['Discipline','Activity','Discipline level','Minutes','XP after completion','Listed XP/hour','Risk'];
export const combatTrainingRow=r=>[combatDisciplines.find(d=>d.id===r.disciplineId).name,r.name,String(r.requiredLevel),String(r.durationSeconds/60),String(r.xpReward),String(r.listedXpPerHour),r.risk];
export const combatEncounterHeaders=['Encounter','Combat level','Minutes','Suggested gear','Risk','Potential loot (odds pending)'];
export const combatEncounterRow=r=>[r.name,String(r.requiredCombatLevel),String(r.durationSeconds/60),r.suggestedGear,r.risk,r.potentialLoot];
