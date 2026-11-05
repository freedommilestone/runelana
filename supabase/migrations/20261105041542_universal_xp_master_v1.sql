-- Universal XP Master V1. Preserve all earned XP; levels are derived from totals.
-- Activity execution/awards remain disabled. No XP is granted by this migration.
create table public.universal_xp_levels (
 track text not null check(track in('profession','branch','combat')),
 level integer not null check(level between 1 and 99),
 total_xp bigint not null check(total_xp>=0),
 xp_to_next bigint,
 curve_version text not null default 'universal-xp-v1' check(curve_version='universal-xp-v1'),
 primary key(track,level),unique(track,total_xp),
 check((level=99 and xp_to_next is null) or (level<99 and xp_to_next is not null and xp_to_next>0))
);
alter table public.universal_xp_levels enable row level security;
revoke all on public.universal_xp_levels from public,anon,authenticated,service_role;
grant select on public.universal_xp_levels to authenticated,service_role;
create policy universal_xp_read on public.universal_xp_levels for select to authenticated using(true);
comment on table public.universal_xp_levels is 'Universal XP Master V1 draft balance: seven professions, 21 independent branches, four independent combat disciplines. Level 99 retains surplus XP. Holding status is separate.';
insert into public.universal_xp_levels(track,level,total_xp,xp_to_next) values
('profession',1,0,15),
('profession',2,15,16),
('profession',3,31,17),
('profession',4,48,19),
('profession',5,67,20),
('profession',6,87,22),
('profession',7,109,23),
('profession',8,132,25),
('profession',9,157,27),
('profession',10,184,29),
('profession',11,213,31),
('profession',12,244,33),
('profession',13,277,36),
('profession',14,313,38),
('profession',15,351,41),
('profession',16,392,44),
('profession',17,436,48),
('profession',18,484,51),
('profession',19,535,55),
('profession',20,590,59),
('profession',21,649,64),
('profession',22,713,68),
('profession',23,781,74),
('profession',24,855,79),
('profession',25,934,85),
('profession',26,1019,91),
('profession',27,1110,98),
('profession',28,1208,106),
('profession',29,1314,114),
('profession',30,1428,122),
('profession',31,1550,131),
('profession',32,1681,141),
('profession',33,1822,152),
('profession',34,1974,163),
('profession',35,2137,175),
('profession',36,2312,189),
('profession',37,2501,203),
('profession',38,2704,218),
('profession',39,2922,234),
('profession',40,3156,252),
('profession',41,3408,271),
('profession',42,3679,291),
('profession',43,3970,313),
('profession',44,4283,336),
('profession',45,4619,361),
('profession',46,4980,389),
('profession',47,5369,418),
('profession',48,5787,449),
('profession',49,6236,483),
('profession',50,6719,519),
('profession',51,7238,558),
('profession',52,7796,600),
('profession',53,8396,645),
('profession',54,9041,693),
('profession',55,9734,745),
('profession',56,10479,801),
('profession',57,11280,861),
('profession',58,12141,925),
('profession',59,13066,995),
('profession',60,14061,1070),
('profession',61,15131,1150),
('profession',62,16281,1236),
('profession',63,17517,1329),
('profession',64,18846,1428),
('profession',65,20274,1535),
('profession',66,21809,1651),
('profession',67,23460,1774),
('profession',68,25234,1907),
('profession',69,27141,2051),
('profession',70,29192,2204),
('profession',71,31396,2370),
('profession',72,33766,2547),
('profession',73,36313,2738),
('profession',74,39051,2944),
('profession',75,41995,3165),
('profession',76,45160,3402),
('profession',77,48562,3657),
('profession',78,52219,3931),
('profession',79,56150,4226),
('profession',80,60376,4543),
('profession',81,64919,4884),
('profession',82,69803,5250),
('profession',83,75053,5644),
('profession',84,80697,6067),
('profession',85,86764,6522),
('profession',86,93286,7011),
('profession',87,100297,7537),
('profession',88,107834,8103),
('profession',89,115937,8710),
('profession',90,124647,9364),
('profession',91,134011,10066),
('profession',92,144077,10821),
('profession',93,154898,11632),
('profession',94,166530,12505),
('profession',95,179035,13443),
('profession',96,192478,14451),
('profession',97,206929,15535),
('profession',98,222464,16700),
('profession',99,239164,null),
('branch',1,0,4),
('branch',2,4,5),
('branch',3,9,6),
('branch',4,15,7),
('branch',5,22,10),
('branch',6,32,12),
('branch',7,44,15),
('branch',8,59,18),
('branch',9,77,23),
('branch',10,100,9),
('branch',11,109,10),
('branch',12,119,12),
('branch',13,131,13),
('branch',14,144,15),
('branch',15,159,18),
('branch',16,177,20),
('branch',17,197,22),
('branch',18,219,26),
('branch',19,245,30),
('branch',20,275,34),
('branch',21,309,38),
('branch',22,347,45),
('branch',23,392,50),
('branch',24,442,58),
('branch',25,500,39),
('branch',26,539,42),
('branch',27,581,46),
('branch',28,627,50),
('branch',29,677,54),
('branch',30,731,58),
('branch',31,789,63),
('branch',32,852,69),
('branch',33,921,74),
('branch',34,995,80),
('branch',35,1075,87),
('branch',36,1162,95),
('branch',37,1257,102),
('branch',38,1359,111),
('branch',39,1470,119),
('branch',40,1589,130),
('branch',41,1719,141),
('branch',42,1860,152),
('branch',43,2012,165),
('branch',44,2177,179),
('branch',45,2356,194),
('branch',46,2550,210),
('branch',47,2760,227),
('branch',48,2987,246),
('branch',49,3233,267),
('branch',50,3500,241),
('branch',51,3741,261),
('branch',52,4002,283),
('branch',53,4285,307),
('branch',54,4592,332),
('branch',55,4924,360),
('branch',56,5284,390),
('branch',57,5674,422),
('branch',58,6096,457),
('branch',59,6553,496),
('branch',60,7049,536),
('branch',61,7585,582),
('branch',62,8167,630),
('branch',63,8797,682),
('branch',64,9479,739),
('branch',65,10218,801),
('branch',66,11019,867),
('branch',67,11886,940),
('branch',68,12826,1018),
('branch',69,13844,1102),
('branch',70,14946,1195),
('branch',71,16141,1294),
('branch',72,17435,1402),
('branch',73,18837,1518),
('branch',74,20355,1645),
('branch',75,22000,960),
('branch',76,22960,1097),
('branch',77,24057,1253),
('branch',78,25310,1432),
('branch',79,26742,1636),
('branch',80,28378,1870),
('branch',81,30248,2137),
('branch',82,32385,2441),
('branch',83,34826,2789),
('branch',84,37615,3187),
('branch',85,40802,3642),
('branch',86,44444,4161),
('branch',87,48605,4755),
('branch',88,53360,5432),
('branch',89,58792,6208),
('branch',90,65000,2337),
('branch',91,67337,2918),
('branch',92,70255,3645),
('branch',93,73900,4552),
('branch',94,78452,5684),
('branch',95,84136,7099),
('branch',96,91235,8866),
('branch',97,100101,11072),
('branch',98,111173,13827),
('branch',99,125000,null),
('combat',1,0,20),
('combat',2,20,22),
('combat',3,42,23),
('combat',4,65,25),
('combat',5,90,27),
('combat',6,117,29),
('combat',7,146,31),
('combat',8,177,33),
('combat',9,210,36),
('combat',10,246,38),
('combat',11,284,41),
('combat',12,325,44),
('combat',13,369,48),
('combat',14,417,51),
('combat',15,468,55),
('combat',16,523,59),
('combat',17,582,64),
('combat',18,646,68),
('combat',19,714,74),
('combat',20,788,79),
('combat',21,867,85),
('combat',22,952,91),
('combat',23,1043,98),
('combat',24,1141,106),
('combat',25,1247,113),
('combat',26,1360,122),
('combat',27,1482,131),
('combat',28,1613,141),
('combat',29,1754,152),
('combat',30,1906,163),
('combat',31,2069,175),
('combat',32,2244,188),
('combat',33,2432,202),
('combat',34,2634,218),
('combat',35,2852,234),
('combat',36,3086,251),
('combat',37,3337,270),
('combat',38,3607,290),
('combat',39,3897,312),
('combat',40,4209,336),
('combat',41,4545,361),
('combat',42,4906,388),
('combat',43,5294,417),
('combat',44,5711,448),
('combat',45,6159,482),
('combat',46,6641,518),
('combat',47,7159,557),
('combat',48,7716,599),
('combat',49,8315,644),
('combat',50,8959,692),
('combat',51,9651,744),
('combat',52,10395,800),
('combat',53,11195,860),
('combat',54,12055,924),
('combat',55,12979,993),
('combat',56,13972,1068),
('combat',57,15040,1148),
('combat',58,16188,1234),
('combat',59,17422,1327),
('combat',60,18749,1426),
('combat',61,20175,1533),
('combat',62,21708,1648),
('combat',63,23356,1772),
('combat',64,25128,1904),
('combat',65,27032,2047),
('combat',66,29079,2201),
('combat',67,31280,2366),
('combat',68,33646,2543),
('combat',69,36189,2734),
('combat',70,38923,2939),
('combat',71,41862,3160),
('combat',72,45022,3396),
('combat',73,48418,3651),
('combat',74,52069,3925),
('combat',75,55994,4219),
('combat',76,60213,4536),
('combat',77,64749,4876),
('combat',78,69625,5242),
('combat',79,74867,5635),
('combat',80,80502,6058),
('combat',81,86560,6512),
('combat',82,93072,7000),
('combat',83,100072,7525),
('combat',84,107597,8090),
('combat',85,115687,8696),
('combat',86,124383,9349),
('combat',87,133732,10050),
('combat',88,143782,10804),
('combat',89,154586,11614),
('combat',90,166200,12485),
('combat',91,178685,13421),
('combat',92,192106,14428),
('combat',93,206534,15510),
('combat',94,222044,16673),
('combat',95,238717,17924),
('combat',96,256641,19268),
('combat',97,275909,20713),
('combat',98,296622,22266),
('combat',99,318888,null);

-- Maintain existing catalog lookup tables for compatibility with older clients.
insert into public.skill_xp_levels(skill_id,level,total_xp,xp_to_next,milestone)
 select s.id,x.level,x.total_xp,x.xp_to_next,'' from public.skill_types s cross join public.universal_xp_levels x where x.track='profession'
 on conflict(skill_id,level) do update set total_xp=excluded.total_xp,xp_to_next=excluded.xp_to_next;
update public.fishing_branch_xp_levels b set total_xp=x.total_xp,xp_to_next=x.xp_to_next from public.universal_xp_levels x where x.track='branch' and x.level=b.level;
update public.farming_branch_xp_levels b set total_xp=x.total_xp,xp_to_next=x.xp_to_next from public.universal_xp_levels x where x.track='branch' and x.level=b.level;
update public.mining_branch_xp_levels b set total_xp=x.total_xp,xp_to_next=x.xp_to_next from public.universal_xp_levels x where x.track='branch' and x.level=b.level;
update public.smithing_branch_xp_levels b set total_xp=x.total_xp,xp_to_next=x.xp_to_next from public.universal_xp_levels x where x.track='branch' and x.level=b.level;
update public.crafting_branch_xp_levels b set total_xp=x.total_xp,xp_to_next=x.xp_to_next from public.universal_xp_levels x where x.track='branch' and x.level=b.level;
update public.cooking_branch_xp_levels b set total_xp=x.total_xp,xp_to_next=x.xp_to_next from public.universal_xp_levels x where x.track='branch' and x.level=b.level;
update public.combat_xp_levels b set total_xp=x.total_xp,xp_to_next=x.xp_to_next from public.universal_xp_levels x where x.track='combat' and x.level=b.level;
-- Keep superseded Enchanting records and any historical XP; never transfer XP to an unrelated new branch.
update public.skill_specializations set archived=true where skill_id='enchanting' and id in('rune-scholar','spellweaver','master-enchanter');
insert into public.skill_specializations(skill_id,id,name,required_level,sort_order,archived) values
 ('enchanting','elemental-enchanting','Elemental Enchanting',10,4,false),
 ('enchanting','advanced-enchanting','Advanced Enchanting',30,5,false),
 ('enchanting','seasonal-enchanting','Seasonal Enchanting',30,6,false);
update public.skill_specializations set name='Commercial Fisher',required_level=10 where skill_id='fishing' and id='commercial-fishing' and not archived;
update public.skill_specializations set name='Treasure Fisher',required_level=30 where skill_id='fishing' and id='treasure-fishing' and not archived;
update public.skill_specializations set name='Trophy Fisher',required_level=30 where skill_id='fishing' and id='trophy-fishing' and not archived;
update public.skill_specializations set name='Crop Farming',required_level=10 where skill_id='farming' and id='crop-farming' and not archived;
update public.skill_specializations set name='Herbalism',required_level=30 where skill_id='farming' and id='herbalism' and not archived;
update public.skill_specializations set name='Rare Plant Cultivation',required_level=30 where skill_id='farming' and id='rare-plant-cultivation' and not archived;
update public.skill_specializations set name='Ore Miner',required_level=10 where skill_id='mining' and id='ore-miner' and not archived;
update public.skill_specializations set name='Gem Prospector',required_level=30 where skill_id='mining' and id='gem-prospector' and not archived;
update public.skill_specializations set name='Rare Mineral Extractor',required_level=30 where skill_id='mining' and id='rare-mineral-extractor' and not archived;
update public.skill_specializations set name='Toolsmith',required_level=10 where skill_id='smithing' and id='toolsmith' and not archived;
update public.skill_specializations set name='Artisan Equipment',required_level=30 where skill_id='smithing' and id='artisan-equipment' and not archived;
update public.skill_specializations set name='Masterwork Forging',required_level=30 where skill_id='smithing' and id='masterwork-forging' and not archived;
update public.skill_specializations set name='Jewelry Making',required_level=10 where skill_id='crafting' and id='jeweler' and not archived;
update public.skill_specializations set name='Utility Crafting',required_level=30 where skill_id='crafting' and id='utility-crafting' and not archived;
update public.skill_specializations set name='Decorative Collectibles',required_level=30 where skill_id='crafting' and id='decorative-collectibles' and not archived;
update public.skill_specializations set name='Everyday Chef',required_level=10 where skill_id='cooking' and id='everyday-chef' and not archived;
update public.skill_specializations set name='Artisan Chef',required_level=30 where skill_id='cooking' and id='artisan-chef' and not archived;
update public.skill_specializations set name='Master Chef',required_level=30 where skill_id='cooking' and id='master-chef' and not archived;
update public.skill_specializations set name='Elemental Enchanting',required_level=10 where skill_id='enchanting' and id='elemental-enchanting' and not archived;
update public.skill_specializations set name='Advanced Enchanting',required_level=30 where skill_id='enchanting' and id='advanced-enchanting' and not archived;
update public.skill_specializations set name='Seasonal Enchanting',required_level=30 where skill_id='enchanting' and id='seasonal-enchanting' and not archived;

create function public.universal_level_for_xp(p_track text,p_xp bigint) returns integer
 language sql stable strict security invoker set search_path='' as $$
 select level from public.universal_xp_levels where track=p_track and total_xp<=p_xp order by total_xp desc limit 1
$$;
create function public.universal_xp_progress(p_track text,p_xp bigint) returns jsonb
 language sql stable strict security invoker set search_path='' as $$
 select jsonb_build_object('curve','universal-'||p_track||'-v1','curveVersion',x.curve_version,
 'levelStartXp',x.total_xp,'nextLevelXp',case when x.level=99 then null else x.total_xp+x.xp_to_next end,
 'xpIntoLevel',case when x.level=99 then 0 else p_xp-x.total_xp end,'xpForLevel',x.xp_to_next,
 'xpRemaining',case when x.level=99 then 0 else x.total_xp+x.xp_to_next-p_xp end,'maxLevel',99,'atMaxLevel',x.level=99)
 from public.universal_xp_levels x where x.track=p_track and x.level=public.universal_level_for_xp(p_track,p_xp)
$$;
revoke all on function public.universal_level_for_xp(text,bigint),public.universal_xp_progress(text,bigint) from public,anon,authenticated;
grant execute on function public.universal_level_for_xp(text,bigint),public.universal_xp_progress(text,bigint) to service_role;
alter table public.player_skills add column curve_version text not null default 'universal-xp-v1';
alter table public.player_skill_specializations add column curve_version text not null default 'legacy';
alter table public.player_combat_xp add column curve_version text not null default 'universal-xp-v1';
alter table public.player_skills alter column level set default 1;
create function public.sync_universal_skill_level() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.xp>=0 then new.level:=public.universal_level_for_xp('profession',new.xp);end if;new.curve_version:='universal-xp-v1';return new;
end $$;
create function public.sync_universal_branch_level() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.xp>=0 and exists(select 1 from public.skill_specializations where skill_id=new.skill_id and id=new.specialization_id and not archived) then
  new.level:=public.universal_level_for_xp('branch',new.xp);new.curve_version:='universal-xp-v1';
 end if;return new;
end $$;
revoke all on function public.sync_universal_skill_level(),public.sync_universal_branch_level() from public,anon,authenticated;
grant execute on function public.sync_universal_skill_level(),public.sync_universal_branch_level() to service_role;
drop trigger if exists player_fishing_level on public.player_skills;
drop trigger if exists player_fishing_branch_level on public.player_skill_specializations;
drop trigger if exists player_farming_level on public.player_skills;
drop trigger if exists player_farming_branch_level on public.player_skill_specializations;
drop trigger if exists player_mining_level on public.player_skills;
drop trigger if exists player_mining_branch_level on public.player_skill_specializations;
drop trigger if exists player_smithing_level on public.player_skills;
drop trigger if exists player_smithing_branch_level on public.player_skill_specializations;
drop trigger if exists player_crafting_level on public.player_skills;
drop trigger if exists player_crafting_branch_level on public.player_skill_specializations;
drop trigger if exists player_cooking_level on public.player_skills;
drop trigger if exists player_cooking_branch_level on public.player_skill_specializations;
create trigger player_universal_skill_level before insert or update of xp,level,skill_id,curve_version on public.player_skills for each row execute function public.sync_universal_skill_level();
create trigger player_universal_branch_level before insert or update of xp,level,skill_id,specialization_id,curve_version on public.player_skill_specializations for each row execute function public.sync_universal_branch_level();
update public.player_skills set level=public.universal_level_for_xp('profession',xp) where level is distinct from public.universal_level_for_xp('profession',xp);
insert into public.player_skill_specializations(user_id,skill_id,specialization_id)
 select p.user_id,s.skill_id,s.id from public.player_skills p join public.skill_specializations s on s.skill_id=p.skill_id where not s.archived on conflict do nothing;
update public.player_skill_specializations p set level=public.universal_level_for_xp('branch',xp),curve_version='universal-xp-v1'
 where exists(select 1 from public.skill_specializations s where s.skill_id=p.skill_id and s.id=p.specialization_id and not s.archived);
create or replace function public.combat_level_for_xp(p_xp bigint) returns integer language sql stable security invoker set search_path='' as $$
 select public.universal_level_for_xp('combat',p_xp)
$$;
create or replace function public.player_combat_snapshot(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.player_profiles where user_id=p_user_id) then return null; end if;
 perform public.initialize_player_combat(p_user_id);
 select jsonb_build_object('sourceVersion','combat-v1','curveVersion','universal-xp-v1','combatLevel',floor(avg(p.level))::integer,
  'disciplines',jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'level',p.level,'xp',p.xp,
   'statName',d.stat_name,'baseStat',d.base_value+d.per_level*(p.level-1),'updatedAt',p.updated_at,
   'progression',public.universal_xp_progress('combat',p.xp)) order by d.sort_order),
  'baseStats',jsonb_object_agg(d.id,d.base_value+d.per_level*(p.level-1)),
  'currentHp',(select current_hp from public.player_combat_state where user_id=p_user_id),
  'maxHp',max(case when d.id='endurance' then d.base_value+d.per_level*(p.level-1) end),
  'gearBonusesConfigured',false,'gearBonuses',null,'gearScore',null,'trainingEnabled',false,'encountersEnabled',false,
  'updatedAt',greatest(max(p.updated_at),(select updated_at from public.player_combat_state where user_id=p_user_id))) into result
 from public.player_combat_xp p join public.combat_disciplines d on d.id=p.discipline_id join public.combat_xp_levels x on x.level=p.level where p.user_id=p_user_id;
 return result;
end $$;
create or replace function public.get_player_skills(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.player_skills(user_id,skill_id) select p_user_id,id from public.skill_types order by sort_order on conflict do nothing;
 insert into public.player_skill_specializations(user_id,skill_id,specialization_id,level)
  select p_user_id,skill_id,id,1 from public.skill_specializations where not archived order by skill_id,sort_order on conflict do nothing;
 select jsonb_build_object('curveVersion','universal-xp-v1','economy',jsonb_build_object('runesAccountBound',true,'runeProductionPerHour',10),'skills',jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'level',p.level,'xp',p.xp,'completedActivities',p.completed_activities,'trainingSeconds',p.training_seconds,'updatedAt',p.updated_at,
  'progression',public.universal_xp_progress('profession',p.xp),
  'craftingActivities',case when s.id='crafting' then public.crafting_master_catalog() else null end,
  'smithingActivities',case when s.id='smithing' then public.smithing_master_catalog() else null end,
  'cookingActivities',case when s.id='cooking' then public.cooking_master_catalog() else null end,
  'miningActivities',case when s.id='mining' then public.mining_master_catalog() else null end,
  'farmingActivities',case when s.id='farming' then public.farming_master_catalog() else null end,
  'fishingActivities',case when s.id='fishing' then public.fishing_master_catalog() else null end,
  'runeUsage',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'usage',u.usage,'purpose',r.purpose,'description',r.usage_description,'characterLevel',r.character_level,'holdingDays',r.holding_days,'rarity',r.rarity,'accountBound',r.account_bound,'proposedProductionCost',r.proposed_production_cost) order by r.sort_order),'[]'::jsonb) from public.skill_rune_usage u join public.rune_types r on r.id=u.rune_id where u.skill_id=s.id),
  'specializations',(select coalesce(jsonb_agg(jsonb_build_object('id',sp.id,'name',sp.name,'requiredLevel',sp.required_level,'level',ps.level,'xp',ps.xp,
   'progression',public.universal_xp_progress('branch',ps.xp)) order by sp.sort_order),'[]'::jsonb)
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
create or replace function public.derive_combat_level() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.xp>=0 then new.level:=public.combat_level_for_xp(new.xp); end if;
 new.updated_at:=clock_timestamp();new.curve_version:='universal-xp-v1';return new;
end $$;