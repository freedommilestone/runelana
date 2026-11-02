-- Source: Runelana_Fishing_Master_List_V4_with_XP (2).pdf.
-- V4 is a balancing catalog, not an activity-settlement engine. Player XP is preserved.
alter table public.skill_specializations add column archived boolean not null default false;
update public.skill_specializations set archived=true where skill_id='fishing';
insert into public.skill_specializations(skill_id,id,name,required_level,sort_order) values
 ('fishing','commercial-fishing','Commercial Fishing',10,4),
 ('fishing','treasure-fishing','Treasure Fishing',10,5),
 ('fishing','trophy-fishing','Trophy Fishing',10,6);
insert into public.player_skill_specializations(user_id,skill_id,specialization_id,level)
 select p.user_id,'fishing',s.id,1 from public.player_skills p cross join public.skill_specializations s
 where p.skill_id='fishing' and s.skill_id='fishing' and not s.archived on conflict do nothing;
-- Historical branch progress remains attached to its original branch, never reassigned.
update public.skill_activities set status='disabled' where skill_id='fishing';
insert into public.skill_rune_usage(skill_id,rune_id,usage) values
 ('fishing','fire','secondary'),('fishing','blood','secondary') on conflict do nothing;

create table public.fishing_activities (
 id text primary key,
 name text not null unique,
 skill_id text not null default 'fishing' check(skill_id='fishing'),
 category text not null check(category in('standard','commercial','treasure','trophy')),
 specialization_id text,
 required_level int not null check(required_level between 1 and 99),
 required_branch_level int check(required_branch_level between 1 and 99),
 equipment_requirement text not null check(length(equipment_requirement)>0),
 duration_seconds int not null check(duration_seconds>0),
 fishing_xp int not null check(fishing_xp>0),
 branch_xp int,
 batch_size int check(batch_size>0),
 reference_label text not null,
 reference_url text check(reference_url is null or reference_url like 'https://oldschool.runescape.wiki/w/%'),
 sort_order int not null unique,
 status text not null default 'planned' check(status in('planned','disabled')),
 balance_status text not null default 'draft' check(balance_status='draft'),
 source_version text not null default 'fishing-v4' check(source_version='fishing-v4'),
 foreign key(skill_id,specialization_id) references public.skill_specializations(skill_id,id),
 check((category='standard' and specialization_id is null and required_branch_level is null and branch_xp is null)
  or (category<>'standard' and specialization_id is not null and specialization_id=category||'-fishing' and required_branch_level is not null and required_level>=10 and branch_xp>0 and branch_xp is not null))
);
create index fishing_activities_specialization on public.fishing_activities(skill_id,specialization_id);
create table public.fishing_activity_runes (
 activity_id text not null references public.fishing_activities(id) on delete cascade,
 rune_id text not null references public.rune_types(id),
 quantity int not null check(quantity>0),primary key(activity_id,rune_id)
);
create index fishing_activity_runes_type on public.fishing_activity_runes(rune_id);
alter table public.fishing_activities enable row level security;
alter table public.fishing_activity_runes enable row level security;
revoke all on public.fishing_activities,public.fishing_activity_runes from public,anon,authenticated,service_role;
grant select on public.fishing_activities,public.fishing_activity_runes to authenticated,service_role;
create policy fishing_catalog_read on public.fishing_activities for select to authenticated using(true);
create policy fishing_costs_read on public.fishing_activity_runes for select to authenticated using(true);
comment on table public.fishing_activities is 'V4 draft catalog. XP is per completed batch; branch XP is separate. Only explicit x5 bundles have batch_size=5. Locations, crate contents, bait consumption and branch XP thresholds are unspecified.';
insert into public.fishing_activities(id,name,category,specialization_id,required_level,required_branch_level,equipment_requirement,duration_seconds,fishing_xp,branch_xp,batch_size,reference_label,reference_url,sort_order) values
 ('fishing-v4-shrimp','Shrimp','standard',null,1,null,'Small Net',360,25,null,null,'Raw shrimps','https://oldschool.runescape.wiki/w/Raw_shrimps',1),
 ('fishing-v4-sardine','Sardine','standard',null,5,null,'Fishing Rod + Bait',360,25,null,null,'Raw sardine','https://oldschool.runescape.wiki/w/Raw_sardine',2),
 ('fishing-v4-herring','Herring','standard',null,10,null,'Fishing Rod + Bait',480,35,null,null,'Raw herring','https://oldschool.runescape.wiki/w/Raw_herring',3),
 ('fishing-v4-anchovies','Anchovies','standard',null,15,null,'Small Net',600,40,null,null,'Raw anchovies','https://oldschool.runescape.wiki/w/Raw_anchovies',4),
 ('fishing-v4-mackerel','Mackerel','standard',null,20,null,'Big Net',720,50,null,null,'Raw mackerel','https://oldschool.runescape.wiki/w/Raw_mackerel',5),
 ('fishing-v4-trout','Trout','standard',null,25,null,'Fly Rod',720,55,null,null,'Raw trout','https://oldschool.runescape.wiki/w/Raw_trout',6),
 ('fishing-v4-salmon','Salmon','standard',null,30,null,'Fly Rod',900,65,null,null,'Raw salmon','https://oldschool.runescape.wiki/w/Raw_salmon',7),
 ('fishing-v4-pike','Pike','standard',null,35,null,'Fishing Rod',1080,75,null,null,'Raw pike','https://oldschool.runescape.wiki/w/Raw_pike',8),
 ('fishing-v4-tuna','Tuna','standard',null,40,null,'Harpoon',1200,80,null,null,'Raw tuna','https://oldschool.runescape.wiki/w/Raw_tuna',9),
 ('fishing-v4-lobster','Lobster','standard',null,45,null,'Lobster Pot',1500,95,null,null,'Raw lobster','https://oldschool.runescape.wiki/w/Raw_lobster',10),
 ('fishing-v4-bass','Bass','standard',null,50,null,'Big Net',1500,100,null,null,'Raw bass','https://oldschool.runescape.wiki/w/Raw_bass',11),
 ('fishing-v4-swordfish','Swordfish','standard',null,55,null,'Harpoon',1800,115,null,null,'Raw swordfish','https://oldschool.runescape.wiki/w/Raw_swordfish',12),
 ('fishing-v4-monkfish','Monkfish','standard',null,60,null,'Big Net',2100,130,null,null,'Raw monkfish','https://oldschool.runescape.wiki/w/Raw_monkfish',13),
 ('fishing-v4-shark','Shark','standard',null,65,null,'Harpoon',2400,140,null,null,'Raw shark','https://oldschool.runescape.wiki/w/Raw_shark',14),
 ('fishing-v4-sea-turtle','Sea Turtle','standard',null,70,null,'Heavy Net',2700,155,null,null,'Raw sea turtle','https://oldschool.runescape.wiki/w/Raw_sea_turtle',15),
 ('fishing-v4-manta-ray','Manta Ray','standard',null,75,null,'Deep Sea Net',3000,170,null,null,'Raw manta ray','https://oldschool.runescape.wiki/w/Raw_manta_ray',16),
 ('fishing-v4-anglerfish','Anglerfish','standard',null,80,null,'Deep Sea Rod',3600,195,null,null,'Raw anglerfish','https://oldschool.runescape.wiki/w/Raw_anglerfish',17),
 ('fishing-v4-dark-crab','Dark Crab','standard',null,85,null,'Reinforced Crab Trap',4200,220,null,null,'Raw dark crab','https://oldschool.runescape.wiki/w/Raw_dark_crab',18),
 ('fishing-v4-sacred-eel','Sacred Eel','standard',null,90,null,'Enchanted Rod',5400,260,null,null,'Sacred eel','https://oldschool.runescape.wiki/w/Sacred_eel',19),
 ('fishing-v4-ancient-sea-serpent','Ancient Sea Serpent','standard',null,95,null,'Master Harpoon',7200,325,null,null,'Runelana original',null,20),
 ('fishing-v4-shrimp-bundle-x5','Shrimp Bundle x5','commercial','commercial-fishing',10,1,'Small Net',1500,90,55,5,'Raw shrimps','https://oldschool.runescape.wiki/w/Raw_shrimps',21),
 ('fishing-v4-sardine-bundle-x5','Sardine Bundle x5','commercial','commercial-fishing',15,10,'Big Net',1800,105,60,5,'Raw sardine','https://oldschool.runescape.wiki/w/Raw_sardine',22),
 ('fishing-v4-herring-bundle-x5','Herring Bundle x5','commercial','commercial-fishing',20,15,'Big Net',2100,120,70,5,'Raw herring','https://oldschool.runescape.wiki/w/Raw_herring',23),
 ('fishing-v4-trout-bundle-x5','Trout Bundle x5','commercial','commercial-fishing',30,20,'River Net',2700,150,90,5,'Raw trout','https://oldschool.runescape.wiki/w/Raw_trout',24),
 ('fishing-v4-salmon-bundle-x5','Salmon Bundle x5','commercial','commercial-fishing',40,30,'Reinforced Net',3600,195,115,5,'Raw salmon','https://oldschool.runescape.wiki/w/Raw_salmon',25),
 ('fishing-v4-lobster-bundle-x5','Lobster Bundle x5','commercial','commercial-fishing',50,40,'Lobster Pot',4500,240,145,5,'Raw lobster','https://oldschool.runescape.wiki/w/Raw_lobster',26),
 ('fishing-v4-tuna-bundle-x5','Tuna Bundle x5','commercial','commercial-fishing',60,50,'Ocean Net',5400,280,170,5,'Raw tuna','https://oldschool.runescape.wiki/w/Raw_tuna',27),
 ('fishing-v4-shark-bundle-x5','Shark Bundle x5','commercial','commercial-fishing',75,65,'Heavy Ocean Net',7200,360,215,5,'Raw shark','https://oldschool.runescape.wiki/w/Raw_shark',28),
 ('fishing-v4-royal-seafood-crate','Royal Seafood Crate','commercial','commercial-fishing',90,80,'Master Net',10800,500,300,null,'Runelana original',null,29),
 ('fishing-v4-grand-ocean-crate','Grand Ocean Crate','commercial','commercial-fishing',99,99,'Legendary Net',14400,640,385,null,'Runelana original',null,30),
 ('fishing-v4-common-shell','Common Shell','treasure','treasure-fishing',10,1,'Small Net',600,60,35,null,'Shell','https://oldschool.runescape.wiki/w/Shell',31),
 ('fishing-v4-oyster','Oyster','treasure','treasure-fishing',20,10,'Oyster Net',900,85,50,null,'Oyster','https://oldschool.runescape.wiki/w/Oyster',32),
 ('fishing-v4-freshwater-pearl','Freshwater Pearl','treasure','treasure-fishing',30,20,'Pearl Net',1500,120,75,null,'Runelana original',null,33),
 ('fishing-v4-giant-clam','Giant Clam','treasure','treasure-fishing',40,30,'Clam Trap',2100,160,95,null,'Runelana original',null,34),
 ('fishing-v4-ancient-coral','Ancient Coral','treasure','treasure-fishing',50,40,'Diving Net',2700,195,120,null,'Runelana original',null,35),
 ('fishing-v4-black-pearl','Black Pearl','treasure','treasure-fishing',60,50,'Deep Sea Net',3600,250,150,null,'Black pearl','https://oldschool.runescape.wiki/w/Black_pearl',36),
 ('fishing-v4-sunken-relic','Sunken Relic','treasure','treasure-fishing',75,65,'Relic Net',5400,345,205,null,'Runelana original',null,37),
 ('fishing-v4-abyssal-pearl','Abyssal Pearl','treasure','treasure-fishing',85,75,'Abyssal Net',7200,435,260,null,'Runelana original',null,38),
 ('fishing-v4-ancient-treasure-chest','Ancient Treasure Chest','treasure','treasure-fishing',95,90,'Master Salvage Net',10800,600,360,null,'Runelana original',null,39),
 ('fishing-v4-legendary-ocean-relic','Legendary Ocean Relic','treasure','treasure-fishing',99,99,'Legendary Salvage Net',14400,765,460,null,'Runelana original',null,40),
 ('fishing-v4-trophy-trout','Trophy Trout','trophy','trophy-fishing',10,1,'Trophy Rod',1200,100,60,null,'Runelana original',null,41),
 ('fishing-v4-golden-carp','Golden Carp','trophy','trophy-fishing',20,10,'Trophy Rod',1800,145,85,null,'Runelana original',null,42),
 ('fishing-v4-giant-salmon','Giant Salmon','trophy','trophy-fishing',30,20,'Heavy Rod',2400,185,110,null,'Runelana original',null,43),
 ('fishing-v4-giant-swordfish','Giant Swordfish','trophy','trophy-fishing',45,30,'Harpoon',3600,265,160,null,'Runelana original',null,44),
 ('fishing-v4-golden-lobster','Golden Lobster','trophy','trophy-fishing',55,40,'Trophy Trap',4500,320,195,null,'Runelana original',null,45),
 ('fishing-v4-albino-shark','Albino Shark','trophy','trophy-fishing',65,50,'Deep Sea Harpoon',5400,380,230,null,'Runelana original',null,46),
 ('fishing-v4-ancient-manta-ray','Ancient Manta Ray','trophy','trophy-fishing',75,65,'Master Net',7200,480,285,null,'Runelana original',null,47),
 ('fishing-v4-leviathan','Leviathan','trophy','trophy-fishing',85,75,'Legendary Harpoon',10800,660,395,null,'Runelana original',null,48),
 ('fishing-v4-crimson-sea-dragon','Crimson Sea Dragon','trophy','trophy-fishing',95,90,'Dragon Harpoon',14400,845,505,null,'Runelana original',null,49),
 ('fishing-v4-mythical-ocean-guardian','Mythical Ocean Guardian','trophy','trophy-fishing',99,99,'Mythic Harpoon',21600,1185,710,null,'Runelana original',null,50);
insert into public.fishing_activity_runes(activity_id,rune_id,quantity) values
 ('fishing-v4-shrimp','air',1),
 ('fishing-v4-sardine','air',1),
 ('fishing-v4-herring','mind',1),
 ('fishing-v4-anchovies','air',2),
 ('fishing-v4-mackerel','water',2),
 ('fishing-v4-trout','water',2),
 ('fishing-v4-salmon','water',3),
 ('fishing-v4-pike','water',2),
 ('fishing-v4-pike','mind',1),
 ('fishing-v4-tuna','water',3),
 ('fishing-v4-lobster','water',3),
 ('fishing-v4-lobster','fire',1),
 ('fishing-v4-bass','water',4),
 ('fishing-v4-swordfish','water',3),
 ('fishing-v4-swordfish','air',2),
 ('fishing-v4-monkfish','water',4),
 ('fishing-v4-monkfish','nature',1),
 ('fishing-v4-shark','water',5),
 ('fishing-v4-shark','nature',2),
 ('fishing-v4-sea-turtle','water',4),
 ('fishing-v4-sea-turtle','nature',2),
 ('fishing-v4-manta-ray','water',5),
 ('fishing-v4-manta-ray','nature',2),
 ('fishing-v4-anglerfish','water',5),
 ('fishing-v4-anglerfish','death',2),
 ('fishing-v4-dark-crab','water',4),
 ('fishing-v4-dark-crab','death',3),
 ('fishing-v4-sacred-eel','nature',4),
 ('fishing-v4-sacred-eel','blood',2),
 ('fishing-v4-ancient-sea-serpent','blood',3),
 ('fishing-v4-ancient-sea-serpent','soul',1),
 ('fishing-v4-shrimp-bundle-x5','air',4),
 ('fishing-v4-sardine-bundle-x5','air',4),
 ('fishing-v4-sardine-bundle-x5','mind',1),
 ('fishing-v4-herring-bundle-x5','mind',5),
 ('fishing-v4-trout-bundle-x5','water',6),
 ('fishing-v4-salmon-bundle-x5','water',8),
 ('fishing-v4-lobster-bundle-x5','water',6),
 ('fishing-v4-lobster-bundle-x5','fire',2),
 ('fishing-v4-tuna-bundle-x5','water',8),
 ('fishing-v4-tuna-bundle-x5','nature',2),
 ('fishing-v4-shark-bundle-x5','water',10),
 ('fishing-v4-shark-bundle-x5','nature',3),
 ('fishing-v4-royal-seafood-crate','water',10),
 ('fishing-v4-royal-seafood-crate','blood',3),
 ('fishing-v4-grand-ocean-crate','nature',10),
 ('fishing-v4-grand-ocean-crate','soul',2),
 ('fishing-v4-common-shell','water',1),
 ('fishing-v4-oyster','water',2),
 ('fishing-v4-freshwater-pearl','water',3),
 ('fishing-v4-freshwater-pearl','mind',1),
 ('fishing-v4-giant-clam','water',4),
 ('fishing-v4-giant-clam','nature',1),
 ('fishing-v4-ancient-coral','water',3),
 ('fishing-v4-ancient-coral','nature',2),
 ('fishing-v4-black-pearl','water',4),
 ('fishing-v4-black-pearl','death',2),
 ('fishing-v4-sunken-relic','nature',3),
 ('fishing-v4-sunken-relic','death',2),
 ('fishing-v4-abyssal-pearl','blood',3),
 ('fishing-v4-abyssal-pearl','water',2),
 ('fishing-v4-ancient-treasure-chest','blood',3),
 ('fishing-v4-ancient-treasure-chest','soul',1),
 ('fishing-v4-legendary-ocean-relic','blood',2),
 ('fishing-v4-legendary-ocean-relic','soul',2),
 ('fishing-v4-trophy-trout','water',2),
 ('fishing-v4-golden-carp','water',2),
 ('fishing-v4-golden-carp','mind',1),
 ('fishing-v4-giant-salmon','water',3),
 ('fishing-v4-giant-salmon','nature',1),
 ('fishing-v4-giant-swordfish','water',4),
 ('fishing-v4-giant-swordfish','nature',1),
 ('fishing-v4-golden-lobster','water',3),
 ('fishing-v4-golden-lobster','nature',2),
 ('fishing-v4-albino-shark','nature',3),
 ('fishing-v4-albino-shark','death',2),
 ('fishing-v4-ancient-manta-ray','nature',4),
 ('fishing-v4-ancient-manta-ray','death',2),
 ('fishing-v4-leviathan','blood',3),
 ('fishing-v4-leviathan','soul',1),
 ('fishing-v4-crimson-sea-dragon','blood',4),
 ('fishing-v4-crimson-sea-dragon','soul',1),
 ('fishing-v4-mythical-ocean-guardian','blood',3),
 ('fishing-v4-mythical-ocean-guardian','soul',2);

create function public.fishing_master_catalog() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',a.id,'name',a.name,'category',a.category,'branchName',s.name,'specializationId',a.specialization_id,
 'requiredLevel',a.required_level,'requiredBranchLevel',a.required_branch_level,
 'equipment',jsonb_build_array(a.equipment_requirement),'durationSeconds',a.duration_seconds,
 'xpReward',a.fishing_xp,'branchXpReward',a.branch_xp,'batchSize',a.batch_size,
 'reference',a.reference_label,'referenceUrl',a.reference_url,'status',a.status,'balanceStatus',a.balance_status,
 'sourceVersion',a.source_version,'tier',a.category,'runeRequirementsConfigured',true,
 'runes',(select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'quantity',c.quantity) order by r.sort_order) from public.fishing_activity_runes c join public.rune_types r on r.id=c.rune_id where c.activity_id=a.id),
 'materials','[]'::jsonb,'outputs','[]'::jsonb
 ) order by a.sort_order),'[]'::jsonb) from public.fishing_activities a
 left join public.skill_specializations s on s.skill_id=a.skill_id and s.id=a.specialization_id where a.status<>'disabled'
$$;
revoke all on function public.fishing_master_catalog() from public,anon,authenticated;
grant execute on function public.fishing_master_catalog() to service_role;
create or replace function public.get_player_skills(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.player_skills(user_id,skill_id) select p_user_id,id from public.skill_types order by sort_order on conflict do nothing;
 insert into public.player_skill_specializations(user_id,skill_id,specialization_id,level)
  select p_user_id,skill_id,id,case when skill_id='fishing' then 1 else 0 end from public.skill_specializations where not archived order by skill_id,sort_order on conflict do nothing;
 select jsonb_build_object('economy',jsonb_build_object('runesAccountBound',true,'runeProductionPerHour',10),'skills',jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'level',p.level,'xp',p.xp,'completedActivities',p.completed_activities,'trainingSeconds',p.training_seconds,'updatedAt',p.updated_at,
  'progression',(select jsonb_build_object('curve','fishing-v1','levelStartXp',x.total_xp,'nextLevelXp',case when x.xp_to_next is null then null else x.total_xp+x.xp_to_next end,'xpIntoLevel',case when x.level=99 then 0 else p.xp-x.total_xp end,'xpForLevel',x.xp_to_next,'xpRemaining',case when x.level=99 then 0 else x.total_xp+x.xp_to_next-p.xp end,'maxLevel',99,'atMaxLevel',x.level=99) from public.skill_xp_levels x where x.skill_id=s.id and x.level=p.level),
  'fishingActivities',case when s.id='fishing' then public.fishing_master_catalog() else null end,
  'runeUsage',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'usage',u.usage,'purpose',r.purpose,'description',r.usage_description,'characterLevel',r.character_level,'holdingDays',r.holding_days,'rarity',r.rarity,'accountBound',r.account_bound,'proposedProductionCost',r.proposed_production_cost) order by r.sort_order),'[]'::jsonb) from public.skill_rune_usage u join public.rune_types r on r.id=u.rune_id where u.skill_id=s.id),
  'specializations',(select coalesce(jsonb_agg(jsonb_build_object('id',sp.id,'name',sp.name,'requiredLevel',sp.required_level,'level',ps.level,'xp',ps.xp) order by sp.sort_order),'[]'::jsonb)
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
