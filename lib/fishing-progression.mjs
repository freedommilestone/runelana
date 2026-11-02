import levels from './fishing-xp-levels.json' with {type:'json'};
import branchLevels from './fishing-branch-xp-levels.json' with {type:'json'};

export const fishingLevels=Object.freeze(levels.map(row=>Object.freeze(row)));
export const fishingBranchLevels=Object.freeze(branchLevels.map(row=>Object.freeze(row)));
export const fishingBranchMaxXp=fishingBranchLevels.at(-1).totalXp;
export const fishingLevelGuideHeaders=['Level','Total Fishing XP','Fishing XP to next','Total branch XP','Branch XP to next','Overall Fishing milestone'];
export const fishingLevelGuideRows=fishingLevels.map((r,i)=>[String(r.level),r.totalXp.toLocaleString('en-US'),r.xpToNext?.toLocaleString('en-US')??'MAX',fishingBranchLevels[i].totalXp.toLocaleString('en-US'),fishingBranchLevels[i].xpToNext?.toLocaleString('en-US')??'MAX',r.milestone||'—']);
export const fishingMaxXp=fishingLevels.at(-1).totalXp;
export const fishingProgress=xp=>curveProgress(fishingLevels,xp);
export const fishingBranchProgress=xp=>curveProgress(fishingBranchLevels,xp);
function curveProgress(curve,xp){
 if(!Number.isSafeInteger(xp)||xp<0)throw new RangeError('Fishing XP must be a nonnegative safe integer.');
 const row=curve.findLast(row=>row.totalXp<=xp),atMaxLevel=row.level===99;
 return {level:row.level,xp,levelStartXp:row.totalXp,nextLevelXp:atMaxLevel?null:row.totalXp+row.xpToNext,
  xpIntoLevel:atMaxLevel?0:xp-row.totalXp,xpForLevel:row.xpToNext,
  xpRemaining:atMaxLevel?0:row.totalXp+row.xpToNext-xp,atMaxLevel,
  percent:atMaxLevel?100:(xp-row.totalXp)/row.xpToNext*100};
}
// Use the server's curve snapshot in player UI; never invent progress on a failed read.
export function skillProgressPercent(skill){
 const p=skill?.progression;
 return p?p.atMaxLevel?100:p.xpIntoLevel/p.xpForLevel*100:(skill?.level??0)/99*100;
}
export function skillXpLabel(skill){
 if(!skill)return 'Progress unavailable';
 const p=skill.progression,total=skill.xp.toLocaleString();
 return !p?`${total} XP`:p.atMaxLevel?`${total} XP · Level 99 mastery`:
  `${total} / ${p.nextLevelXp.toLocaleString()} XP · ${p.xpRemaining.toLocaleString()} XP to level ${skill.level+1}`;
}
