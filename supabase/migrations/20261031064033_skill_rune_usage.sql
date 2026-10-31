-- User-provided economic usage matrix: profession-wide usage is not a recipe cost.
alter table public.rune_types add column purpose text not null default '', add column usage_description text not null default '';
update public.rune_types set purpose='Precision and movement',usage_description='Specialized catches, lightweight accessories, and agility or precision enchantments.' where id='air';
update public.rune_types set purpose='Knowledge and technique',usage_description='Precision equipment, specialized fishing tools, and accuracy-related enchantments.' where id='mind';
update public.rune_types set purpose='Growth and preservation',usage_description='Crops, seafood preservation, fishing, cooking, and water-based enchantments.' where id='water';
update public.rune_types set purpose='Heat and transformation',usage_description='Advanced smithing and cooking, heat-resistant equipment, and fire enchantments.' where id='fire';
update public.rune_types set purpose='Growth and refinement',usage_description='Rare plants, refined minerals, specialty ingredients, and nature-based enchantments.' where id='nature';
update public.rune_types set purpose='Dangerous materials and dark magic',usage_description='Dark-themed equipment, rare minerals, and specialized effects in advanced mining, smithing, and enchanting.' where id='death';
update public.rune_types set purpose='Powerful equipment and rare materials',usage_description='High-level weapons, armor, accessories, enchantments, and specialized equipment sets.' where id='blood';
update public.rune_types set purpose='Legendary and prestige creations',usage_description='Legendary equipment, seasonal enchantments, rare collectibles, and high-tier specialty foods.' where id='soul';

create table public.skill_rune_usage (
 skill_id text not null references public.skill_types(id),
 rune_id text not null references public.rune_types(id),
 usage text not null check(usage in('primary','secondary')),
 primary key(skill_id,rune_id)
);
create index skill_rune_usage_type on public.skill_rune_usage(rune_id);
alter table public.skill_rune_usage enable row level security;
revoke all on public.skill_rune_usage from public,anon,authenticated;
grant select on public.skill_rune_usage to authenticated;
grant all on public.skill_rune_usage to service_role;
create policy skill_rune_usage_read on public.skill_rune_usage for select to authenticated using(true);
insert into public.skill_rune_usage(skill_id,rune_id,usage) values
 ('fishing','air','primary'),
 ('mining','air','secondary'),
 ('smithing','air','secondary'),
 ('crafting','air','primary'),
 ('enchanting','air','primary'),
 ('fishing','mind','secondary'),
 ('farming','mind','secondary'),
 ('smithing','mind','secondary'),
 ('crafting','mind','primary'),
 ('enchanting','mind','primary'),
 ('cooking','mind','secondary'),
 ('fishing','water','primary'),
 ('farming','water','primary'),
 ('mining','water','secondary'),
 ('crafting','water','secondary'),
 ('enchanting','water','primary'),
 ('cooking','water','primary'),
 ('farming','fire','secondary'),
 ('mining','fire','secondary'),
 ('smithing','fire','primary'),
 ('crafting','fire','secondary'),
 ('enchanting','fire','primary'),
 ('cooking','fire','primary'),
 ('fishing','nature','secondary'),
 ('farming','nature','primary'),
 ('mining','nature','primary'),
 ('smithing','nature','secondary'),
 ('crafting','nature','primary'),
 ('enchanting','nature','primary'),
 ('cooking','nature','primary'),
 ('fishing','death','secondary'),
 ('farming','death','secondary'),
 ('mining','death','primary'),
 ('smithing','death','primary'),
 ('crafting','death','secondary'),
 ('enchanting','death','primary'),
 ('farming','blood','secondary'),
 ('mining','blood','primary'),
 ('smithing','blood','primary'),
 ('crafting','blood','primary'),
 ('enchanting','blood','primary'),
 ('cooking','blood','secondary'),
 ('fishing','soul','secondary'),
 ('farming','soul','primary'),
 ('mining','soul','secondary'),
 ('smithing','soul','primary'),
 ('crafting','soul','primary'),
 ('enchanting','soul','primary'),
 ('cooking','soul','primary');

-- Withdraw the seven initial suggestions; the supplied matrix does not define
-- which combination or quantity a specific recipe consumes. Never require all
-- profession runes for every activity. Planned activities remain unavailable.
delete from public.skill_activity_runes where quantity is null and (activity_id,rune_id) in (
 ('catch-fish','water'),('grow-crops','nature'),('mine-ore','air'),('smith-steel-bars','fire'),
 ('craft-items','mind'),('enchant-equipment','soul'),('cook-meals','fire')
);
create or replace function public.get_player_skills(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.player_skills(user_id,skill_id) select p_user_id,id from public.skill_types order by sort_order on conflict do nothing;
 insert into public.player_skill_specializations(user_id,skill_id,specialization_id)
  select p_user_id,skill_id,id from public.skill_specializations order by skill_id,sort_order on conflict do nothing;
 select jsonb_build_object('skills',jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'level',p.level,'xp',p.xp,'completedActivities',p.completed_activities,'trainingSeconds',p.training_seconds,'updatedAt',p.updated_at,
  'runeUsage',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'usage',u.usage,'purpose',r.purpose,'description',r.usage_description,'characterLevel',r.character_level,'holdingDays',r.holding_days) order by r.sort_order),'[]'::jsonb) from public.skill_rune_usage u join public.rune_types r on r.id=u.rune_id where u.skill_id=s.id),
  'specializations',(select coalesce(jsonb_agg(jsonb_build_object('id',sp.id,'name',sp.name,'requiredLevel',sp.required_level,'level',ps.level,'xp',ps.xp) order by sp.sort_order),'[]'::jsonb)
   from public.skill_specializations sp join public.player_skill_specializations ps on ps.skill_id=sp.skill_id and ps.specialization_id=sp.id and ps.user_id=p_user_id where sp.skill_id=s.id),
  'activities',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'requiredLevel',a.required_level,'status',a.status,
   'runes',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'quantity',ar.quantity) order by r.sort_order),'[]'::jsonb) from public.skill_activity_runes ar join public.rune_types r on r.id=ar.rune_id where ar.activity_id=a.id)
  ) order by a.sort_order,a.id),'[]'::jsonb) from public.skill_activities a where a.skill_id=s.id)
 ) order by s.sort_order)) into result
 from public.skill_types s join public.player_skills p on p.skill_id=s.id and p.user_id=p_user_id;
 return result;
end $$;
revoke all on function public.get_player_skills(uuid) from public,anon,authenticated;
grant execute on function public.get_player_skills(uuid) to service_role;
