import rows from './smithing-master-v1.json' with {type:'json'};
export const smithingCatalog=Object.freeze(rows.map(Object.freeze));
export const smithingCategories=[['standard','Standard Smithing'],['toolsmith','Toolsmith'],['artisan','Artisan Equipment'],['masterwork','Masterwork Forging']];
export const smithingBranchIds={toolsmith:'toolsmith',artisan:'artisan-equipment',masterwork:'masterwork-forging'};
export const smithingRuneCost=r=>Object.entries(r.runes).map(([id,n])=>`${n} ${id[0].toUpperCase()+id.slice(1)}`).join(' + ');
export const smithingGuideHeaders=['Item','Smithing level','Branch level','Materials / batch','Runes / batch','Minutes','Yield','Smithing XP','Branch XP'];
export const smithingGuideRow=r=>[r.name,String(r.requiredLevel),r.requiredBranchLevel==null?'—':String(r.requiredBranchLevel),r.materials.map(m=>`${m.quantity} ${m.name}`).join(' + '),smithingRuneCost(r),String(r.durationSeconds/60),String(r.yieldQuantity),String(r.xpReward),String(r.branchXpReward)];
