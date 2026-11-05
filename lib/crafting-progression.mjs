// XP thresholds are governed by Universal XP Master V1.
import {professionXpLevels,branchXpLevels} from './universal-xp.mjs';
import milestones from './crafting-xp-levels.json' with {type:'json'};
const levels=professionXpLevels.map((row,i)=>({...milestones[i],...row}));
const branchLevels=branchXpLevels;
export const craftingLevels=Object.freeze(levels.map(Object.freeze));
export const craftingBranchLevels=Object.freeze(branchLevels.map(Object.freeze));
export const craftingLevelGuideHeaders=['Level','Total Crafting XP','Crafting XP to next','Total branch XP','Branch XP to next'];
export const craftingLevelGuideRows=craftingLevels.map((r,i)=>[String(r.level),r.totalXp.toLocaleString('en-US'),r.xpToNext?.toLocaleString('en-US')??'MAX',craftingBranchLevels[i].totalXp.toLocaleString('en-US'),craftingBranchLevels[i].xpToNext?.toLocaleString('en-US')??'MAX']);
