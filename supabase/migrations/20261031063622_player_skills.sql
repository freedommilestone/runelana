-- Profession progress is separate from adventure XP and holding-based status.
create table public.skill_types (
 id text primary key, name text not null unique, sort_order int not null unique
);
insert into public.skill_types values
 ('fishing','Fishing',1),('farming','Farming',2),('mining','Mining',3),
 ('smithing','Smithing',4),('crafting','Crafting',5),('enchanting','Enchanting',6),('cooking','Cooking',7);

create table public.skill_specializations (
 skill_id text not null references public.skill_types(id),
 id text not null, name text not null, required_level int not null default 30 check(required_level between 0 and 99),
 sort_order int not null, primary key(skill_id,id), unique(skill_id,sort_order)
);
insert into public.skill_specializations(skill_id,id,name,sort_order) values
 ('fishing','river-angler','River Angler',1),('fishing','deep-sea-fisher','Deep Sea Fisher',2),('fishing','legendary-angler','Legendary Angler',3),
 ('farming','market-gardener','Market Gardener',1),('farming','herbalist','Herbalist',2),('farming','master-cultivator','Master Cultivator',3),
 ('mining','ore-prospector','Ore Prospector',1),('mining','gem-seeker','Gem Seeker',2),('mining','deep-miner','Deep Miner',3),
 ('smithing','toolsmith','Toolsmith',1),('smithing','armorsmith','Armorsmith',2),('smithing','master-weaponsmith','Master Weaponsmith',3),
 ('crafting','artisan','Artisan',1),('crafting','jeweler','Jeweler',2),('crafting','master-craftsman','Master Craftsman',3),
 ('enchanting','rune-scholar','Rune Scholar',1),('enchanting','spellweaver','Spellweaver',2),('enchanting','master-enchanter','Master Enchanter',3),
 ('cooking','everyday-chef','Everyday Chef',1),('cooking','artisan-chef','Artisan Chef',2),('cooking','master-chef','Master Chef',3);

create table public.player_skills (
 user_id uuid not null references auth.users(id) on delete cascade,
 skill_id text not null references public.skill_types(id),
 level int not null default 0 check(level between 0 and 99),
 xp bigint not null default 0 check(xp between 0 and 9007199254740991),
 completed_activities bigint not null default 0 check(completed_activities between 0 and 9007199254740991),
 training_seconds bigint not null default 0 check(training_seconds between 0 and 9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(user_id,skill_id)
);
create index player_skills_type on public.player_skills(skill_id);
create table public.player_skill_specializations (
 user_id uuid not null, skill_id text not null, specialization_id text not null,
 level int not null default 0 check(level between 0 and 99),
 xp bigint not null default 0 check(xp between 0 and 9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(user_id,skill_id,specialization_id),
 foreign key(user_id,skill_id) references public.player_skills(user_id,skill_id) on delete cascade,
 foreign key(skill_id,specialization_id) references public.skill_specializations(skill_id,id)
);
create index player_specialization_type on public.player_skill_specializations(skill_id,specialization_id);

create table public.skill_activities (
 id text primary key, skill_id text not null references public.skill_types(id), name text not null,
 required_level int not null default 0 check(required_level between 0 and 99),
 status text not null default 'planned' check(status in('planned','available','disabled')),
 sort_order int not null default 1
);
create index skill_activities_type on public.skill_activities(skill_id,sort_order);
insert into public.skill_activities(id,skill_id,name) values
 ('catch-fish','fishing','Catch Fish'),('grow-crops','farming','Grow Crops'),('mine-ore','mining','Mine Ore'),
 ('smith-steel-bars','smithing','Smith Steel Bars'),('craft-items','crafting','Craft Items'),
 ('enchant-equipment','enchanting','Enchant Equipment'),('cook-meals','cooking','Cook Meals');
create table public.skill_activity_runes (
 activity_id text not null references public.skill_activities(id) on delete cascade,
 rune_id text not null references public.rune_types(id),
 quantity int check(quantity>0), primary key(activity_id,rune_id)
);
create index skill_activity_rune_type on public.skill_activity_runes(rune_id);
comment on column public.skill_activity_runes.quantity is 'NULL means cost is not configured, never zero or free. Activity execution must remain disabled until costs and server-side training are implemented.';
insert into public.skill_activity_runes(activity_id,rune_id) values
 ('catch-fish','water'),('grow-crops','nature'),('mine-ore','air'),('smith-steel-bars','fire'),
 ('craft-items','mind'),('enchant-equipment','soul'),('cook-meals','fire');

alter table public.skill_types enable row level security;
alter table public.skill_specializations enable row level security;
alter table public.player_skills enable row level security;
alter table public.player_skill_specializations enable row level security;
alter table public.skill_activities enable row level security;
alter table public.skill_activity_runes enable row level security;
revoke all on public.skill_types,public.skill_specializations,public.player_skills,public.player_skill_specializations,public.skill_activities,public.skill_activity_runes from public,anon,authenticated;
grant select on public.skill_types,public.skill_specializations,public.player_skills,public.player_skill_specializations,public.skill_activities,public.skill_activity_runes to authenticated;
grant all on public.skill_types,public.skill_specializations,public.player_skills,public.player_skill_specializations,public.skill_activities,public.skill_activity_runes to service_role;
create policy skill_catalog_read on public.skill_types for select to authenticated using(true);
create policy skill_paths_read on public.skill_specializations for select to authenticated using(true);
create policy skill_activities_read on public.skill_activities for select to authenticated using(true);
create policy skill_requirements_read on public.skill_activity_runes for select to authenticated using(true);
create policy own_skills on public.player_skills for select to authenticated using((select auth.uid())=user_id);
create policy own_skill_paths on public.player_skill_specializations for select to authenticated using((select auth.uid())=user_id);

create function public.touch_skill_progress() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=clock_timestamp();return new;end $$;
revoke all on function public.touch_skill_progress() from public,anon,authenticated;
grant execute on function public.touch_skill_progress() to service_role;
create trigger player_skills_updated before update on public.player_skills for each row execute function public.touch_skill_progress();
create trigger player_skill_paths_updated before update on public.player_skill_specializations for each row execute function public.touch_skill_progress();

-- Seed existing accounts at zero. These new records replace only UI sample values.
insert into public.player_skills(user_id,skill_id) select u.id,s.id from auth.users u cross join public.skill_types s;
insert into public.player_skill_specializations(user_id,skill_id,specialization_id)
 select p.user_id,s.skill_id,s.id from public.player_skills p join public.skill_specializations s on s.skill_id=p.skill_id;

-- Called only by the authenticated Next.js server. Lazily initializes future accounts.
-- ON CONFLICT DO NOTHING preserves earned progress on every subsequent read.
create function public.get_player_skills(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.player_skills(user_id,skill_id) select p_user_id,id from public.skill_types order by sort_order on conflict do nothing;
 insert into public.player_skill_specializations(user_id,skill_id,specialization_id)
  select p_user_id,skill_id,id from public.skill_specializations order by skill_id,sort_order on conflict do nothing;
 select jsonb_build_object('skills',jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'level',p.level,'xp',p.xp,'completedActivities',p.completed_activities,'trainingSeconds',p.training_seconds,'updatedAt',p.updated_at,
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
