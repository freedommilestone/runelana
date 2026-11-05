-- Beginner Starter Kit V1: one audited grant per character, independent of wallet eligibility.
create table public.starter_item_types(
 id text primary key, name text not null unique,
 kind text not null check(kind in('profession_tool','combat_equipment','starter_supply')),
 grant_quantity integer not null check(grant_quantity>0), requirement text not null,
 reusable boolean not null, notes text not null,
 storage text not null check(storage in('tools','inventory','runes')),
 equipment_slot text check(equipment_slot in('weapon','shield','body','boots')),
 unique(id,equipment_slot),
 check((kind='combat_equipment')=(equipment_slot is not null))
);
comment on table public.starter_item_types is 'Beginner Starter Kit Master V1. All entries account-bound, nontradable and nondroppable. Reusable gear has unlimited durability. Food effect remains pending.';
insert into public.starter_item_types(id,name,kind,grant_quantity,requirement,reusable,notes,storage,equipment_slot) values
('small-fishing-net','Small Fishing Net','profession_tool',1,'Fishing 1',true,'Beginner net catches, including Shrimp','tools',null),
('wooden-rake','Wooden Rake','profession_tool',1,'Farming 1',true,'Prepare soil and start basic crops','tools',null),
('bronze-pickaxe','Bronze Pickaxe','profession_tool',1,'Mining 1',true,'Copper, Tin, and beginner deposits','tools',null),
('basic-smithing-hammer','Basic Smithing Hammer','profession_tool',1,'Smithing 1',true,'Starter metalworking and basic bars','tools',null),
('basic-crafting-toolkit','Basic Crafting Toolkit','profession_tool',1,'Crafting 1',true,'Ropes, lines, and simple components','tools',null),
('cooking-pot','Cooking Pot','profession_tool',1,'Cooking 1',true,'Basic meals and ingredient preparation','tools',null),
('apprentice-enchanting-focus','Apprentice Enchanting Focus','profession_tool',1,'Enchanting 1',true,'Beginner gear enchantments when materials and runes are available','tools',null),
('bronze-sword','Bronze Sword','combat_equipment',1,'Attack 1',true,'Basic melee weapon','inventory','weapon'),
('wooden-shield','Wooden Shield','combat_equipment',1,'Defense 1',true,'Basic protection','inventory','shield'),
('leather-body','Leather Body','combat_equipment',1,'Defense 1',true,'Starter torso armor','inventory','body'),
('leather-boots','Leather Boots','combat_equipment',1,'Defense 1',true,'Starter footwear','inventory','boots'),
('basic-bait','Basic Bait','starter_supply',20,'None',false,'Beginner rod fishing','inventory',null),
('wheat-seeds','Wheat Seeds','starter_supply',10,'None',false,'First farming harvests','inventory',null),
('potato-seeds','Potato Seeds','starter_supply',10,'None',false,'Additional farming crop','inventory',null),
('beginner-food','Beginner Food','starter_supply',5,'None',false,'Shortens one eligible activity; exact meal/effect TBD','inventory',null),
('air-runes','Air Runes','starter_supply',50,'None',false,'Fuel eligible beginner recipes','runes',null);
create table public.player_starter_kit_grants(
 user_id uuid primary key references public.player_profiles(user_id) on delete cascade,
 kit_version text not null, granted_at timestamptz not null default now(), manifest jsonb not null
);
create table public.player_starter_items(
 user_id uuid not null references public.player_profiles(user_id) on delete cascade,
 item_id text not null references public.starter_item_types(id),
 quantity bigint not null check(quantity>=0 and quantity<=1000000000000),
 acquired_at timestamptz not null default now(), primary key(user_id,item_id)
);
create index starter_items_catalog_idx on public.player_starter_items(item_id);
create table public.player_starter_equipment_slots(
 user_id uuid not null, slot text not null, item_id text not null,
 primary key(user_id,slot), unique(user_id,item_id),
 foreign key(user_id,item_id) references public.player_starter_items(user_id,item_id) on delete cascade,
 foreign key(item_id,slot) references public.starter_item_types(id,equipment_slot)
);
create index starter_slots_catalog_idx on public.player_starter_equipment_slots(item_id,slot);
create function public.validate_starter_item() returns trigger language plpgsql security invoker set search_path='' as $$
declare t public.starter_item_types;
begin
 select * into t from public.starter_item_types where id=new.item_id;
 if t.storage='runes' or (t.reusable and new.quantity<>1) then raise exception 'Invalid starter item quantity or storage'; end if;
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.item_id<>old.item_id) then raise exception 'Starter items cannot be transferred'; end if;
 return new;
end $$;
create trigger validate_starter_item before insert or update on public.player_starter_items for each row execute function public.validate_starter_item();
alter table public.starter_item_types enable row level security;
revoke all on public.starter_item_types from public,anon,authenticated,service_role;
grant select on public.starter_item_types to authenticated,service_role;
create policy starter_catalog_read on public.starter_item_types for select to authenticated using(true);
alter table public.player_starter_kit_grants enable row level security;
revoke all on public.player_starter_kit_grants from public,anon,authenticated,service_role;
grant select on public.player_starter_kit_grants to authenticated;
grant select,insert,update,delete on public.player_starter_kit_grants to service_role;
create policy player_starter_kit_grants_owner_read on public.player_starter_kit_grants for select to authenticated using((select auth.uid())=user_id);
alter table public.player_starter_items enable row level security;
revoke all on public.player_starter_items from public,anon,authenticated,service_role;
grant select on public.player_starter_items to authenticated;
grant select,insert,update,delete on public.player_starter_items to service_role;
create policy player_starter_items_owner_read on public.player_starter_items for select to authenticated using((select auth.uid())=user_id);
alter table public.player_starter_equipment_slots enable row level security;
revoke all on public.player_starter_equipment_slots from public,anon,authenticated,service_role;
grant select on public.player_starter_equipment_slots to authenticated;
grant select,insert,update,delete on public.player_starter_equipment_slots to service_role;
create policy player_starter_equipment_slots_owner_read on public.player_starter_equipment_slots for select to authenticated using((select auth.uid())=user_id);
create function public.grant_player_starter_kit(p_user_id uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 -- Unique character key serializes retries. All stacks, rune credit and receipt commit together.
 insert into public.player_starter_kit_grants(user_id,kit_version,manifest)
 select p_user_id,'beginner-starter-kit-v1',jsonb_agg(jsonb_build_object('id',id,'quantity',grant_quantity,'storage',storage) order by id) from public.starter_item_types
 on conflict(user_id) do nothing;
 if not found then return false; end if;
 insert into public.player_starter_items(user_id,item_id,quantity)
 select p_user_id,id,grant_quantity from public.starter_item_types where storage<>'runes';
 insert into public.player_rune_production(user_id) values(p_user_id) on conflict do nothing;
 insert into public.player_rune_inventory(user_id,rune_id,balance_ticks) values(p_user_id,'air',180000000000)
 on conflict(user_id,rune_id) do update set balance_ticks=public.player_rune_inventory.balance_ticks+excluded.balance_ticks;
 return true;
end $$;
create function public.initialize_profile_starter_kit() returns trigger language plpgsql security invoker set search_path='' as $$
begin perform public.grant_player_starter_kit(new.user_id); return null; end $$;
create trigger initialize_profile_starter_kit after insert on public.player_profiles for each row execute function public.initialize_profile_starter_kit();
-- New accounts receive the documented kit; preserve existing prototype supplies and imports.
alter table public.player_profiles alter column crafting_supplies set default 0;
create or replace function public.player_profile_state_snapshot(p_user_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select jsonb_build_object('state',jsonb_build_object(
  'gp',p.game_gold,'steelBars',p.steel_bars,'runes',p.crafting_supplies,'xp',p.adventure_xp,
  'started',false,'last',0,'path','gather','title',p.title,
  'owned',coalesce((select jsonb_agg(e.item_id order by e.item_id) from public.player_equipment e where e.user_id=p.user_id),'[]'::jsonb),
  'equipped',coalesce((select t.name from public.equipment_types t where t.id=p.equipped_item_id),'Traveler''s cloak'),
  'starterKit',(select jsonb_build_object('version',g.kit_version,'grantedAt',g.granted_at) from public.player_starter_kit_grants g where g.user_id=p.user_id),
  'starterItems',coalesce((select jsonb_agg(jsonb_build_object('id',s.item_id,'quantity',s.quantity) order by s.item_id) from public.player_starter_items s where s.user_id=p.user_id and s.quantity>0),'[]'::jsonb),
  'equipmentSlots',coalesce((select jsonb_object_agg(s.slot,s.item_id) from public.player_starter_equipment_slots s where s.user_id=p.user_id),'{}'::jsonb),
  'servicesCompleted',p.services_completed,
  'activity',case when p.activity_type is null then null else jsonb_build_object('type',p.activity_type,'startedAt',extract(epoch from p.activity_started_at)*1000,'endsAt',extract(epoch from p.activity_ends_at)*1000) end),
  'revision',p.revision,'updatedAt',p.updated_at,'imported',p.legacy_import is not null,
  'serverNow',extract(epoch from clock_timestamp())*1000)
 from public.player_profiles p where p.user_id=p_user_id
$$;
create or replace function public.refresh_player_account_stats(p_user_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p public.player_profiles; w public.player_wallets; h public.wallet_gp_history; s public.player_account_stats;
 total_s bigint; current_s bigint; longest_s bigint; through_ts timestamptz; checked_ts timestamptz; status_text text:='unverified';
begin
 -- No auth/profile creation side effects, including during cascading account deletion.
 select * into p from public.player_profiles where user_id=p_user_id;
 if not found then return null; end if;
 insert into public.player_account_stats(user_id,services_tracked_since) values(p_user_id,p.created_at) on conflict do nothing;
 -- Serialize reconciliation for this account. Source reads happen after the lock.
 perform 1 from public.player_account_stats where user_id=p_user_id for update;
 select * into p from public.player_profiles where user_id=p_user_id;
 if not found then return null; end if;
 select * into w from public.player_wallets where user_id=p_user_id and wallet_address is not null and verified_at is not null;
 if found then
  status_text:='pending';
  select * into h from public.wallet_gp_history where user_id=p_user_id and link_version=w.link_version;
  if found then
   if h.status='error' then status_text:='error'; end if;
   -- Reject incomplete or malformed summaries; unknown is not zero.
   if h.summary->>'status'='complete' and h.completed_at is not null
    and h.summary->>'totalSeconds' ~ '^[0-9]{1,13}$' and h.summary->>'currentSeconds' ~ '^[0-9]{1,13}$'
    and h.summary->>'longestSeconds' ~ '^[0-9]{1,13}$' and h.summary->>'throughTime' ~ '^[0-9]{1,11}$'
    and h.summary->>'throughSlot' ~ '^[0-9]{1,16}$' then
    total_s:=(h.summary->>'totalSeconds')::bigint;current_s:=(h.summary->>'currentSeconds')::bigint;longest_s:=(h.summary->>'longestSeconds')::bigint;
    through_ts:=to_timestamp((h.summary->>'throughTime')::double precision);checked_ts:=h.completed_at;
    if current_s>longest_s or longest_s>total_s or through_ts>clock_timestamp()+interval '1 minute' or total_s>extract(epoch from through_ts) then
     total_s:=null;current_s:=null;longest_s:=null;through_ts:=null;checked_ts:=null;status_text:='error';
    else
     status_text:=case when h.status<>'complete' or checked_ts<clock_timestamp()-interval '36 hours' or through_ts<clock_timestamp()-interval '36 hours'
       or w.scan_error is not null or (w.last_slot>(h.summary->>'throughSlot')::bigint and w.gp_raw_balance is distinct from h.summary->>'rawBalance') then 'stale' else 'current' end;
    end if;
   end if;
  end if;
 end if;
 update public.player_account_stats set
  member_since=(select u.created_at from auth.users u where u.id=p_user_id),
  skills_trained=(select count(*) from public.player_skills where user_id=p_user_id and (xp>0 or completed_activities>0 or training_seconds>0)),
  skills_total=(select count(*) from public.skill_types),
  equipment_collected=(select count(*) from public.player_equipment where user_id=p_user_id)+(select count(*) from public.player_starter_items si join public.starter_item_types t on t.id=si.item_id where si.user_id=p_user_id and t.reusable and si.quantity>0),
  services_completed=p.services_completed,services_tracked_since=p.created_at,
  wallet_address=w.wallet_address,wallet_link_version=w.link_version,holding_status=status_text,
  total_holding_seconds=total_s,current_streak_seconds=current_s,longest_streak_seconds=longest_s,
  holding_verified_through=through_ts,holding_checked_at=checked_ts,updated_at=clock_timestamp()
 where user_id=p_user_id returning * into s;
 return jsonb_build_object('memberSince',s.member_since,'skillsTrained',s.skills_trained,'skillsTotal',s.skills_total,
  'equipmentCollected',s.equipment_collected,'servicesCompleted',s.services_completed,'servicesTrackedSince',s.services_tracked_since,
  'holding',jsonb_build_object('status',s.holding_status,'walletAddress',s.wallet_address,'linkVersion',s.wallet_link_version,
   'totalSeconds',s.total_holding_seconds,'currentSeconds',s.current_streak_seconds,'longestSeconds',s.longest_streak_seconds,
   'verifiedThrough',s.holding_verified_through,'checkedAt',s.holding_checked_at),'updatedAt',s.updated_at);
end $$;
comment on column public.player_account_stats.equipment_collected is 'Distinct owned prototype equipment, reusable starter tools and combat gear. Excludes consumable supplies, materials and runes.';
create trigger starter_items_account_stats after insert or update or delete on public.player_starter_items for each row execute function public.sync_player_account_stats();
create or replace function public.update_player_profile(p_user_id uuid,p_action text,p_revision integer default null,p_item text default null,p_legacy jsonb default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 p public.player_profiles; starter public.starter_item_types; item public.equipment_types; old jsonb; legacy_id text;
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
  when 'equip-starter', 'unequip-starter' then
   select t.* into starter from public.starter_item_types t join public.player_starter_items s on s.item_id=t.id
    where s.user_id=p_user_id and s.quantity=1 and t.id=p_item and t.kind='combat_equipment';
   if not found then problem:='You do not own this starter combat equipment.';
   elsif p_action='equip-starter' then
    -- All V1 equipment requires level 1, the minimum enforced combat level.
    insert into public.player_starter_equipment_slots(user_id,slot,item_id) values(p_user_id,starter.equipment_slot,p_item)
     on conflict(user_id,slot) do update set item_id=excluded.item_id;
   else
    delete from public.player_starter_equipment_slots where user_id=p_user_id and item_id=p_item;
   end if;
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
revoke all on function public.validate_starter_item() from public,anon,authenticated;
grant execute on function public.validate_starter_item() to service_role;
revoke all on function public.grant_player_starter_kit(uuid) from public,anon,authenticated;
grant execute on function public.grant_player_starter_kit(uuid) to service_role;
revoke all on function public.initialize_profile_starter_kit() from public,anon,authenticated;
grant execute on function public.initialize_profile_starter_kit() to service_role;
-- Existing characters receive the same kit once without changing their XP, wallet, gear or supplies.
select public.grant_player_starter_kit(user_id) from public.player_profiles;
select public.refresh_player_account_stats(user_id) from public.player_profiles;
