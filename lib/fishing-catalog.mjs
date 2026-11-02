import rows from './fishing-master-v7.json' with {type:'json'};
export const fishingCatalog=Object.freeze(rows.map(r=>Object.freeze(r)));
export const fishingCategories=[['standard','Standard Fishing'],['commercial','Commercial Fishing'],['treasure','Treasure Fishing'],['trophy','Trophy Fishing']];
export const fishingRuneCost=r=>Object.entries(r.runes).map(([id,n])=>`${n} ${id[0].toUpperCase()+id.slice(1)}`).join(' + ');
export const fishingGuideHeaders=['Activity','Fishing level','Branch level','Runes / batch','Equipment','Time','Fishing XP','Branch XP','Artwork reference'];
export const fishingGuideRow=r=>[r.name,String(r.requiredLevel),r.requiredBranchLevel==null?'—':String(r.requiredBranchLevel),fishingRuneCost(r),r.equipment,`${r.durationSeconds/60} min`,String(r.xpReward),r.branchXpReward==null?'—':String(r.branchXpReward),r.referenceUrl?{label:r.reference,href:r.referenceUrl}:r.reference];
