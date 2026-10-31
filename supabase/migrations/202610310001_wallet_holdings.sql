begin;

create table public.player_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  network text not null default 'solana:mainnet' check (network = 'solana:mainnet'),
  mint text not null default 'HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ' check (mint = 'HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ'),
  link_version uuid not null default gen_random_uuid(),
  verified_at timestamptz,
  linked_at timestamptz,
  unlinked_at timestamptz,
  gp_raw_balance text check (gp_raw_balance ~ '^[0-9]{1,38}$'),
  last_slot bigint check (last_slot >= 0),
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  scan_error text check (scan_error in ('rpc_unavailable','stale_slot')),
  holding_since timestamptz,
  daily_scanned_on date,
  daily_attempt_on date,
  daily_attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index player_wallets_one_owner on public.player_wallets(wallet_address) where wallet_address is not null;

create table public.wallet_gp_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_wallets(user_id) on delete cascade,
  link_version uuid not null,
  wallet_address text not null,
  gp_raw_balance text not null check (gp_raw_balance ~ '^[0-9]{1,38}$'),
  slot bigint not null check (slot >= 0),
  checked_at timestamptz not null,
  source text not null check (source in ('profile','daily')),
  unique(user_id, link_version, slot)
);
create index wallet_gp_snapshots_history on public.wallet_gp_snapshots(user_id, checked_at desc);
create table public.wallet_verification_proofs (
  proof_hash text primary key check (proof_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  consumed_at timestamptz not null default now()
);
create table public.gp_scan_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','partial','failed')),
  successful integer not null default 0,
  failed integer not null default 0,
  remaining integer,
  error_code text
);

alter table public.player_wallets enable row level security;
alter table public.wallet_gp_snapshots enable row level security;
alter table public.wallet_verification_proofs enable row level security;
alter table public.gp_scan_runs enable row level security;
revoke all on public.player_wallets, public.wallet_gp_snapshots, public.wallet_verification_proofs, public.gp_scan_runs from public, anon, authenticated;
grant select on public.player_wallets, public.wallet_gp_snapshots to authenticated;
grant all on public.player_wallets, public.wallet_gp_snapshots, public.wallet_verification_proofs, public.gp_scan_runs to service_role;
create policy wallet_owner_read on public.player_wallets for select to authenticated using ((select auth.uid()) = user_id);
create policy snapshot_owner_read on public.wallet_gp_snapshots for select to authenticated using ((select auth.uid()) = user_id);

-- Only the server calls this after verifying the Ed25519 signature or a legacy HMAC receipt.
create function public.link_player_wallet(p_user_id uuid, p_address text, p_verified_at timestamptz, p_proof_hash text, p_legacy boolean default false)
returns public.player_wallets language plpgsql security definer set search_path = '' as $$
declare w public.player_wallets;
begin
  -- A tombstone prevents old user-editable metadata from restoring an unlinked wallet.
  insert into public.player_wallets(user_id) values(p_user_id) on conflict do nothing;
  select * into w from public.player_wallets where user_id=p_user_id for update;
  if p_legacy and (w.verified_at is not null or w.unlinked_at is not null) then return w; end if;
  insert into public.wallet_verification_proofs(proof_hash,user_id) values(p_proof_hash,p_user_id);
  if w.wallet_address is distinct from p_address then
    update public.player_wallets set wallet_address=p_address, link_version=gen_random_uuid(),
      verified_at=p_verified_at, linked_at=clock_timestamp(), unlinked_at=null,
      gp_raw_balance=null, last_slot=null, last_success_at=null, last_attempt_at=null,
      scan_error=null, holding_since=null, daily_scanned_on=null, daily_attempt_on=null,
      daily_attempts=0, lease_token=null, lease_until=null, updated_at=clock_timestamp()
    where user_id=p_user_id returning * into w;
  else
    update public.player_wallets set verified_at=p_verified_at, updated_at=clock_timestamp()
    where user_id=p_user_id returning * into w;
  end if;
  return w;
end $$;

create function public.unlink_player_wallet(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.player_wallets(user_id,unlinked_at) values(p_user_id,clock_timestamp()) on conflict(user_id) do update
  set wallet_address=null, link_version=gen_random_uuid(), unlinked_at=clock_timestamp(),
    gp_raw_balance=null, last_slot=null, last_success_at=null, last_attempt_at=null,
    scan_error=null, holding_since=null, lease_token=null, lease_until=null, updated_at=clock_timestamp();
end $$;

-- Balance and holding transitions are atomic with history insertion. The link version
-- rejects scans that finish after the player changes or removes their wallet.
create function public.record_gp_scan(p_user_id uuid, p_version uuid, p_raw text, p_slot bigint,
  p_checked_at timestamptz, p_error text default null, p_lease uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w public.player_wallets; period_start timestamptz;
begin
  select * into w from public.player_wallets where user_id=p_user_id for update;
  if not found or w.wallet_address is null or w.link_version <> p_version
    or (p_lease is not null and (w.lease_token is distinct from p_lease or w.lease_until < clock_timestamp())) then
    return jsonb_build_object('applied',false,'wallet',to_jsonb(w));
  end if;
  if p_checked_at > clock_timestamp() + interval '30 seconds' or p_checked_at < w.linked_at then
    raise exception 'Invalid scan timestamp';
  end if;
  -- Late responses cannot overwrite a newer observation or newer failure.
  if p_checked_at <= w.last_attempt_at then
    if p_lease is not null then
      update public.player_wallets set lease_token=null,lease_until=null where user_id=p_user_id;
    end if;
    return jsonb_build_object('applied',false,'wallet',to_jsonb(w));
  end if;
  if p_error is null and (p_raw is null or p_raw !~ '^[0-9]{1,38}$' or p_slot is null or p_slot < 0) then
    raise exception 'Invalid GP observation';
  end if;
  if p_error is null and p_slot = w.last_slot and
     (w.last_success_at at time zone 'UTC')::date = (p_checked_at at time zone 'UTC')::date then
    -- The same block is not a new observation and cannot extend holding time.
    update public.player_wallets set
      daily_scanned_on=case when p_lease is not null then (p_checked_at at time zone 'UTC')::date else daily_scanned_on end,
      lease_token=case when p_lease is not null then null else lease_token end,
      lease_until=case when p_lease is not null then null else lease_until end
    where user_id=p_user_id returning * into w;
    return jsonb_build_object('applied',true,'wallet',to_jsonb(w));
  end if;
  if p_error is null and p_slot <= w.last_slot then p_error := 'stale_slot'; end if;
  if p_error is not null then
    update public.player_wallets set last_attempt_at=p_checked_at,scan_error=p_error,
      lease_token=case when p_lease is not null then null else lease_token end,
      lease_until=case when p_lease is not null then null else lease_until end,updated_at=clock_timestamp()
    where user_id=p_user_id returning * into w;
    return jsonb_build_object('applied',false,'wallet',to_jsonb(w));
  end if;
  period_start := case
    when p_raw::numeric = 0 then null
    when w.holding_since is null or w.last_success_at < p_checked_at - interval '48 hours' then p_checked_at
    else w.holding_since end;
  insert into public.wallet_gp_snapshots(user_id,link_version,wallet_address,gp_raw_balance,slot,checked_at,source)
    values(p_user_id,p_version,w.wallet_address,p_raw,p_slot,p_checked_at,case when p_lease is null then 'profile' else 'daily' end)
    on conflict(user_id,link_version,slot) do nothing;
  update public.player_wallets set gp_raw_balance=p_raw,last_slot=p_slot,last_success_at=p_checked_at,
    last_attempt_at=p_checked_at,scan_error=null,holding_since=period_start,
    daily_scanned_on=case when p_lease is not null then (p_checked_at at time zone 'UTC')::date else daily_scanned_on end,
    lease_token=case when p_lease is not null then null else lease_token end,
    lease_until=case when p_lease is not null then null else lease_until end,updated_at=clock_timestamp()
  where user_id=p_user_id returning * into w;
  return jsonb_build_object('applied',true,'wallet',to_jsonb(w));
end $$;

-- SKIP LOCKED and short leases make overlapping cron invocations safe. Failed wallets
-- get two attempts per UTC day; successful scans are not repeated by a duplicate cron.
create function public.claim_daily_gp_scans(p_limit integer default 5)
returns setof public.player_wallets language sql security definer set search_path = '' as $$
  with eligible as (
    select user_id from public.player_wallets
    where wallet_address is not null
      and (daily_scanned_on is null or daily_scanned_on < (clock_timestamp() at time zone 'UTC')::date)
      and (daily_attempt_on is distinct from (clock_timestamp() at time zone 'UTC')::date or daily_attempts < 2)
      and (lease_until is null or lease_until < clock_timestamp())
    order by last_success_at nulls first, user_id
    for update skip locked limit greatest(1,least(p_limit,20))
  )
  update public.player_wallets w set lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '5 minutes',
    daily_attempts=case when w.daily_attempt_on=(clock_timestamp() at time zone 'UTC')::date then w.daily_attempts+1 else 1 end,
    daily_attempt_on=(clock_timestamp() at time zone 'UTC')::date
  from eligible where w.user_id=eligible.user_id returning w.*;
$$;

-- Migrate only cryptographically valid legacy links, checked by the application.
-- This function returns only candidate IDs and receipts, never other Auth data.
create function public.legacy_wallet_candidates(p_after uuid default '00000000-0000-0000-0000-000000000000',p_limit integer default 100)
returns table(user_id uuid,receipt text) language sql security definer set search_path = '' as $$
  select u.id,u.raw_user_meta_data->>'runelana_wallet_receipt' from auth.users u
  where u.id>p_after and u.raw_user_meta_data->>'runelana_wallet_receipt' is not null
    and not exists(select 1 from public.player_wallets w where w.user_id=u.id)
  order by u.id limit greatest(1,least(p_limit,100));
$$;

create function public.remaining_daily_gp_scans()
returns bigint language sql security definer set search_path = '' as $$
 select count(*) from public.player_wallets where wallet_address is not null
 and (daily_scanned_on is null or daily_scanned_on < (clock_timestamp() at time zone 'UTC')::date);
$$;
revoke all on function public.remaining_daily_gp_scans() from public,anon,authenticated;
grant execute on function public.remaining_daily_gp_scans() to service_role;

revoke all on function public.link_player_wallet(uuid,text,timestamptz,text,boolean),
 public.unlink_player_wallet(uuid), public.record_gp_scan(uuid,uuid,text,bigint,timestamptz,text,uuid),
 public.claim_daily_gp_scans(integer), public.legacy_wallet_candidates(uuid,integer) from public,anon,authenticated;
grant execute on function public.link_player_wallet(uuid,text,timestamptz,text,boolean),
 public.unlink_player_wallet(uuid), public.record_gp_scan(uuid,uuid,text,bigint,timestamptz,text,uuid),
 public.claim_daily_gp_scans(integer), public.legacy_wallet_candidates(uuid,integer) to service_role;

comment on column public.player_wallets.holding_since is 'First positive observation in the current sampled period. Zero resets it. Gaps over 48h restart it. Daily scans cannot prove continuous ownership.';
notify pgrst, 'reload schema';
commit;
