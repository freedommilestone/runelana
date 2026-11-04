-- Derived, player-owned statistics. Source records remain authoritative.
create table public.player_account_stats (
 user_id uuid primary key references public.player_profiles(user_id) on delete cascade,
 member_since timestamptz,
 skills_trained integer not null default 0 check(skills_trained>=0),
 skills_total integer not null default 0 check(skills_total>=skills_trained),
 equipment_collected integer not null default 0 check(equipment_collected>=0),
 services_completed bigint not null default 0 check(services_completed>=0),
 services_tracked_since timestamptz not null,
 wallet_address text,
 wallet_link_version uuid,
 holding_status text not null default 'unverified' check(holding_status in('unverified','pending','current','stale','error')),
 total_holding_seconds bigint check(total_holding_seconds>=0),
 current_streak_seconds bigint check(current_streak_seconds>=0),
 longest_streak_seconds bigint check(longest_streak_seconds>=0),
 holding_verified_through timestamptz,
 holding_checked_at timestamptz,
 updated_at timestamptz not null default now(),
 check((total_holding_seconds is null and current_streak_seconds is null and longest_streak_seconds is null and holding_verified_through is null and holding_checked_at is null)
 or(total_holding_seconds is not null and current_streak_seconds is not null and longest_streak_seconds is not null and holding_verified_through is not null and holding_checked_at is not null and current_streak_seconds<=longest_streak_seconds and longest_streak_seconds<=total_holding_seconds)),
 check(holding_status not in('current','stale') or total_holding_seconds is not null)
);
comment on table public.player_account_stats is 'Reconciled account statistics, refreshed by source changes and profile reads. No client-authored counters. Holding time is bounded by verified chain history; it is never extrapolated to wall-clock time.';
comment on column public.player_account_stats.skills_trained is 'Distinct professions with earned XP, completed activities or recorded training time. Default level 1 does not count.';
comment on column public.player_account_stats.equipment_collected is 'Distinct equipment currently in player_equipment, including imported legacy equipment. Excludes prototype Steel Bars, crafting supplies and account-bound runes. Not lifetime units.';
comment on column public.player_account_stats.services_tracked_since is 'Cloud profile creation. Historical browser service counts were never recorded and cannot be reconstructed.';
alter table public.player_account_stats enable row level security;
revoke all on public.player_account_stats from public,anon,authenticated,service_role;
grant select on public.player_account_stats to authenticated;
grant select,insert,update,delete on public.player_account_stats to service_role;
create policy account_stats_owner_read on public.player_account_stats for select to authenticated using((select auth.uid())=user_id);
-- The server can read only the Auth columns needed for the true account creation date.
grant usage on schema auth to service_role;
grant select(id,created_at) on auth.users to service_role;

create function public.refresh_player_account_stats(p_user_id uuid) returns jsonb
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
  equipment_collected=(select count(*) from public.player_equipment where user_id=p_user_id),
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
revoke all on function public.refresh_player_account_stats(uuid) from public,anon,authenticated;
grant execute on function public.refresh_player_account_stats(uuid) to service_role;

create function public.sync_player_account_stats() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' then perform public.refresh_player_account_stats(old.user_id);
 else
  if tg_op='UPDATE' and old.user_id is distinct from new.user_id then perform public.refresh_player_account_stats(old.user_id); end if;
  perform public.refresh_player_account_stats(new.user_id);
 end if;
 return null;
end $$;
revoke all on function public.sync_player_account_stats() from public,anon,authenticated;
grant execute on function public.sync_player_account_stats() to service_role;
create trigger profile_account_stats after insert or update on public.player_profiles for each row execute function public.sync_player_account_stats();
create trigger equipment_account_stats after insert or update or delete on public.player_equipment for each row execute function public.sync_player_account_stats();
create trigger skill_account_stats after insert or update of xp,completed_activities,training_seconds or delete on public.player_skills for each row execute function public.sync_player_account_stats();
create trigger wallet_account_stats after insert or update or delete on public.player_wallets for each row execute function public.sync_player_account_stats();
create trigger holding_account_stats after insert or update or delete on public.wallet_gp_history for each row execute function public.sync_player_account_stats();

-- Keep the established revision checks, rewards and atomic equipment actions intact.
create function public.player_profile_state_snapshot(p_user_id uuid) returns jsonb
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
revoke all on function public.player_profile_state_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.player_profile_state_snapshot(uuid) to service_role;
create or replace function public.player_profile_snapshot(p_user_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; stats jsonb;
begin
 stats:=public.refresh_player_account_stats(p_user_id);
 result:=public.player_profile_state_snapshot(p_user_id);
 if result is null then return null; end if;
 return result||jsonb_build_object('accountStats',stats);
end $$;
revoke all on function public.player_profile_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.player_profile_snapshot(uuid) to service_role;
select public.refresh_player_account_stats(user_id) from public.player_profiles;
