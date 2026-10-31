create table public.wallet_gp_history (
  user_id uuid primary key references public.player_wallets(user_id) on delete cascade,
  link_version uuid not null,
  status text not null default 'pending' check(status in ('pending','complete','error')),
  checkpoint jsonb,
  target jsonb,
  cursor text,
  summary jsonb,
  completed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  error_code text check(error_code in ('provider_unavailable','history_incomplete')),
  updated_at timestamptz not null default now()
);
alter table public.wallet_gp_history enable row level security;
revoke all on public.wallet_gp_history from anon, authenticated;
grant select on public.wallet_gp_history to authenticated;
grant all on public.wallet_gp_history to service_role;
create policy own_current_gp_history on public.wallet_gp_history for select to authenticated
using ((select auth.uid())=user_id and exists(select 1 from public.player_wallets w where w.user_id=wallet_gp_history.user_id and w.link_version=wallet_gp_history.link_version and w.wallet_address is not null));

create function public.claim_gp_history(p_user_id uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare w public.player_wallets; h public.wallet_gp_history;
begin
  select pw.* into w from public.player_wallets pw left join public.wallet_gp_history gh on gh.user_id=pw.user_id
  where pw.wallet_address is not null and (p_user_id is null or pw.user_id=p_user_id)
    and (gh.user_id is null or gh.link_version<>pw.link_version or
      ((gh.lease_until is null or gh.lease_until<now()) and gh.next_attempt_at<=now()))
  order by gh.updated_at nulls first, pw.user_id for update of pw skip locked limit 1;
  if not found then return null; end if;
  insert into public.wallet_gp_history(user_id,link_version) values(w.user_id,w.link_version) on conflict(user_id) do nothing;
  select * into h from public.wallet_gp_history where user_id=w.user_id for update;
  if h.link_version<>w.link_version then
    update public.wallet_gp_history set link_version=w.link_version,status='pending',checkpoint=null,target=null,cursor=null,summary=null,completed_at=null,error_code=null where user_id=w.user_id;
  end if;
  update public.wallet_gp_history set lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now()
    where user_id=w.user_id returning * into h;
  return to_jsonb(h)||jsonb_build_object('wallet_address',w.wallet_address);
end $$;

create function public.save_gp_history(p_user_id uuid,p_version uuid,p_lease uuid,p_checkpoint jsonb,p_target jsonb,p_cursor text,p_summary jsonb,p_error text,p_release boolean) returns boolean
language plpgsql security invoker set search_path='' as $$
declare w public.player_wallets; h public.wallet_gp_history;
begin
  select * into w from public.player_wallets where user_id=p_user_id for update;
  if not found or w.wallet_address is null or w.link_version<>p_version then return false; end if;
  select * into h from public.wallet_gp_history where user_id=p_user_id for update;
  if not found or h.link_version<>p_version or h.lease_token is distinct from p_lease or h.lease_until<now() then return false; end if;
  update public.wallet_gp_history set checkpoint=case when p_error is null then p_checkpoint else checkpoint end,
    target=case when p_error is null then p_target else target end,cursor=case when p_error is null then p_cursor else cursor end,
    summary=coalesce(p_summary,summary), completed_at=case when p_summary is not null then now() else completed_at end,
    status=case when p_error is not null then 'error' when p_summary is not null then 'complete' else 'pending' end,
    error_code=p_error,updated_at=now(),
    next_attempt_at=now()+case when p_error is not null then interval '1 minute' when p_summary is not null then interval '6 hours' else interval '0 seconds' end,
    lease_token=case when p_release then null else lease_token end,
    lease_until=case when p_release then null else now()+interval '2 minutes' end
  where user_id=p_user_id;
  return true;
end $$;
revoke all on function public.claim_gp_history(uuid) from public,anon,authenticated;
revoke all on function public.save_gp_history(uuid,uuid,uuid,jsonb,jsonb,text,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_gp_history(uuid) to service_role;
grant execute on function public.save_gp_history(uuid,uuid,uuid,jsonb,jsonb,text,jsonb,text,boolean) to service_role;

create function public.remaining_gp_history() returns bigint language sql security invoker set search_path='' as $$
  select count(*) from public.player_wallets w left join public.wallet_gp_history h on h.user_id=w.user_id
  where w.wallet_address is not null and (h.user_id is null or h.link_version<>w.link_version or h.status<>'complete' or h.completed_at<now()-interval '36 hours')
$$;
revoke all on function public.remaining_gp_history() from public,anon,authenticated;
grant execute on function public.remaining_gp_history() to service_role;
