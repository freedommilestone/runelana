import rows from './crafting-master-v1.json' with {type:'json'};
export const craftingCatalog=Object.freeze(rows.map(Object.freeze));
export const craftingCategories=[['standard','Standard Crafting'],['jewelry','Jewelry Making'],['utility','Utility Crafting'],['decorative','Decorative Collectibles']];
export const craftingBranchIds={jewelry:'jeweler',utility:'utility-crafting',decorative:'decorative-collectibles'};
export const craftingRuneCost=r=>Object.entries(r.runes).map(([id,n])=>`${n} ${id[0].toUpperCase()+id.slice(1)}`).join(' + ')||'None';
export const craftingGuideHeaders=['Item','Crafting level','Branch level','Materials / batch','Runes / batch','Equipment','Minutes','Yield','Crafting XP','Branch XP'];
export const craftingGuideRow=r=>[r.name,String(r.requiredLevel),r.requiredBranchLevel==null?'—':String(r.requiredBranchLevel),r.materials.map(m=>`${m.quantity} ${m.name}`).join(' + '),craftingRuneCost(r),r.equipment.join(', '),String(r.durationSeconds/60),String(r.yieldQuantity),String(r.xpReward),String(r.branchXpReward)];
