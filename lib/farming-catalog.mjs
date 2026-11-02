import rows from './farming-master-v1.json' with {type:'json'};
export const farmingCatalog=Object.freeze(rows.map(Object.freeze));
export const farmingCategories=[['standard','Standard Farming'],['crop','Crop Farming'],['herbalism','Herbalism'],['rare-plant','Rare Plant Cultivation']];
export const farmingBranchIds={crop:'crop-farming',herbalism:'herbalism','rare-plant':'rare-plant-cultivation'};
export const farmingRuneCost=r=>Object.entries(r.runes).map(([id,n])=>`${n} ${id[0].toUpperCase()+id.slice(1)}`).join(' + ')||'None';
export const farmingGuideHeaders=['Activity','Farming level','Branch level','Runes / batch','Equipment','Inputs / batch','Time','Yield','Farming XP','Branch XP'];
export const farmingGuideRow=r=>[r.name,String(r.requiredLevel),r.requiredBranchLevel==null?'—':String(r.requiredBranchLevel),farmingRuneCost(r),r.equipment,r.materials.map(m=>`${m.name} ×${m.quantity}`).join(', '),`${r.durationSeconds/60} min`,String(r.yieldQuantity),String(r.xpReward),String(r.branchXpReward)];
