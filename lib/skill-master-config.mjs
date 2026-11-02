import {fishingCategories} from './fishing-catalog.mjs';
import {fishingLevels,fishingBranchLevels} from './fishing-progression.mjs';
import {farmingCategories,farmingBranchIds} from './farming-catalog.mjs';
import {farmingLevels,farmingBranchLevels} from './farming-progression.mjs';
import {miningCategories,miningBranchIds} from './mining-catalog.mjs';
import {miningLevels,miningBranchLevels} from './mining-progression.mjs';
export const skillMasterConfigs={
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
