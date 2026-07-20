-- supabase/migrations/20260720120200_players_module_rls.sql

DROP POLICY IF EXISTS "Users can view players in their teams" ON public.players;
DROP POLICY IF EXISTS "Users can create players in their teams" ON public.players;
DROP POLICY IF EXISTS "Users can update players in their teams" ON public.players;
DROP POLICY IF EXISTS "Users can delete players in their teams" ON public.players;

CREATE POLICY "view players by module permission" ON public.players
  FOR SELECT USING (has_team_access(team_id, 'players', 'view'));
CREATE POLICY "insert players by module permission" ON public.players
  FOR INSERT WITH CHECK (has_team_access(team_id, 'players', 'edit'));
CREATE POLICY "update players by module permission" ON public.players
  FOR UPDATE USING (has_team_access(team_id, 'players', 'edit'));
CREATE POLICY "delete players by module permission" ON public.players
  FOR DELETE USING (has_team_access(team_id, 'players', 'edit'));

DROP POLICY IF EXISTS "Users can view training locations for their teams" ON public.training_locations;
DROP POLICY IF EXISTS "Users can insert training locations for their teams" ON public.training_locations;
DROP POLICY IF EXISTS "Users can update training locations for their teams" ON public.training_locations;
DROP POLICY IF EXISTS "Users can delete training locations for their teams" ON public.training_locations;

CREATE POLICY "view training_locations by module permission" ON public.training_locations
  FOR SELECT USING (has_team_access(team_id, 'players', 'view'));
CREATE POLICY "insert training_locations by module permission" ON public.training_locations
  FOR INSERT WITH CHECK (has_team_access(team_id, 'players', 'edit'));
CREATE POLICY "update training_locations by module permission" ON public.training_locations
  FOR UPDATE USING (has_team_access(team_id, 'players', 'edit'));
CREATE POLICY "delete training_locations by module permission" ON public.training_locations
  FOR DELETE USING (has_team_access(team_id, 'players', 'edit'));
