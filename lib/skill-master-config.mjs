import {craftingCategories,craftingBranchIds} from './crafting-catalog.mjs';
import {craftingLevels,craftingBranchLevels} from './crafting-progression.mjs';
import {fishingCategories} from './fishing-catalog.mjs';
import {fishingLevels,fishingBranchLevels} from './fishing-progression.mjs';
import {farmingCategories,farmingBranchIds} from './farming-catalog.mjs';
import {farmingLevels,farmingBranchLevels} from './farming-progression.mjs';
import {miningCategories,miningBranchIds} from './mining-catalog.mjs';
import {miningLevels,miningBranchLevels} from './mining-progression.mjs';
import {cookingCategories,cookingBranchIds} from './cooking-catalog.mjs';
import {cookingLevels,cookingBranchLevels} from './cooking-progression.mjs';
import {smithingCategories,smithingBranchIds} from './smithing-catalog.mjs';
import {smithingLevels,smithingBranchLevels} from './smithing-progression.mjs';
export const skillMasterConfigs={
 crafting:{name:'Crafting',categories:craftingCategories,branchIds:craftingBranchIds,levels:craftingLevels,branchLevels:craftingBranchLevels,activitiesKey:'craftingActivities',hasYield:true,
  milestones:[[1,'Standard Crafting'],[10,'Jewelry Making'],[30,'Utility & Collectibles'],[99,'Overall mastery']],
  descriptions:{standard:'Make cord, timber, gem settings, and advanced components. Standard recipes award overall Crafting XP only.',jewelry:'Assemble rings, necklaces, and prestige jewelry. Enchanting adds magical effects separately.',utility:'Assemble rods, nets, and profession equipment. Speed and combat bonuses are not assigned.',decorative:'Create collectible displays. Recipes consume their trophy fish or other ingredients; irreversible rare-item use requires confirmation before production.'}},
 smithing:{name:'Smithing',categories:smithingCategories,branchIds:smithingBranchIds,levels:smithingLevels,branchLevels:smithingBranchLevels,activitiesKey:'smithingActivities',hasYield:true,
  milestones:[[1,'Standard Smithing'],[10,'Toolsmith'],[30,'Artisan & Masterwork'],[99,'Overall mastery']],
  descriptions:{standard:'Smelt bars and forge fittings. Standard recipes award overall Smithing XP only.',toolsmith:'Forge pickaxes and harpoons for professions. Equipment bonuses are not assigned.',artisan:'Make noncombat equipment for professions. Exact equipment modifiers remain pending.',masterwork:'Forge components for advanced tools and Crafting assembly. Rewards are per completed batch.'}},
 cooking:{name:'Cooking',categories:cookingCategories,branchIds:cookingBranchIds,levels:cookingLevels,branchLevels:cookingBranchLevels,activitiesKey:'cookingActivities',hasYield:true,
  milestones:[[1,'Standard Cooking'],[10,'Everyday Chef'],[30,'Artisan & Master Chef'],[99,'Overall mastery']],
  descriptions:{standard:'Prepare meals with ingredients from Fishing and Farming. Standard recipes award overall Cooking XP only.',everyday:'Cook everyday meals and provision batches with independent Everyday Chef XP.',artisan:'Prepare profession-specific food. Eligible professions are pending; meal names do not establish eligibility.',master:'Prepare high-level cuisine using rare ingredients. Food effects apply to one activity only.'}},
 fishing:{name:'Fishing',categories:fishingCategories,branchIds:{commercial:'commercial-fishing',treasure:'treasure-fishing',trophy:'trophy-fishing'},levels:fishingLevels,branchLevels:fishingBranchLevels,activitiesKey:'fishingActivities',hasYield:false,
  milestones:[[1,'Standard Fishing'],[10,'Commercial Fishing'],[30,'Treasure & Trophy'],[99,'Overall mastery']],
  descriptions:{standard:'Catch individual fish. These activities award overall Fishing XP only.',commercial:'Gather fish bundles and seafood crates. Rewards are per completed batch.',treasure:'Discover shells, pearls, and sunken relics.',trophy:'Pursue unusual catches and legendary ocean creatures.'}},
 farming:{name:'Farming',categories:farmingCategories,branchIds:farmingBranchIds,levels:farmingLevels,branchLevels:farmingBranchLevels,activitiesKey:'farmingActivities',hasYield:true,
  milestones:[[1,'Standard Farming'],[10,'Crop Farming'],[30,'Herbalism & Rare Plants'],[99,'Overall mastery']],
  descriptions:{standard:'Grow crops, fiber, timber, and herbs. Standard activities award overall Farming XP only.',crop:'Cultivate bulk crops, compost, and agricultural supplies.',herbalism:'Grow useful herbs and refine rare botanical ingredients.','rare-plant':'Cultivate unusual plants and prestige botanical creations.'}},
 mining:{name:'Mining',categories:miningCategories,branchIds:miningBranchIds,levels:miningLevels,branchLevels:miningBranchLevels,activitiesKey:'miningActivities',hasYield:true,
  milestones:[[1,'Standard Mining'],[10,'Ore Miner'],[30,'Gems & Rare Minerals'],[99,'Overall mastery']],
  descriptions:{standard:'Gather ores, uncut gems, and raw minerals. Standard activities award overall Mining XP only.',ore:'Extract veins and deposits in larger batches. XP is per completed activity, not per output.',gem:'Prospect uncut gems, clusters, and unusual gemstones.',mineral:'Extract rare raw minerals with guaranteed draft yields.'}}
};
