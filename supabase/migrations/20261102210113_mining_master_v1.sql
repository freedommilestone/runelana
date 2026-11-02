-- Mining Master List V1, user confirmed Time is minutes and XP curves match Fishing/Farming. Draft catalog only.
-- Preserve existing XP; archive older concepts, never transfer their XP to a new path.
update public.skill_specializations set archived=true where skill_id='mining';
insert into public.skill_specializations(skill_id,id,name,required_level,sort_order) values
 ('mining','ore-miner','Ore Miner',10,4),('mining','gem-prospector','Gem Prospector',30,5),('mining','rare-mineral-extractor','Rare Mineral Extractor',30,6);
update public.skill_activities set status='disabled' where skill_id='mining';
insert into public.skill_rune_usage(skill_id,rune_id,usage) values ('mining','mind','secondary') on conflict do nothing;
create table public.mining_catalog_items(id text primary key,name text not null unique);
comment on table public.mining_catalog_items is 'V1 output references with stable IDs. Conversion, uses, tradeability, rarity, stack sizes and artwork remain pending. Not an inventory.';
create table public.mining_activities(
 id text primary key check(id ~ '^MIN-[0-9]{3}$'),name text not null unique,
 skill_id text not null default 'mining' check(skill_id='mining'),
 category text not null check(category in('standard','ore','gem','mineral')),
 specialization_id text,required_level integer not null check(required_level between 1 and 99),
 required_branch_level integer check(required_branch_level between 1 and 99),
 equipment_requirement text not null check(length(equipment_requirement)>0),
 duration_seconds integer not null check(duration_seconds>0),
 mining_xp integer not null check(mining_xp>0),branch_xp integer not null check(branch_xp>=0),
 output_item_id text not null references public.mining_catalog_items(id),
 yield_quantity integer not null check(yield_quantity>0),
 sort_order integer not null unique,
 requires_rune_eligibility boolean not null default true check(requires_rune_eligibility),
 equipment_consumed boolean not null default false check(not equipment_consumed),
 yield_mode text not null default 'guaranteed' check(yield_mode='guaranteed'),
 status text not null default 'planned' check(status in('planned','disabled')),
 balance_status text not null default 'draft' check(balance_status='draft'),
 source_version text not null default 'mining-v1' check(source_version='mining-v1'),
 foreign key(skill_id,specialization_id) references public.skill_specializations(skill_id,id),
 check((category='standard' and specialization_id is null and required_branch_level is null and branch_xp=0)
 or (category<>'standard' and specialization_id is not null and required_branch_level is not null and branch_xp>0 and (
 (category='ore' and specialization_id='ore-miner' and required_level>=10) or
 (category='gem' and specialization_id='gem-prospector' and required_level>=30) or
 (category='mineral' and specialization_id='rare-mineral-extractor' and required_level>=30))))
);
create index mining_activities_branch on public.mining_activities(skill_id,specialization_id);
create index mining_activities_output on public.mining_activities(output_item_id);
create table public.mining_activity_runes(
 activity_id text not null references public.mining_activities(id) on delete cascade,
 rune_id text not null references public.rune_types(id),quantity integer not null check(quantity>0),primary key(activity_id,rune_id)
);
create index mining_runes_type on public.mining_activity_runes(rune_id);
comment on table public.mining_activities is 'V1 guaranteed yields, rune costs per attempt, XP per completion not per output. Reusable equipment, no invented tool bonuses. Rune eligibility and sufficient inventory both required. Branch switching after current activity completes or is canceled. Training, refunds, equipment recipes and output conversions pending.';
alter table public.mining_catalog_items enable row level security;
revoke all on public.mining_catalog_items from public,anon,authenticated,service_role;
grant select on public.mining_catalog_items to authenticated,service_role;
create policy mining_catalog_items_read on public.mining_catalog_items for select to authenticated using(true);
alter table public.mining_activities enable row level security;
revoke all on public.mining_activities from public,anon,authenticated,service_role;
grant select on public.mining_activities to authenticated,service_role;
create policy mining_activities_read on public.mining_activities for select to authenticated using(true);
alter table public.mining_activity_runes enable row level security;
revoke all on public.mining_activity_runes from public,anon,authenticated,service_role;
grant select on public.mining_activity_runes to authenticated,service_role;
create policy mining_activity_runes_read on public.mining_activity_runes for select to authenticated using(true);
insert into public.mining_catalog_items(id,name) values
 ('mining-item-copper-ore','Copper Ore'),
 ('mining-item-tin-ore','Tin Ore'),
 ('mining-item-clay','Clay'),
 ('mining-item-iron-ore','Iron Ore'),
 ('mining-item-coal','Coal'),
 ('mining-item-silver-ore','Silver Ore'),
 ('mining-item-limestone','Limestone'),
 ('mining-item-gold-ore','Gold Ore'),
 ('mining-item-sandstone','Sandstone'),
 ('mining-item-mithril-ore','Mithril Ore'),
 ('mining-item-granite','Granite'),
 ('mining-item-uncut-sapphire','Uncut Sapphire'),
 ('mining-item-adamantite-ore','Adamantite Ore'),
 ('mining-item-uncut-emerald','Uncut Emerald'),
 ('mining-item-uncut-ruby','Uncut Ruby'),
 ('mining-item-runite-ore','Runite Ore'),
 ('mining-item-uncut-diamond','Uncut Diamond'),
 ('mining-item-amethyst','Amethyst'),
 ('mining-item-dark-crystal-ore','Dark Crystal Ore'),
 ('mining-item-ancient-starstone','Ancient Starstone'),
 ('mining-item-copper-vein-batch','Copper Vein Batch'),
 ('mining-item-iron-vein-batch','Iron Vein Batch'),
 ('mining-item-coal-seam-batch','Coal Seam Batch'),
 ('mining-item-silver-deposit-batch','Silver Deposit Batch'),
 ('mining-item-gold-vein-batch','Gold Vein Batch'),
 ('mining-item-mithril-vein-batch','Mithril Vein Batch'),
 ('mining-item-adamantite-deposit-batch','Adamantite Deposit Batch'),
 ('mining-item-runite-vein-batch','Runite Vein Batch'),
 ('mining-item-rare-metal-ore-batch','Rare Metal Ore Batch'),
 ('mining-item-masterwork-ore-cache','Masterwork Ore Cache'),
 ('mining-item-uncut-opal','Uncut Opal'),
 ('mining-item-uncut-jade','Uncut Jade'),
 ('mining-item-uncut-red-topaz','Uncut Red Topaz'),
 ('mining-item-uncut-sapphire-cluster','Uncut Sapphire Cluster'),
 ('mining-item-uncut-emerald-cluster','Uncut Emerald Cluster'),
 ('mining-item-uncut-ruby-cluster','Uncut Ruby Cluster'),
 ('mining-item-uncut-diamond-cluster','Uncut Diamond Cluster'),
 ('mining-item-star-sapphire','Star Sapphire'),
 ('mining-item-royal-prism-gem','Royal Prism Gem'),
 ('mining-item-celestial-heart-gem','Celestial Heart Gem'),
 ('mining-item-shimmering-quartz','Shimmering Quartz'),
 ('mining-item-charged-crystal-fragment','Charged Crystal Fragment'),
 ('mining-item-ancient-fossil-stone','Ancient Fossil Stone'),
 ('mining-item-abyssal-mineral','Abyssal Mineral'),
 ('mining-item-obsidian-core','Obsidian Core'),
 ('mining-item-bloodstone-fragment','Bloodstone Fragment'),
 ('mining-item-astral-crystal','Astral Crystal'),
 ('mining-item-void-ore','Void Ore'),
 ('mining-item-ancient-rune-crystal','Ancient Rune Crystal'),
 ('mining-item-eternal-mineral','Eternal Mineral');
insert into public.mining_activities(id,name,category,specialization_id,required_level,required_branch_level,equipment_requirement,duration_seconds,mining_xp,branch_xp,output_item_id,yield_quantity,sort_order) values
 ('MIN-001','Copper Ore','standard',null,1,null,'Bronze Pickaxe',360,25,0,'mining-item-copper-ore',2,1),
 ('MIN-002','Tin Ore','standard',null,3,null,'Bronze Pickaxe',360,30,0,'mining-item-tin-ore',2,2),
 ('MIN-003','Clay','standard',null,5,null,'Bronze Pickaxe',480,35,0,'mining-item-clay',3,3),
 ('MIN-004','Iron Ore','standard',null,10,null,'Iron Pickaxe',600,45,0,'mining-item-iron-ore',2,4),
 ('MIN-005','Coal','standard',null,15,null,'Iron Pickaxe',720,55,0,'mining-item-coal',2,5),
 ('MIN-006','Silver Ore','standard',null,20,null,'Steel Pickaxe',900,70,0,'mining-item-silver-ore',2,6),
 ('MIN-007','Limestone','standard',null,25,null,'Steel Pickaxe',960,75,0,'mining-item-limestone',3,7),
 ('MIN-008','Gold Ore','standard',null,30,null,'Steel Pickaxe',1200,90,0,'mining-item-gold-ore',2,8),
 ('MIN-009','Sandstone','standard',null,35,null,'Mithril Pickaxe',1320,100,0,'mining-item-sandstone',3,9),
 ('MIN-010','Mithril Ore','standard',null,40,null,'Mithril Pickaxe',1500,110,0,'mining-item-mithril-ore',2,10),
 ('MIN-011','Granite','standard',null,45,null,'Mithril Pickaxe',1680,125,0,'mining-item-granite',2,11),
 ('MIN-012','Uncut Sapphire','standard',null,50,null,'Adamant Pickaxe',1800,135,0,'mining-item-uncut-sapphire',1,12),
 ('MIN-013','Adamantite Ore','standard',null,55,null,'Adamant Pickaxe',2100,150,0,'mining-item-adamantite-ore',2,13),
 ('MIN-014','Uncut Emerald','standard',null,60,null,'Adamant Pickaxe',2280,165,0,'mining-item-uncut-emerald',1,14),
 ('MIN-015','Uncut Ruby','standard',null,65,null,'Rune Pickaxe',2520,180,0,'mining-item-uncut-ruby',1,15),
 ('MIN-016','Runite Ore','standard',null,70,null,'Rune Pickaxe',2880,195,0,'mining-item-runite-ore',1,16),
 ('MIN-017','Uncut Diamond','standard',null,75,null,'Rune Pickaxe',3300,220,0,'mining-item-uncut-diamond',1,17),
 ('MIN-018','Amethyst','standard',null,80,null,'Dragon Pickaxe',3900,245,0,'mining-item-amethyst',1,18),
 ('MIN-019','Dark Crystal Ore','standard',null,90,null,'Crystal Pickaxe',5400,310,0,'mining-item-dark-crystal-ore',1,19),
 ('MIN-020','Ancient Starstone','standard',null,99,null,'Master Pickaxe',9000,445,0,'mining-item-ancient-starstone',1,20),
 ('MIN-021','Copper Vein Batch','ore','ore-miner',10,1,'Iron Pickaxe',1320,95,50,'mining-item-copper-vein-batch',8,21),
 ('MIN-022','Iron Vein Batch','ore','ore-miner',15,10,'Iron Pickaxe',1680,120,65,'mining-item-iron-vein-batch',8,22),
 ('MIN-023','Coal Seam Batch','ore','ore-miner',20,15,'Steel Pickaxe',2160,150,80,'mining-item-coal-seam-batch',8,23),
 ('MIN-024','Silver Deposit Batch','ore','ore-miner',30,20,'Steel Pickaxe',2880,200,110,'mining-item-silver-deposit-batch',8,24),
 ('MIN-025','Gold Vein Batch','ore','ore-miner',40,30,'Mithril Pickaxe',3600,250,140,'mining-item-gold-vein-batch',8,25),
 ('MIN-026','Mithril Vein Batch','ore','ore-miner',50,40,'Mithril Pickaxe',4500,310,170,'mining-item-mithril-vein-batch',6,26),
 ('MIN-027','Adamantite Deposit Batch','ore','ore-miner',60,50,'Adamant Pickaxe',5700,385,210,'mining-item-adamantite-deposit-batch',6,27),
 ('MIN-028','Runite Vein Batch','ore','ore-miner',75,65,'Rune Pickaxe',7800,505,280,'mining-item-runite-vein-batch',5,28),
 ('MIN-029','Rare Metal Ore Batch','ore','ore-miner',90,80,'Dragon Pickaxe',11400,700,385,'mining-item-rare-metal-ore-batch',4,29),
 ('MIN-030','Masterwork Ore Cache','ore','ore-miner',99,99,'Master Pickaxe',15600,915,505,'mining-item-masterwork-ore-cache',3,30),
 ('MIN-031','Uncut Opal','gem','gem-prospector',30,1,'Steel Pickaxe',1200,120,65,'mining-item-uncut-opal',1,31),
 ('MIN-032','Uncut Jade','gem','gem-prospector',35,10,'Steel Pickaxe',1500,145,80,'mining-item-uncut-jade',1,32),
 ('MIN-033','Uncut Red Topaz','gem','gem-prospector',40,15,'Mithril Pickaxe',1800,165,90,'mining-item-uncut-red-topaz',1,33),
 ('MIN-034','Uncut Sapphire Cluster','gem','gem-prospector',45,20,'Mithril Pickaxe',2400,200,110,'mining-item-uncut-sapphire-cluster',2,34),
 ('MIN-035','Uncut Emerald Cluster','gem','gem-prospector',50,30,'Adamant Pickaxe',3000,240,130,'mining-item-uncut-emerald-cluster',2,35),
 ('MIN-036','Uncut Ruby Cluster','gem','gem-prospector',60,40,'Adamant Pickaxe',3900,300,165,'mining-item-uncut-ruby-cluster',2,36),
 ('MIN-037','Uncut Diamond Cluster','gem','gem-prospector',70,50,'Rune Pickaxe',5100,370,205,'mining-item-uncut-diamond-cluster',2,37),
 ('MIN-038','Star Sapphire','gem','gem-prospector',80,65,'Dragon Pickaxe',7200,485,265,'mining-item-star-sapphire',1,38),
 ('MIN-039','Royal Prism Gem','gem','gem-prospector',90,80,'Crystal Pickaxe',10800,670,370,'mining-item-royal-prism-gem',1,39),
 ('MIN-040','Celestial Heart Gem','gem','gem-prospector',99,99,'Master Pickaxe',16200,940,515,'mining-item-celestial-heart-gem',1,40),
 ('MIN-041','Shimmering Quartz','mineral','rare-mineral-extractor',30,1,'Steel Pickaxe',1500,135,75,'mining-item-shimmering-quartz',1,41),
 ('MIN-042','Charged Crystal Fragment','mineral','rare-mineral-extractor',40,10,'Mithril Pickaxe',2100,180,100,'mining-item-charged-crystal-fragment',1,42),
 ('MIN-043','Ancient Fossil Stone','mineral','rare-mineral-extractor',50,20,'Mithril Pickaxe',3000,240,130,'mining-item-ancient-fossil-stone',1,43),
 ('MIN-044','Abyssal Mineral','mineral','rare-mineral-extractor',60,30,'Adamant Pickaxe',3900,300,165,'mining-item-abyssal-mineral',1,44),
 ('MIN-045','Obsidian Core','mineral','rare-mineral-extractor',70,40,'Rune Pickaxe',5100,370,205,'mining-item-obsidian-core',1,45),
 ('MIN-046','Bloodstone Fragment','mineral','rare-mineral-extractor',75,50,'Rune Pickaxe',6600,450,250,'mining-item-bloodstone-fragment',1,46),
 ('MIN-047','Astral Crystal','mineral','rare-mineral-extractor',80,65,'Dragon Pickaxe',8400,545,300,'mining-item-astral-crystal',1,47),
 ('MIN-048','Void Ore','mineral','rare-mineral-extractor',90,75,'Crystal Pickaxe',11400,700,385,'mining-item-void-ore',1,48),
 ('MIN-049','Ancient Rune Crystal','mineral','rare-mineral-extractor',95,90,'Master Pickaxe',14400,850,470,'mining-item-ancient-rune-crystal',1,49),
 ('MIN-050','Eternal Mineral','mineral','rare-mineral-extractor',99,99,'Master Pickaxe',21600,1195,655,'mining-item-eternal-mineral',1,50);
insert into public.mining_activity_runes(activity_id,rune_id,quantity) values
 ('MIN-001','air',1),
 ('MIN-002','air',1),
 ('MIN-003','air',1),
 ('MIN-004','mind',1),
 ('MIN-005','mind',1),
 ('MIN-005','air',1),
 ('MIN-006','mind',2),
 ('MIN-007','water',2),
 ('MIN-008','fire',2),
 ('MIN-009','water',2),
 ('MIN-009','mind',1),
 ('MIN-010','fire',2),
 ('MIN-010','water',1),
 ('MIN-011','fire',2),
 ('MIN-011','mind',1),
 ('MIN-012','nature',2),
 ('MIN-012','water',1),
 ('MIN-013','fire',3),
 ('MIN-013','nature',1),
 ('MIN-014','nature',3),
 ('MIN-015','nature',3),
 ('MIN-015','fire',1),
 ('MIN-016','nature',3),
 ('MIN-016','death',1),
 ('MIN-017','death',2),
 ('MIN-017','nature',2),
 ('MIN-018','death',2),
 ('MIN-018','blood',1),
 ('MIN-019','blood',2),
 ('MIN-019','death',1),
 ('MIN-020','soul',1),
 ('MIN-020','blood',2),
 ('MIN-021','air',3),
 ('MIN-022','mind',3),
 ('MIN-022','air',1),
 ('MIN-023','mind',4),
 ('MIN-024','water',4),
 ('MIN-024','mind',1),
 ('MIN-025','fire',5),
 ('MIN-026','fire',5),
 ('MIN-026','water',2),
 ('MIN-027','fire',6),
 ('MIN-027','nature',2),
 ('MIN-028','nature',5),
 ('MIN-028','death',2),
 ('MIN-029','blood',4),
 ('MIN-029','death',2),
 ('MIN-030','soul',2),
 ('MIN-030','blood',3),
 ('MIN-031','water',2),
 ('MIN-032','water',2),
 ('MIN-032','mind',1),
 ('MIN-033','fire',2),
 ('MIN-033','water',1),
 ('MIN-034','nature',3),
 ('MIN-035','nature',3),
 ('MIN-035','water',1),
 ('MIN-036','nature',4),
 ('MIN-036','fire',1),
 ('MIN-037','death',3),
 ('MIN-037','nature',2),
 ('MIN-038','blood',2),
 ('MIN-038','nature',2),
 ('MIN-039','blood',2),
 ('MIN-039','soul',1),
 ('MIN-040','blood',3),
 ('MIN-040','soul',2),
 ('MIN-041','water',2),
 ('MIN-041','nature',1),
 ('MIN-042','fire',2),
 ('MIN-042','nature',2),
 ('MIN-043','nature',2),
 ('MIN-043','death',1),
 ('MIN-044','death',3),
 ('MIN-044','nature',1),
 ('MIN-045','fire',3),
 ('MIN-045','death',2),
 ('MIN-046','blood',2),
 ('MIN-046','death',2),
 ('MIN-047','blood',2),
 ('MIN-047','soul',1),
 ('MIN-048','blood',3),
 ('MIN-048','soul',1),
 ('MIN-049','blood',3),
 ('MIN-049','soul',2),
 ('MIN-050','blood',4),
 ('MIN-050','soul',2);
insert into public.skill_xp_levels(skill_id,level,total_xp,xp_to_next,milestone) values
 ('mining',1,0,15,''),
 ('mining',2,15,16,''),
 ('mining',3,31,17,''),
 ('mining',4,48,19,''),
 ('mining',5,67,20,''),
 ('mining',6,87,22,''),
 ('mining',7,109,23,''),
 ('mining',8,132,25,''),
 ('mining',9,157,27,''),
 ('mining',10,184,29,'Ore Miner available'),
 ('mining',11,213,31,''),
 ('mining',12,244,33,''),
 ('mining',13,277,36,''),
 ('mining',14,313,38,''),
 ('mining',15,351,41,''),
 ('mining',16,392,44,''),
 ('mining',17,436,48,''),
 ('mining',18,484,51,''),
 ('mining',19,535,55,''),
 ('mining',20,590,59,''),
 ('mining',21,649,64,''),
 ('mining',22,713,68,''),
 ('mining',23,781,74,''),
 ('mining',24,855,79,''),
 ('mining',25,934,85,''),
 ('mining',26,1019,91,''),
 ('mining',27,1110,98,''),
 ('mining',28,1208,106,''),
 ('mining',29,1314,114,''),
 ('mining',30,1428,122,'Gem Prospector & Rare Mineral Extractor available'),
 ('mining',31,1550,131,''),
 ('mining',32,1681,141,''),
 ('mining',33,1822,152,''),
 ('mining',34,1974,163,''),
 ('mining',35,2137,175,''),
 ('mining',36,2312,189,''),
 ('mining',37,2501,203,''),
 ('mining',38,2704,218,''),
 ('mining',39,2922,234,''),
 ('mining',40,3156,252,''),
 ('mining',41,3408,271,''),
 ('mining',42,3679,291,''),
 ('mining',43,3970,313,''),
 ('mining',44,4283,336,''),
 ('mining',45,4619,361,''),
 ('mining',46,4980,389,''),
 ('mining',47,5369,418,''),
 ('mining',48,5787,449,''),
 ('mining',49,6236,483,''),
 ('mining',50,6719,519,''),
 ('mining',51,7238,558,''),
 ('mining',52,7796,600,''),
 ('mining',53,8396,645,''),
 ('mining',54,9041,693,''),
 ('mining',55,9734,745,''),
 ('mining',56,10479,801,''),
 ('mining',57,11280,861,''),
 ('mining',58,12141,925,''),
 ('mining',59,13066,995,''),
 ('mining',60,14061,1070,''),
 ('mining',61,15131,1150,''),
 ('mining',62,16281,1236,''),
 ('mining',63,17517,1329,''),
 ('mining',64,18846,1428,''),
 ('mining',65,20274,1535,''),
 ('mining',66,21809,1651,''),
 ('mining',67,23460,1774,''),
 ('mining',68,25234,1907,''),
 ('mining',69,27141,2051,''),
 ('mining',70,29192,2204,''),
 ('mining',71,31396,2370,''),
 ('mining',72,33766,2547,''),
 ('mining',73,36313,2738,''),
 ('mining',74,39051,2944,''),
 ('mining',75,41995,3165,''),
 ('mining',76,45160,3402,''),
 ('mining',77,48562,3657,''),
 ('mining',78,52219,3931,''),
 ('mining',79,56150,4226,''),
 ('mining',80,60376,4543,''),
 ('mining',81,64919,4884,''),
 ('mining',82,69803,5250,''),
 ('mining',83,75053,5644,''),
 ('mining',84,80697,6067,''),
 ('mining',85,86764,6522,''),
 ('mining',86,93286,7011,''),
 ('mining',87,100297,7537,''),
 ('mining',88,107834,8103,''),
 ('mining',89,115937,8710,''),
 ('mining',90,124647,9364,''),
 ('mining',91,134011,10066,''),
 ('mining',92,144077,10821,''),
 ('mining',93,154898,11632,''),
 ('mining',94,166530,12505,''),
 ('mining',95,179035,13443,''),
 ('mining',96,192478,14451,''),
 ('mining',97,206929,15535,''),
 ('mining',98,222464,16700,''),
 ('mining',99,239164,null,'');
create table public.mining_branch_xp_levels(
 level integer primary key check(level between 1 and 99),total_xp bigint not null unique check(total_xp>=0),xp_to_next bigint,
 check((level=1 and total_xp=0) or (level>1 and total_xp>0)),
 check((level=99 and xp_to_next is null) or (level<99 and xp_to_next is not null and xp_to_next>0))
);
alter table public.mining_branch_xp_levels enable row level security;
revoke all on public.mining_branch_xp_levels from public,anon,authenticated,service_role;
grant select on public.mining_branch_xp_levels to authenticated,service_role;
create policy mining_branch_curve_read on public.mining_branch_xp_levels for select to authenticated using(true);
comment on table public.mining_branch_xp_levels is 'User-approved Fishing/Farming 99-row branch curve; independent saved XP per branch, cap level 99 at 125000 XP. Draft balancing thresholds.';
insert into public.mining_branch_xp_levels(level,total_xp,xp_to_next) values
 (1,0,4),
 (2,4,5),
 (3,9,6),
 (4,15,7),
 (5,22,10),
 (6,32,12),
 (7,44,15),
 (8,59,18),
 (9,77,23),
 (10,100,9),
 (11,109,10),
 (12,119,12),
 (13,131,13),
 (14,144,15),
 (15,159,18),
 (16,177,20),
 (17,197,22),
 (18,219,26),
 (19,245,30),
 (20,275,34),
 (21,309,38),
 (22,347,45),
 (23,392,50),
 (24,442,58),
 (25,500,39),
 (26,539,42),
 (27,581,46),
 (28,627,50),
 (29,677,54),
 (30,731,58),
 (31,789,63),
 (32,852,69),
 (33,921,74),
 (34,995,80),
 (35,1075,87),
 (36,1162,95),
 (37,1257,102),
 (38,1359,111),
 (39,1470,119),
 (40,1589,130),
 (41,1719,141),
 (42,1860,152),
 (43,2012,165),
 (44,2177,179),
 (45,2356,194),
 (46,2550,210),
 (47,2760,227),
 (48,2987,246),
 (49,3233,267),
 (50,3500,241),
 (51,3741,261),
 (52,4002,283),
 (53,4285,307),
 (54,4592,332),
 (55,4924,360),
 (56,5284,390),
 (57,5674,422),
 (58,6096,457),
 (59,6553,496),
 (60,7049,536),
 (61,7585,582),
 (62,8167,630),
 (63,8797,682),
 (64,9479,739),
 (65,10218,801),
 (66,11019,867),
 (67,11886,940),
 (68,12826,1018),
 (69,13844,1102),
 (70,14946,1195),
 (71,16141,1294),
 (72,17435,1402),
 (73,18837,1518),
 (74,20355,1645),
 (75,22000,960),
 (76,22960,1097),
 (77,24057,1253),
 (78,25310,1432),
 (79,26742,1636),
 (80,28378,1870),
 (81,30248,2137),
 (82,32385,2441),
 (83,34826,2789),
 (84,37615,3187),
 (85,40802,3642),
 (86,44444,4161),
 (87,48605,4755),
 (88,53360,5432),
 (89,58792,6208),
 (90,65000,2337),
 (91,67337,2918),
 (92,70255,3645),
 (93,73900,4552),
 (94,78452,5684),
 (95,84136,7099),
 (96,91235,8866),
 (97,100101,11072),
 (98,111173,13827),
 (99,125000,null);
create function public.mining_level_for_xp(p_xp bigint) returns integer language sql stable strict security invoker set search_path='' as $$
 select level from public.skill_xp_levels where skill_id='mining' and total_xp<=p_xp order by total_xp desc limit 1
$$;
revoke all on function public.mining_level_for_xp(bigint) from public,anon,authenticated;
grant execute on function public.mining_level_for_xp(bigint) to service_role;
create function public.mining_branch_level_for_xp(p_xp bigint) returns integer language sql stable strict security invoker set search_path='' as $$
 select level from public.mining_branch_xp_levels where total_xp<=p_xp order by total_xp desc limit 1
$$;
revoke all on function public.mining_branch_level_for_xp(bigint) from public,anon,authenticated;
grant execute on function public.mining_branch_level_for_xp(bigint) to service_role;
create function public.sync_mining_level() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.skill_id='mining' and new.xp>=0 then new.level=public.mining_level_for_xp(new.xp); end if;
 return new;
end $$;
revoke all on function public.sync_mining_level() from public,anon,authenticated;
grant execute on function public.sync_mining_level() to service_role;
create trigger player_mining_level before insert or update of xp,level,skill_id on public.player_skills for each row execute function public.sync_mining_level();
create function public.sync_mining_branch_level() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.skill_id='mining' and new.specialization_id in('ore-miner','gem-prospector','rare-mineral-extractor') and new.xp>=0 then new.level=public.mining_branch_level_for_xp(new.xp); end if;
 return new;
end $$;
revoke all on function public.sync_mining_branch_level() from public,anon,authenticated;
grant execute on function public.sync_mining_branch_level() to service_role;
create trigger player_mining_branch_level before insert or update of xp,level,skill_id,specialization_id on public.player_skill_specializations for each row execute function public.sync_mining_branch_level();
update public.player_skills set level=public.mining_level_for_xp(xp) where skill_id='mining' and level is distinct from public.mining_level_for_xp(xp);
insert into public.player_skill_specializations(user_id,skill_id,specialization_id,level)
 select p.user_id,'mining',s.id,1 from public.player_skills p cross join public.skill_specializations s
 where p.skill_id='mining' and s.skill_id='mining' and not s.archived on conflict do nothing;
create function public.mining_master_catalog() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',a.id,'name',a.name,'category',a.category,'specializationId',a.specialization_id,'branchName',sp.name,
 'requiredLevel',a.required_level,'requiredBranchLevel',a.required_branch_level,'equipment',jsonb_build_array(a.equipment_requirement),
 'durationSeconds',a.duration_seconds,'xpReward',a.mining_xp,'branchXpReward',a.branch_xp,'yieldQuantity',a.yield_quantity,
 'status',a.status,'balanceStatus',a.balance_status,'sourceVersion',a.source_version,'tier',a.category,'runeRequirementsConfigured',true,
 'reference','Artwork and equipment recipes pending','requiresRuneEligibility',a.requires_rune_eligibility,'equipmentConsumed',a.equipment_consumed,'yieldMode',a.yield_mode,
 'materials','[]'::jsonb,
 'outputs',jsonb_build_array(jsonb_build_object('id',o.id,'name',o.name,'quantity',a.yield_quantity)),
 'runes',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'quantity',c.quantity) order by r.sort_order),'[]'::jsonb) from public.mining_activity_runes c join public.rune_types r on r.id=c.rune_id where c.activity_id=a.id)
 ) order by a.sort_order),'[]'::jsonb) from public.mining_activities a join public.mining_catalog_items o on o.id=a.output_item_id left join public.skill_specializations sp on sp.skill_id=a.skill_id and sp.id=a.specialization_id
$$;
revoke all on function public.mining_master_catalog() from public,anon,authenticated;
grant execute on function public.mining_master_catalog() to service_role;
create or replace function public.get_player_skills(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.player_skills(user_id,skill_id) select p_user_id,id from public.skill_types order by sort_order on conflict do nothing;
 insert into public.player_skill_specializations(user_id,skill_id,specialization_id,level)
  select p_user_id,skill_id,id,case when skill_id in('fishing','farming','mining') then 1 else 0 end from public.skill_specializations where not archived order by skill_id,sort_order on conflict do nothing;
 select jsonb_build_object('economy',jsonb_build_object('runesAccountBound',true,'runeProductionPerHour',10),'skills',jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'level',p.level,'xp',p.xp,'completedActivities',p.completed_activities,'trainingSeconds',p.training_seconds,'updatedAt',p.updated_at,
  'progression',(select jsonb_build_object('curve',case s.id when 'mining' then 'mining-v1' when 'farming' then 'farming-v1' else 'fishing-v2' end,'levelStartXp',x.total_xp,'nextLevelXp',case when x.xp_to_next is null then null else x.total_xp+x.xp_to_next end,'xpIntoLevel',case when x.level=99 then 0 else p.xp-x.total_xp end,'xpForLevel',x.xp_to_next,'xpRemaining',case when x.level=99 then 0 else x.total_xp+x.xp_to_next-p.xp end,'maxLevel',99,'atMaxLevel',x.level=99) from public.skill_xp_levels x where x.skill_id=s.id and x.level=p.level),
  'miningActivities',case when s.id='mining' then public.mining_master_catalog() else null end,
  'farmingActivities',case when s.id='farming' then public.farming_master_catalog() else null end,
  'fishingActivities',case when s.id='fishing' then public.fishing_master_catalog() else null end,
  'runeUsage',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'usage',u.usage,'purpose',r.purpose,'description',r.usage_description,'characterLevel',r.character_level,'holdingDays',r.holding_days,'rarity',r.rarity,'accountBound',r.account_bound,'proposedProductionCost',r.proposed_production_cost) order by r.sort_order),'[]'::jsonb) from public.skill_rune_usage u join public.rune_types r on r.id=u.rune_id where u.skill_id=s.id),
  'specializations',(select coalesce(jsonb_agg(jsonb_build_object('id',sp.id,'name',sp.name,'requiredLevel',sp.required_level,'level',ps.level,'xp',ps.xp,
   'progression',(select jsonb_build_object('curve',case sp.skill_id when 'mining' then 'mining-branch-v1' when 'farming' then 'farming-branch-v1' else 'fishing-branch-v2' end,'levelStartXp',x.total_xp,'nextLevelXp',case when x.xp_to_next is null then null else x.total_xp+x.xp_to_next end,'xpIntoLevel',case when x.level=99 then 0 else ps.xp-x.total_xp end,'xpForLevel',x.xp_to_next,'xpRemaining',case when x.level=99 then 0 else x.total_xp+x.xp_to_next-ps.xp end,'maxLevel',99,'atMaxLevel',x.level=99) from (select 'fishing' as skill_id,level,total_xp,xp_to_next from public.fishing_branch_xp_levels union all select 'farming',level,total_xp,xp_to_next from public.farming_branch_xp_levels union all select 'mining',level,total_xp,xp_to_next from public.mining_branch_xp_levels) x where x.skill_id=sp.skill_id and x.level=ps.level)) order by sp.sort_order),'[]'::jsonb)
   from public.skill_specializations sp join public.player_skill_specializations ps on ps.skill_id=sp.skill_id and ps.specialization_id=sp.id and ps.user_id=p_user_id where sp.skill_id=s.id and not sp.archived),
  'activities',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'requiredLevel',a.required_level,'status',a.status,'tier',a.activity_tier,'balanceStatus',a.balance_status,'runeRequirementsConfigured',a.rune_requirements_configured,'durationSeconds',a.duration_seconds,'xpReward',a.xp_reward,
   'materials',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'quantity',c.quantity) order by m.id),'[]'::jsonb) from public.skill_activity_materials c join public.skill_materials m on m.id=c.material_id where c.activity_id=a.id),
   'outputs',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'quantity',c.quantity) order by m.id),'[]'::jsonb) from public.skill_activity_outputs c join public.skill_materials m on m.id=c.material_id where c.activity_id=a.id),
   'runes',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'quantity',ar.quantity) order by r.sort_order),'[]'::jsonb) from public.skill_activity_runes ar join public.rune_types r on r.id=ar.rune_id where ar.activity_id=a.id)
  ) order by a.sort_order,a.id),'[]'::jsonb) from public.skill_activities a where a.skill_id=s.id)
 ) order by s.sort_order)) into result
 from public.skill_types s join public.player_skills p on p.skill_id=s.id and p.user_id=p_user_id;
 return result;
end $$;

revoke all on function public.get_player_skills(uuid) from public,anon,authenticated;
grant execute on function public.get_player_skills(uuid) to service_role;
