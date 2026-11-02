-- Source: Runelana_Fishing_Master_List_V7_Item_Links.pdf (50 draft activities).
-- Update catalog metadata in place; never reset player XP, branch XP, or inventory.
alter table public.fishing_activities drop constraint fishing_activities_source_version_check;
alter table public.fishing_activities alter column source_version set default 'fishing-v7';
alter table public.fishing_activities drop constraint fishing_activities_check;
update public.skill_specializations set required_level=case when id='commercial-fishing' then 10 else 30 end
 where skill_id='fishing' and id in('commercial-fishing','treasure-fishing','trophy-fishing');
update public.fishing_activities set required_level=1,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_shrimps',source_version='fishing-v7' where id='fishing-v4-shrimp';
update public.fishing_activities set required_level=5,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_sardine',source_version='fishing-v7' where id='fishing-v4-sardine';
update public.fishing_activities set required_level=10,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_herring',source_version='fishing-v7' where id='fishing-v4-herring';
update public.fishing_activities set required_level=15,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_anchovies',source_version='fishing-v7' where id='fishing-v4-anchovies';
update public.fishing_activities set required_level=20,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_mackerel',source_version='fishing-v7' where id='fishing-v4-mackerel';
update public.fishing_activities set required_level=25,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_trout',source_version='fishing-v7' where id='fishing-v4-trout';
update public.fishing_activities set required_level=30,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_salmon',source_version='fishing-v7' where id='fishing-v4-salmon';
update public.fishing_activities set required_level=35,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_pike',source_version='fishing-v7' where id='fishing-v4-pike';
update public.fishing_activities set required_level=40,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_tuna',source_version='fishing-v7' where id='fishing-v4-tuna';
update public.fishing_activities set required_level=45,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_lobster',source_version='fishing-v7' where id='fishing-v4-lobster';
update public.fishing_activities set required_level=50,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_bass',source_version='fishing-v7' where id='fishing-v4-bass';
update public.fishing_activities set required_level=55,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_swordfish',source_version='fishing-v7' where id='fishing-v4-swordfish';
update public.fishing_activities set required_level=60,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_monkfish',source_version='fishing-v7' where id='fishing-v4-monkfish';
update public.fishing_activities set required_level=65,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_shark',source_version='fishing-v7' where id='fishing-v4-shark';
update public.fishing_activities set required_level=70,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_sea_turtle',source_version='fishing-v7' where id='fishing-v4-sea-turtle';
update public.fishing_activities set required_level=75,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_manta_ray',source_version='fishing-v7' where id='fishing-v4-manta-ray';
update public.fishing_activities set required_level=80,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_anglerfish',source_version='fishing-v7' where id='fishing-v4-anglerfish';
update public.fishing_activities set required_level=85,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_dark_crab',source_version='fishing-v7' where id='fishing-v4-dark-crab';
update public.fishing_activities set required_level=90,branch_xp=0,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Sacred_eel',source_version='fishing-v7' where id='fishing-v4-sacred-eel';
update public.fishing_activities set required_level=95,branch_xp=0,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-ancient-sea-serpent';
update public.fishing_activities set required_level=10,branch_xp=55,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_shrimps',source_version='fishing-v7' where id='fishing-v4-shrimp-bundle-x5';
update public.fishing_activities set required_level=15,branch_xp=60,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_sardine',source_version='fishing-v7' where id='fishing-v4-sardine-bundle-x5';
update public.fishing_activities set required_level=20,branch_xp=70,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_herring',source_version='fishing-v7' where id='fishing-v4-herring-bundle-x5';
update public.fishing_activities set required_level=30,branch_xp=90,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_trout',source_version='fishing-v7' where id='fishing-v4-trout-bundle-x5';
update public.fishing_activities set required_level=40,branch_xp=115,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_salmon',source_version='fishing-v7' where id='fishing-v4-salmon-bundle-x5';
update public.fishing_activities set required_level=50,branch_xp=145,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_lobster',source_version='fishing-v7' where id='fishing-v4-lobster-bundle-x5';
update public.fishing_activities set required_level=60,branch_xp=170,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_tuna',source_version='fishing-v7' where id='fishing-v4-tuna-bundle-x5';
update public.fishing_activities set required_level=75,branch_xp=215,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_shark',source_version='fishing-v7' where id='fishing-v4-shark-bundle-x5';
update public.fishing_activities set required_level=90,branch_xp=300,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-royal-seafood-crate';
update public.fishing_activities set required_level=99,branch_xp=385,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-grand-ocean-crate';
update public.fishing_activities set required_level=30,branch_xp=35,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Shell',source_version='fishing-v7' where id='fishing-v4-common-shell';
update public.fishing_activities set required_level=30,branch_xp=50,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Oyster',source_version='fishing-v7' where id='fishing-v4-oyster';
update public.fishing_activities set required_level=30,branch_xp=75,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Pearl',source_version='fishing-v7' where id='fishing-v4-freshwater-pearl';
update public.fishing_activities set required_level=40,branch_xp=95,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Giant_clam',source_version='fishing-v7' where id='fishing-v4-giant-clam';
update public.fishing_activities set required_level=50,branch_xp=120,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Coral',source_version='fishing-v7' where id='fishing-v4-ancient-coral';
update public.fishing_activities set required_level=60,branch_xp=150,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Black_pearl',source_version='fishing-v7' where id='fishing-v4-black-pearl';
update public.fishing_activities set required_level=75,branch_xp=205,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-sunken-relic';
update public.fishing_activities set required_level=85,branch_xp=260,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-abyssal-pearl';
update public.fishing_activities set required_level=95,branch_xp=360,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-ancient-treasure-chest';
update public.fishing_activities set required_level=99,branch_xp=460,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-legendary-ocean-relic';
update public.fishing_activities set required_level=30,branch_xp=60,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_trout',source_version='fishing-v7' where id='fishing-v4-trophy-trout';
update public.fishing_activities set required_level=30,branch_xp=85,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-golden-carp';
update public.fishing_activities set required_level=30,branch_xp=110,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_salmon',source_version='fishing-v7' where id='fishing-v4-giant-salmon';
update public.fishing_activities set required_level=45,branch_xp=160,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_swordfish',source_version='fishing-v7' where id='fishing-v4-giant-swordfish';
update public.fishing_activities set required_level=55,branch_xp=195,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_lobster',source_version='fishing-v7' where id='fishing-v4-golden-lobster';
update public.fishing_activities set required_level=65,branch_xp=230,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_shark',source_version='fishing-v7' where id='fishing-v4-albino-shark';
update public.fishing_activities set required_level=75,branch_xp=285,reference_label='View OSRS item',reference_url='https://oldschool.runescape.wiki/w/Raw_manta_ray',source_version='fishing-v7' where id='fishing-v4-ancient-manta-ray';
update public.fishing_activities set required_level=85,branch_xp=395,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-leviathan';
update public.fishing_activities set required_level=95,branch_xp=505,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-crimson-sea-dragon';
update public.fishing_activities set required_level=99,branch_xp=710,reference_label='Original Runelana artwork needed',reference_url=null,source_version='fishing-v7' where id='fishing-v4-mythical-ocean-guardian';

alter table public.fishing_activities alter column branch_xp set not null;
alter table public.fishing_activities add constraint fishing_activities_source_version_check check(source_version='fishing-v7');
alter table public.fishing_activities add constraint fishing_activities_check check(
 (category='standard' and specialization_id is null and required_branch_level is null and branch_xp=0)
 or (category<>'standard' and specialization_id is not null and specialization_id=category||'-fishing'
 and required_branch_level is not null and required_level>=case when category='commercial' then 10 else 30 end and branch_xp>0));
comment on table public.fishing_activities is 'V7 draft catalog. Stable activity IDs retained from V4. XP is per completed batch; standard branch XP is zero. Commercial unlocks at Fishing 10; Treasure and Trophy at 30. OSRS links are item-page visual references, not image files or final artwork. Branch XP thresholds, locations, bait consumption and crate contents remain unspecified.';
