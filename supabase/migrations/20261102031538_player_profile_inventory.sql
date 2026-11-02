-- Account-saved prototype progress. These balances are never wallet GP or typed runes.
create table public.equipment_types (
 id text primary key, name text not null unique, category text not null,
 supply_cost integer not null check(supply_cost>0)
);
insert into public.equipment_types values
 ('cape','Infernal Cape','Capes',80),('helm','Abyssal Helm','Hats',120),
 ('blade','Dragon Blade','Weapons',180),('armor','Royal Platebody','Armor',240);
create table public.player_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 title text not null default 'Adventurer',
 crafting_supplies numeric not null default 120 check(crafting_supplies between 0 and 1000000000000),
 adventure_xp numeric not null default 0 check(adventure_xp between 0 and 1000000000000),
 game_gold bigint not null default 0 check(game_gold between 0 and 1000000000000),
 steel_bars bigint not null default 0 check(steel_bars between 0 and 1000000000000),
 services_completed bigint not null default 0 check(services_completed>=0),
 equipped_item_id text,
 activity_type text check(activity_type in ('smith','service')),
 activity_started_at timestamptz,
 activity_ends_at timestamptz,
 revision integer not null default 0 check(revision>=0),
 legacy_import jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((activity_type is null and activity_started_at is null and activity_ends_at is null)
  or (activity_type is not null and activity_started_at is not null and activity_ends_at>activity_started_at))
);
create table public.player_equipment (
 user_id uuid not null references public.player_profiles(user_id) on delete cascade,
 item_id text not null references public.equipment_types(id),
 acquired_at timestamptz not null default now(),
 source text not null check(source in ('legacy','shop')),
 primary key(user_id,item_id)
);
alter table public.player_profiles add constraint equipped_item_owned
 foreign key(user_id,equipped_item_id) references public.player_equipment(user_id,item_id) deferrable initially deferred;
create index player_equipment_item_idx on public.player_equipment(item_id);
create index player_profiles_equipped_idx on public.player_profiles(user_id,equipped_item_id);
alter table public.equipment_types enable row level security;
alter table public.player_profiles enable row level security;
alter table public.player_equipment enable row level security;
revoke all on public.equipment_types,public.player_profiles,public.player_equipment from public,anon,authenticated;
grant select on public.equipment_types,public.player_profiles,public.player_equipment to authenticated;
grant select,insert,update,delete on public.equipment_types,public.player_profiles,public.player_equipment to service_role;
create policy equipment_catalog_read on public.equipment_types for select to authenticated using(true);
create policy profile_owner_read on public.player_profiles for select to authenticated using((select auth.uid())=user_id);
create policy equipment_owner_read on public.player_equipment for select to authenticated using((select auth.uid())=user_id);

-- Invoker functions run only with the trusted API's service role, never browser credentials.
create function public.player_profile_snapshot(p_user_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select jsonb_build_object('state',jsonb_build_object(
  'gp',p.game_gold,'steelBars',p.steel_bars,'runes',p.crafting_supplies,'xp',p.adventure_xp,
  'started',false,'last',0,'path','gather','title',p.title,
  'owned',coalesce((select jsonb_agg(e.item_id order by e.item_id) from public.player_equipment e where e.user_id=p.user_id),'[]'::jsonb),
  'equipped',coalesce((select t.name from public.equipment_types t where t.id=p.equipped_item_id),'Traveler''s cloak'),
  'servicesCompleted',p.services_completed,
  'activity',case when p.activity_type is null then null else jsonb_build_object('type',p.activity_type,'startedAt',extract(epoch from p.activity_started_at)*1000,'endsAt',extract(epoch from p.activity_ends_at)*1000) end),
  'revision',p.revision,'updatedAt',p.updated_at,'imported',p.legacy_import is not null,
  'serverNow',extract(epoch from clock_timestamp())*1000)
 from public.player_profiles p where p.user_id=p_user_id
$$;
create function public.update_player_profile(p_user_id uuid,p_action text,p_revision integer default null,p_item text default null,p_legacy jsonb default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 p public.player_profiles; item public.equipment_types; old jsonb; legacy_id text;
 ts timestamptz:=clock_timestamp(); imported boolean:=false; problem text;
begin
 if p_action='initialize' then
  -- First device wins; later devices cannot import over an existing account save.
  insert into public.player_profiles(user_id) values(p_user_id) on conflict do nothing;
  imported:=found;
 end if;
 select * into p from public.player_profiles where user_id=p_user_id for update;
 if not found then return jsonb_build_object('error','Profile is not initialized.','status',409); end if;
 if p_action='initialize' and imported and p_legacy is not null then
  -- Bounded, sanitized legacy prototype data is retained for provenance. It never grants
  -- wallet holdings, character status, typed runes, profession XP or tradable resources.
  old:=p_legacy;
  if jsonb_typeof(old)<>'object' then raise exception 'Invalid legacy save'; end if;
  p.crafting_supplies:=coalesce((old->>'runes')::numeric,120);
  p.adventure_xp:=coalesce((old->>'xp')::numeric,0);
  p.game_gold:=coalesce((old->>'gp')::bigint,0);
  p.steel_bars:=coalesce((old->>'steelBars')::bigint,0);
  if jsonb_typeof(old->'owned')='array' then
   for legacy_id in select jsonb_array_elements_text(old->'owned') loop
    insert into public.player_equipment(user_id,item_id,source)
     select p_user_id,t.id,'legacy' from public.equipment_types t where t.id=legacy_id on conflict do nothing;
   end loop;
  end if;
  select t.id into p.equipped_item_id from public.equipment_types t join public.player_equipment e on e.item_id=t.id and e.user_id=p_user_id where t.name=old->>'equipped';
  if old->'activity'->>'type' in ('smith','service') then
   p.activity_type:=old->'activity'->>'type';
   p.activity_started_at:=to_timestamp((old->'activity'->>'startedAt')::numeric/1000);
   p.activity_ends_at:=to_timestamp((old->'activity'->>'endsAt')::numeric/1000);
  end if;
  p.legacy_import:=old;
 elsif p_action<>'initialize' then
  if p_revision is null or p_revision<>p.revision then
   return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error','Your profile changed on another device. Latest progress loaded; please try again.','status',409);
  end if;
  case p_action
  when 'buy' then
   select * into item from public.equipment_types where id=p_item;
   if not found then problem:='Unknown equipment.';
   else
    if not exists(select 1 from public.player_equipment where user_id=p_user_id and item_id=p_item) then
     if p.crafting_supplies<item.supply_cost then problem:='Not enough crafting supplies.';
     else
      p.crafting_supplies:=p.crafting_supplies-item.supply_cost;
      insert into public.player_equipment(user_id,item_id,source) values(p_user_id,p_item,'shop');
     end if;
    end if;
    if problem is null then p.equipped_item_id:=p_item; end if;
   end if;
  when 'equip' then
   if p_item is null then p.equipped_item_id:=null;
   elsif exists(select 1 from public.player_equipment where user_id=p_user_id and item_id=p_item) then p.equipped_item_id:=p_item;
   else problem:='You do not own this equipment.'; end if;
  when 'start' then
   if p.activity_type is not null then problem:='Complete or cancel your current activity first.';
   elsif p_item is null or p_item not in ('smith','service') then problem:='Unknown activity.';
   elsif p_item='smith' and p.crafting_supplies<20 then problem:='You need 20 crafting supplies.';
   else
    p.activity_type:=p_item;p.activity_started_at:=ts;
    p.activity_ends_at:=ts+case when p_item='smith' then interval '120 seconds' else interval '90 seconds' end;
    if p_item='smith' then p.crafting_supplies:=p.crafting_supplies-20; end if;
   end if;
  when 'cancel' then
   if p.activity_type is null then problem:='No activity to cancel.';
   else
    if p.activity_type='smith' then p.crafting_supplies:=p.crafting_supplies+20; end if;
    p.activity_type:=null;p.activity_started_at:=null;p.activity_ends_at:=null;
   end if;
  when 'collect' then
   if p.activity_type is null then problem:='No activity to collect.';
   elsif ts<p.activity_ends_at then problem:='This activity is still running.';
   else
    if p.activity_type='smith' then p.steel_bars:=p.steel_bars+10;p.adventure_xp:=p.adventure_xp+10;
    else p.game_gold:=p.game_gold+40;p.adventure_xp:=p.adventure_xp+5;p.services_completed:=p.services_completed+1; end if;
    p.activity_type:=null;p.activity_started_at:=null;p.activity_ends_at:=null;
   end if;
  else problem:='Unknown profile action.';
  end case;
 end if;
 if problem is not null then return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error',problem,'status',400); end if;
 if p_action<>'initialize' or imported then
  update public.player_profiles set crafting_supplies=p.crafting_supplies,adventure_xp=p.adventure_xp,
   game_gold=p.game_gold,steel_bars=p.steel_bars,services_completed=p.services_completed,
   equipped_item_id=p.equipped_item_id,activity_type=p.activity_type,activity_started_at=p.activity_started_at,
   activity_ends_at=p.activity_ends_at,legacy_import=p.legacy_import,revision=p.revision+1,updated_at=ts
   where user_id=p_user_id;
 end if;
 return public.player_profile_snapshot(p_user_id);
end $$;
revoke all on function public.player_profile_snapshot(uuid),public.update_player_profile(uuid,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.player_profile_snapshot(uuid),public.update_player_profile(uuid,text,integer,text,jsonb) to service_role;
comment on table public.player_profiles is 'Account-saved prototype game state. Not on-chain GP, typed rune balances, or profession XP. Legacy imports are untrusted historical browser progress.';
comment on column public.player_profiles.services_completed is 'Services collected since cloud tracking began; old browser service counts were never recorded.';
