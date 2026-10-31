import {economyScenarios,simulateEconomy} from '../lib/economy-simulation.mjs';
const report={
 status:'draft',
 assumptions:['Seven days unless specified; 10 capacity units/hour after the first unlock using proposed costs 1/2/8/20/120. Flat production is included for comparison only. No rune trading.','Holding tiers and skill levels stay fixed per scenario; profession level is 99 except the new-player scenario.','Materials are assumed available, so upstream gathering and material market costs are not simulated.','Production is evaluated in daily batches with rune carryover, a single 24-hour activity slot, and the stated recipe priority. Intraday scheduling is not modeled.','Requested batches are synthetic demand targets, not sales forecasts. No GP prices, market clearing, or profit guarantees are modeled.'],
 results:economyScenarios.map(simulateEconomy)
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
