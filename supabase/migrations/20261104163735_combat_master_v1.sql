-- Combat V1 is a draft master catalog and saved progression, not an enabled battle engine.
create table public.combat_disciplines(
 id text primary key check(id in('attack','strength','defense','endurance')),
 name text not null unique,stat_name text not null,base_value numeric(8,2) not null check(base_value>0),
 per_level numeric(8,2) not null check(per_level>0),sort_order integer not null unique
);
create table public.combat_xp_levels(
 level integer primary key check(level between 1 and 99),total_xp bigint not null unique check(total_xp>=0),
 xp_to_next bigint,check((level<99 and xp_to_next is not null and xp_to_next>0) or (level=99 and xp_to_next is null))
);
create table public.combat_training_activities(
 id text primary key,discipline_id text not null references public.combat_disciplines(id),name text not null,
 required_level integer not null references public.combat_xp_levels(level),duration_seconds integer not null check(duration_seconds>0),
 xp_reward bigint not null check(xp_reward>0),listed_xp_per_hour integer not null check(listed_xp_per_hour>0),
 risk text not null check(risk in('none','low','medium')),sort_order integer not null unique,
 status text not null default 'planned' check(status in('planned','disabled')),
 source_version text not null default 'combat-v1' check(source_version='combat-v1'),unique(discipline_id,name)
);
create index combat_training_level_idx on public.combat_training_activities(required_level);
create table public.combat_encounters(
 id text primary key,name text not null unique,required_combat_level integer not null references public.combat_xp_levels(level),
 duration_seconds integer not null check(duration_seconds>0),suggested_gear text not null,
 risk text not null check(risk in('low','medium','high')),potential_loot text not null,sort_order integer not null unique,
 status text not null default 'planned' check(status in('planned','disabled')),
 source_version text not null default 'combat-v1' check(source_version='combat-v1')
);
create index combat_encounter_level_idx on public.combat_encounters(required_combat_level);
comment on table public.combat_training_activities is '32 V1 previews. Selected discipline earns XP after completion only. Shared activity slot, costs/equipment gates, risk effects, cancellation and idempotent settlement need activation work. Listed Master Training XP/hour is 412 in PDF; 1650 XP / 4 hours is 412.5.';
comment on table public.combat_encounters is 'Seven V1 encounter previews. Potential loot is descriptive, not a guarantee, item grant, or drop table. Combat outcome formulas, gear modifiers, loot odds, travel and food/strategy effects are unfinished.';
create table public.player_combat_xp(
 user_id uuid not null references public.player_profiles(user_id) on delete cascade,
 discipline_id text not null references public.combat_disciplines(id),
 xp bigint not null default 0 check(xp between 0 and 9007199254740991),
 level integer not null default 1 check(level between 1 and 99),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(user_id,discipline_id)
);
create index player_combat_discipline_idx on public.player_combat_xp(discipline_id);
create table public.player_combat_state(
 user_id uuid primary key references public.player_profiles(user_id) on delete cascade,
 current_hp integer not null check(current_hp>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
comment on table public.player_combat_xp is 'Four independent combat XP totals. Server-derived levels use combat-v1, not profession XP, adventure XP or GP holding days. Level 99 retains excess XP. No public XP-award endpoint.';
comment on table public.player_combat_state is 'Saved current HP, initialized at base Max HP. Reads never heal. HP is capped to Endurance base Max HP until a combat gear master defines bonuses. Encounters/healing/defeat are not enabled.';
insert into public.combat_disciplines(id,name,stat_name,base_value,per_level,sort_order) values
 ('attack','Attack','Accuracy',10,1.1,1),
 ('strength','Strength','Power',10,1.05,2),
 ('defense','Defense','Resistance',10,0.9,3),
 ('endurance','Endurance','Max HP',100,2,4);
insert into public.combat_xp_levels(level,total_xp,xp_to_next) values
 (1,0,20),
 (2,20,22),
 (3,42,23),
 (4,65,25),
 (5,90,27),
 (6,117,29),
 (7,146,31),
 (8,177,33),
 (9,210,36),
 (10,246,38),
 (11,284,41),
 (12,325,44),
 (13,369,48),
 (14,417,51),
 (15,468,55),
 (16,523,59),
 (17,582,64),
 (18,646,68),
 (19,714,74),
 (20,788,79),
 (21,867,85),
 (22,952,91),
 (23,1043,98),
 (24,1141,106),
 (25,1247,113),
 (26,1360,122),
 (27,1482,131),
 (28,1613,141),
 (29,1754,152),
 (30,1906,163),
 (31,2069,175),
 (32,2244,188),
 (33,2432,202),
 (34,2634,218),
 (35,2852,234),
 (36,3086,251),
 (37,3337,270),
 (38,3607,290),
 (39,3897,312),
 (40,4209,336),
 (41,4545,361),
 (42,4906,388),
 (43,5294,417),
 (44,5711,448),
 (45,6159,482),
 (46,6641,518),
 (47,7159,557),
 (48,7716,599),
 (49,8315,644),
 (50,8959,692),
 (51,9651,744),
 (52,10395,800),
 (53,11195,860),
 (54,12055,924),
 (55,12979,993),
 (56,13972,1068),
 (57,15040,1148),
 (58,16188,1234),
 (59,17422,1327),
 (60,18749,1426),
 (61,20175,1533),
 (62,21708,1648),
 (63,23356,1772),
 (64,25128,1904),
 (65,27032,2047),
 (66,29079,2201),
 (67,31280,2366),
 (68,33646,2543),
 (69,36189,2734),
 (70,38923,2939),
 (71,41862,3160),
 (72,45022,3396),
 (73,48418,3651),
 (74,52069,3925),
 (75,55994,4219),
 (76,60213,4536),
 (77,64749,4876),
 (78,69625,5242),
 (79,74867,5635),
 (80,80502,6058),
 (81,86560,6512),
 (82,93072,7000),
 (83,100072,7525),
 (84,107597,8090),
 (85,115687,8696),
 (86,124383,9349),
 (87,133732,10050),
 (88,143782,10804),
 (89,154586,11614),
 (90,166200,12485),
 (91,178685,13421),
 (92,192106,14428),
 (93,206534,15510),
 (94,222044,16673),
 (95,238717,17924),
 (96,256641,19268),
 (97,275909,20713),
 (98,296622,22266),
 (99,318888,null);
insert into public.combat_training_activities(id,discipline_id,name,required_level,duration_seconds,xp_reward,listed_xp_per_hour,risk,sort_order) values
 ('attack-practice-drills','attack','Practice Drills',1,900,35,140,'none',1),
 ('attack-training-dummy','attack','Training Dummy',5,1800,85,170,'none',2),
 ('attack-sparring-session','attack','Sparring Session',15,3600,190,190,'low',3),
 ('attack-veteran-training','attack','Veteran Training',30,5400,360,240,'low',4),
 ('attack-advanced-combat-drill','attack','Advanced Combat Drill',45,7200,560,280,'low',5),
 ('attack-elite-training','attack','Elite Training',60,10800,1050,350,'medium',6),
 ('attack-master-training','attack','Master Training',75,14400,1650,412,'medium',7),
 ('attack-grandmaster-trial','attack','Grandmaster Trial',90,21600,3000,500,'medium',8),
 ('strength-practice-drills','strength','Practice Drills',1,900,35,140,'none',9),
 ('strength-training-dummy','strength','Training Dummy',5,1800,85,170,'none',10),
 ('strength-sparring-session','strength','Sparring Session',15,3600,190,190,'low',11),
 ('strength-veteran-training','strength','Veteran Training',30,5400,360,240,'low',12),
 ('strength-advanced-combat-drill','strength','Advanced Combat Drill',45,7200,560,280,'low',13),
 ('strength-elite-training','strength','Elite Training',60,10800,1050,350,'medium',14),
 ('strength-master-training','strength','Master Training',75,14400,1650,412,'medium',15),
 ('strength-grandmaster-trial','strength','Grandmaster Trial',90,21600,3000,500,'medium',16),
 ('defense-practice-drills','defense','Practice Drills',1,900,35,140,'none',17),
 ('defense-training-dummy','defense','Training Dummy',5,1800,85,170,'none',18),
 ('defense-sparring-session','defense','Sparring Session',15,3600,190,190,'low',19),
 ('defense-veteran-training','defense','Veteran Training',30,5400,360,240,'low',20),
 ('defense-advanced-combat-drill','defense','Advanced Combat Drill',45,7200,560,280,'low',21),
 ('defense-elite-training','defense','Elite Training',60,10800,1050,350,'medium',22),
 ('defense-master-training','defense','Master Training',75,14400,1650,412,'medium',23),
 ('defense-grandmaster-trial','defense','Grandmaster Trial',90,21600,3000,500,'medium',24),
 ('endurance-practice-drills','endurance','Practice Drills',1,900,35,140,'none',25),
 ('endurance-training-dummy','endurance','Training Dummy',5,1800,85,170,'none',26),
 ('endurance-sparring-session','endurance','Sparring Session',15,3600,190,190,'low',27),
 ('endurance-veteran-training','endurance','Veteran Training',30,5400,360,240,'low',28),
 ('endurance-advanced-combat-drill','endurance','Advanced Combat Drill',45,7200,560,280,'low',29),
 ('endurance-elite-training','endurance','Elite Training',60,10800,1050,350,'medium',30),
 ('endurance-master-training','endurance','Master Training',75,14400,1650,412,'medium',31),
 ('endurance-grandmaster-trial','endurance','Grandmaster Trial',90,21600,3000,500,'medium',32);
insert into public.combat_encounters(id,name,required_combat_level,duration_seconds,suggested_gear,risk,potential_loot,sort_order) values
 ('forest-bandit-patrol','Forest Bandit Patrol',10,1800,'Basic equipment','low','Common crafting materials',1),
 ('cave-guardian','Cave Guardian',25,3600,'Iron/steel-tier gear','low','Ore, minor trophies',2),
 ('ruined-fortress-warden','Ruined Fortress Warden',40,5400,'Steel/mithril-tier gear','medium','Equipment components',3),
 ('deepwater-serpent','Deepwater Serpent',55,7200,'Mithril/adamant-tier gear','medium','Marine trophies, rare materials',4),
 ('obsidian-colossus','Obsidian Colossus',70,10800,'Rune-tier gear','high','Rare minerals, collectibles',5),
 ('abyssal-leviathan','Abyssal Leviathan',85,14400,'Masterwork gear','high','Boss trophy, rare materials',6),
 ('eternal-sentinel','Eternal Sentinel',95,21600,'Endgame gear','high','Prestige collectibles',7);
create function public.combat_level_for_xp(p_xp bigint) returns integer language sql stable security invoker set search_path='' as $$
 select max(level) from public.combat_xp_levels where total_xp<=p_xp
$$;
create function public.derive_combat_level() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.xp>=0 then new.level:=public.combat_level_for_xp(new.xp); end if;
 new.updated_at:=clock_timestamp();return new;
end $$;
create trigger derive_combat_level before insert or update of xp,level on public.player_combat_xp for each row execute function public.derive_combat_level();
create function public.combat_base_max_hp(p_user_id uuid) returns integer language sql volatile security invoker set search_path='' as $$
 select (d.base_value+d.per_level*(coalesce((select level from public.player_combat_xp where user_id=p_user_id and discipline_id='endurance'),1)-1))::integer from public.combat_disciplines d where d.id='endurance'
$$;
create function public.validate_combat_hp() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.current_hp>public.combat_base_max_hp(new.user_id) then raise exception 'Current HP exceeds base Max HP'; end if;
 new.updated_at:=clock_timestamp();return new;
end $$;
create trigger validate_combat_hp before insert or update on public.player_combat_state for each row execute function public.validate_combat_hp();
create function public.cap_combat_hp() returns trigger language plpgsql security invoker set search_path='' as $$
declare uid uuid; discipline text;
begin
 if tg_op='DELETE' then uid:=old.user_id;discipline:=old.discipline_id;else uid:=new.user_id;discipline:=new.discipline_id;end if;
 if discipline='endurance' then
  update public.player_combat_state set current_hp=public.combat_base_max_hp(uid)
   where user_id=uid and current_hp>public.combat_base_max_hp(uid);
 end if;
 return null;
end $$;
create trigger cap_combat_hp after insert or update of xp,level or delete on public.player_combat_xp for each row execute function public.cap_combat_hp();
create function public.initialize_player_combat(p_user_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.player_profiles where user_id=p_user_id) then return; end if;
 insert into public.player_combat_xp(user_id,discipline_id) select p_user_id,id from public.combat_disciplines on conflict do nothing;
 insert into public.player_combat_state(user_id,current_hp) values(p_user_id,public.combat_base_max_hp(p_user_id)) on conflict do nothing;
end $$;
create function public.initialize_profile_combat() returns trigger language plpgsql security invoker set search_path='' as $$
begin perform public.initialize_player_combat(new.user_id);return null;end $$;
create trigger initialize_profile_combat after insert on public.player_profiles for each row execute function public.initialize_profile_combat();
create function public.player_combat_snapshot(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.player_profiles where user_id=p_user_id) then return null; end if;
 perform public.initialize_player_combat(p_user_id);
 select jsonb_build_object('sourceVersion','combat-v1','combatLevel',floor(avg(p.level))::integer,
  'disciplines',jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'level',p.level,'xp',p.xp,
   'statName',d.stat_name,'baseStat',d.base_value+d.per_level*(p.level-1),'updatedAt',p.updated_at,
   'progression',jsonb_build_object('curve','combat-v1','levelStartXp',x.total_xp,'nextLevelXp',case when p.level=99 then null else x.total_xp+x.xp_to_next end,
   'xpIntoLevel',case when p.level=99 then 0 else p.xp-x.total_xp end,'xpForLevel',x.xp_to_next,
   'xpRemaining',case when p.level=99 then 0 else x.total_xp+x.xp_to_next-p.xp end,'atMaxLevel',p.level=99)) order by d.sort_order),
  'baseStats',jsonb_object_agg(d.id,d.base_value+d.per_level*(p.level-1)),
  'currentHp',(select current_hp from public.player_combat_state where user_id=p_user_id),
  'maxHp',max(case when d.id='endurance' then d.base_value+d.per_level*(p.level-1) end),
  'gearBonusesConfigured',false,'gearBonuses',null,'gearScore',null,'trainingEnabled',false,'encountersEnabled',false,
  'updatedAt',greatest(max(p.updated_at),(select updated_at from public.player_combat_state where user_id=p_user_id))) into result
 from public.player_combat_xp p join public.combat_disciplines d on d.id=p.discipline_id join public.combat_xp_levels x on x.level=p.level where p.user_id=p_user_id;
 return result;
end $$;

-- Only trusted server calls initialize or read the combined snapshot. Browser rows are owner-read-only.
alter table public.combat_disciplines enable row level security;
revoke all on public.combat_disciplines from public,anon,authenticated,service_role;
grant select on public.combat_disciplines to authenticated,service_role;
create policy combat_disciplines_read on public.combat_disciplines for select to authenticated using(true);
alter table public.combat_xp_levels enable row level security;
revoke all on public.combat_xp_levels from public,anon,authenticated,service_role;
grant select on public.combat_xp_levels to authenticated,service_role;
create policy combat_xp_levels_read on public.combat_xp_levels for select to authenticated using(true);
alter table public.combat_training_activities enable row level security;
revoke all on public.combat_training_activities from public,anon,authenticated,service_role;
grant select on public.combat_training_activities to authenticated,service_role;
create policy combat_training_activities_read on public.combat_training_activities for select to authenticated using(true);
alter table public.combat_encounters enable row level security;
revoke all on public.combat_encounters from public,anon,authenticated,service_role;
grant select on public.combat_encounters to authenticated,service_role;
create policy combat_encounters_read on public.combat_encounters for select to authenticated using(true);
alter table public.player_combat_xp enable row level security;
revoke all on public.player_combat_xp from public,anon,authenticated,service_role;
grant select on public.player_combat_xp to authenticated,service_role;
grant insert,update,delete on public.player_combat_xp to service_role;
create policy player_combat_xp_read on public.player_combat_xp for select to authenticated using((select auth.uid())=user_id);
alter table public.player_combat_state enable row level security;
revoke all on public.player_combat_state from public,anon,authenticated,service_role;
grant select on public.player_combat_state to authenticated,service_role;
grant insert,update,delete on public.player_combat_state to service_role;
create policy player_combat_state_read on public.player_combat_state for select to authenticated using((select auth.uid())=user_id);
revoke all on function public.combat_level_for_xp(bigint) from public,anon,authenticated;
grant execute on function public.combat_level_for_xp(bigint) to service_role;
revoke all on function public.derive_combat_level() from public,anon,authenticated;
grant execute on function public.derive_combat_level() to service_role;
revoke all on function public.combat_base_max_hp(uuid) from public,anon,authenticated;
grant execute on function public.combat_base_max_hp(uuid) to service_role;
revoke all on function public.validate_combat_hp() from public,anon,authenticated;
grant execute on function public.validate_combat_hp() to service_role;
revoke all on function public.cap_combat_hp() from public,anon,authenticated;
grant execute on function public.cap_combat_hp() to service_role;
revoke all on function public.initialize_player_combat(uuid) from public,anon,authenticated;
grant execute on function public.initialize_player_combat(uuid) to service_role;
revoke all on function public.initialize_profile_combat() from public,anon,authenticated;
grant execute on function public.initialize_profile_combat() to service_role;
revoke all on function public.player_combat_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.player_combat_snapshot(uuid) to service_role;
select public.initialize_player_combat(user_id) from public.player_profiles;
create or replace function public.player_profile_snapshot(p_user_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; stats jsonb;
begin
 stats:=public.refresh_player_account_stats(p_user_id);
 result:=public.player_profile_state_snapshot(p_user_id);
 if result is null then return null; end if;
 return result||jsonb_build_object('accountStats',stats,'combat',public.player_combat_snapshot(p_user_id));
end $$;
revoke all on function public.player_profile_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.player_profile_snapshot(uuid) to service_role;
