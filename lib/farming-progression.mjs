import {professionXpLevels,branchXpLevels} from './universal-xp.mjs';
import milestones from './farming-xp-levels.json' with {type:'json'};
const levels=professionXpLevels.map((row,i)=>({...milestones[i],...row}));
const branchLevels=branchXpLevels;
export const farmingLevels=Object.freeze(levels.map(Object.freeze));
export const farmingBranchLevels=Object.freeze(branchLevels.map(Object.freeze));
export const farmingLevelGuideHeaders=['Level','Total Farming XP','Farming XP to next','Total branch XP','Branch XP to next'];
export const farmingLevelGuideRows=farmingLevels.map((r,i)=>[String(r.level),r.totalXp.toLocaleString('en-US'),r.xpToNext?.toLocaleString('en-US')??'MAX',farmingBranchLevels[i].totalXp.toLocaleString('en-US'),farmingBranchLevels[i].xpToNext?.toLocaleString('en-US')??'MAX']);
