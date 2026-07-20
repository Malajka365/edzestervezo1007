-- supabase/migrations/20260720120400_matches_measurement_module_rls.sql

DROP POLICY IF EXISTS "Users can view matches for their teams" ON public.matches;
DROP POLICY IF EXISTS "Users can create matches for their teams" ON public.matches;
DROP POLICY IF EXISTS "Users can update matches for their teams" ON public.matches;
DROP POLICY IF EXISTS "Users can delete matches for their teams" ON public.matches;

CREATE POLICY "view matches by module permission" ON public.matches
  FOR SELECT USING (has_team_access(team_id, 'matches', 'view'));
CREATE POLICY "insert matches by module permission" ON public.matches
  FOR INSERT WITH CHECK (has_team_access(team_id, 'matches', 'edit'));
CREATE POLICY "update matches by module permission" ON public.matches
  FOR UPDATE USING (has_team_access(team_id, 'matches', 'edit'));
CREATE POLICY "delete matches by module permission" ON public.matches
  FOR DELETE USING (has_team_access(team_id, 'matches', 'edit'));

DROP POLICY IF EXISTS "Users can view tactics technique for their teams" ON public.tactics_technique;
DROP POLICY IF EXISTS "Users can insert tactics technique for their teams" ON public.tactics_technique;
DROP POLICY IF EXISTS "Users can update tactics technique for their teams" ON public.tactics_technique;
DROP POLICY IF EXISTS "Users can delete tactics technique for their teams" ON public.tactics_technique;

CREATE POLICY "view tactics_technique by module permission" ON public.tactics_technique
  FOR SELECT USING (has_team_access(team_id, 'matches', 'view'));
CREATE POLICY "insert tactics_technique by module permission" ON public.tactics_technique
  FOR INSERT WITH CHECK (has_team_access(team_id, 'matches', 'edit'));
CREATE POLICY "update tactics_technique by module permission" ON public.tactics_technique
  FOR UPDATE USING (has_team_access(team_id, 'matches', 'edit'));
CREATE POLICY "delete tactics_technique by module permission" ON public.tactics_technique
  FOR DELETE USING (has_team_access(team_id, 'matches', 'edit'));

-- measurements: team_id-t a players táblából kapja (player_id -> team_id)
DROP POLICY IF EXISTS "Users can view measurements in their teams" ON public.measurements;
DROP POLICY IF EXISTS "Users can create measurements in their teams" ON public.measurements;
DROP POLICY IF EXISTS "Users can update measurements in their teams" ON public.measurements;
DROP POLICY IF EXISTS "Users can delete measurements in their teams" ON public.measurements;

CREATE POLICY "view measurements by module permission" ON public.measurements
  FOR SELECT USING (
    has_team_access((SELECT team_id FROM public.players WHERE id = player_id), 'measurement', 'view')
    OR has_team_access((SELECT team_id FROM public.players WHERE id = player_id), 'stats', 'view')
  );
CREATE POLICY "insert measurements by module permission" ON public.measurements
  FOR INSERT WITH CHECK (
    has_team_access((SELECT team_id FROM public.players WHERE id = player_id), 'measurement', 'edit')
  );
CREATE POLICY "update measurements by module permission" ON public.measurements
  FOR UPDATE USING (
    has_team_access((SELECT team_id FROM public.players WHERE id = player_id), 'measurement', 'edit')
  );
CREATE POLICY "delete measurements by module permission" ON public.measurements
  FOR DELETE USING (
    has_team_access((SELECT team_id FROM public.players WHERE id = player_id), 'measurement', 'edit')
  );

DROP POLICY IF EXISTS "Users can view load factors for their teams" ON public.training_load_factors;
DROP POLICY IF EXISTS "Users can insert load factors for their teams" ON public.training_load_factors;
DROP POLICY IF EXISTS "Users can update load factors for their teams" ON public.training_load_factors;
DROP POLICY IF EXISTS "Users can delete load factors for their teams" ON public.training_load_factors;

CREATE POLICY "view training_load_factors by module permission" ON public.training_load_factors
  FOR SELECT USING (has_team_access(team_id, 'measurement', 'view'));
CREATE POLICY "insert training_load_factors by module permission" ON public.training_load_factors
  FOR INSERT WITH CHECK (has_team_access(team_id, 'measurement', 'edit'));
CREATE POLICY "update training_load_factors by module permission" ON public.training_load_factors
  FOR UPDATE USING (has_team_access(team_id, 'measurement', 'edit'));
CREATE POLICY "delete training_load_factors by module permission" ON public.training_load_factors
  FOR DELETE USING (has_team_access(team_id, 'measurement', 'edit'));
