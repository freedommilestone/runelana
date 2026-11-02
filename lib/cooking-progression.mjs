// XP curves adopted from Fishing/Farming by explicit user confirmation; not provided in Cooking PDF.
import levels from './cooking-xp-levels.json' with {type:'json'};
import branchLevels from './cooking-branch-xp-levels.json' with {type:'json'};
export const cookingLevels=Object.freeze(levels.map(Object.freeze));
export const cookingBranchLevels=Object.freeze(branchLevels.map(Object.freeze));
export const cookingLevelGuideHeaders=['Level','Total Cooking XP','Cooking XP to next','Total branch XP','Branch XP to next'];
export const cookingLevelGuideRows=cookingLevels.map((r,i)=>[String(r.level),r.totalXp.toLocaleString('en-US'),r.xpToNext?.toLocaleString('en-US')??'MAX',cookingBranchLevels[i].totalXp.toLocaleString('en-US'),cookingBranchLevels[i].xpToNext?.toLocaleString('en-US')??'MAX']);
