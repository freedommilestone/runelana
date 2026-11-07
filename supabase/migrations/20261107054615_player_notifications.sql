-- Server-written character events. Read receipts acknowledge only displayed IDs.
create table public.player_notifications (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('activity_completed','items_obtained','level_up','rune_unlocked')),
 title text not null, details jsonb not null default '{}', event_key text,
 occurred_at timestamptz not null default clock_timestamp(), read_at timestamptz,
 unique(user_id,event_key)
);
create index player_notifications_feed on public.player_notifications(user_id,id desc);
create index player_notifications_unread on public.player_notifications(user_id,id) where read_at is null;
alter table public.player_notifications enable row level security;
revoke all on public.player_notifications from public,anon,authenticated;
grant select on public.player_notifications to authenticated;
grant all on public.player_notifications to service_role;
grant usage,select on sequence public.player_notifications_id_seq to service_role;
create policy player_notifications_owner on public.player_notifications for select to authenticated using ((select auth.uid())=user_id);

create function public.notify_skill_job() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.player_notifications(user_id,kind,title,details,event_key,occurred_at)
 values(new.user_id,'activity_completed',coalesce(new.recipe->>'name','Activity')||' completed',
 jsonb_build_object('skill',new.skill_id,'batches',new.quantity,'xp',coalesce((new.recipe->>'xpReward')::bigint,0)*new.quantity,
 'items',coalesce((select jsonb_agg(jsonb_build_object('name',o->>'name','quantity',(o->>'quantity')::bigint*new.quantity)) from jsonb_array_elements(new.recipe->'outputs') o),'[]'::jsonb),
 'gameGold',coalesce((new.recipe->>'gameGold')::bigint,0)),
 'job:'||new.id,new.resolved_at) on conflict(user_id,event_key) do nothing;
 return new;
end $$;
create trigger notify_completed_job after update of status on public.player_skill_jobs for each row when(old.status='running' and new.status='collected') execute function public.notify_skill_job();

create function public.notify_player_level() returns trigger language plpgsql security invoker set search_path='' as $$
declare label text;
begin
 if tg_table_name='player_skill_specializations' then
  select name into label from public.skill_specializations where skill_id=new.skill_id and id=new.specialization_id;
 elsif tg_table_name='player_combat_xp' then
  select name into label from public.combat_disciplines where id=new.discipline_id;
 else select name into label from public.skill_types where id=new.skill_id;
 end if;
 insert into public.player_notifications(user_id,kind,title,details,occurred_at)
 values(new.user_id,'level_up',coalesce(label,'Skill')||' level up!',jsonb_build_object('fromLevel',old.level,'level',new.level,'xp',new.xp),new.updated_at);
 return new;
end $$;
-- AFTER triggers observe the XP-derived level, including changes to XP alone.
create trigger notify_skill_level after update on public.player_skills for each row when(new.level>old.level) execute function public.notify_player_level();
create trigger notify_branch_level after update on public.player_skill_specializations for each row when(new.level>old.level) execute function public.notify_player_level();
create trigger notify_combat_level after update on public.player_combat_xp for each row when(new.level>old.level) execute function public.notify_player_level();

create function public.notify_equipment_received() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.player_notifications(user_id,kind,title,details,occurred_at)
 select new.user_id,'items_obtained','Equipment obtained',jsonb_build_object('items',jsonb_build_array(jsonb_build_object('name',name,'quantity',1))),new.acquired_at from public.equipment_types where id=new.item_id;
 return new;
end $$;
create trigger notify_equipment_received after insert on public.player_equipment for each row execute function public.notify_equipment_received();

create function public.notify_starter_kit_received() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.player_notifications(user_id,kind,title,details,event_key,occurred_at)
 values(new.user_id,'items_obtained','Beginner starter kit received',jsonb_build_object('message','Your beginner equipment, supplies and 50 Air Runes are ready in your inventories.'),'starter-kit',new.granted_at)
 on conflict(user_id,event_key) do nothing;
 return new;
end $$;
create trigger notify_starter_kit_received after insert on public.player_starter_kit_grants for each row execute function public.notify_starter_kit_received();

-- Remember the highest announced holding level without changing production rules.
alter table public.player_rune_production add column notified_holding_level integer not null default 0;
alter function public.sync_player_runes(uuid) rename to sync_player_runes_before_notifications;
create function public.sync_player_runes(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; previous_level integer; next_level integer;
begin
 result:=public.sync_player_runes_before_notifications(p_user_id);
 next_level:=coalesce((result->>'characterLevel')::integer,0);
 select notified_holding_level into previous_level from public.player_rune_production where user_id=p_user_id for update;
 if next_level>previous_level then
  update public.player_rune_production set notified_holding_level=next_level where user_id=p_user_id;
  insert into public.player_notifications(user_id,kind,title,details,event_key)
  values(p_user_id,'rune_unlocked','Holding level '||next_level||' reached',
   jsonb_build_object('fromLevel',previous_level,'level',next_level,'message','Rune production unlocked: '||(select string_agg(name||' Rune',', ' order by sort_order) from public.rune_types where character_level>previous_level and character_level<=next_level)),
   'holding-level:'||next_level) on conflict(user_id,event_key) do nothing;
 end if;
 return result;
end $$;

create function public.player_notification_feed(p_user_id uuid,p_before bigint default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare events jsonb; next_id bigint;
begin
 perform public.settle_player_skill_queue(p_user_id);
 select coalesce(jsonb_agg(jsonb_build_object('id',id::text,'kind',kind,'title',title,'details',details,'occurredAt',occurred_at,'readAt',read_at) order by id desc),'[]'),min(id)
 into events,next_id from (select * from public.player_notifications where user_id=p_user_id and (p_before is null or id<p_before) order by id desc limit 30) n;
 return jsonb_build_object('events',events,'unreadCount',(select count(*) from public.player_notifications where user_id=p_user_id and read_at is null),
 'nextCursor',case when exists(select 1 from public.player_notifications where user_id=p_user_id and id<next_id) then next_id::text else null end);
end $$;
create function public.read_player_notifications(p_user_id uuid,p_ids bigint[]) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(cardinality(p_ids),0)>30 then raise exception 'Too many notification IDs';end if;
 update public.player_notifications set read_at=clock_timestamp() where user_id=p_user_id and id=any(p_ids) and read_at is null;
 return jsonb_build_object('unreadCount',(select count(*) from public.player_notifications where user_id=p_user_id and read_at is null));
end $$;
alter function public.player_profile_snapshot(uuid) rename to player_profile_snapshot_before_notifications;
create function public.player_profile_snapshot(p_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 result:=public.player_profile_snapshot_before_notifications(p_user_id);
 return result||jsonb_build_object('notificationUnread',(select count(*) from public.player_notifications where user_id=p_user_id and read_at is null));
end $$;

-- Recent actual completions are useful on first opening; no invented level history.
insert into public.player_notifications(user_id,kind,title,details,event_key,occurred_at)
select j.user_id,'activity_completed',coalesce(j.recipe->>'name','Activity')||' completed',
 jsonb_build_object('skill',j.skill_id,'batches',j.quantity,'xp',coalesce((j.recipe->>'xpReward')::bigint,0)*j.quantity,
 'items',coalesce((select jsonb_agg(jsonb_build_object('name',o->>'name','quantity',(o->>'quantity')::bigint*j.quantity)) from jsonb_array_elements(j.recipe->'outputs') o),'[]'::jsonb),'gameGold',coalesce((j.recipe->>'gameGold')::bigint,0)),
 'job:'||j.id,j.resolved_at
from public.player_skill_jobs j where status='collected' and resolved_at>now()-interval '7 days'
on conflict(user_id,event_key) do nothing;

do $$declare f regprocedure;begin
 for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in (
 'notify_skill_job','notify_player_level','notify_equipment_received','notify_starter_kit_received',
 'sync_player_runes','sync_player_runes_before_notifications','player_notification_feed','read_player_notifications','player_profile_snapshot','player_profile_snapshot_before_notifications') loop
 execute format('revoke all on function %s from public,anon,authenticated',f);
 execute format('grant execute on function %s to service_role',f);
 end loop;
end $$;
