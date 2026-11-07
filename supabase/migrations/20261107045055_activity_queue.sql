-- One running task and a reorderable, resource-reserved queue per account.
-- Existing running jobs retain their saved timestamps, costs and rewards.
alter table public.player_skill_jobs
 drop constraint player_skill_jobs_status_check,
 drop constraint player_skill_jobs_check1,
 alter column skill_id drop not null,
 alter column started_at drop not null,
 alter column ends_at drop not null,
 add column queue_position integer,
 add column created_at timestamptz not null default now(),
 add column equipment_selections jsonb not null default '{}',
 add constraint skill_job_status check(status in('queued','running','collected','cancelled')),
 add constraint skill_job_resolution check((status in('queued','running'))=(resolved_at is null)),
 add constraint skill_job_schedule check(
  (status='queued' and started_at is null and ends_at is null and queue_position is not null and queue_position>0)
  or (status='running' and started_at is not null and ends_at>started_at and queue_position is null)
  or (status in('collected','cancelled') and queue_position is null));
create index player_skill_queue_order on public.player_skill_jobs(user_id,queue_position,id) where status='queued';
create index player_legacy_activity_due on public.player_profiles(activity_ends_at,user_id) where activity_type is not null;
create index player_skill_queue_due on public.player_skill_jobs(ends_at,user_id) where status='running';

alter function public.skill_recipe_for_execution(text) rename to skill_recipe_before_queue;
create function public.skill_recipe_for_execution(p_id text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select case p_id
 when 'prototype:smith' then jsonb_build_object('id',p_id,'kind','prototype','prototype','smith','skillId','smithing','name','Steel Bars','durationSeconds',120,'xpReward',10,'gameGold',0,'steelBars',10,'supplyCost',20,'outputs',jsonb_build_array(jsonb_build_object('name','Steel Bar','quantity',10)))
 when 'prototype:service' then jsonb_build_object('id',p_id,'kind','prototype','prototype','service','name','Merchant Service','durationSeconds',90,'xpReward',5,'gameGold',40,'steelBars',0,'supplyCost',0,'outputs','[]'::jsonb)
 else public.skill_recipe_before_queue(p_id) end
$$;

create function public.complete_player_skill_job(p_user_id uuid,p_job_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare job public.player_skill_jobs; output jsonb; amount bigint; ts timestamptz;
begin
 select * into job from public.player_skill_jobs where id=p_job_id and user_id=p_user_id and status='running' for update;
 if not found or job.ends_at>clock_timestamp() then return;end if;
 ts:=job.ends_at;
 if job.recipe->>'kind'='prototype' then
  update public.player_profiles set game_gold=game_gold+(job.recipe->>'gameGold')::bigint,
   steel_bars=steel_bars+(job.recipe->>'steelBars')::bigint,adventure_xp=adventure_xp+(job.recipe->>'xpReward')::bigint,
   services_completed=services_completed+case when job.recipe->>'prototype'='service' then 1 else 0 end where user_id=p_user_id;
 else
   for output in select value from jsonb_array_elements(job.recipe->'outputs') loop
    amount:=(output->>'quantity')::bigint*job.quantity;
    if amount is null or amount<=0 then raise exception 'Invalid saved output.';end if;
    insert into public.player_skill_inventory(user_id,item_name,skill_id,quantity,updated_at) values(p_user_id,output->>'name',job.skill_id,amount,ts)
    on conflict(user_id,item_name) do update set quantity=public.player_skill_inventory.quantity+excluded.quantity,updated_at=excluded.updated_at;
   end loop;
   update public.player_skills set xp=xp+(job.recipe->>'xpReward')::bigint*job.quantity,completed_activities=completed_activities+job.quantity,training_seconds=training_seconds+(job.recipe->>'durationSeconds')::bigint*job.quantity,updated_at=ts where user_id=p_user_id and skill_id=job.skill_id;
   if job.recipe->>'specializationId' is not null then
    update public.player_skill_specializations set xp=xp+coalesce((job.recipe->>'branchXpReward')::bigint,0)*job.quantity,updated_at=ts where user_id=p_user_id and skill_id=job.skill_id and specialization_id=job.recipe->>'specializationId';
   end if;

 end if;
 update public.player_skill_jobs set status='collected',resolved_at=ts where id=job.id;
end $$;

create function public.settle_player_skill_queue(p_user_id uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare profile public.player_profiles; job public.player_skill_jobs; next_start timestamptz; ts timestamptz; recipe jsonb; changed boolean:=false; completed integer:=0;
begin
 if not exists(select 1 from public.player_profiles where user_id=p_user_id) then return 0;end if;
 -- All queue and profile writers use wallet -> runes -> profile -> jobs/items -> stats.
 perform public.sync_player_runes(p_user_id);
 select * into profile from public.player_profiles where user_id=p_user_id for update;
 if not found then return 0;end if;
 ts:=clock_timestamp();next_start:=ts;
 -- Preserve any previously running browser prototype when upgrading/initializing.
 if profile.activity_type is not null then
  recipe:=public.skill_recipe_for_execution('prototype:'||profile.activity_type);
  insert into public.player_skill_jobs(user_id,skill_id,recipe_id,recipe,quantity,rune_reservation,material_reservation,started_at,ends_at)
   values(p_user_id,recipe->>'skillId',recipe->>'id',recipe,1,'[]',case when profile.activity_type='smith' then '[{"source":"prototype","id":"crafting-supplies","quantity":20}]'::jsonb else '[]'::jsonb end,profile.activity_started_at,profile.activity_ends_at);
  update public.player_profiles set activity_type=null,activity_started_at=null,activity_ends_at=null where user_id=p_user_id;
  changed:=true;
 end if;
 loop
  select * into job from public.player_skill_jobs where user_id=p_user_id and status='running' for update;
  if not found then
   select * into job from public.player_skill_jobs where user_id=p_user_id and status='queued' order by queue_position,id limit 1 for update;
   if not found then exit;end if;
   update public.player_skill_jobs set status='running',queue_position=null,started_at=next_start,
    ends_at=next_start+make_interval(secs=>(job.recipe->>'durationSeconds')::integer*job.quantity) where id=job.id returning * into job;
   changed:=true;
  end if;
  if job.ends_at>ts then exit;end if;
  next_start:=job.ends_at;
  perform public.complete_player_skill_job(p_user_id,job.id);
  completed:=completed+1;changed:=true;
 end loop;
 if changed then update public.player_profiles set revision=revision+1,updated_at=ts where user_id=p_user_id;end if;
 return completed;
end $$;

create function public.skill_job_summary(job public.player_skill_jobs) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('type','skill','id',job.id,'skillId',job.skill_id,'kind',coalesce(job.recipe->>'kind','skill'),
  'recipeId',job.recipe_id,'name',job.recipe->>'name','quantity',job.quantity,'outputs',job.recipe->'outputs',
  'xpReward',(job.recipe->>'xpReward')::bigint*job.quantity,'gameGold',coalesce((job.recipe->>'gameGold')::bigint,0),
  'durationSeconds',(job.recipe->>'durationSeconds')::integer*job.quantity,'status',job.status,'position',job.queue_position,
  'startedAt',extract(epoch from job.started_at)*1000,'endsAt',extract(epoch from job.ends_at)*1000,'completedAt',extract(epoch from job.resolved_at)*1000)
$$;
alter function public.player_profile_state_snapshot(uuid) rename to player_profile_state_before_queue;
create function public.player_profile_state_snapshot(p_user_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 result:=public.player_profile_state_before_queue(p_user_id);
 if result is null then return null;end if;
 result:=jsonb_set(result,'{state,activity}',coalesce((select public.skill_job_summary(j) from public.player_skill_jobs j where user_id=p_user_id and status='running'),'null'::jsonb));
 result:=jsonb_set(result,'{state,activityQueue}',coalesce((select jsonb_agg(public.skill_job_summary(j) order by queue_position,id) from public.player_skill_jobs j where user_id=p_user_id and status='queued'),'[]'));
 result:=jsonb_set(result,'{state,recentActivities}',coalesce((select jsonb_agg(public.skill_job_summary(j) order by resolved_at desc,id) from (select * from public.player_skill_jobs where user_id=p_user_id and status='collected' order by resolved_at desc,id limit 5) j),'[]'));
 return result||jsonb_build_object('queueAvailable',true,'queueLimit',20);
end $$;
create or replace function public.player_profile_snapshot(p_user_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; stats jsonb;
begin
 perform public.settle_player_skill_queue(p_user_id);
 stats:=public.refresh_player_account_stats(p_user_id);
 result:=public.player_profile_state_snapshot(p_user_id);
 if result is null then return null;end if;
 return result||jsonb_build_object('accountStats',stats,'combat',public.player_combat_snapshot(p_user_id));
end $$;

-- Replace the old signature instead of overloading PostgREST's RPC endpoint.
drop function public.execute_player_skill_job(uuid,text,integer,text,integer,integer,jsonb,boolean);
create function public.execute_player_skill_job(p_user_id uuid,p_action text,p_revision integer,p_recipe text default null,p_quantity integer default 1,p_time_limit integer default 3600,p_selections jsonb default '{}',p_confirmed boolean default false,p_job_id uuid default null,p_order uuid[] default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 profile public.player_profiles; job public.player_skill_jobs; recipe jsonb; rune jsonb; material jsonb; reserved jsonb;
 rune_costs jsonb:='[]'; material_costs jsonb:='[]'; equipment text; selected text; skill text; branch text;
 level_required int; current_level int; branch_level int; branch_entry int; seconds int; amount bigint; remaining bigint; take bigint; owned bigint; starter record;
 ts timestamptz; problem text; rune_state jsonb; target uuid; next_position integer; count_jobs integer; completed integer;
begin
 if p_action not in('start-skill','collect-skill','cancel-skill','reorder-skill') or p_action is null then raise exception 'Unknown skill action.';end if;
 if not exists(select 1 from public.player_profiles where user_id=p_user_id) then raise exception 'Your player profile is not initialized.';end if;
 rune_state:=public.sync_player_runes(p_user_id);
 select * into profile from public.player_profiles where user_id=p_user_id for update;
 if p_revision is null or p_revision<>profile.revision then
  return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error','Your queue changed. Latest progress loaded; please try again.','status',409);
 end if;
 select id into target from public.player_skill_jobs where user_id=p_user_id and status='running';
 target:=coalesce(p_job_id,target);
 completed:=public.settle_player_skill_queue(p_user_id);
 ts:=clock_timestamp();
 if p_action='start-skill' then
  select count(*) into count_jobs from public.player_skill_jobs where user_id=p_user_id and status in('running','queued');
  if count_jobs>=20 then raise exception 'Your queue is full (20 tasks). Remove a waiting task or let one finish.';end if;
  if p_quantity is null or p_quantity<1 or p_quantity>10000 or p_time_limit is null or p_time_limit not in(900,3600,14400,28800) then raise exception 'Choose a valid quantity and production time limit.';end if;
  if jsonb_typeof(p_selections) is distinct from 'object' then raise exception 'Choose valid equipment.';end if;
  recipe:=public.skill_recipe_for_execution(p_recipe);
  if recipe is null then raise exception 'This recipe is not available for production.';end if;
  skill:=recipe->>'skillId';branch:=recipe->>'specializationId';seconds:=(recipe->>'durationSeconds')::int;
  if seconds is null or seconds<=0 or seconds::bigint*p_quantity>p_time_limit then raise exception 'This quantity exceeds the selected production time limit.';end if;
  if coalesce((recipe->>'requiresConsumptionConfirmation')::boolean,false) and p_confirmed is distinct from true then raise exception 'Confirm consumption of the collectible ingredients before starting.';end if;
  if recipe->>'kind'='prototype' then
   if p_quantity<>1 then raise exception 'Prototype tasks use one batch.';end if;
   amount:=(recipe->>'supplyCost')::bigint;
   if amount>0 then
    update public.player_profiles set crafting_supplies=crafting_supplies-amount where user_id=p_user_id and crafting_supplies>=amount;
    if not found then raise exception 'Not enough crafting supplies.';end if;
    material_costs:=jsonb_build_array(jsonb_build_object('source','prototype','id','crafting-supplies','quantity',amount));
   end if;
  else
  perform public.get_player_skills(p_user_id);
  select level into current_level from public.player_skills where user_id=p_user_id and skill_id=skill for update;
  level_required:=(recipe->>'requiredLevel')::int;
  if branch is not null then
   select s.required_level,p.level into branch_entry,branch_level from public.skill_specializations s join public.player_skill_specializations p on p.specialization_id=s.id and p.skill_id=s.skill_id and p.user_id=p_user_id where s.id=branch and s.skill_id=skill and not s.archived;
   if branch_level is null or branch_level<coalesce((recipe->>'requiredBranchLevel')::int,1) then raise exception 'Your specialization level is too low for this recipe.';end if;
   level_required:=greatest(level_required,branch_entry);
  end if;
  if current_level is null or current_level<level_required then raise exception 'Your skill level is too low for this recipe.';end if;
  for equipment in select trim(part) from jsonb_array_elements_text(coalesce(recipe->'equipment','[]')) e cross join lateral regexp_split_to_table(e,'\s*\+\s*') part loop
   if equipment='Bait' then raise exception 'This recipe needs a defined bait cost before it can start.';end if;
   selected:=p_selections->>equipment;
   if selected is null or not (
    exists(select 1 from public.player_starter_items i join public.starter_item_types t on t.id=i.item_id where i.user_id=p_user_id and i.quantity>0 and i.item_id=selected and t.reusable and (t.name=equipment or t.id=public.skill_starter_equivalent(equipment)))
    or exists(select 1 from public.player_skill_inventory i where i.user_id=p_user_id and i.quantity>0 and i.item_name=equipment and selected='production:'||i.item_name)
   ) then raise exception 'Required equipment is missing: %.',equipment;end if;
  end loop;
  -- Costs are debited atomically. Any validation failure rolls all debits back.
  for rune in select value from jsonb_array_elements(coalesce(recipe->'runes','[]')) order by value->>'id' loop
   if skill='mining' and not (rune_state->'unlocked' ? (rune->>'id')) then raise exception 'Mining requires unlocked % rune access.',rune->>'name';end if;
   amount:=(rune->>'quantity')::bigint*p_quantity;
   if amount is null or amount<=0 then raise exception 'Rune costs are not configured.';end if;
   update public.player_rune_inventory set balance_ticks=balance_ticks-amount::numeric*3600000000 where user_id=p_user_id and rune_id=rune->>'id' and balance_ticks>=amount::numeric*3600000000;
   if not found then raise exception 'Not enough % runes.',rune->>'name';end if;
   rune_costs:=rune_costs||jsonb_build_array(jsonb_build_object('id',rune->>'id','quantity',amount));
  end loop;
  for material in select value from jsonb_array_elements(coalesce(recipe->'materials','[]')) order by value->>'name' loop
   amount:=(material->>'quantity')::bigint*p_quantity;remaining:=amount;
   if amount is null or amount<=0 then raise exception 'Material costs are not configured.';end if;
   select quantity into owned from public.player_skill_inventory where user_id=p_user_id and item_name=material->>'name' for update;
   take:=least(remaining,coalesce(owned,0));
   if take>0 then
    update public.player_skill_inventory set quantity=quantity-take,updated_at=ts where user_id=p_user_id and item_name=material->>'name';
    material_costs:=material_costs||jsonb_build_array(jsonb_build_object('source','production','id',material->>'name','quantity',take));remaining:=remaining-take;
   end if;
   for starter in select i.item_id,i.quantity from public.player_starter_items i join public.starter_item_types t on t.id=i.item_id where i.user_id=p_user_id and not t.reusable and (t.name=material->>'name' or t.id=public.skill_starter_equivalent(material->>'name')) order by i.item_id for update of i loop
    take:=least(remaining,starter.quantity);
    if take>0 then
     update public.player_starter_items set quantity=quantity-take where user_id=p_user_id and item_id=starter.item_id;
     material_costs:=material_costs||jsonb_build_array(jsonb_build_object('source','starter','id',starter.item_id,'quantity',take));remaining:=remaining-take;
    end if;
   end loop;
   if remaining>0 then raise exception 'Not enough %.',material->>'name';end if;
  end loop;
  if jsonb_array_length(coalesce(recipe->'outputs','[]'))=0 then raise exception 'Recipe outputs are not configured.';end if;

  end if;
  select coalesce(max(queue_position),0)+1 into next_position from public.player_skill_jobs where user_id=p_user_id and status='queued';
  insert into public.player_skill_jobs(user_id,skill_id,recipe_id,recipe,quantity,status,queue_position,rune_reservation,material_reservation,equipment_selections)
   values(p_user_id,skill,p_recipe,recipe,p_quantity,'queued',next_position,rune_costs,material_costs,p_selections);
 elsif p_action='reorder-skill' then
  select count(*) into count_jobs from public.player_skill_jobs where user_id=p_user_id and status='queued';
  if p_order is null or cardinality(p_order)<>count_jobs or cardinality(p_order)<>(select count(distinct id) from unnest(p_order) id)
   or exists(select 1 from unnest(p_order) o(id) where not exists(select 1 from public.player_skill_jobs j where j.id=o.id and j.user_id=p_user_id and j.status='queued')) then
   return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error','The waiting queue changed. Refresh and reorder the current tasks.','status',409);
  end if;
  update public.player_skill_jobs j set queue_position=o.ordinality from unnest(p_order) with ordinality o(id,ordinality) where j.id=o.id and j.user_id=p_user_id and j.status='queued';
 elsif p_action='cancel-skill' then
  select * into job from public.player_skill_jobs where id=target and user_id=p_user_id and status in('queued','running') for update;
  if not found then
   return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error','This task has already finished or was removed. Latest queue loaded.','status',409);
  end if;
  if job.status='running' and job.ends_at<=clock_timestamp() then
   perform public.settle_player_skill_queue(p_user_id);
   return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error','This task has finished. Rewards saved; latest queue loaded.','status',409);
  end if;
   for reserved in select value from jsonb_array_elements(job.rune_reservation) loop
    update public.player_rune_inventory set balance_ticks=balance_ticks+(reserved->>'quantity')::numeric*3600000000 where user_id=p_user_id and rune_id=reserved->>'id';
   end loop;
   for reserved in select value from jsonb_array_elements(job.material_reservation) loop
    if reserved->>'source'='prototype' then
     update public.player_profiles set crafting_supplies=crafting_supplies+(reserved->>'quantity')::bigint where user_id=p_user_id;
    elsif reserved->>'source'='starter' then
     update public.player_starter_items set quantity=quantity+(reserved->>'quantity')::int where user_id=p_user_id and item_id=reserved->>'id';
    else
     update public.player_skill_inventory set quantity=quantity+(reserved->>'quantity')::bigint,updated_at=ts where user_id=p_user_id and item_name=reserved->>'id';
    end if;
   end loop;

  update public.player_skill_jobs set status='cancelled',queue_position=null,resolved_at=ts where id=job.id;
 elsif p_action='collect-skill' and completed=0 then
  return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error','Rewards are saved automatically when each task finishes.','status',400);
 end if;
 update public.player_profiles set revision=revision+1,updated_at=ts where user_id=p_user_id;
 perform public.settle_player_skill_queue(p_user_id);
 return public.player_profile_snapshot(p_user_id);
exception when sqlstate 'P0001' then
 get stacked diagnostics problem=message_text;
 return jsonb_build_object('error',problem,'status',400);
end $$;

create or replace function public.update_player_profile(p_user_id uuid,p_action text,p_revision integer default null,p_item text default null,p_legacy jsonb default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if p_action='start' then
  return public.execute_player_skill_job(p_user_id,'start-skill',p_revision,'prototype:'||p_item);
 elsif p_action in('collect','cancel') and exists(select 1 from public.player_skill_jobs where user_id=p_user_id and status='running') then
  return public.execute_player_skill_job(p_user_id,case when p_action='collect' then 'collect-skill' else 'cancel-skill' end,p_revision);
 end if;
 if exists(select 1 from public.player_profiles where user_id=p_user_id) then perform public.settle_player_skill_queue(p_user_id);end if;
 return public.update_player_profile_before_skill_jobs(p_user_id,p_action,p_revision,p_item,p_legacy);
end $$;

create function public.process_player_skill_queues() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare account record; processed integer:=0; failed integer:=0;
begin
 for account in select user_id from (
  select user_id,ends_at from public.player_skill_jobs where status='running' and ends_at<=clock_timestamp()
  union all select user_id,activity_ends_at from public.player_profiles where activity_type is not null and activity_ends_at<=clock_timestamp()
 ) due order by ends_at,user_id limit 200 loop
  begin
   perform public.settle_player_skill_queue(account.user_id);processed:=processed+1;
  exception when others then
   failed:=failed+1;raise warning 'Activity queue settlement failed for account %, SQLSTATE %',account.user_id,sqlstate;
  end;
 end loop;
 return jsonb_build_object('processed',processed,'failed',failed);
end $$;
revoke all on function public.skill_recipe_for_execution(text),public.complete_player_skill_job(uuid,uuid),public.settle_player_skill_queue(uuid),public.skill_job_summary(public.player_skill_jobs),public.player_profile_state_snapshot(uuid),public.execute_player_skill_job(uuid,text,integer,text,integer,integer,jsonb,boolean,uuid,uuid[]),public.process_player_skill_queues() from public,anon,authenticated;
grant execute on function public.skill_recipe_for_execution(text),public.complete_player_skill_job(uuid,uuid),public.settle_player_skill_queue(uuid),public.skill_job_summary(public.player_skill_jobs),public.player_profile_state_snapshot(uuid),public.execute_player_skill_job(uuid,text,integer,text,integer,integer,jsonb,boolean,uuid,uuid[]),public.process_player_skill_queues() to service_role;
comment on table public.player_skill_jobs is 'Account activity queue. Reserve costs when added, immutable recipe snapshot, one running task, ordered waiting tasks, automatic exactly-once item/XP rewards and contiguous server timestamps. Cancelling a running or queued task refunds its reservation.';
