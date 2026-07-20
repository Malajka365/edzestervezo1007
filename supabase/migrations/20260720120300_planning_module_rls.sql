-- supabase/migrations/20260720120300_planning_module_rls.sql

DROP POLICY IF EXISTS "Users can view templates for their teams" ON public.macrocycle_templates;
DROP POLICY IF EXISTS "Users can create templates for their teams" ON public.macrocycle_templates;
DROP POLICY IF EXISTS "Users can update templates for their teams" ON public.macrocycle_templates;
DROP POLICY IF EXISTS "Users can delete templates for their teams" ON public.macrocycle_templates;

CREATE POLICY "view macrocycle_templates by module permission" ON public.macrocycle_templates
  FOR SELECT USING (has_team_access(team_id, 'macrocycle', 'view'));
CREATE POLICY "insert macrocycle_templates by module permission" ON public.macrocycle_templates
  FOR INSERT WITH CHECK (has_team_access(team_id, 'macrocycle', 'edit'));
CREATE POLICY "update macrocycle_templates by module permission" ON public.macrocycle_templates
  FOR UPDATE USING (has_team_access(team_id, 'macrocycle', 'edit'));
CREATE POLICY "delete macrocycle_templates by module permission" ON public.macrocycle_templates
  FOR DELETE USING (has_team_access(team_id, 'macrocycle', 'edit'));

-- macrocycle_planning: team_id-t a season_id-n keresztül a training_seasons táblából kapja
DROP POLICY IF EXISTS "Users can view planning for their teams" ON public.macrocycle_planning;
DROP POLICY IF EXISTS "Users can create planning for their teams" ON public.macrocycle_planning;
DROP POLICY IF EXISTS "Users can update planning for their teams" ON public.macrocycle_planning;
DROP POLICY IF EXISTS "Users can delete planning for their teams" ON public.macrocycle_planning;

CREATE POLICY "view macrocycle_planning by module permission" ON public.macrocycle_planning
  FOR SELECT USING (
    has_team_access((SELECT team_id FROM public.training_seasons WHERE id = season_id), 'macrocycle', 'view')
  );
CREATE POLICY "insert macrocycle_planning by module permission" ON public.macrocycle_planning
  FOR INSERT WITH CHECK (
    has_team_access((SELECT team_id FROM public.training_seasons WHERE id = season_id), 'macrocycle', 'edit')
  );
CREATE POLICY "update macrocycle_planning by module permission" ON public.macrocycle_planning
  FOR UPDATE USING (
    has_team_access((SELECT team_id FROM public.training_seasons WHERE id = season_id), 'macrocycle', 'edit')
  );
CREATE POLICY "delete macrocycle_planning by module permission" ON public.macrocycle_planning
  FOR DELETE USING (
    has_team_access((SELECT team_id FROM public.training_seasons WHERE id = season_id), 'macrocycle', 'edit')
  );

DROP POLICY IF EXISTS "Users can view sessions for their teams" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can create sessions for their teams" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can update sessions for their teams" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can delete sessions for their teams" ON public.training_sessions;

CREATE POLICY "view training_sessions by module permission" ON public.training_sessions
  FOR SELECT USING (has_team_access(team_id, 'calendar', 'view'));
CREATE POLICY "insert training_sessions by module permission" ON public.training_sessions
  FOR INSERT WITH CHECK (has_team_access(team_id, 'calendar', 'edit'));
CREATE POLICY "update training_sessions by module permission" ON public.training_sessions
  FOR UPDATE USING (has_team_access(team_id, 'calendar', 'edit'));
CREATE POLICY "delete training_sessions by module permission" ON public.training_sessions
  FOR DELETE USING (has_team_access(team_id, 'calendar', 'edit'));

DROP POLICY IF EXISTS "Users can view templates for their teams" ON public.training_templates;
DROP POLICY IF EXISTS "Users can create templates for their teams" ON public.training_templates;
DROP POLICY IF EXISTS "Users can update templates for their teams" ON public.training_templates;
DROP POLICY IF EXISTS "Users can delete templates for their teams" ON public.training_templates;

CREATE POLICY "view training_templates by module permission" ON public.training_templates
  FOR SELECT USING (has_team_access(team_id, 'templates', 'view'));
CREATE POLICY "insert training_templates by module permission" ON public.training_templates
  FOR INSERT WITH CHECK (has_team_access(team_id, 'templates', 'edit'));
CREATE POLICY "update training_templates by module permission" ON public.training_templates
  FOR UPDATE USING (has_team_access(team_id, 'templates', 'edit'));
CREATE POLICY "delete training_templates by module permission" ON public.training_templates
  FOR DELETE USING (has_team_access(team_id, 'templates', 'edit'));
