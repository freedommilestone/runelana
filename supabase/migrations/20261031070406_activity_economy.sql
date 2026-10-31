-- Draft launch recipes. Player balances, skills and production allocations are untouched.
alter table public.rune_types add column rarity text, add column proposed_production_cost smallint check(proposed_production_cost>0), add column account_bound boolean not null default true check(account_bound);
update public.rune_types set rarity=case when id in('air','mind','water') then 'common' when id in('fire','nature') then 'uncommon' when id='death' then 'rare' when id='blood' then 'epic' else 'legendary' end;
alter table public.rune_types alter column rarity set not null, add constraint rune_rarity_valid check(rarity in('common','uncommon','rare','epic','legendary'));
update public.rune_types set proposed_production_cost=case rarity when 'common' then 1 when 'uncommon' then 2 when 'rare' then 8 when 'epic' then 20 else 120 end;
alter table public.rune_types alter column proposed_production_cost set not null;
comment on column public.rune_types.proposed_production_cost is 'Draft capacity units per rune for balancing only. Live accrual remains 10 runes per hour; this field is not applied to player balances.';
alter table public.skill_activities
 add column activity_tier text check(activity_tier in('basic','intermediate','advanced')),
 add column balance_status text not null default 'draft' check(balance_status in('draft','ready')),
 add column rune_requirements_configured boolean not null default false,
 add column duration_seconds int check(duration_seconds>0),
 add column xp_reward int check(xp_reward>=0),
 add constraint available_activity_configured check(status<>'available' or (activity_tier is not null and balance_status='ready' and rune_requirements_configured and duration_seconds is not null and xp_reward is not null));
comment on column public.skill_activities.activity_tier is 'Basic is explicitly rune-free; intermediate uses common/uncommon runes; advanced combines rare, epic, or legendary runes with other runes and materials.';
comment on column public.skill_activity_runes.quantity is 'Positive units consumed per completed batch. NULL is unconfigured, never free. Basic recipes explicitly require no rune rows.';
create table public.skill_materials(id text primary key,name text not null);
create table public.skill_activity_materials(
 activity_id text not null references public.skill_activities(id) on delete cascade,
 material_id text not null references public.skill_materials(id),quantity int not null check(quantity>0),primary key(activity_id,material_id)
);
create index skill_material_input_type on public.skill_activity_materials(material_id);
create table public.skill_activity_outputs(
 activity_id text not null references public.skill_activities(id) on delete cascade,
 material_id text not null references public.skill_materials(id),quantity int not null check(quantity>0),primary key(activity_id,material_id)
);
create index skill_material_output_type on public.skill_activity_outputs(material_id);
alter table public.skill_materials enable row level security;
alter table public.skill_activity_materials enable row level security;
alter table public.skill_activity_outputs enable row level security;
revoke all on public.skill_materials,public.skill_activity_materials,public.skill_activity_outputs from public,anon,authenticated;
grant select on public.skill_materials,public.skill_activity_materials,public.skill_activity_outputs to authenticated;
grant all on public.skill_materials,public.skill_activity_materials,public.skill_activity_outputs to service_role;
create policy material_catalog_read on public.skill_materials for select to authenticated using(true);
create policy activity_materials_read on public.skill_activity_materials for select to authenticated using(true);
create policy activity_outputs_read on public.skill_activity_outputs for select to authenticated using(true);

-- Replace only the unused generic placeholders created in the previous migration.
do $$ begin
 if exists(select 1 from public.skill_activities where id in('catch-fish','grow-crops','mine-ore','craft-items','enchant-equipment','cook-meals','smith-steel-bars') and status<>'planned') then raise exception 'Review active recipes before replacing draft placeholders';end if;
end $$;
delete from public.skill_activities where id in('catch-fish','grow-crops','mine-ore','craft-items','enchant-equipment','cook-meals');
insert into public.skill_materials(id,name) values
 ('berries','Berries'),
 ('bread','Bread'),
 ('cloth','Cloth'),
 ('coal','Coal'),
 ('copper-bar','Copper Bar'),
 ('copper-brooch','Copper Brooch'),
 ('copper-ore','Copper Ore'),
 ('copper-tools','Copper Tools'),
 ('grilled-shrimp','Grilled Shrimp'),
 ('harvest-meal','Harvest Meal'),
 ('herbs','Herbs'),
 ('iron-ore','Iron Ore'),
 ('legendary-armor','Legendary Armor'),
 ('lightweight-pendant','Lightweight Pendant'),
 ('moonherb','Moonherb'),
 ('plant-fiber','Plant Fiber'),
 ('polished-gem','Polished Gem'),
 ('practice-charm','Practice Charm'),
 ('practice-scroll','Practice Scroll'),
 ('precision-tools','Precision Tools'),
 ('preserved-seafood','Preserved Seafood'),
 ('prestige-amulet','Prestige Amulet'),
 ('raw-sardine','Raw Sardine'),
 ('raw-shrimp','Raw Shrimp'),
 ('raw-soulfin','Raw Soulfin'),
 ('raw-trout','Raw Trout'),
 ('rough-stone','Rough Stone'),
 ('royal-banquet','Royal Banquet'),
 ('seasonal-amulet','Seasonal Amulet'),
 ('shadow-crystal','Shadow Crystal'),
 ('specialty-stew','Specialty Stew'),
 ('steel-bar','Steel Bar'),
 ('steel-pickaxe','Steel Pickaxe'),
 ('swift-charm','Swift Charm'),
 ('vegetables','Vegetables'),
 ('water-ward','Water Ward'),
 ('wheat','Wheat');
insert into public.skill_activities(id,skill_id,name,required_level,status,sort_order,activity_tier,balance_status,rune_requirements_configured,duration_seconds,xp_reward) values
 ('catch-shrimp','fishing','Catch Shrimp',0,'planned',1,'basic','draft',true,60,4),
 ('catch-sardines','fishing','Catch Sardines',0,'planned',2,'basic','draft',true,90,6),
 ('precision-trout','fishing','Catch River Trout',10,'planned',3,'intermediate','draft',true,240,18),
 ('preserve-seafood','fishing','Preserve Seafood',20,'planned',4,'intermediate','draft',true,300,22),
 ('soulfin-expedition','fishing','Catch a Soulfin',50,'planned',5,'advanced','draft',true,1200,80),
 ('grow-wheat','farming','Grow Wheat',0,'planned',1,'basic','draft',true,120,6),
 ('gather-herbs','farming','Gather Herbs',0,'planned',2,'basic','draft',true,180,8),
 ('irrigate-berries','farming','Grow Irrigated Berries',10,'planned',3,'intermediate','draft',true,300,20),
 ('greenhouse-harvest','farming','Grow Greenhouse Vegetables',20,'planned',4,'intermediate','draft',true,420,28),
 ('cultivate-moonherb','farming','Cultivate Moonherb',50,'planned',5,'advanced','draft',true,1200,80),
 ('mine-copper','mining','Mine Copper',0,'planned',1,'basic','draft',true,90,6),
 ('gather-coal','mining','Gather Coal',0,'planned',2,'basic','draft',true,120,8),
 ('refine-gemstones','mining','Refine Gemstones',10,'planned',3,'intermediate','draft',true,300,22),
 ('extract-iron','mining','Extract Iron',20,'planned',4,'intermediate','draft',true,360,26),
 ('mine-shadow-crystal','mining','Mine Shadow Crystal',50,'planned',5,'advanced','draft',true,1500,90),
 ('smelt-copper','smithing','Smelt Copper Bars',0,'planned',1,'basic','draft',true,150,10),
 ('forge-copper-tools','smithing','Forge Copper Tools',0,'planned',2,'basic','draft',true,180,12),
 ('smith-steel-bars','smithing','Smith Steel Bars',10,'planned',3,'intermediate','draft',true,300,22),
 ('forge-steel-pickaxe','smithing','Forge a Steel Pickaxe',20,'planned',4,'intermediate','draft',true,480,32),
 ('forge-legendary-armor','smithing','Forge Legendary Armor',75,'planned',5,'advanced','draft',true,43200,500),
 ('weave-cloth','crafting','Weave Cloth',0,'planned',1,'basic','draft',true,120,8),
 ('craft-copper-brooch','crafting','Craft a Copper Brooch',0,'planned',2,'basic','draft',true,180,12),
 ('craft-precision-tools','crafting','Craft Precision Tools',10,'planned',3,'intermediate','draft',true,300,22),
 ('craft-light-pendant','crafting','Craft a Lightweight Pendant',20,'planned',4,'intermediate','draft',true,420,28),
 ('craft-prestige-amulet','crafting','Craft a Prestige Amulet',80,'planned',5,'advanced','draft',true,43200,600),
 ('study-inscriptions','enchanting','Study Inscriptions',0,'planned',1,'basic','draft',true,120,8),
 ('prepare-practice-charm','enchanting','Prepare a Practice Charm',0,'planned',2,'basic','draft',true,180,12),
 ('enchant-swift-charm','enchanting','Enchant a Swift Charm',10,'planned',3,'intermediate','draft',true,300,22),
 ('enchant-water-ward','enchanting','Enchant a Water Ward',20,'planned',4,'intermediate','draft',true,420,28),
 ('seasonal-enchantment','enchanting','Create a Seasonal Enchantment',85,'planned',5,'advanced','draft',true,86400,1000),
 ('cook-shrimp','cooking','Cook Shrimp',0,'planned',1,'basic','draft',true,90,6),
 ('bake-bread','cooking','Bake Bread',0,'planned',2,'basic','draft',true,150,10),
 ('cook-specialty-stew','cooking','Cook Specialty Stew',10,'planned',3,'intermediate','draft',true,300,22),
 ('prepare-harvest-meal','cooking','Prepare a Harvest Meal',20,'planned',4,'intermediate','draft',true,420,28),
 ('prepare-royal-banquet','cooking','Prepare a Royal Banquet',50,'planned',5,'advanced','draft',true,1800,100)
on conflict(id) do update set skill_id=excluded.skill_id,name=excluded.name,required_level=excluded.required_level,status=excluded.status,sort_order=excluded.sort_order,activity_tier=excluded.activity_tier,balance_status=excluded.balance_status,rune_requirements_configured=excluded.rune_requirements_configured,duration_seconds=excluded.duration_seconds,xp_reward=excluded.xp_reward;
insert into public.skill_activity_runes(activity_id,rune_id,quantity) values
 ('precision-trout','air',1),
 ('precision-trout','water',1),
 ('preserve-seafood','water',2),
 ('preserve-seafood','mind',1),
 ('soulfin-expedition','water',2),
 ('soulfin-expedition','nature',1),
 ('soulfin-expedition','soul',1),
 ('irrigate-berries','water',1),
 ('irrigate-berries','mind',1),
 ('greenhouse-harvest','water',2),
 ('greenhouse-harvest','nature',1),
 ('cultivate-moonherb','nature',2),
 ('cultivate-moonherb','water',2),
 ('cultivate-moonherb','blood',1),
 ('refine-gemstones','air',1),
 ('refine-gemstones','water',1),
 ('extract-iron','air',1),
 ('extract-iron','fire',1),
 ('mine-shadow-crystal','nature',2),
 ('mine-shadow-crystal','death',2),
 ('mine-shadow-crystal','air',1),
 ('smith-steel-bars','fire',2),
 ('forge-steel-pickaxe','fire',2),
 ('forge-steel-pickaxe','air',1),
 ('forge-legendary-armor','blood',3),
 ('forge-legendary-armor','fire',2),
 ('forge-legendary-armor','nature',1),
 ('craft-precision-tools','mind',1),
 ('craft-precision-tools','air',1),
 ('craft-light-pendant','air',1),
 ('craft-light-pendant','mind',2),
 ('craft-prestige-amulet','soul',5),
 ('craft-prestige-amulet','mind',2),
 ('craft-prestige-amulet','nature',1),
 ('enchant-swift-charm','air',1),
 ('enchant-swift-charm','mind',1),
 ('enchant-water-ward','water',2),
 ('enchant-water-ward','mind',1),
 ('seasonal-enchantment','soul',10),
 ('seasonal-enchantment','blood',1),
 ('seasonal-enchantment','mind',2),
 ('cook-specialty-stew','fire',1),
 ('cook-specialty-stew','water',1),
 ('prepare-harvest-meal','mind',1),
 ('prepare-harvest-meal','water',1),
 ('prepare-harvest-meal','fire',1),
 ('prepare-harvest-meal','nature',1),
 ('prepare-royal-banquet','fire',2),
 ('prepare-royal-banquet','nature',2),
 ('prepare-royal-banquet','water',1),
 ('prepare-royal-banquet','blood',1);
insert into public.skill_activity_materials(activity_id,material_id,quantity) values
 ('precision-trout','wheat',1),
 ('preserve-seafood','raw-shrimp',3),
 ('soulfin-expedition','wheat',2),
 ('soulfin-expedition','practice-charm',1),
 ('irrigate-berries','herbs',1),
 ('greenhouse-harvest','herbs',2),
 ('cultivate-moonherb','herbs',3),
 ('cultivate-moonherb','berries',2),
 ('refine-gemstones','rough-stone',3),
 ('extract-iron','rough-stone',2),
 ('mine-shadow-crystal','rough-stone',5),
 ('mine-shadow-crystal','steel-pickaxe',1),
 ('smelt-copper','copper-ore',2),
 ('smelt-copper','coal',1),
 ('forge-copper-tools','copper-bar',2),
 ('smith-steel-bars','iron-ore',2),
 ('smith-steel-bars','coal',1),
 ('forge-steel-pickaxe','steel-bar',2),
 ('forge-steel-pickaxe','copper-tools',1),
 ('forge-legendary-armor','steel-bar',6),
 ('forge-legendary-armor','shadow-crystal',1),
 ('weave-cloth','plant-fiber',3),
 ('craft-copper-brooch','copper-bar',1),
 ('craft-precision-tools','copper-tools',1),
 ('craft-precision-tools','polished-gem',1),
 ('craft-light-pendant','copper-bar',1),
 ('craft-light-pendant','polished-gem',1),
 ('craft-light-pendant','cloth',1),
 ('craft-prestige-amulet','polished-gem',3),
 ('craft-prestige-amulet','shadow-crystal',1),
 ('craft-prestige-amulet','cloth',2),
 ('study-inscriptions','plant-fiber',2),
 ('study-inscriptions','copper-ore',1),
 ('prepare-practice-charm','copper-brooch',1),
 ('prepare-practice-charm','plant-fiber',1),
 ('enchant-swift-charm','practice-charm',1),
 ('enchant-water-ward','copper-brooch',1),
 ('enchant-water-ward','polished-gem',1),
 ('seasonal-enchantment','prestige-amulet',1),
 ('seasonal-enchantment','moonherb',2),
 ('cook-shrimp','raw-shrimp',2),
 ('cook-shrimp','coal',1),
 ('bake-bread','wheat',3),
 ('bake-bread','coal',1),
 ('cook-specialty-stew','raw-trout',1),
 ('cook-specialty-stew','vegetables',2),
 ('prepare-harvest-meal','preserved-seafood',1),
 ('prepare-harvest-meal','berries',2),
 ('prepare-royal-banquet','raw-trout',2),
 ('prepare-royal-banquet','moonherb',1),
 ('prepare-royal-banquet','vegetables',4);
insert into public.skill_activity_outputs(activity_id,material_id,quantity) values
 ('catch-shrimp','raw-shrimp',2),
 ('catch-sardines','raw-sardine',2),
 ('precision-trout','raw-trout',2),
 ('preserve-seafood','preserved-seafood',2),
 ('soulfin-expedition','raw-soulfin',1),
 ('grow-wheat','wheat',3),
 ('grow-wheat','plant-fiber',1),
 ('gather-herbs','herbs',2),
 ('gather-herbs','plant-fiber',1),
 ('irrigate-berries','berries',3),
 ('greenhouse-harvest','vegetables',3),
 ('cultivate-moonherb','moonherb',1),
 ('mine-copper','copper-ore',2),
 ('mine-copper','rough-stone',1),
 ('gather-coal','coal',2),
 ('gather-coal','rough-stone',1),
 ('refine-gemstones','polished-gem',1),
 ('extract-iron','iron-ore',2),
 ('mine-shadow-crystal','shadow-crystal',1),
 ('smelt-copper','copper-bar',1),
 ('forge-copper-tools','copper-tools',1),
 ('smith-steel-bars','steel-bar',1),
 ('forge-steel-pickaxe','steel-pickaxe',1),
 ('forge-legendary-armor','legendary-armor',1),
 ('weave-cloth','cloth',1),
 ('craft-copper-brooch','copper-brooch',1),
 ('craft-precision-tools','precision-tools',1),
 ('craft-light-pendant','lightweight-pendant',1),
 ('craft-prestige-amulet','prestige-amulet',1),
 ('study-inscriptions','practice-scroll',1),
 ('prepare-practice-charm','practice-charm',1),
 ('enchant-swift-charm','swift-charm',1),
 ('enchant-water-ward','water-ward',1),
 ('seasonal-enchantment','seasonal-amulet',1),
 ('cook-shrimp','grilled-shrimp',2),
 ('bake-bread','bread',2),
 ('cook-specialty-stew','specialty-stew',2),
 ('prepare-harvest-meal','harvest-meal',2),
 ('prepare-royal-banquet','royal-banquet',1);

-- Validate related rows at transaction end so a recipe and its inputs can be edited atomically.
create function public.validate_skill_recipe(p_id text) returns void language plpgsql security invoker set search_path='' as $$
declare a public.skill_activities; rune_count int; rare_count int; unset_count int;
begin
 select * into a from public.skill_activities where id=p_id for update;
 if not found then return;end if;
 select count(*),count(*) filter(where r.rarity in('rare','epic','legendary')),count(*) filter(where c.quantity is null) into rune_count,rare_count,unset_count
  from public.skill_activity_runes c join public.rune_types r on r.id=c.rune_id where c.activity_id=p_id;
 if a.activity_tier='basic' and rune_count>0 then raise exception 'Basic activities cannot consume runes' using errcode='23514';end if;
 if a.activity_tier='intermediate' and rare_count>0 then raise exception 'Intermediate activities use only common or uncommon runes' using errcode='23514';end if;
 if exists(select 1 from public.skill_activity_runes c where c.activity_id=p_id and not exists(select 1 from public.skill_rune_usage u where u.skill_id=a.skill_id and u.rune_id=c.rune_id)) then raise exception 'Rune is outside this profession usage mapping' using errcode='23514';end if;
 if a.rune_requirements_configured then
  if a.activity_tier is null or unset_count>0 then raise exception 'Configured recipe requires an explicit tier and rune quantities' using errcode='23514';end if;
  if a.activity_tier='intermediate' and rune_count=0 then raise exception 'Intermediate rune costs are not configured' using errcode='23514';end if;
  if a.activity_tier='advanced' and (rare_count=0 or rune_count<2 or not exists(select 1 from public.skill_activity_materials where activity_id=p_id)) then raise exception 'Advanced recipes require rare runes, a rune combination, and materials' using errcode='23514';end if;
 end if;
 if a.status='available' and not exists(select 1 from public.skill_activity_outputs where activity_id=p_id) then raise exception 'Available recipe requires an output' using errcode='23514';end if;
end $$;
create function public.check_skill_recipe_change() returns trigger language plpgsql security invoker set search_path='' as $$
declare ids text[]='{}';r text;old_row jsonb;new_row jsonb;
begin
 if TG_OP<>'INSERT' then old_row=to_jsonb(OLD);end if;
 if TG_OP<>'DELETE' then new_row=to_jsonb(NEW);end if;
 if TG_TABLE_NAME='skill_activities' then ids=array[old_row->>'id',new_row->>'id'];
 elsif TG_TABLE_NAME='rune_types' then
  select array_agg(distinct activity_id order by activity_id) into ids from public.skill_activity_runes where rune_id in(old_row->>'id',new_row->>'id');
 elsif TG_TABLE_NAME='skill_rune_usage' then
  select array_agg(distinct a.id order by a.id) into ids from public.skill_activities a join public.skill_activity_runes c on c.activity_id=a.id where (a.skill_id,c.rune_id) in((old_row->>'skill_id',old_row->>'rune_id'),(new_row->>'skill_id',new_row->>'rune_id'));
 else ids=array[old_row->>'activity_id',new_row->>'activity_id'];end if;
 for r in select distinct x from unnest(ids) x where x is not null order by x loop perform public.validate_skill_recipe(r);end loop;
 return null;
end $$;
revoke all on function public.validate_skill_recipe(text),public.check_skill_recipe_change() from public,anon,authenticated;
grant execute on function public.validate_skill_recipe(text),public.check_skill_recipe_change() to service_role;
create constraint trigger skill_activities_recipe_check after insert or update or delete on public.skill_activities deferrable initially deferred for each row execute function public.check_skill_recipe_change();
create constraint trigger skill_activity_runes_recipe_check after insert or update or delete on public.skill_activity_runes deferrable initially deferred for each row execute function public.check_skill_recipe_change();
create constraint trigger skill_activity_materials_recipe_check after insert or update or delete on public.skill_activity_materials deferrable initially deferred for each row execute function public.check_skill_recipe_change();
create constraint trigger skill_activity_outputs_recipe_check after insert or update or delete on public.skill_activity_outputs deferrable initially deferred for each row execute function public.check_skill_recipe_change();
create constraint trigger rune_types_recipe_check after insert or update or delete on public.rune_types deferrable initially deferred for each row execute function public.check_skill_recipe_change();
create constraint trigger skill_rune_usage_recipe_check after insert or update or delete on public.skill_rune_usage deferrable initially deferred for each row execute function public.check_skill_recipe_change();
select public.validate_skill_recipe(id) from public.skill_activities;
create or replace function public.get_player_skills(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.player_skills(user_id,skill_id) select p_user_id,id from public.skill_types order by sort_order on conflict do nothing;
 insert into public.player_skill_specializations(user_id,skill_id,specialization_id)
  select p_user_id,skill_id,id from public.skill_specializations order by skill_id,sort_order on conflict do nothing;
 select jsonb_build_object('economy',jsonb_build_object('runesAccountBound',true,'runeProductionPerHour',10),'skills',jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'level',p.level,'xp',p.xp,'completedActivities',p.completed_activities,'trainingSeconds',p.training_seconds,'updatedAt',p.updated_at,
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
revoke all on function public.get_player_skills(uuid) from public,anon,authenticated;
grant execute on function public.get_player_skills(uuid) to service_role;
