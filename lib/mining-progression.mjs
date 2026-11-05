// XP curves adopted from Fishing/Farming by explicit user confirmation; not provided in Mining PDF.
import {professionXpLevels,branchXpLevels} from './universal-xp.mjs';
import milestones from './mining-xp-levels.json' with {type:'json'};
const levels=professionXpLevels.map((row,i)=>({...milestones[i],...row}));
const branchLevels=branchXpLevels;
export const miningLevels=Object.freeze(levels.map(Object.freeze));
export const miningBranchLevels=Object.freeze(branchLevels.map(Object.freeze));
export const miningLevelGuideHeaders=['Level','Total Mining XP','Mining XP to next','Total branch XP','Branch XP to next'];
export const miningLevelGuideRows=miningLevels.map((r,i)=>[String(r.level),r.totalXp.toLocaleString('en-US'),r.xpToNext?.toLocaleString('en-US')??'MAX',miningBranchLevels[i].totalXp.toLocaleString('en-US'),miningBranchLevels[i].xpToNext?.toLocaleString('en-US')??'MAX']);
