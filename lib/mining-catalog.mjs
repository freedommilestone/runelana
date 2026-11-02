import rows from './mining-master-v1.json' with {type:'json'};
export const miningCatalog=Object.freeze(rows.map(Object.freeze));
export const miningCategories=[['standard','Standard Mining'],['ore','Ore Miner'],['gem','Gem Prospector'],['mineral','Rare Mineral Extractor']];
export const miningBranchIds={ore:'ore-miner',gem:'gem-prospector',mineral:'rare-mineral-extractor'};
export const miningRuneCost=r=>Object.entries(r.runes).map(([id,n])=>`${n} ${id[0].toUpperCase()+id.slice(1)}`).join(' + ');
export const miningGuideHeaders=['ID','Output','Mining level','Branch level','Runes / attempt','Reusable equipment','Time','Guaranteed yield','Mining XP','Branch XP'];
export const miningGuideRow=r=>[r.id,r.name,String(r.requiredLevel),r.requiredBranchLevel==null?'—':String(r.requiredBranchLevel),miningRuneCost(r),r.equipment,`${r.durationSeconds/60} min`,String(r.yieldQuantity),String(r.xpReward),String(r.branchXpReward)];
