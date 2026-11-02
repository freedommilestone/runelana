-- Supabase can grant new public tables to service_role through default privileges.
-- The game may read the curve; only database administration may rebalance it.
revoke all on public.skill_xp_levels from service_role;
grant select on public.skill_xp_levels to service_role;
