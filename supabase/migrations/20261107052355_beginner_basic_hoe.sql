-- Add the reusable Farming starter tool. Future kits automatically read this catalog.
insert into public.starter_item_types(id,name,kind,grant_quantity,requirement,reusable,notes,storage,equipment_slot)
values('basic-hoe','Basic Hoe','profession_tool',1,'Farming 1',true,
 'Prepare soil for beginner Farming activities, including Wheat','tools',null)
on conflict(id) do nothing;

-- Extend existing kits once without regranting consumed seeds, food or Air Runes.
-- Match gameplay lock order: profile before inventory and grant receipt.
do $$
declare player record;
begin
 for player in select user_id from public.player_profiles order by user_id for update loop
  insert into public.player_starter_items(user_id,item_id,quantity)
  values(player.user_id,'basic-hoe',1) on conflict(user_id,item_id) do nothing;
  if found then
   update public.player_profiles set revision=revision+1,updated_at=now() where user_id=player.user_id;
  end if;
  update public.player_starter_kit_grants
   set manifest=manifest||jsonb_build_array(jsonb_build_object('id','basic-hoe','quantity',1,'storage','tools'))
   where user_id=player.user_id and not manifest @> '[{"id":"basic-hoe"}]'::jsonb;
 end loop;
end $$;
