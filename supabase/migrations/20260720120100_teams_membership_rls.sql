-- supabase/migrations/20260720120100_teams_membership_rls.sql

-- Helper function to bypass RLS when checking team membership
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO anon, authenticated;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_module_permissions ENABLE ROW LEVEL SECURITY;

-- team_members: tagok látják egymást a saját csapatukban; csak a
-- csapat tulajdonosa (teams.created_by) írhat (meghívás beváltása
-- SECURITY DEFINER függvényen keresztül megy, ld. Task 9, nem itt).
CREATE POLICY "members can view team_members of their teams" ON public.team_members
  FOR SELECT USING (
    public.is_team_member(team_id)
  );

CREATE POLICY "owner can manage team_members" ON public.team_members
  FOR ALL USING (
    team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  ) WITH CHECK (
    team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  );

-- team_invites: csak a csapat tulajdonosa látja/kezeli
-- Owner management handled via SECURITY DEFINER functions in Task 9
CREATE POLICY "owner can manage team_invites" ON public.team_invites
  FOR ALL USING (
    team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  ) WITH CHECK (
    team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  );

-- team_module_permissions: minden csapattag olvashatja (kell a UI
-- modul-szűréshez), csak a tulajdonos írhatja
CREATE POLICY "members can view team_module_permissions" ON public.team_module_permissions
  FOR SELECT USING (
    public.is_team_member(team_id)
  );

CREATE POLICY "owner can manage team_module_permissions" ON public.team_module_permissions
  FOR ALL USING (
    team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  ) WITH CHECK (
    team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  );

-- teams: régi created_by-alapú policy-k cseréje tagság-alapúra
DROP POLICY IF EXISTS "Users can view teams they created" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON public.teams;

CREATE POLICY "members can view their teams" ON public.teams
  FOR SELECT USING (
    public.is_team_member(id)
  );

CREATE POLICY "authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "owner can update their teams" ON public.teams
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "owner can delete their teams" ON public.teams
  FOR DELETE USING (created_by = auth.uid());
