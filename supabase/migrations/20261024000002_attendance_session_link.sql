-- 2. szakasz: a jelenlét-sor opcionálisan egy edzéshez kötődik, és a
-- jelenlétet az 'attendance' VAGY a 'rehab' joggal lehet kezelni.
-- Idempotens.

ALTER TABLE public.player_attendance
  ADD COLUMN IF NOT EXISTS training_session_id uuid
  REFERENCES public.training_sessions(id) ON DELETE SET NULL;

-- Egy játékosnak egy edzéshez legfeljebb egy sora lehet (a Mai edzés mentése upsert).
CREATE UNIQUE INDEX IF NOT EXISTS player_attendance_session_player_uniq
  ON public.player_attendance (training_session_id, player_id)
  WHERE training_session_id IS NOT NULL;

DROP POLICY IF EXISTS "view player_attendance by module permission" ON public.player_attendance;
DROP POLICY IF EXISTS "insert player_attendance by module permission" ON public.player_attendance;
DROP POLICY IF EXISTS "update player_attendance by module permission" ON public.player_attendance;
DROP POLICY IF EXISTS "delete player_attendance by module permission" ON public.player_attendance;

CREATE POLICY "view player_attendance by module permission" ON public.player_attendance
  FOR SELECT USING (has_team_access(team_id, 'attendance', 'view') OR has_team_access(team_id, 'rehab', 'view'));
CREATE POLICY "insert player_attendance by module permission" ON public.player_attendance
  FOR INSERT WITH CHECK (has_team_access(team_id, 'attendance', 'edit') OR has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "update player_attendance by module permission" ON public.player_attendance
  FOR UPDATE USING (has_team_access(team_id, 'attendance', 'edit') OR has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "delete player_attendance by module permission" ON public.player_attendance
  FOR DELETE USING (has_team_access(team_id, 'attendance', 'edit') OR has_team_access(team_id, 'rehab', 'edit'));
