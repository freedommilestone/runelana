-- Fishing Level System V2: overall XP thresholds unchanged; independent branch curve.
-- Preserve all XP and activity counters. Only active Fishing branch levels are derived anew.
create table public.fishing_branch_xp_levels (
 level integer primary key check(level between 1 and 99),
 total_xp bigint not null unique check(total_xp>=0),
 xp_to_next bigint,
 check((level=1 and total_xp=0) or (level>1 and total_xp>0)),
 check((level=99 and xp_to_next is null) or (level<99 and xp_to_next is not null and xp_to_next>0))
);
alter table public.fishing_branch_xp_levels enable row level security;
revoke all on public.fishing_branch_xp_levels from public,anon,authenticated,service_role;
grant select on public.fishing_branch_xp_levels to authenticated,service_role;
create policy fishing_branch_curve_read on public.fishing_branch_xp_levels for select to authenticated using(true);
comment on table public.fishing_branch_xp_levels is 'Fishing Level System V2 PDF: exact 99 draft thresholds shared by Commercial, Treasure, and Trophy. Each branch has independent saved XP; max level 99 at 125000 XP. No interpolation or activity settlement.';
insert into public.fishing_branch_xp_levels(level,total_xp,xp_to_next) values
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

create function public.fishing_branch_level_for_xp(p_xp bigint) returns integer
language sql stable strict security invoker set search_path='' as $$
 select level from public.fishing_branch_xp_levels where total_xp<=p_xp order by total_xp desc limit 1
$$;
revoke all on function public.fishing_branch_level_for_xp(bigint) from public,anon,authenticated;
grant execute on function public.fishing_branch_level_for_xp(bigint) to service_role;
create function public.sync_fishing_branch_level() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.skill_id='fishing' and new.specialization_id in('commercial-fishing','treasure-fishing','trophy-fishing') and new.xp>=0 then
  new.level=public.fishing_branch_level_for_xp(new.xp);
 end if;
 return new;
end $$;
revoke all on function public.sync_fishing_branch_level() from public,anon,authenticated;
grant execute on function public.sync_fishing_branch_level() to service_role;
create trigger player_fishing_branch_level before insert or update of xp,level,skill_id,specialization_id
 on public.player_skill_specializations for each row execute function public.sync_fishing_branch_level();
update public.player_skill_specializations set level=public.fishing_branch_level_for_xp(xp)
 where skill_id='fishing' and specialization_id in('commercial-fishing','treasure-fishing','trophy-fishing')
 and level is distinct from public.fishing_branch_level_for_xp(xp);
update public.skill_xp_levels set milestone=case level when 10 then 'Commercial Fisher available' when 30 then 'Treasure & Trophy Fisher available' else '' end where skill_id='fishing';
comment on table public.skill_xp_levels is 'Fishing Level System V2: overall thresholds unchanged from V1, round(15 * 1.075^(L-1)), levels 1-99. Branch unlock milestones refer to overall Fishing level. Administration-only writes.';
create or replace function public.get_player_skills(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.player_skills(user_id,skill_id) select p_user_id,id from public.skill_types order by sort_order on conflict do nothing;
 insert into public.player_skill_specializations(user_id,skill_id,specialization_id,level)
  select p_user_id,skill_id,id,case when skill_id='fishing' then 1 else 0 end from public.skill_specializations where not archived order by skill_id,sort_order on conflict do nothing;
 select jsonb_build_object('economy',jsonb_build_object('runesAccountBound',true,'runeProductionPerHour',10),'skills',jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'level',p.level,'xp',p.xp,'completedActivities',p.completed_activities,'trainingSeconds',p.training_seconds,'updatedAt',p.updated_at,
  'progression',(select jsonb_build_object('curve','fishing-v2','levelStartXp',x.total_xp,'nextLevelXp',case when x.xp_to_next is null then null else x.total_xp+x.xp_to_next end,'xpIntoLevel',case when x.level=99 then 0 else p.xp-x.total_xp end,'xpForLevel',x.xp_to_next,'xpRemaining',case when x.level=99 then 0 else x.total_xp+x.xp_to_next-p.xp end,'maxLevel',99,'atMaxLevel',x.level=99) from public.skill_xp_levels x where x.skill_id=s.id and x.level=p.level),
  'fishingActivities',case when s.id='fishing' then public.fishing_master_catalog() else null end,
  'runeUsage',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'usage',u.usage,'purpose',r.purpose,'description',r.usage_description,'characterLevel',r.character_level,'holdingDays',r.holding_days,'rarity',r.rarity,'accountBound',r.account_bound,'proposedProductionCost',r.proposed_production_cost) order by r.sort_order),'[]'::jsonb) from public.skill_rune_usage u join public.rune_types r on r.id=u.rune_id where u.skill_id=s.id),
  'specializations',(select coalesce(jsonb_agg(jsonb_build_object('id',sp.id,'name',sp.name,'requiredLevel',sp.required_level,'level',ps.level,'xp',ps.xp,
   'progression',(select jsonb_build_object('curve','fishing-branch-v2','levelStartXp',x.total_xp,'nextLevelXp',case when x.xp_to_next is null then null else x.total_xp+x.xp_to_next end,'xpIntoLevel',case when x.level=99 then 0 else ps.xp-x.total_xp end,'xpForLevel',x.xp_to_next,'xpRemaining',case when x.level=99 then 0 else x.total_xp+x.xp_to_next-ps.xp end,'maxLevel',99,'atMaxLevel',x.level=99) from public.fishing_branch_xp_levels x where sp.skill_id='fishing' and sp.id in('commercial-fishing','treasure-fishing','trophy-fishing') and x.level=ps.level)) order by sp.sort_order),'[]'::jsonb)
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
