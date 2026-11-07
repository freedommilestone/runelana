-- Atomic, account-owned profession jobs. Recipe values come only from the
-- existing master catalogs. No browser-supplied costs, rewards or timestamps.
create table public.player_skill_inventory (
 user_id uuid not null references public.player_profiles(user_id) on delete cascade,
 item_name text not null check(length(item_name) between 1 and 160),
 skill_id text not null references public.skill_types(id),
 quantity bigint not null check(quantity>=0),
 updated_at timestamptz not null default now(), primary key(user_id,item_name)
);
create index player_skill_inventory_skill on public.player_skill_inventory(skill_id);
create table public.player_skill_jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.player_profiles(user_id) on delete cascade,
 skill_id text not null references public.skill_types(id), recipe_id text not null,
 recipe jsonb not null, quantity integer not null check(quantity between 1 and 10000),
 status text not null default 'running' check(status in('running','collected','cancelled')),
 rune_reservation jsonb not null, material_reservation jsonb not null,
 started_at timestamptz not null, ends_at timestamptz not null, resolved_at timestamptz,
 check(ends_at>started_at), check((status='running')=(resolved_at is null))
);
create unique index one_running_skill_job on public.player_skill_jobs(user_id) where status='running';
create index player_skill_jobs_history on public.player_skill_jobs(user_id,started_at desc);
create index player_skill_jobs_skill on public.player_skill_jobs(skill_id);
alter table public.player_skill_inventory enable row level security;
alter table public.player_skill_jobs enable row level security;
revoke all on public.player_skill_inventory,public.player_skill_jobs from public,anon,authenticated,service_role;
grant select on public.player_skill_inventory,public.player_skill_jobs to authenticated;
grant select,insert,update,delete on public.player_skill_inventory,public.player_skill_jobs to service_role;
create policy skill_inventory_owner_read on public.player_skill_inventory for select to authenticated using((select auth.uid())=user_id);
create policy skill_jobs_owner_read on public.player_skill_jobs for select to authenticated using((select auth.uid())=user_id);

create function public.skill_recipe_for_execution(p_id text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select r||jsonb_build_object('skillId',skill,
  'outputs',case when skill='fishing' then jsonb_build_array(jsonb_build_object('name',r->>'name','quantity',1)) else r->'outputs' end)
 from (
  select 'fishing' as skill,public.fishing_master_catalog() as recipes
  union all select 'farming',public.farming_master_catalog()
  union all select 'mining',public.mining_master_catalog()
  union all select 'cooking',public.cooking_master_catalog()
  union all select 'smithing',public.smithing_master_catalog()
  union all select 'crafting',public.crafting_master_catalog()
 ) catalogs cross join lateral jsonb_array_elements(recipes) r where r->>'id'=p_id limit 1
$$;
create function public.skill_starter_equivalent(p_name text) returns text
language sql immutable security invoker set search_path='' as $$
 select case p_name when 'Small Net' then 'small-fishing-net' when 'Basic Crafting Kit' then 'basic-crafting-toolkit'
 when 'Wheat Seed' then 'wheat-seeds' when 'Potato Seed' then 'potato-seeds' when 'Bait' then 'basic-bait' else null end
$$;

alter function public.player_profile_state_snapshot(uuid) rename to player_profile_state_before_skill_jobs;
create function public.player_profile_state_snapshot(p_user_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; job public.player_skill_jobs;
begin
 result:=public.player_profile_state_before_skill_jobs(p_user_id);
 if result is null then return null;end if;
 result:=jsonb_set(result,'{state,producedItems}',coalesce((select jsonb_agg(jsonb_build_object('id','production:'||item_name,'name',item_name,'quantity',quantity,'skillId',skill_id) order by item_name) from public.player_skill_inventory where user_id=p_user_id and quantity>0),'[]'::jsonb));
 select * into job from public.player_skill_jobs where user_id=p_user_id and status='running';
 if found then result:=jsonb_set(result,'{state,activity}',jsonb_build_object('type','skill','id',job.id,'skillId',job.skill_id,'recipeId',job.recipe_id,'name',job.recipe->>'name','quantity',job.quantity,'outputs',job.recipe->'outputs','xpReward',(job.recipe->>'xpReward')::bigint*job.quantity,'startedAt',extract(epoch from job.started_at)*1000,'endsAt',extract(epoch from job.ends_at)*1000));end if;
 return result;
end $$;

-- Use the same profile lock for prototype starts and profession starts.
alter function public.update_player_profile(uuid,text,integer,text,jsonb) rename to update_player_profile_before_skill_jobs;
create function public.update_player_profile(p_user_id uuid,p_action text,p_revision integer default null,p_item text default null,p_legacy jsonb default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.player_profiles where user_id=p_user_id for update;
 if p_action='start' and exists(select 1 from public.player_skill_jobs where user_id=p_user_id and status='running') then
  return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error','Finish or cancel your current skill activity first.','status',409);
 end if;
 return public.update_player_profile_before_skill_jobs(p_user_id,p_action,p_revision,p_item,p_legacy);
end $$;
alter function public.get_player_skills(uuid) rename to get_player_skills_before_execution;
create function public.get_player_skills(p_user_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select public.get_player_skills_before_execution(p_user_id)||jsonb_build_object('productionAvailable',true)
$$;

create function public.execute_player_skill_job(p_user_id uuid,p_action text,p_revision integer,p_recipe text default null,p_quantity integer default 1,p_time_limit integer default 3600,p_selections jsonb default '{}',p_confirmed boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 profile public.player_profiles; job public.player_skill_jobs; recipe jsonb; rune jsonb; material jsonb; output jsonb; reserved jsonb;
 rune_costs jsonb:='[]'; material_costs jsonb:='[]'; equipment text; selected text; skill text; branch text;
 level_required int; current_level int; branch_level int; branch_entry int; seconds int; amount bigint; remaining bigint; take bigint; owned bigint; starter record;
 ts timestamptz; problem text; rune_state jsonb;
begin
 if p_action not in('start-skill','collect-skill','cancel-skill') or p_action is null then raise exception 'Unknown skill action.';end if;
 -- Lock order: wallet -> rune production/inventory -> profile -> skill/items -> stats.
 -- This matches wallet verification and passive production settlement.
 rune_state:=public.sync_player_runes(p_user_id);
 select * into profile from public.player_profiles where user_id=p_user_id for update;
 if not found then raise exception 'Your player profile is not initialized.';end if;
 if p_revision is null or p_revision<>profile.revision then
  return public.player_profile_snapshot(p_user_id)||jsonb_build_object('error','Your profile changed. Latest progress loaded; please try again.','status',409);
 end if;
 ts:=clock_timestamp();
 select * into job from public.player_skill_jobs where user_id=p_user_id and status='running' for update;
 if p_action='start-skill' then
  if job.id is not null or profile.activity_type is not null then raise exception 'Finish or cancel your current activity first.';end if;
  if p_quantity is null or p_quantity<1 or p_quantity>10000 or p_time_limit is null or p_time_limit not in(900,3600,14400,28800) then raise exception 'Choose a valid quantity and production time limit.';end if;
  if jsonb_typeof(p_selections) is distinct from 'object' then raise exception 'Choose valid equipment.';end if;
  recipe:=public.skill_recipe_for_execution(p_recipe);
  if recipe is null then raise exception 'This recipe is not available for production.';end if;
  skill:=recipe->>'skillId';branch:=recipe->>'specializationId';seconds:=(recipe->>'durationSeconds')::int;
  if seconds is null or seconds<=0 or seconds::bigint*p_quantity>p_time_limit then raise exception 'This quantity exceeds the selected production time limit.';end if;
  if coalesce((recipe->>'requiresConsumptionConfirmation')::boolean,false) and p_confirmed is distinct from true then raise exception 'Confirm consumption of the collectible ingredients before starting.';end if;
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
  insert into public.player_skill_jobs(user_id,skill_id,recipe_id,recipe,quantity,rune_reservation,material_reservation,started_at,ends_at)
   values(p_user_id,skill,p_recipe,recipe,p_quantity,rune_costs,material_costs,ts,ts+make_interval(secs=>seconds*p_quantity));
 else
  if job.id is null then raise exception 'There is no active skill activity.';end if;
  if p_action='collect-skill' then
   if ts<job.ends_at then raise exception 'This activity is still running.';end if;
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
   update public.player_skill_jobs set status='collected',resolved_at=ts where id=job.id;
  else
   if ts>=job.ends_at then raise exception 'This activity is complete. Collect your rewards.';end if;
   for reserved in select value from jsonb_array_elements(job.rune_reservation) loop
    update public.player_rune_inventory set balance_ticks=balance_ticks+(reserved->>'quantity')::numeric*3600000000 where user_id=p_user_id and rune_id=reserved->>'id';
   end loop;
   for reserved in select value from jsonb_array_elements(job.material_reservation) loop
    if reserved->>'source'='starter' then
     update public.player_starter_items set quantity=quantity+(reserved->>'quantity')::int where user_id=p_user_id and item_id=reserved->>'id';
    else
     update public.player_skill_inventory set quantity=quantity+(reserved->>'quantity')::bigint,updated_at=ts where user_id=p_user_id and item_name=reserved->>'id';
    end if;
   end loop;
   update public.player_skill_jobs set status='cancelled',resolved_at=ts where id=job.id;
  end if;
 end if;
 update public.player_profiles set revision=revision+1,updated_at=ts where user_id=p_user_id;
 return public.player_profile_snapshot(p_user_id);
exception when sqlstate 'P0001' then
 get stacked diagnostics problem=message_text;
 return jsonb_build_object('error',problem,'status',400);
end $$;

revoke all on function public.skill_recipe_for_execution(text),public.skill_starter_equivalent(text),public.player_profile_state_snapshot(uuid),public.update_player_profile(uuid,text,integer,text,jsonb),public.get_player_skills(uuid),public.execute_player_skill_job(uuid,text,integer,text,integer,integer,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.skill_recipe_for_execution(text),public.skill_starter_equivalent(text),public.player_profile_state_snapshot(uuid),public.update_player_profile(uuid,text,integer,text,jsonb),public.get_player_skills(uuid),public.execute_player_skill_job(uuid,text,integer,text,integer,integer,jsonb,boolean) to service_role;
comment on table public.player_skill_jobs is 'Server-timed profession batches: inputs reserved at start, collect all outputs and XP once, cancel before completion refunds all inputs with no partial rewards. Snapshot freezes recipe costs/rewards for each job.';
comment on table public.player_skill_inventory is 'Actual collected profession output stacks. Exact master-list names link inputs across skills; no implicit bundle conversion or name guessing. Rune inventory stays separate.';
