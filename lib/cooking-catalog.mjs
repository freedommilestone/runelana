import rows from './cooking-master-v1.json' with {type:'json'};
export const cookingCatalog=Object.freeze(rows.map(Object.freeze));
export const cookingCategories=[['standard','Standard Cooking'],['everyday','Everyday Chef'],['artisan','Artisan Chef'],['master','Master Chef']];
export const cookingBranchIds={everyday:'everyday-chef',artisan:'artisan-chef',master:'master-chef'};
export const cookingRuneCost=r=>Object.entries(r.runes).map(([id,n])=>`${n} ${id[0].toUpperCase()+id.slice(1)}`).join(' + ');
export const cookingGuideHeaders=['Meal','Cooking level','Branch level','Ingredients / batch','Runes / batch','Minutes','Servings','Cooking XP','Branch XP','Time reduction','Food eligibility'];
export const cookingGuideRow=r=>[r.name,String(r.requiredLevel),r.requiredBranchLevel==null?'—':String(r.requiredBranchLevel),r.materials.map(m=>`${m.quantity} ${m.name}`).join(' + '),cookingRuneCost(r),String(r.durationSeconds/60),String(r.yieldQuantity),String(r.xpReward),String(r.branchXpReward),`${r.timeReductionPercent}%`,r.foodEligibility==='pending-profession'?'Profession-specific: pending':'One chosen activity'];
