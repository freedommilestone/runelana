-- Fishing V1 curve from Runelana_Fishing_XP_Levels_1_to_99.pdf.
-- Existing XP is preserved. No activity is activated or awarded XP by this migration.
create table public.skill_xp_levels (
 skill_id text not null references public.skill_types(id),
 level integer not null check(level between 1 and 99),
 total_xp bigint not null check(total_xp >= 0),
 xp_to_next bigint,
 milestone text not null default '',
 primary key(skill_id,level), unique(skill_id,total_xp),
 check ((level=1 and total_xp=0) or (level>1 and total_xp>0)),
 check ((level=99 and xp_to_next is null) or (level<99 and xp_to_next>0))
);
alter table public.skill_xp_levels enable row level security;
revoke all on public.skill_xp_levels from public,anon,authenticated;
grant select on public.skill_xp_levels to authenticated,service_role;
create policy skill_xp_levels_read on public.skill_xp_levels for select to authenticated using(true);
comment on table public.skill_xp_levels is 'Versioned in migrations; Fishing V1: round(15 * 1.075^(L-1)), levels 1-99. Only administration may change thresholds.';
insert into public.skill_xp_levels(skill_id,level,total_xp,xp_to_next,milestone) values
 ('fishing',1,0,15,''),
 ('fishing',2,15,16,''),
 ('fishing',3,31,17,''),
 ('fishing',4,48,19,''),
 ('fishing',5,67,20,''),
 ('fishing',6,87,22,''),
 ('fishing',7,109,23,''),
 ('fishing',8,132,25,''),
 ('fishing',9,157,27,''),
 ('fishing',10,184,29,'First specialization'),
 ('fishing',11,213,31,''),
 ('fishing',12,244,33,''),
 ('fishing',13,277,36,''),
 ('fishing',14,313,38,''),
 ('fishing',15,351,41,''),
 ('fishing',16,392,44,''),
 ('fishing',17,436,48,''),
 ('fishing',18,484,51,''),
 ('fishing',19,535,55,''),
 ('fishing',20,590,59,''),
 ('fishing',21,649,64,''),
 ('fishing',22,713,68,''),
 ('fishing',23,781,74,''),
 ('fishing',24,855,79,''),
 ('fishing',25,934,85,''),
 ('fishing',26,1019,91,''),
 ('fishing',27,1110,98,''),
 ('fishing',28,1208,106,''),
 ('fishing',29,1314,114,''),
 ('fishing',30,1428,122,''),
 ('fishing',31,1550,131,''),
 ('fishing',32,1681,141,''),
 ('fishing',33,1822,152,''),
 ('fishing',34,1974,163,''),
 ('fishing',35,2137,175,''),
 ('fishing',36,2312,189,''),
 ('fishing',37,2501,203,''),
 ('fishing',38,2704,218,''),
 ('fishing',39,2922,234,''),
 ('fishing',40,3156,252,''),
 ('fishing',41,3408,271,''),
 ('fishing',42,3679,291,''),
 ('fishing',43,3970,313,''),
 ('fishing',44,4283,336,''),
 ('fishing',45,4619,361,''),
 ('fishing',46,4980,389,''),
 ('fishing',47,5369,418,''),
 ('fishing',48,5787,449,''),
 ('fishing',49,6236,483,''),
 ('fishing',50,6719,519,''),
 ('fishing',51,7238,558,''),
 ('fishing',52,7796,600,''),
 ('fishing',53,8396,645,''),
 ('fishing',54,9041,693,''),
 ('fishing',55,9734,745,''),
 ('fishing',56,10479,801,''),
 ('fishing',57,11280,861,''),
 ('fishing',58,12141,925,''),
 ('fishing',59,13066,995,''),
 ('fishing',60,14061,1070,''),
 ('fishing',61,15131,1150,''),
 ('fishing',62,16281,1236,''),
 ('fishing',63,17517,1329,''),
 ('fishing',64,18846,1428,''),
 ('fishing',65,20274,1535,''),
 ('fishing',66,21809,1651,''),
 ('fishing',67,23460,1774,''),
 ('fishing',68,25234,1907,''),
 ('fishing',69,27141,2051,''),
 ('fishing',70,29192,2204,''),
 ('fishing',71,31396,2370,''),
 ('fishing',72,33766,2547,''),
 ('fishing',73,36313,2738,''),
 ('fishing',74,39051,2944,''),
 ('fishing',75,41995,3165,''),
 ('fishing',76,45160,3402,''),
 ('fishing',77,48562,3657,''),
 ('fishing',78,52219,3931,''),
 ('fishing',79,56150,4226,''),
 ('fishing',80,60376,4543,''),
 ('fishing',81,64919,4884,''),
 ('fishing',82,69803,5250,''),
 ('fishing',83,75053,5644,''),
 ('fishing',84,80697,6067,''),
 ('fishing',85,86764,6522,''),
 ('fishing',86,93286,7011,''),
 ('fishing',87,100297,7537,''),
 ('fishing',88,107834,8103,''),
 ('fishing',89,115937,8710,''),
 ('fishing',90,124647,9364,''),
 ('fishing',91,134011,10066,''),
 ('fishing',92,144077,10821,''),
 ('fishing',93,154898,11632,''),
 ('fishing',94,166530,12505,''),
 ('fishing',95,179035,13443,''),
 ('fishing',96,192478,14451,''),
 ('fishing',97,206929,15535,''),
 ('fishing',98,222464,16700,''),
 ('fishing',99,239164,null,'Fishing mastery');

create function public.fishing_level_for_xp(p_xp bigint) returns integer
language sql stable strict security invoker set search_path='' as $$
 select level from public.skill_xp_levels where skill_id='fishing' and total_xp<=p_xp order by total_xp desc limit 1
$$;
revoke all on function public.fishing_level_for_xp(bigint) from public,anon,authenticated;
grant execute on function public.fishing_level_for_xp(bigint) to service_role;

create function public.sync_fishing_level() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.skill_id='fishing' then
  -- Reject invalid XP using the existing player_skills XP constraint.
  if new.xp>=0 then new.level=public.fishing_level_for_xp(new.xp); end if;
 end if;
 return new;
end $$;
revoke all on function public.sync_fishing_level() from public,anon,authenticated;
grant execute on function public.sync_fishing_level() to service_role;
create trigger player_fishing_level before insert or update of xp,level,skill_id
 on public.player_skills for each row execute function public.sync_fishing_level();
update public.player_skills set level=public.fishing_level_for_xp(xp)
 where skill_id='fishing' and level is distinct from public.fishing_level_for_xp(xp);
update public.skill_activities set required_level=1 where skill_id='fishing' and required_level=0;
update public.skill_specializations set required_level=10 where skill_id='fishing' and id='river-angler';

create or replace function public.get_player_skills(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.player_skills(user_id,skill_id) select p_user_id,id from public.skill_types order by sort_order on conflict do nothing;
 insert into public.player_skill_specializations(user_id,skill_id,specialization_id)
  select p_user_id,skill_id,id from public.skill_specializations order by skill_id,sort_order on conflict do nothing;
 select jsonb_build_object('economy',jsonb_build_object('runesAccountBound',true,'runeProductionPerHour',10),'skills',jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'level',p.level,'xp',p.xp,'completedActivities',p.completed_activities,'trainingSeconds',p.training_seconds,'updatedAt',p.updated_at,
  'progression',(select jsonb_build_object('curve','fishing-v1','levelStartXp',x.total_xp,'nextLevelXp',case when x.xp_to_next is null then null else x.total_xp+x.xp_to_next end,'xpIntoLevel',case when x.level=99 then 0 else p.xp-x.total_xp end,'xpForLevel',x.xp_to_next,'xpRemaining',case when x.level=99 then 0 else x.total_xp+x.xp_to_next-p.xp end,'maxLevel',99,'atMaxLevel',x.level=99) from public.skill_xp_levels x where x.skill_id=s.id and x.level=p.level),
  'runeUsage',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'usage',u.usage,'purpose',r.purpose,'description',r.usage_description,'characterLevel',r.character_level,'holdingDays',r.holding_days,'rarity',r.rarity,'accountBound',r.account_bound,'proposedProductionCost',r.proposed_production_cost) order by r.sort_order),'[]'::jsonb) from public.skill_rune_usage u join public.rune_types r on r.id=u.rune_id where u.skill_id=s.id),
  'specializations',(select coalesce(jsonb_agg(jsonb_build_object('id',sp.id,'name',sp.name,'requiredLevel',sp.required_level,'level',ps.level,'xp',ps.xp) order by sp.sort_order),'[]'::jsonb)
   from public.skill_specializations sp join public.player_skill_specializations ps on ps.skill_id=sp.skill_id and ps.specialization_id=sp.id and ps.user_id=p_user_id where sp.skill_id=s.id),
  'activities',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'requiredLevel',a.required_level,'status',a.status,'tier',a.activity_tier,'balanceStatus',a.balance_status,'runeRequirementsConfigured',a.rune_requirements_configured,'durationSeconds',a.duration_seconds,'xpReward',a.xp_reward,
   'materials',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'quantity',c.quantity) order by m.id),'[]'::jsonb) from public.skill_activity_materials c join public.skill_materials m on m.id=c.material_id where c.activity_id=a.id),
   'outputs',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'quantity',c.quantity) order by m.id),'[]'::jsonb) from public.skill_activity_outputs c join public.skill_materials m on m.id=c.material_id where c.activity_id=a.id),
   'runes',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'quantity',ar.quantity) order by r.sort_order),'[]'::jsonb) from public.skill_activity_runes ar join public.rune_types r on r.id=ar.rune_id where ar.activity_id=a.id)
  ) order by a.sort_order,a.id),'[]'::jsonb) from public.skill_activities a where a.skill_id=s.id)
 ) order by s.sort_order)) into result
 from public.skill_types s join public.player_skills p on p.skill_id=s.id and p.user_id=p_user_id;
 return result;
end $$;
