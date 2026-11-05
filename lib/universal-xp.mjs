import curves from './universal-xp-levels.json' with {type:'json'};
import unlocks from './universal-xp-unlocks.json' with {type:'json'};
export const universalXpVersion='universal-xp-v1';
export const professionXpLevels=Object.freeze(curves.profession.map(Object.freeze));
export const branchXpLevels=Object.freeze(curves.branch.map(Object.freeze));
export const combatXpLevels=Object.freeze(curves.combat.map(Object.freeze));
export const specializationUnlocks=Object.freeze(unlocks.map(Object.freeze));
export function universalProgress(track,xp){
 const curve={profession:professionXpLevels,branch:branchXpLevels,combat:combatXpLevels}[track];
 if(!curve)throw new RangeError('Unknown XP track.');
 if(!Number.isSafeInteger(xp)||xp<0)throw new RangeError('XP must be a nonnegative safe integer.');
 const row=curve.findLast(r=>r.totalXp<=xp),atMaxLevel=row.level===99;
 return {curve:`universal-${track}-v1`,curveVersion:universalXpVersion,level:row.level,xp,levelStartXp:row.totalXp,nextLevelXp:atMaxLevel?null:row.totalXp+row.xpToNext,xpIntoLevel:atMaxLevel?0:xp-row.totalXp,xpForLevel:row.xpToNext,xpRemaining:atMaxLevel?0:row.totalXp+row.xpToNext-xp,maxLevel:99,atMaxLevel,percent:atMaxLevel?100:(xp-row.totalXp)/row.xpToNext*100};
}
const fmt=n=>n==null?'MAX':n.toLocaleString('en-US');
export const universalXpHeaders=['Level','Profession total XP','Profession XP to next','Branch total XP','Branch XP to next','Combat total XP','Combat XP to next'];
export const universalXpRows=professionXpLevels.map((p,i)=>[String(p.level),fmt(p.totalXp),fmt(p.xpToNext),fmt(branchXpLevels[i].totalXp),fmt(branchXpLevels[i].xpToNext),fmt(combatXpLevels[i].totalXp),fmt(combatXpLevels[i].xpToNext)]);
export const specializationHeaders=['Profession','Specialization','Parent level required','Starting branch level'];
export const specializationRows=specializationUnlocks.map(s=>[s.skill,s.name,String(s.requiredLevel),'1 (0 XP)']);
