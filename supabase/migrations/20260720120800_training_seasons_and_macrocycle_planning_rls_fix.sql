-- supabase/migrations/20260720120800_training_seasons_and_macrocycle_planning_rls_fix.sql
--
-- Final whole-branch review found two RLS gaps introduced/exposed by the
-- team-membership-permissions feature:
--
-- Bug 1 (critical): training_seasons had RLS completely disabled and zero
-- policies. It has a nullable team_id (FK -> teams(id)) and is read directly
-- by MacrocyclePlanner.jsx / Calendar.jsx via `.eq('team_id', ...)`. It is
-- also relied upon indirectly by macrocycle_planning's RLS policies (from
-- 20260720120300_planning_module_rls.sql), which resolve team_id via
-- `(SELECT team_id FROM public.training_seasons WHERE id = season_id)` --
-- that subquery runs under training_seasons' own RLS, so with RLS disabled
-- any authenticated user could read/write any team's seasons.
--
-- Bug 2 (critical): macrocycle_planning has the correct 4 module-permission
-- policies (added in 20260720120300_planning_module_rls.sql) but
-- ENABLE ROW LEVEL SECURITY was never run on the table, so Postgres ignores
-- all policies and the table is fully open to any authenticated role with
-- table grants.

-- Bug 1: enable RLS on training_seasons and add the standard 4-policy
-- module-permission pattern, gated on the 'macrocycle' module (seasons are
-- consumed by the Makrociklus Tervező / calendar planning flow). A null
-- team_id makes has_team_access(NULL, ...) return false, so such rows are
-- simply invisible rather than erroring.
ALTER TABLE public.training_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view training_seasons by module permission" ON public.training_seasons
  FOR SELECT USING (has_team_access(team_id, 'macrocycle', 'view'));
CREATE POLICY "insert training_seasons by module permission" ON public.training_seasons
  FOR INSERT WITH CHECK (has_team_access(team_id, 'macrocycle', 'edit'));
CREATE POLICY "update training_seasons by module permission" ON public.training_seasons
  FOR UPDATE USING (has_team_access(team_id, 'macrocycle', 'edit'));
CREATE POLICY "delete training_seasons by module permission" ON public.training_seasons
  FOR DELETE USING (has_team_access(team_id, 'macrocycle', 'edit'));

-- Bug 2: the policies already exist on macrocycle_planning; just enable RLS
-- so they're actually enforced.
ALTER TABLE public.macrocycle_planning ENABLE ROW LEVEL SECURITY;
