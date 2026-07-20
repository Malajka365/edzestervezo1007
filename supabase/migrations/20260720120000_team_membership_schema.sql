-- supabase/migrations/20260720120000_team_membership_schema.sql

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'fitness_coach', 'physiotherapist')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  role TEXT NOT NULL CHECK (role IN ('coach', 'fitness_coach', 'physiotherapist')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_team_invites_team_id ON public.team_invites(team_id);
CREATE INDEX idx_team_invites_token ON public.team_invites(token);

CREATE TABLE public.team_module_permissions (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'fitness_coach', 'physiotherapist')),
  module_key TEXT NOT NULL CHECK (module_key IN (
    'players', 'macrocycle', 'calendar', 'exercises', 'templates',
    'matches', 'measurement', 'stats', 'rehab'
  )),
  access_level TEXT NOT NULL CHECK (access_level IN ('none', 'view', 'edit')),
  PRIMARY KEY (team_id, role, module_key)
);

-- Segédfüggvény: van-e a bejelentkezett usernek legalább p_min_level szintű
-- hozzáférése p_module modulhoz p_team_id csapatban.
-- SECURITY DEFINER, mert az RLS policy-kban használjuk, és a
-- team_members / team_module_permissions táblák saját RLS-e (Task 2)
-- ellenkező esetben rekurzívan blokkolná ezt a lekérdezést.
CREATE OR REPLACE FUNCTION public.has_team_access(p_team_id uuid, p_module text, p_min_level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.team_module_permissions tmp
      ON tmp.team_id = tm.team_id AND tmp.role = tm.role
    WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
      AND tmp.module_key = p_module
      AND (
        (p_min_level = 'view' AND tmp.access_level IN ('view', 'edit'))
        OR (p_min_level = 'edit' AND tmp.access_level = 'edit')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_team_access(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_team_access(uuid, text, text) TO anon, authenticated;

-- Backfill: minden meglévő csapat létrehozója bekerül coach szerepkörrel
INSERT INTO public.team_members (team_id, user_id, role)
SELECT id, created_by, 'coach'
FROM public.teams
WHERE created_by IS NOT NULL
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Alapértelmezett jogosultsági mátrix minden meglévő csapatra
INSERT INTO public.team_module_permissions (team_id, role, module_key, access_level)
SELECT t.id, m.role, m.module_key, m.access_level
FROM public.teams t
CROSS JOIN (VALUES
  ('coach', 'players', 'edit'), ('fitness_coach', 'players', 'edit'), ('physiotherapist', 'players', 'view'),
  ('coach', 'macrocycle', 'edit'), ('fitness_coach', 'macrocycle', 'edit'), ('physiotherapist', 'macrocycle', 'none'),
  ('coach', 'calendar', 'edit'), ('fitness_coach', 'calendar', 'edit'), ('physiotherapist', 'calendar', 'view'),
  ('coach', 'exercises', 'edit'), ('fitness_coach', 'exercises', 'edit'), ('physiotherapist', 'exercises', 'view'),
  ('coach', 'templates', 'edit'), ('fitness_coach', 'templates', 'edit'), ('physiotherapist', 'templates', 'none'),
  ('coach', 'matches', 'edit'), ('fitness_coach', 'matches', 'view'), ('physiotherapist', 'matches', 'none'),
  ('coach', 'measurement', 'edit'), ('fitness_coach', 'measurement', 'edit'), ('physiotherapist', 'measurement', 'view'),
  ('coach', 'stats', 'view'), ('fitness_coach', 'stats', 'view'), ('physiotherapist', 'stats', 'view'),
  ('coach', 'rehab', 'edit'), ('fitness_coach', 'rehab', 'none'), ('physiotherapist', 'rehab', 'edit')
) AS m(role, module_key, access_level)
ON CONFLICT (team_id, role, module_key) DO NOTHING;

-- Új csapat létrehozásakor automatikusan feltölti a default mátrixot
-- és felveszi a létrehozót coach tagnak
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'coach')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  INSERT INTO public.team_module_permissions (team_id, role, module_key, access_level)
  VALUES
    (NEW.id, 'coach', 'players', 'edit'), (NEW.id, 'fitness_coach', 'players', 'edit'), (NEW.id, 'physiotherapist', 'players', 'view'),
    (NEW.id, 'coach', 'macrocycle', 'edit'), (NEW.id, 'fitness_coach', 'macrocycle', 'edit'), (NEW.id, 'physiotherapist', 'macrocycle', 'none'),
    (NEW.id, 'coach', 'calendar', 'edit'), (NEW.id, 'fitness_coach', 'calendar', 'edit'), (NEW.id, 'physiotherapist', 'calendar', 'view'),
    (NEW.id, 'coach', 'exercises', 'edit'), (NEW.id, 'fitness_coach', 'exercises', 'edit'), (NEW.id, 'physiotherapist', 'exercises', 'view'),
    (NEW.id, 'coach', 'templates', 'edit'), (NEW.id, 'fitness_coach', 'templates', 'edit'), (NEW.id, 'physiotherapist', 'templates', 'none'),
    (NEW.id, 'coach', 'matches', 'edit'), (NEW.id, 'fitness_coach', 'matches', 'view'), (NEW.id, 'physiotherapist', 'matches', 'none'),
    (NEW.id, 'coach', 'measurement', 'edit'), (NEW.id, 'fitness_coach', 'measurement', 'edit'), (NEW.id, 'physiotherapist', 'measurement', 'view'),
    (NEW.id, 'coach', 'stats', 'view'), (NEW.id, 'fitness_coach', 'stats', 'view'), (NEW.id, 'physiotherapist', 'stats', 'view'),
    (NEW.id, 'coach', 'rehab', 'edit'), (NEW.id, 'fitness_coach', 'rehab', 'none'), (NEW.id, 'physiotherapist', 'rehab', 'edit')
  ON CONFLICT (team_id, role, module_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_team();
