// XP curves adopted from Fishing/Farming following the established profession convention; not provided in Smithing PDF.
import {professionXpLevels,branchXpLevels} from './universal-xp.mjs';
import milestones from './smithing-xp-levels.json' with {type:'json'};
const levels=professionXpLevels.map((row,i)=>({...milestones[i],...row}));
const branchLevels=branchXpLevels;
export const smithingLevels=Object.freeze(levels.map(Object.freeze));
export const smithingBranchLevels=Object.freeze(branchLevels.map(Object.freeze));
export const smithingLevelGuideHeaders=['Level','Total Smithing XP','Smithing XP to next','Total branch XP','Branch XP to next'];
export const smithingLevelGuideRows=smithingLevels.map((r,i)=>[String(r.level),r.totalXp.toLocaleString('en-US'),r.xpToNext?.toLocaleString('en-US')??'MAX',smithingBranchLevels[i].totalXp.toLocaleString('en-US'),smithingBranchLevels[i].xpToNext?.toLocaleString('en-US')??'MAX']);
