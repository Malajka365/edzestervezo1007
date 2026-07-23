-- supabase/migrations/20260720121000_codify_legacy_table_rls.sql
--
-- K2 a review-ból (docs/review/00-osszefoglalo-prioritasok.md):
-- A profiles / exercises / training_exercises / user_exercise_favorites táblák
-- RLS-e eddig csak az élő adatbázisban létezett (a régi projekt dumpjából jött át),
-- egyik migrációs fájl sem tartalmazta. Ez a migráció:
--   1. verziókövetetté teszi (kodifikálja) a meglévő policy-kat,
--   2. javítja a profiles hibát: csapattársak profilja (név/email) eddig nem volt
--      olvasható, ezért a Csapattagok lista üres neveket mutatott volna,
--   3. training_exercises: created_by default beállítása, hogy a jövőbeli sorok
--      tulajdonosa rögzüljön (későbbi szigorítás előfeltétele).

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Segédfüggvény: közös csapatban van-e a bejelentkezett user a megadott userrel.
-- SECURITY DEFINER, hogy a team_members RLS-e ne szóljon bele (ugyanaz a minta,
-- mint a has_team_access / is_team_member függvényeknél).
CREATE OR REPLACE FUNCTION public.shares_team_with(p_other_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members a
    JOIN public.team_members b ON a.team_id = b.team_id
    WHERE a.user_id = auth.uid()
      AND b.user_id = p_other_user
  );
$$;

REVOKE ALL ON FUNCTION public.shares_team_with(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.shares_team_with(uuid) TO authenticated;

-- Csapattársak profilja olvasható (a Csapattagok lista nevekhez/emailekhez kell)
DROP POLICY IF EXISTS "Team members can view teammate profiles" ON public.profiles;
CREATE POLICY "Team members can view teammate profiles" ON public.profiles
  FOR SELECT USING (public.shares_team_with(id));

-- ============================================================
-- exercises (mérési gyakorlat-típusok, felhasználónként)
-- ============================================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create exercises" ON public.exercises;
CREATE POLICY "Users can create exercises" ON public.exercises
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view their own exercises" ON public.exercises;
CREATE POLICY "Users can view their own exercises" ON public.exercises
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own exercises" ON public.exercises;
CREATE POLICY "Users can update their own exercises" ON public.exercises
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own exercises" ON public.exercises;
CREATE POLICY "Users can delete their own exercises" ON public.exercises
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================================
-- user_exercise_favorites (felhasználónkénti kedvencek)
-- ============================================================
ALTER TABLE public.user_exercise_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can add their own favorites" ON public.user_exercise_favorites;
CREATE POLICY "Users can add their own favorites" ON public.user_exercise_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.user_exercise_favorites;
CREATE POLICY "Users can view their own favorites" ON public.user_exercise_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own favorites" ON public.user_exercise_favorites;
CREATE POLICY "Users can remove their own favorites" ON public.user_exercise_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- training_exercises (globális gyakorlat-könyvtár)
-- ============================================================
-- Szándékosan megosztott könyvtár: minden bejelentkezett user látja és
-- szerkesztheti. Ismert gyengeség (bárki módosíthatja bárki gyakorlatát),
-- de a jelenlegi adat (mind a 12 sor tulajdonos nélküli) és a UI (nem állít
-- created_by-t) miatt a szigorítás most funkciótörést okozna.
-- Előkészítés a jövőbeli szigorításhoz: az új sorok tulajdonosa rögzül.
ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exercises ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Anyone can view exercises" ON public.training_exercises;
CREATE POLICY "Anyone can view exercises" ON public.training_exercises
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create exercises" ON public.training_exercises;
CREATE POLICY "Authenticated users can create exercises" ON public.training_exercises
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update exercises" ON public.training_exercises;
CREATE POLICY "Authenticated users can update exercises" ON public.training_exercises
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete exercises" ON public.training_exercises;
CREATE POLICY "Authenticated users can delete exercises" ON public.training_exercises
  FOR DELETE USING (auth.uid() IS NOT NULL);
