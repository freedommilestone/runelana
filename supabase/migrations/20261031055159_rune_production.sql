create table public.rune_types(id text primary key, name text not null, character_level int not null, holding_days int not null unique, sort_order int not null unique);
insert into public.rune_types values ('air','Air',1,1,1),('mind','Mind',5,7,2),('water','Water',10,14,3),('fire','Fire',20,30,4),('nature','Nature',35,60,5),('death','Death',50,120,6),('blood','Blood',75,240,7),('soul','Soul',100,365,8);
create function public.valid_rune_allocation(a jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare k text; v jsonb; n int=0; total int=0;
begin
 if a is null or jsonb_typeof(a)<>'object' then return false; end if;
 for k,v in select * from jsonb_each(a) loop
  if not(k=any(array['air','mind','water','fire','nature','death','blood','soul'])) or jsonb_typeof(v)<>'number' or v::text !~ '^(0|[1-9]|10)$' then return false; end if;
  n=n+1;total=total+(v::text)::int;
 end loop;
 return n=8 and total in(0,10);
end $$;
create table public.player_rune_production(
 user_id uuid primary key references auth.users(id) on delete cascade,
 link_version uuid,
 allocations jsonb not null default '{"air":0,"mind":0,"water":0,"fire":0,"nature":0,"death":0,"blood":0,"soul":0}' check(public.valid_rune_allocation(allocations)),
 last_accrued_at timestamptz not null default now(), revision bigint not null default 0, created_at timestamptz not null default now()
);
create index rune_production_due on public.player_rune_production(last_accrued_at);
-- One tick is one microsecond at a rate of one rune/hour: 3,600,000,000 ticks = one rune.
create table public.player_rune_inventory(
 user_id uuid not null references public.player_rune_production(user_id) on delete cascade,
 rune_id text not null references public.rune_types(id), balance_ticks numeric(38,0) not null default 0 check(balance_ticks>=0), primary key(user_id,rune_id)
);
create index rune_inventory_type on public.player_rune_inventory(rune_id);
create table public.rune_allocation_events(
 id bigint generated always as identity primary key,user_id uuid not null references public.player_rune_production(user_id) on delete cascade,
 allocations jsonb not null,reason text not null,created_at timestamptz not null default now()
);
create index rune_events_player on public.rune_allocation_events(user_id,created_at desc);
alter table public.rune_types enable row level security;
alter table public.player_rune_production enable row level security;
alter table public.player_rune_inventory enable row level security;
alter table public.rune_allocation_events enable row level security;
revoke all on public.rune_types,public.player_rune_production,public.player_rune_inventory,public.rune_allocation_events from public,anon,authenticated;
grant select on public.rune_types,public.player_rune_production,public.player_rune_inventory,public.rune_allocation_events to authenticated;
grant all on public.rune_types,public.player_rune_production,public.player_rune_inventory,public.rune_allocation_events to service_role;
grant usage,select on sequence public.rune_allocation_events_id_seq to service_role;
create policy rune_catalog_read on public.rune_types for select to authenticated using(true);
create policy own_production on public.player_rune_production for select to authenticated using((select auth.uid())=user_id);
create policy own_runes on public.player_rune_inventory for select to authenticated using((select auth.uid())=user_id);
create policy own_allocations on public.rune_allocation_events for select to authenticated using((select auth.uid())=user_id);

create function public.settle_player_runes(p_user_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare p public.player_rune_production; t timestamptz; elapsed numeric;
begin
 select * into p from public.player_rune_production where user_id=p_user_id for update;
 if not found then return;end if;
 t=clock_timestamp();
 elapsed=greatest(0,floor(extract(epoch from(t-p.last_accrued_at))*1000000));
 insert into public.player_rune_inventory(user_id,rune_id,balance_ticks)
 select p_user_id,r.id,elapsed*(p.allocations->>r.id)::int from public.rune_types r
 on conflict(user_id,rune_id) do update set balance_ticks=public.player_rune_inventory.balance_ticks+excluded.balance_ticks;
 update public.player_rune_production set last_accrued_at=greatest(t,last_accrued_at) where user_id=p_user_id;
end $$;
create function public.sync_player_runes(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare w public.player_wallets; p public.player_rune_production; days int=0; a jsonb; unlocked jsonb; inv jsonb; level int=0;
begin
 -- Wallet -> production lock order also used by verification/history triggers.
 select * into w from public.player_wallets where user_id=p_user_id for update;
 insert into public.player_rune_production(user_id) values(p_user_id) on conflict do nothing;
 select * into p from public.player_rune_production where user_id=p_user_id for update;
 perform public.settle_player_runes(p_user_id);
 if w.wallet_address is not null then
  select coalesce((h.summary->>'longestDays')::int,0) into days from public.wallet_gp_history h where h.user_id=p_user_id and h.link_version=w.link_version;
 end if;
 days=coalesce(days,0);
 select coalesce(jsonb_agg(r.id order by r.sort_order),'[]'),coalesce(max(r.character_level),0) into unlocked,level from public.rune_types r where r.holding_days<=days;
 a=p.allocations;
 if p.link_version is distinct from w.link_version or exists(select 1 from public.rune_types r where (a->>r.id)::int>0 and r.holding_days>days) or not exists(select 1 from jsonb_each_text(a) v where v.value::int>0) then
  select jsonb_object_agg(r.id,case when r.id='air' and days>=1 then 10 else 0 end) into a from public.rune_types r;
 end if;
 if a is distinct from p.allocations or p.link_version is distinct from w.link_version then
  update public.player_rune_production set allocations=a,link_version=w.link_version,revision=revision+1 where user_id=p_user_id;
  insert into public.rune_allocation_events(user_id,allocations,reason) values(p_user_id,a,'eligibility');
 end if;
 select * into p from public.player_rune_production where user_id=p_user_id;
 select jsonb_object_agg(i.rune_id,i.balance_ticks::text) into inv from public.player_rune_inventory i where i.user_id=p_user_id;
 return jsonb_build_object('capacity',10,'allocations',p.allocations,'revision',p.revision,'inventoryTicks',inv,'accruedAt',p.last_accrued_at,'longestDays',days,'characterLevel',level,'unlocked',unlocked,'active',days>=1,'walletVerified',w.wallet_address is not null);
end $$;
create function public.allocate_player_runes(p_user_id uuid,p_allocations jsonb,p_revision bigint) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s jsonb;
begin
 s=public.sync_player_runes(p_user_id);
 if not public.valid_rune_allocation(p_allocations) then return jsonb_build_object('error','Invalid allocation.','status',400);end if;
 if (select sum(value::int) from jsonb_each_text(p_allocations))<>10 then return jsonb_build_object('error','Allocate exactly 10 whole runes per hour.','status',400);end if;
 if not(s->>'active')::boolean then return jsonb_build_object('error','Verify a wallet with at least one completed GP holding day.','status',403);end if;
 if exists(select 1 from jsonb_each_text(p_allocations) a where a.value::int>0 and not(s->'unlocked' ? a.key)) then return jsonb_build_object('error','That rune is still locked.','status',403);end if;
 if p_allocations=s->'allocations' then return s;end if;
 if p_revision is distinct from(s->>'revision')::bigint then return jsonb_build_object('error','Allocation changed in another window. Reset to the saved allocation and try again.','status',409);end if;
 update public.player_rune_production set allocations=p_allocations,revision=revision+1 where user_id=p_user_id;
 insert into public.rune_allocation_events(user_id,allocations,reason) values(p_user_id,p_allocations,'player');
 return public.sync_player_runes(p_user_id);
end $$;
create function public.rune_wallet_changed() returns trigger language plpgsql security invoker set search_path='' as $$
begin perform public.sync_player_runes(new.user_id);return new;end $$;
create trigger sync_runes_on_wallet_change after update of link_version on public.player_wallets for each row when(old.link_version is distinct from new.link_version) execute function public.rune_wallet_changed();
create function public.rune_history_changed() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.summary is null then return new;end if;
 if tg_op='UPDATE' and old.summary is not distinct from new.summary then return new;end if;
 perform public.sync_player_runes(new.user_id);return new;
end $$;
create trigger sync_runes_on_history after insert or update of summary on public.wallet_gp_history for each row execute function public.rune_history_changed();
create function public.settle_rune_batch(p_limit int default 200) returns int language plpgsql security invoker set search_path='' as $$
declare uid uuid; n int=0;
begin
 for uid in select user_id from public.player_rune_production where last_accrued_at<statement_timestamp()-interval '1 minute' order by last_accrued_at limit least(greatest(p_limit,1),200) loop
  perform public.sync_player_runes(uid);n=n+1;
 end loop;return n;
end $$;
revoke all on function public.valid_rune_allocation(jsonb),public.settle_player_runes(uuid),public.sync_player_runes(uuid),public.allocate_player_runes(uuid,jsonb,bigint),public.rune_wallet_changed(),public.rune_history_changed(),public.settle_rune_batch(int) from public,anon,authenticated;
grant execute on function public.valid_rune_allocation(jsonb),public.settle_player_runes(uuid),public.sync_player_runes(uuid),public.allocate_player_runes(uuid,jsonb,bigint),public.rune_wallet_changed(),public.rune_history_changed(),public.settle_rune_batch(int) to service_role;
-- Enroll existing verified holders at feature activation, without retroactive rewards.
select public.sync_player_runes(w.user_id) from public.player_wallets w where w.wallet_address is not null;
