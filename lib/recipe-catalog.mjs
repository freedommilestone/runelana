// Launch balancing draft. Costs, durations, XP and levels are proposals, not live training rules.
export const commonRunes=['air','mind','water'];
export const uncommonRunes=['fire','nature'];
export const rareRunes=['death','blood','soul'];
const recipe=(id,skill,name,tier,level,seconds,xp,runes,inputs,outputs)=>({id,skill,name,tier,level,seconds,xp,runes,inputs,outputs});
export const recipes=[
 recipe('catch-shrimp','fishing','Catch Shrimp','basic',1,60,4,{}, {},{'raw-shrimp':2}),
 recipe('catch-sardines','fishing','Catch Sardines','basic',1,90,6,{}, {},{'raw-sardine':2}),
 recipe('precision-trout','fishing','Catch River Trout','intermediate',10,240,18,{air:1,water:1},{wheat:1},{'raw-trout':2}),
 recipe('preserve-seafood','fishing','Preserve Seafood','intermediate',20,300,22,{water:2,mind:1},{'raw-shrimp':3},{'preserved-seafood':2}),
 recipe('soulfin-expedition','fishing','Catch a Soulfin','advanced',50,1200,80,{water:2,nature:1,soul:1},{wheat:2,'practice-charm':1},{'raw-soulfin':1}),
 recipe('grow-wheat','farming','Grow Wheat','basic',0,120,6,{}, {},{wheat:3,'plant-fiber':1}),
 recipe('gather-herbs','farming','Gather Herbs','basic',0,180,8,{}, {},{herbs:2,'plant-fiber':1}),
 recipe('irrigate-berries','farming','Grow Irrigated Berries','intermediate',10,300,20,{water:1,mind:1},{herbs:1},{berries:3}),
 recipe('greenhouse-harvest','farming','Grow Greenhouse Vegetables','intermediate',20,420,28,{water:2,nature:1},{herbs:2},{vegetables:3}),
 recipe('cultivate-moonherb','farming','Cultivate Moonherb','advanced',50,1200,80,{nature:2,water:2,blood:1},{herbs:3,berries:2},{moonherb:1}),
 recipe('mine-copper','mining','Mine Copper','basic',0,90,6,{}, {},{'copper-ore':2,'rough-stone':1}),
 recipe('gather-coal','mining','Gather Coal','basic',0,120,8,{}, {},{coal:2,'rough-stone':1}),
 recipe('refine-gemstones','mining','Refine Gemstones','intermediate',10,300,22,{air:1,water:1},{'rough-stone':3},{'polished-gem':1}),
 recipe('extract-iron','mining','Extract Iron','intermediate',20,360,26,{air:1,fire:1},{'rough-stone':2},{'iron-ore':2}),
 recipe('mine-shadow-crystal','mining','Mine Shadow Crystal','advanced',50,1500,90,{nature:2,death:2,air:1},{'rough-stone':5,'steel-pickaxe':1},{'shadow-crystal':1}),
 recipe('smelt-copper','smithing','Smelt Copper Bars','basic',0,150,10,{}, {'copper-ore':2,coal:1},{'copper-bar':1}),
 recipe('forge-copper-tools','smithing','Forge Copper Tools','basic',0,180,12,{}, {'copper-bar':2},{'copper-tools':1}),
 recipe('smith-steel-bars','smithing','Smith Steel Bars','intermediate',10,300,22,{fire:2},{'iron-ore':2,coal:1},{'steel-bar':1}),
 recipe('forge-steel-pickaxe','smithing','Forge a Steel Pickaxe','intermediate',20,480,32,{fire:2,air:1},{'steel-bar':2,'copper-tools':1},{'steel-pickaxe':1}),
 recipe('forge-legendary-armor','smithing','Forge Legendary Armor','advanced',75,43200,500,{blood:3,fire:2,nature:1},{'steel-bar':6,'shadow-crystal':1},{'legendary-armor':1}),
 recipe('weave-cloth','crafting','Weave Cloth','basic',0,120,8,{}, {'plant-fiber':3},{cloth:1}),
 recipe('craft-copper-brooch','crafting','Craft a Copper Brooch','basic',0,180,12,{}, {'copper-bar':1},{'copper-brooch':1}),
 recipe('craft-precision-tools','crafting','Craft Precision Tools','intermediate',10,300,22,{mind:1,air:1},{'copper-tools':1,'polished-gem':1},{'precision-tools':1}),
 recipe('craft-light-pendant','crafting','Craft a Lightweight Pendant','intermediate',20,420,28,{air:1,mind:2},{'copper-bar':1,'polished-gem':1,cloth:1},{'lightweight-pendant':1}),
 recipe('craft-prestige-amulet','crafting','Craft a Prestige Amulet','advanced',80,43200,600,{soul:5,mind:2,nature:1},{'polished-gem':3,'shadow-crystal':1,cloth:2},{'prestige-amulet':1}),
 recipe('study-inscriptions','enchanting','Study Inscriptions','basic',0,120,8,{}, {'plant-fiber':2,'copper-ore':1},{'practice-scroll':1}),
 recipe('prepare-practice-charm','enchanting','Prepare a Practice Charm','basic',0,180,12,{}, {'copper-brooch':1,'plant-fiber':1},{'practice-charm':1}),
 recipe('enchant-swift-charm','enchanting','Enchant a Swift Charm','intermediate',10,300,22,{air:1,mind:1},{'practice-charm':1},{'swift-charm':1}),
 recipe('enchant-water-ward','enchanting','Enchant a Water Ward','intermediate',20,420,28,{water:2,mind:1},{'copper-brooch':1,'polished-gem':1},{'water-ward':1}),
 recipe('seasonal-enchantment','enchanting','Create a Seasonal Enchantment','advanced',85,86400,1000,{soul:10,blood:1,mind:2},{'prestige-amulet':1,moonherb:2},{'seasonal-amulet':1}),
 recipe('cook-shrimp','cooking','Cook Shrimp','basic',0,90,6,{}, {'raw-shrimp':2,coal:1},{'grilled-shrimp':2}),
 recipe('bake-bread','cooking','Bake Bread','basic',0,150,10,{}, {wheat:3,coal:1},{bread:2}),
 recipe('cook-specialty-stew','cooking','Cook Specialty Stew','intermediate',10,300,22,{fire:1,water:1},{'raw-trout':1,vegetables:2},{'specialty-stew':2}),
 recipe('prepare-harvest-meal','cooking','Prepare a Harvest Meal','intermediate',20,420,28,{mind:1,water:1,fire:1,nature:1},{'preserved-seafood':1,berries:2},{'harvest-meal':2}),
 recipe('prepare-royal-banquet','cooking','Prepare a Royal Banquet','advanced',50,1800,100,{fire:2,nature:2,water:1,blood:1},{'raw-trout':2,moonherb:1,vegetables:4},{'royal-banquet':1})
];
export const materials=[...new Set(recipes.flatMap(r=>[...Object.keys(r.inputs),...Object.keys(r.outputs)]))].sort().map(id=>({id,name:id.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}));
