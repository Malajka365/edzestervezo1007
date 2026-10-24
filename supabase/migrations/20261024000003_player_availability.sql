-- 2. szakasz: játékos-elérhetőség naplója (bevethető / korlátozott / sérült).
-- Minden változás új sor; a játékos aktuális állapota a legutóbbi sora.
-- Idempotens.

CREATE TABLE IF NOT EXISTS public.player_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('available', 'limited', 'injured')),
  started_on date NOT NULL DEFAULT current_date,
  expected_return date,
  note text,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_availability_team_player_idx
  ON public.player_availability (team_id, player_id, started_on DESC, created_at DESC);

ALTER TABLE public.player_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view player_availability by module permission" ON public.player_availability;
DROP POLICY IF EXISTS "insert player_availability by module permission" ON public.player_availability;
DROP POLICY IF EXISTS "update player_availability by module permission" ON public.player_availability;
DROP POLICY IF EXISTS "delete player_availability by module permission" ON public.player_availability;

CREATE POLICY "view player_availability by module permission" ON public.player_availability
  FOR SELECT USING (has_team_access(team_id, 'players', 'view') OR has_team_access(team_id, 'rehab', 'view'));
CREATE POLICY "insert player_availability by module permission" ON public.player_availability
  FOR INSERT WITH CHECK (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "update player_availability by module permission" ON public.player_availability
  FOR UPDATE USING (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "delete player_availability by module permission" ON public.player_availability
  FOR DELETE USING (has_team_access(team_id, 'rehab', 'edit'));
