-- 2. szakasz: a Jelenlét saját jogosultsági modult kap ('attendance').
-- Idempotens: többször is lefuttatható.

-- 1) module_key CHECK bővítése. A megszorítás neve automatikusan generált volt,
--    ezért a pg_constraint-ből keressük ki, és egy ismert nevűre cseréljük.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.team_module_permissions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%module_key%'
  LOOP
    EXECUTE format('ALTER TABLE public.team_module_permissions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.team_module_permissions
  ADD CONSTRAINT team_module_permissions_module_key_check CHECK (module_key IN (
    'players', 'macrocycle', 'calendar', 'exercises', 'templates',
    'matches', 'measurement', 'stats', 'rehab', 'attendance'
  ));

-- 2) Meglévő csapatok: mindhárom szerep szerkesztheti a jelenlétet.
INSERT INTO public.team_module_permissions (team_id, role, module_key, access_level)
SELECT t.id, m.role, 'attendance', 'edit'
FROM public.teams t
CROSS JOIN (VALUES ('coach'), ('fitness_coach'), ('physiotherapist')) AS m(role)
ON CONFLICT (team_id, role, module_key) DO NOTHING;

-- 3) Új csapatok: a trigger-függvény az eredeti (20260720120000) mátrixot
--    adja + az 'attendance' sorokat.
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
    (NEW.id, 'coach', 'rehab', 'edit'), (NEW.id, 'fitness_coach', 'rehab', 'none'), (NEW.id, 'physiotherapist', 'rehab', 'edit'),
    (NEW.id, 'coach', 'attendance', 'edit'), (NEW.id, 'fitness_coach', 'attendance', 'edit'), (NEW.id, 'physiotherapist', 'attendance', 'edit')
  ON CONFLICT (team_id, role, module_key) DO NOTHING;

  RETURN NEW;
END;
$$;
