-- Supabase cron settles due queues without a browser session. Local test engines
-- without pg_cron exercise the same worker function directly.
do $$
begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron;
  perform cron.schedule('runelana-activity-queues','* * * * *','select public.process_player_skill_queues();');
 end if;
end $$;
