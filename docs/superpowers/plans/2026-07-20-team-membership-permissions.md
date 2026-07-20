# Csapat tagság és szerepkör-alapú jogosultságok — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Egy csapathoz több felhasználó is csatlakozhasson (vezetőedző/erőnléti edző/gyógytornász) meghívó linken keresztül, csapatonként testre szabható, app-on belül szerkeszthető modul-szintű jogosultsági mátrixszal (nincs/megtekint/szerkeszt).

**Architecture:** Három új Postgres tábla (`team_members`, `team_invites`, `team_module_permissions`) + egy `security definer` SQL függvény (`has_team_access`), amire minden csapathoz kötött tábla RLS policy-ja hivatkozik a jelenlegi `created_by = auth.uid()` minta helyett. Frontend oldalon a `TeamContext` bővül csapat-tagsággal és a felhasználó aktuális csapatbeli szerepkörével, a Dashboard sidebar ez alapján szűri a modulokat.

**Tech Stack:** PostgreSQL (Supabase), React 18 + Vite, react-router-dom, `@supabase/supabase-js`. Nincs automata teszt-keretrendszer a projektben (nincs `test` script a `package.json`-ban) — a projekt eddigi gyakorlatát követve minden lépés SQL-lekérdezéssel (`psql`) vagy böngészős manuális ellenőrzéssel verifikálandó, nem unit teszttel.

## Global Constraints

- Adatbázis: Supabase projekt `nyrtfogyijaeytqtgvey` (`.env`-ben `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`), session pooler connection string: `postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`, jelszó a felhasználónál (`Betonkevero88`).
- `role` érték-készlet mindenhol pontosan: `'coach'`, `'fitness_coach'`, `'physiotherapist'` (idézőjelek, kisbetű, ez már létező érték a `profiles.role`-ban is).
- `module_key` érték-készlet mindenhol pontosan: `'players'`, `'macrocycle'`, `'calendar'`, `'exercises'`, `'templates'`, `'matches'`, `'measurement'`, `'stats'`, `'rehab'`.
- `access_level` érték-készlet: `'none'`, `'view'`, `'edit'`.
- Migrációs SQL fájlokat a `supabase/migrations/` mappába kell tenni, dátum-prefixes névvel (`YYYYMMDDHHMMSS_leiras.sql`), a meglévő fájlok mintáját követve.
- Minden migrációt a session pooler connection string-gel kell alkalmazni `psql -f <fájl>`-lel (nincs kapcsolat közvetlen IPv6-on keresztül ezen a hálózaton).

---

## Fájlstruktúra

**Új fájlok:**
- `supabase/migrations/20260720120000_team_membership_schema.sql` — táblák, függvény, backfill, alap jogosultság-seed
- `supabase/migrations/20260720120100_teams_membership_rls.sql` — `teams`/`team_members`/`team_invites`/`team_module_permissions` policy-k
- `supabase/migrations/20260720120200_players_module_rls.sql` — `players`, `training_locations`
- `supabase/migrations/20260720120300_planning_module_rls.sql` — `macrocycle_templates`, `macrocycle_planning`, `training_sessions`, `training_templates`
- `supabase/migrations/20260720120400_matches_measurement_module_rls.sql` — `matches`, `tactics_technique`, `measurements`, `training_load_factors`
- `supabase/migrations/20260720120500_rehab_module_rls.sql` — `player_anamnesis`, `player_documents`, `player_attendance`
- `src/lib/permissions.js` — `MODULES`, `ROLES`, `DEFAULT_PERMISSIONS` konstansok (JS oldali tükre a defaultnak, UI-hoz)
- `src/pages/JoinTeam.jsx` — meghívó link beváltó oldal (`/join/:token`)
- `src/components/TeamMembersPanel.jsx` — tagok lista + meghívás + jogosultsági mátrix szerkesztő

**Módosított fájlok:**
- `src/context/TeamContext.jsx` — csapat-lekérdezés `team_members`-en keresztül, `currentUserRole` state
- `src/App.jsx` — `/join/:token` route hozzáadása
- `src/pages/Teams.jsx` — "Tag meghívása" gomb + `TeamMembersPanel` beillesztés
- `src/pages/Dashboard.jsx` — sidebar modul-szűrés a csapat-szerepkör jogosultsága alapján

---

### Task 1: Séma — team_members, team_invites, team_module_permissions

**Files:**
- Create: `supabase/migrations/20260720120000_team_membership_schema.sql`

**Interfaces:**
- Produces: `public.has_team_access(p_team_id uuid, p_module text, p_min_level text) returns boolean` — minden későbbi RLS task ezt hívja.
- Produces: táblák `team_members(id, team_id, user_id, role, joined_at)`, `team_invites(id, team_id, token, role, created_by, expires_at, used_at, used_by)`, `team_module_permissions(team_id, role, module_key, access_level)`.

- [ ] **Step 1: Migrációs SQL megírása**

```sql
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
```

- [ ] **Step 2: Migráció alkalmazása**

Run (PowerShell/Bash, `PGPASSWORD` a projekt DB jelszava):
```
export PGPASSWORD='Betonkevero88'
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20260720120000_team_membership_schema.sql
```
Expected: nincs `ERROR` sor a kimenetben (a `CREATE TABLE`/`CREATE FUNCTION`/`CREATE TRIGGER`/`INSERT` parancsok mind sikeresek).

- [ ] **Step 3: Backfill ellenőrzése**

Run:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -c "select tm.role, count(*) from team_members tm group by tm.role;" \
  -c "select count(*) from team_module_permissions;"
```
Expected: minden meglévő csapatra (jelenleg 3: `U16`, `U18`, `Teszt Csapat`) egy `coach` sor a `team_members`-ben, és 3 csapat × 9 modul × 3 szerepkör = 81 sor a `team_module_permissions`-ben.

- [ ] **Step 4: Új csapat trigger ellenőrzése**

Run:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -c "insert into teams (name, created_by) values ('Plan Test Team', '86ecfd98-fe6a-4240-945b-d03cc501ac1b') returning id;"
```
Jegyezd fel a visszaadott `id`-t, majd:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -c "select count(*) from team_members where team_id = '<ID>';" \
  -c "select count(*) from team_module_permissions where team_id = '<ID>';"
```
Expected: `team_members` = 1 sor (`coach`, `86ecfd98-...`), `team_module_permissions` = 9 sor. Utána töröld a teszt csapatot: `delete from teams where id = '<ID>';` (cascade törli a members/permissions sorokat is).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260720120000_team_membership_schema.sql
git commit -m "feat: add team_members, team_invites, team_module_permissions schema"
```

---

### Task 2: RLS — teams, team_members, team_invites, team_module_permissions

**Files:**
- Create: `supabase/migrations/20260720120100_teams_membership_rls.sql`

**Interfaces:**
- Consumes: `public.has_team_access()` (Task 1)
- Produces: `teams` tábla policy-i mostantól tagságon alapulnak, nem csak `created_by`-on.

- [ ] **Step 1: Migrációs SQL megírása**

```sql
-- supabase/migrations/20260720120100_teams_membership_rls.sql

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_module_permissions ENABLE ROW LEVEL SECURITY;

-- team_members: tagok látják egymást a saját csapatukban; csak a
-- csapat tulajdonosa (teams.created_by) írhat (meghívás beváltása
-- SECURITY DEFINER függvényen keresztül megy, ld. Task 9, nem itt).
CREATE POLICY "members can view team_members of their teams" ON public.team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "owner can manage team_members" ON public.team_members
  FOR ALL USING (
    team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  ) WITH CHECK (
    team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  );

-- team_invites: csak a csapat tulajdonosa látja/kezeli
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
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
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
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "owner can update their teams" ON public.teams
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "owner can delete their teams" ON public.teams
  FOR DELETE USING (created_by = auth.uid());
```

- [ ] **Step 2: Migráció alkalmazása**

Run:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20260720120100_teams_membership_rls.sql
```
Expected: nincs `ERROR`.

- [ ] **Step 3: Ellenőrzés — tag lát csapatot, nem-tag nem**

Run két lekérdezést, az egyik a meglévő teszt userrel (`86ecfd98-fe6a-4240-945b-d03cc501ac1b`, `teszt.migracio1@gmail.com`, tagja a "Teszt Csapat"-nak), a másik a `malajka23@gmail.com` userrel (`3ec1c493-6855-45a6-9763-42a046f07cd8`, tagja `U16`/`U18`-nak, NEM tagja "Teszt Csapat"-nak):

```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" -c "
set role authenticated;
set request.jwt.claim.sub = '86ecfd98-fe6a-4240-945b-d03cc501ac1b';
select name from teams;
reset role;
"
```
Expected: csak `Teszt Csapat` jön vissza (a `set request.jwt.claim.sub` szimulálja az `auth.uid()`-ot RLS teszthez).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260720120100_teams_membership_rls.sql
git commit -m "feat: rewrite teams RLS to use team membership"
```

---

### Task 3: RLS — players, training_locations (modul: players)

**Files:**
- Create: `supabase/migrations/20260720120200_players_module_rls.sql`

**Interfaces:**
- Consumes: `public.has_team_access()` (Task 1)

- [ ] **Step 1: Migrációs SQL megírása**

```sql
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
```

- [ ] **Step 2: Migráció alkalmazása és ellenőrzés**

Run:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20260720120200_players_module_rls.sql
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" -c "
set role authenticated;
set request.jwt.claim.sub = '86ecfd98-fe6a-4240-945b-d03cc501ac1b';
select name from players where team_id = '37a4ab72-5170-4de0-b2e1-faff4a8f08f1';
reset role;
"
```
Expected: `Teszt Játékos` visszaadva (a teszt user `coach` szerepkörrel `edit`/`view` mindkettőt megkapja a `players` modulra a Task 1 default seed alapján).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260720120200_players_module_rls.sql
git commit -m "feat: rewrite players/training_locations RLS to module permissions"
```

---

### Task 4: RLS — macrocycle_templates, macrocycle_planning, training_sessions, training_templates

**Files:**
- Create: `supabase/migrations/20260720120300_planning_module_rls.sql`

**Interfaces:**
- Consumes: `public.has_team_access()` (Task 1)

- [ ] **Step 1: Migrációs SQL megírása**

```sql
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
```

> Megjegyzés: futtatás előtt ellenőrizd a tényleges policy-neveket a projektben (`select policyname from pg_policies where tablename in ('macrocycle_templates','macrocycle_planning','training_sessions','training_templates');`) — a `DROP POLICY IF EXISTS` biztonságos akkor is, ha egy név nem egyezik pontosan, de a tényleges nevekkel egyezőnek kell lennie a régi policy eltávolításához (`IF EXISTS` csak azt jelenti, hogy nem hibázik, ha nincs ilyen nevű, de ha a régi más néven fut, az megmarad és OR-kapcsolatban felülírja az új korlátozást).

- [ ] **Step 2: Migráció alkalmazása és ellenőrzés**

Run:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20260720120300_planning_module_rls.sql
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" -c "
select tablename, policyname from pg_policies
where tablename in ('macrocycle_templates','macrocycle_planning','training_sessions','training_templates')
order by tablename;
"
```
Expected: csak az új (`... by module permission`) nevű policy-k szerepelnek táblánként, a régiek eltűntek.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260720120300_planning_module_rls.sql
git commit -m "feat: rewrite macrocycle/calendar/templates RLS to module permissions"
```

---

### Task 5: RLS — matches, tactics_technique, measurements, training_load_factors

**Files:**
- Create: `supabase/migrations/20260720120400_matches_measurement_module_rls.sql`

**Interfaces:**
- Consumes: `public.has_team_access()` (Task 1)

**Fontos döntés:** a `measurements` tábla SELECT policy-ja `measurement` VAGY `stats` modulon keresztül is átengedi az olvasást, mert a Ranglista/Progresszió modulok ugyanebből a táblából olvasnak, és a spec szerint `stats` mindig legalább `view` mindhárom szerepkörnek — így akkor is látják az összesítő nézeteket, ha az owner a `measurement` modult `none`-ra állítja az adott szerepkörnek.

- [ ] **Step 1: Migrációs SQL megírása**

```sql
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
DROP POLICY IF EXISTS "Users can view measurements for their teams" ON public.measurements;
DROP POLICY IF EXISTS "Users can create measurements for their teams" ON public.measurements;
DROP POLICY IF EXISTS "Users can update measurements for their teams" ON public.measurements;
DROP POLICY IF EXISTS "Users can delete measurements for their teams" ON public.measurements;

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
```

> Ugyanaz a policy-név ellenőrzési figyelmeztetés érvényes itt is, mint Task 4-ben: `select policyname from pg_policies where tablename in ('matches','tactics_technique','measurements','training_load_factors');` a tényleges nevek megerősítésére a `DROP` előtt.

- [ ] **Step 2: Migráció alkalmazása és ellenőrzés**

Run:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20260720120400_matches_measurement_module_rls.sql
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" -c "
select tablename, policyname from pg_policies
where tablename in ('matches','tactics_technique','measurements','training_load_factors')
order by tablename;
"
```
Expected: csak az új `... by module permission` policy-k.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260720120400_matches_measurement_module_rls.sql
git commit -m "feat: rewrite matches/measurement RLS to module permissions"
```

---

### Task 6: RLS — player_anamnesis, player_documents, player_attendance (modul: rehab)

**Files:**
- Create: `supabase/migrations/20260720120500_rehab_module_rls.sql`

**Interfaces:**
- Consumes: `public.has_team_access()` (Task 1)

- [ ] **Step 1: Migrációs SQL megírása**

```sql
-- supabase/migrations/20260720120500_rehab_module_rls.sql

DROP POLICY IF EXISTS "Users can view anamnesis for their teams" ON public.player_anamnesis;
DROP POLICY IF EXISTS "Users can create anamnesis for their teams" ON public.player_anamnesis;
DROP POLICY IF EXISTS "Users can update anamnesis for their teams" ON public.player_anamnesis;
DROP POLICY IF EXISTS "Users can delete anamnesis for their teams" ON public.player_anamnesis;

CREATE POLICY "view player_anamnesis by module permission" ON public.player_anamnesis
  FOR SELECT USING (has_team_access(team_id, 'rehab', 'view'));
CREATE POLICY "insert player_anamnesis by module permission" ON public.player_anamnesis
  FOR INSERT WITH CHECK (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "update player_anamnesis by module permission" ON public.player_anamnesis
  FOR UPDATE USING (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "delete player_anamnesis by module permission" ON public.player_anamnesis
  FOR DELETE USING (has_team_access(team_id, 'rehab', 'edit'));

DROP POLICY IF EXISTS "Users can view documents for their teams" ON public.player_documents;
DROP POLICY IF EXISTS "Users can upload documents for their teams" ON public.player_documents;
DROP POLICY IF EXISTS "Users can update documents for their teams" ON public.player_documents;
DROP POLICY IF EXISTS "Users can delete documents for their teams" ON public.player_documents;

CREATE POLICY "view player_documents by module permission" ON public.player_documents
  FOR SELECT USING (has_team_access(team_id, 'rehab', 'view'));
CREATE POLICY "insert player_documents by module permission" ON public.player_documents
  FOR INSERT WITH CHECK (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "update player_documents by module permission" ON public.player_documents
  FOR UPDATE USING (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "delete player_documents by module permission" ON public.player_documents
  FOR DELETE USING (has_team_access(team_id, 'rehab', 'edit'));

DROP POLICY IF EXISTS "Users can view attendance for their teams" ON public.player_attendance;
DROP POLICY IF EXISTS "Users can create attendance for their teams" ON public.player_attendance;
DROP POLICY IF EXISTS "Users can update attendance for their teams" ON public.player_attendance;
DROP POLICY IF EXISTS "Users can delete attendance for their teams" ON public.player_attendance;

CREATE POLICY "view player_attendance by module permission" ON public.player_attendance
  FOR SELECT USING (has_team_access(team_id, 'rehab', 'view'));
CREATE POLICY "insert player_attendance by module permission" ON public.player_attendance
  FOR INSERT WITH CHECK (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "update player_attendance by module permission" ON public.player_attendance
  FOR UPDATE USING (has_team_access(team_id, 'rehab', 'edit'));
CREATE POLICY "delete player_attendance by module permission" ON public.player_attendance
  FOR DELETE USING (has_team_access(team_id, 'rehab', 'edit'));

-- storage.objects policy a player-documents bucket-hez: a filePath
-- '<team_id>/<player_id>/<fájlnév>' formátumú (ld. src/components/DocumentUpload.jsx),
-- az első path-szegmens a team_id.
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

CREATE POLICY "view player-documents by module permission" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'player-documents'
    AND has_team_access((storage.foldername(name))[1]::uuid, 'rehab', 'view')
  );
CREATE POLICY "insert player-documents by module permission" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'player-documents'
    AND has_team_access((storage.foldername(name))[1]::uuid, 'rehab', 'edit')
  );
CREATE POLICY "delete player-documents by module permission" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'player-documents'
    AND has_team_access((storage.foldername(name))[1]::uuid, 'rehab', 'edit')
  );
```

> A `storage.objects` policy-khoz előbb futtasd le `select policyname from pg_policies where tablename = 'objects' and schemaname = 'storage';`-t, és a `DROP POLICY IF EXISTS` sorokat igazítsd a ténylegesen létező nevekhez (a migrációs dump nem tartalmazta sértetlenül ezt a részt — ld. korábbi restore log —, ezért az új projektben lehet, hogy egyáltalán nincs még custom policy a `player-documents` bucket-en, csak a Supabase alapértelmezett `storage.objects` RLS van kikapcsolva/engedélyezve; ha a `DROP` semmit nem talál, az rendben van, a `CREATE POLICY` attól még létrejön).

- [ ] **Step 2: Migráció alkalmazása és ellenőrzés**

Run:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20260720120500_rehab_module_rls.sql
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" -c "
select tablename, policyname from pg_policies
where tablename in ('player_anamnesis','player_documents','player_attendance')
order by tablename;
"
```
Expected: csak az új `... by module permission` policy-k.

- [ ] **Step 3: Böngészős regressziós ellenőrzés**

Nyisd meg `http://localhost:5173`, jelentkezz be `teszt.migracio1@gmail.com`-mal, navigálj Rehabilitáció → Teszt Játékos → Dokumentumok. Expected: a korábban (a Task 6 előtt) feltöltött "Teszt dokumentum" továbbra is látszik a listában (RLS csere nem törölte a hozzáférést a saját csapat tulajdonosától).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260720120500_rehab_module_rls.sql
git commit -m "feat: rewrite rehab tables and storage RLS to module permissions"
```

---

### Task 7: `src/lib/permissions.js` — megosztott konstansok

**Files:**
- Create: `src/lib/permissions.js`

**Interfaces:**
- Produces: `MODULES` (`[{key, name}]`), `ROLES` (`[{key, name}]`), `DEFAULT_PERMISSIONS` (`{[role]: {[module_key]: access_level}}`) — Task 8 (TeamContext), Task 10 (invite UI) és Task 11 (permission editor) mind ezt importálja, hogy a modul/szerepkör listák egy helyen legyenek karbantartva.

- [ ] **Step 1: Fájl megírása**

```javascript
// src/lib/permissions.js

export const MODULES = [
  { key: 'players', name: 'Csapatok / Játékosok' },
  { key: 'macrocycle', name: 'Makrociklus Tervező' },
  { key: 'calendar', name: 'Edzésnaptár' },
  { key: 'exercises', name: 'Gyakorlat Könyvtár' },
  { key: 'templates', name: 'Edzéssablonok' },
  { key: 'matches', name: 'Mérkőzések' },
  { key: 'measurement', name: 'Mérési modul' },
  { key: 'stats', name: 'Ranglista / Progresszió' },
  { key: 'rehab', name: 'Rehabilitáció' },
]

export const ROLES = [
  { key: 'coach', name: 'Vezetőedző' },
  { key: 'fitness_coach', name: 'Erőnléti edző' },
  { key: 'physiotherapist', name: 'Gyógytornász' },
]

export const ACCESS_LEVELS = [
  { key: 'none', name: 'Nincs' },
  { key: 'view', name: 'Megtekint' },
  { key: 'edit', name: 'Szerkeszt' },
]

// A dashboard sidebar modulok id-jai (Dashboard.jsx `modules` tömb `id`
// mezője) és a jogosultsági module_key-ek közötti megfeleltetés.
// A 'home' és 'trainingload' (1RM Kalkulátor) nincs benne: mindig
// elérhető minden csapattagnak, nem íródik adatbázisba.
export const DASHBOARD_MODULE_TO_PERMISSION_KEY = {
  teams: 'players',
  macrocycle: 'macrocycle',
  calendar: 'calendar',
  exercises: 'exercises',
  templates: 'templates',
  matches: 'matches',
  measurement: 'measurement',
  leaderboard: 'stats',
  progress: 'stats',
  rehab: 'rehab',
}

// Egy adott modul_key-hez tartozó access_level alapján eldönti, látszik-e
// a sidebar-ban egyáltalán ('none' esetén nem).
export function isModuleVisible(permissions, moduleKey) {
  if (!moduleKey) return true
  return permissions?.[moduleKey] === 'view' || permissions?.[moduleKey] === 'edit'
}

// Van-e szerkesztési joga az adott modulhoz.
export function canEditModule(permissions, moduleKey) {
  if (!moduleKey) return true
  return permissions?.[moduleKey] === 'edit'
}
```

- [ ] **Step 2: Manuális ellenőrzés**

Run (Node-dal, hogy szintaktikailag helyes-e az ES module import):
```
node -e "import('./src/lib/permissions.js').then(m => console.log(m.MODULES.length, m.ROLES.length))"
```
Expected kimenet: `9 3`

- [ ] **Step 3: Commit**

```bash
git add src/lib/permissions.js
git commit -m "feat: add shared module/role/permission constants"
```

---

### Task 8: `TeamContext.jsx` — csapat-tagság alapú lekérdezés

**Files:**
- Modify: `src/context/TeamContext.jsx`

**Interfaces:**
- Consumes: `MODULES`, `DASHBOARD_MODULE_TO_PERMISSION_KEY` nem kell közvetlenül itt, csak a `team_members`/`team_module_permissions` táblák.
- Produces: `useTeams()` visszatérési értéke bővül `currentUserRole` (string vagy `null`) és `currentUserPermissions` (`{[module_key]: access_level}`) mezőkkel — ezeket Task 11 (Dashboard sidebar) és Task 10 (permission editor jogosultság-ellenőrzés) használja.

- [ ] **Step 1: `fetchTeams` átírása tagság-alapúra, `currentUserRole`/`currentUserPermissions` hozzáadása**

```javascript
// src/context/TeamContext.jsx — teljes új tartalom

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TeamContext = createContext()

export function TeamProvider({ children, session }) {
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [currentUserPermissions, setCurrentUserPermissions] = useState({})

  useEffect(() => {
    if (session?.user?.id) {
      fetchTeams()
    }
  }, [session])

  useEffect(() => {
    if (selectedTeam?.id && session?.user?.id) {
      fetchRoleAndPermissions(selectedTeam.id)
    } else {
      setCurrentUserRole(null)
      setCurrentUserPermissions({})
    }
  }, [selectedTeam, session])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const { data: memberships, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('user_id', session.user.id)

      if (memberError) throw memberError

      const teamList = (memberships || [])
        .map((m) => m.teams)
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setTeams(teamList)

      if (!selectedTeam && teamList.length > 0) {
        setSelectedTeam(teamList[0])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleAndPermissions = async (teamId) => {
    try {
      const { data: memberRow, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', session.user.id)
        .single()

      if (memberError) throw memberError

      setCurrentUserRole(memberRow.role)

      const { data: permRows, error: permError } = await supabase
        .from('team_module_permissions')
        .select('module_key, access_level')
        .eq('team_id', teamId)
        .eq('role', memberRow.role)

      if (permError) throw permError

      const permMap = {}
      for (const row of permRows || []) {
        permMap[row.module_key] = row.access_level
      }
      setCurrentUserPermissions(permMap)
    } catch (error) {
      console.error('Error fetching role/permissions:', error)
      setCurrentUserRole(null)
      setCurrentUserPermissions({})
    }
  }

  const createTeam = async (teamData) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{ ...teamData, created_by: session.user.id }])
        .select()
        .single()

      if (error) throw error

      setTeams([data, ...teams])
      setSelectedTeam(data)
      return { success: true, data }
    } catch (error) {
      console.error('Error creating team:', error)
      return { success: false, error: error.message }
    }
  }

  const updateTeam = async (teamId, teamData) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({ ...teamData, updated_at: new Date().toISOString() })
        .eq('id', teamId)
        .select()
        .single()

      if (error) throw error

      setTeams(teams.map((t) => (t.id === teamId ? data : t)))
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(data)
      }
      return { success: true, data }
    } catch (error) {
      console.error('Error updating team:', error)
      return { success: false, error: error.message }
    }
  }

  const deleteTeam = async (teamId) => {
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId)

      if (error) throw error

      const newTeams = teams.filter((t) => t.id !== teamId)
      setTeams(newTeams)

      if (selectedTeam?.id === teamId) {
        setSelectedTeam(newTeams.length > 0 ? newTeams[0] : null)
      }
      return { success: true }
    } catch (error) {
      console.error('Error deleting team:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    teams,
    selectedTeam,
    setSelectedTeam,
    loading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    currentUserRole,
    currentUserPermissions,
    isTeamOwner: selectedTeam?.created_by === session?.user?.id,
  }

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeams() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeams must be used within TeamProvider')
  }
  return context
}
```

- [ ] **Step 2: Böngészős ellenőrzés**

Indítsd el `npm run dev`-vel, jelentkezz be `teszt.migracio1@gmail.com`-mal (a "Teszt Csapat" tulajdonosa), nyisd meg a böngésző konzolt, és futtasd:
```javascript
// ideiglenesen tedd be a Dashboard.jsx-be egy console.log(currentUserRole, currentUserPermissions)-ot,
// vagy React DevTools-szal nézd meg a TeamProvider context értékét
```
Expected: `currentUserRole` = `'coach'`, `currentUserPermissions` egy 9 kulcsú objektum (`players: 'edit'`, `rehab: 'edit'`, `matches: 'edit'`, stb. a Task 1 default mátrix szerint), és a Dashboard továbbra is betölt hibátlanul (a régi `created_by` alapú lekérdezés helyett most a `team_members` join fut, de ugyanazt a csapatlistát kell visszaadnia).

- [ ] **Step 3: Commit**

```bash
git add src/context/TeamContext.jsx
git commit -m "feat: fetch teams via team_members, expose current user role/permissions"
```

---

### Task 9: Meghívó generálás — `TeamMembersPanel.jsx` (1. rész: tagok + meghívás)

**Files:**
- Create: `src/components/TeamMembersPanel.jsx`
- Modify: `src/pages/Teams.jsx`

**Interfaces:**
- Consumes: `useTeams()` → `selectedTeam`, `isTeamOwner` (Task 8); `ROLES` (Task 7)
- Produces: `<TeamMembersPanel team={selectedTeam} isOwner={isTeamOwner} />` — Task 11 (permission editor) ugyanebbe a fájlba kerül bele (2. rész), ugyanaz a komponens, lentebb bővítve.

- [ ] **Step 1: `TeamMembersPanel.jsx` megírása (tagok lista + meghívás rész)**

```javascript
// src/components/TeamMembersPanel.jsx

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/permissions'
import { UserPlus, Trash2, Copy, X } from 'lucide-react'

export default function TeamMembersPanel({ team, isOwner }) {
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteRole, setInviteRole] = useState('fitness_coach')
  const [generatedLink, setGeneratedLink] = useState(null)

  useEffect(() => {
    if (team?.id) {
      fetchMembersAndInvites()
    }
  }, [team])

  const fetchMembersAndInvites = async () => {
    try {
      setLoading(true)
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('id, user_id, role, joined_at, profiles(email, full_name)')
        .eq('team_id', team.id)
        .order('joined_at', { ascending: true })

      if (memberError) throw memberError
      setMembers(memberData || [])

      if (isOwner) {
        const { data: inviteData, error: inviteError } = await supabase
          .from('team_invites')
          .select('id, token, role, expires_at, created_at')
          .eq('team_id', team.id)
          .is('used_at', null)
          .order('created_at', { ascending: false })

        if (inviteError) throw inviteError
        setPendingInvites(inviteData || [])
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('team_invites')
        .insert({ team_id: team.id, role: inviteRole, created_by: (await supabase.auth.getUser()).data.user.id })
        .select()
        .single()

      if (error) throw error

      const link = `${window.location.origin}/join/${data.token}`
      setGeneratedLink(link)
      fetchMembersAndInvites()
    } catch (error) {
      console.error('Error generating invite:', error)
      alert('Hiba történt a meghívó létrehozásakor')
    }
  }

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm('Biztosan visszavonod ezt a meghívót?')) return
    try {
      const { error } = await supabase.from('team_invites').delete().eq('id', inviteId)
      if (error) throw error
      fetchMembersAndInvites()
    } catch (error) {
      console.error('Error revoking invite:', error)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Biztosan eltávolítod ezt a tagot a csapatból?')) return
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId)
      if (error) throw error
      fetchMembersAndInvites()
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  const roleLabel = (roleKey) => ROLES.find((r) => r.key === roleKey)?.name || roleKey

  if (loading) return <div className="text-slate-400 text-sm">Betöltés...</div>

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Csapattagok</h3>
          {isOwner && (
            <button
              onClick={() => {
                setShowInviteForm(true)
                setGeneratedLink(null)
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Tag meghívása
            </button>
          )}
        </div>

        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-white font-medium">{m.profiles?.full_name || m.profiles?.email}</p>
                <p className="text-sm text-slate-400">{roleLabel(m.role)}</p>
              </div>
              {isOwner && m.role !== 'coach' && (
                <button onClick={() => handleRemoveMember(m.id)} className="p-2 hover:bg-slate-600 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {isOwner && pendingInvites.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">Függő meghívók</h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{roleLabel(inv.role)}</p>
                  <p className="text-sm text-slate-400">
                    Lejár: {new Date(inv.expires_at).toLocaleDateString('hu-HU')}
                  </p>
                </div>
                <button onClick={() => handleRevokeInvite(inv.id)} className="p-2 hover:bg-slate-600 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Tag meghívása</h3>
              <button onClick={() => setShowInviteForm(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {!generatedLink ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Szerepkör</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={handleGenerateInvite} className="btn btn-primary w-full">
                  Meghívó link generálása
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Küldd el ezt a linket ({roleLabel(inviteRole)} szerepkörrel, 7 napig érvényes):
                </p>
                <div className="flex items-center gap-2 p-3 bg-slate-700 rounded-lg">
                  <code className="text-sm text-white flex-1 truncate">{generatedLink}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedLink)}
                    className="p-2 hover:bg-slate-600 rounded-lg"
                  >
                    <Copy className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
                <button onClick={() => setShowInviteForm(false)} className="btn btn-primary w-full">
                  Kész
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Beillesztés a `Teams.jsx`-be**

Nyisd meg `src/pages/Teams.jsx`-t, és a fájl tetején add hozzá az importot:
```javascript
import TeamMembersPanel from '../components/TeamMembersPanel'
import { useTeams } from '../context/TeamContext'
```
A komponens visszatérési JSX-ében, a játékos-lista kártya alá (a `selectedTeam` blokkon belül, ahol most a "Játékosok - {selectedTeam.name}" kártya van) illeszd be:
```jsx
{selectedTeam && (
  <TeamMembersPanel team={selectedTeam} isOwner={selectedTeam.created_by === session.user.id} />
)}
```
(A pontos `session` prop-elérést a meglévő `Teams.jsx` kódjából kell átvenni — ha a komponens már kapja `session`-t propként, azt használd; ha nem, importáld `useTeams()`-ből az `isTeamOwner` mezőt Task 8-ból: `const { selectedTeam, isTeamOwner } = useTeams()`.)

- [ ] **Step 3: Böngészős ellenőrzés**

`npm run dev`, jelentkezz be `teszt.migracio1@gmail.com`-mal, nyisd meg Csapatok oldalt, görgess le a "Csapattagok" kártyáig. Kattints "Tag meghívása" → válaszd "Erőnléti edző"-t → "Meghívó link generálása". Expected: megjelenik egy `http://localhost:5173/join/<64 karakteres hex token>` formátumú link.

Ellenőrizd DB-ből is:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -c "select token, role, expires_at from team_invites where team_id = '37a4ab72-5170-4de0-b2e1-faff4a8f08f1' order by created_at desc limit 1;"
```
Expected: egy sor, `role = 'fitness_coach'`, `expires_at` kb. 7 nappal a mostani időpont után.

- [ ] **Step 4: Commit**

```bash
git add src/components/TeamMembersPanel.jsx src/pages/Teams.jsx
git commit -m "feat: add team members list and invite link generation UI"
```

---

### Task 10: Meghívó beváltás — `/join/:token` route

**Files:**
- Create: `src/pages/JoinTeam.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `supabase` kliens (`src/lib/supabase.js`)
- Produces: `/join/:token` publikus route, ami bejelentkezés után beváltja a meghívót.

- [ ] **Step 1: `JoinTeam.jsx` megírása**

```javascript
// src/pages/JoinTeam.jsx

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/permissions'
import LoadingSpinner from '../components/LoadingSpinner'

export default function JoinTeam({ session }) {
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | confirm | joining | success | error
  const [invite, setInvite] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!session) {
      // Nincs bejelentkezve: irányítsuk az Auth oldalra, a token megőrzésével
      sessionStorage.setItem('pendingInviteToken', token)
      navigate('/auth')
      return
    }
    fetchInvite()
  }, [session])

  const fetchInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('team_invites')
        .select('id, team_id, role, expires_at, used_at, teams(name)')
        .eq('token', token)
        .single()

      if (error || !data) {
        setStatus('error')
        setErrorMessage('A meghívó link érvénytelen.')
        return
      }
      if (data.used_at) {
        setStatus('error')
        setErrorMessage('Ezt a meghívót már felhasználták.')
        return
      }
      if (new Date(data.expires_at) < new Date()) {
        setStatus('error')
        setErrorMessage('A meghívó link lejárt.')
        return
      }

      setInvite(data)
      setStatus('confirm')
    } catch (error) {
      console.error('Error fetching invite:', error)
      setStatus('error')
      setErrorMessage('Hiba történt a meghívó betöltésekor.')
    }
  }

  const handleAccept = async () => {
    setStatus('joining')
    try {
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: invite.team_id, user_id: session.user.id, role: invite.role })

      if (memberError) throw memberError

      const { error: inviteError } = await supabase
        .from('team_invites')
        .update({ used_at: new Date().toISOString(), used_by: session.user.id })
        .eq('id', invite.id)

      if (inviteError) throw inviteError

      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (error) {
      console.error('Error accepting invite:', error)
      setStatus('error')
      setErrorMessage('Hiba történt a csatlakozás során. Lehet, hogy már tagja vagy ennek a csapatnak.')
    }
  }

  const roleLabel = (roleKey) => ROLES.find((r) => r.key === roleKey)?.name || roleKey

  if (status === 'loading' || status === 'joining') return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        {status === 'confirm' && invite && (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Csapat meghívó</h2>
            <p className="text-slate-300 mb-6">
              Csatlakozol a(z) <strong>{invite.teams.name}</strong> csapathoz mint{' '}
              <strong>{roleLabel(invite.role)}</strong>?
            </p>
            <button onClick={handleAccept} className="btn btn-primary w-full">
              Csatlakozás
            </button>
          </>
        )}
        {status === 'success' && <p className="text-green-400">Sikeres csatlakozás! Átirányítás...</p>}
        {status === 'error' && <p className="text-red-400">{errorMessage}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Route hozzáadása `App.jsx`-hez**

Módosítsd `src/App.jsx`-t: adj hozzá egy importot és egy route-ot.

```javascript
import JoinTeam from './pages/JoinTeam'
```

A `<Routes>` blokkban, a `/dashboard` route elé:
```jsx
<Route path="/join/:token" element={<JoinTeam session={session} />} />
```

- [ ] **Step 3: Auth utáni visszairányítás a pending invite-ra**

Nyisd meg `src/pages/Auth.jsx`-t, keresd meg a sikeres bejelentkezés/regisztráció utáni logikát (ahol jelenleg a session állítódik, ami miatt az `App.jsx` átirányít `/dashboard`-ra), és a komponens tetején (vagy egy `useEffect`-ben, ami a session változásra figyel) add hozzá:
```javascript
useEffect(() => {
  const pendingToken = sessionStorage.getItem('pendingInviteToken')
  if (pendingToken && session) {
    sessionStorage.removeItem('pendingInviteToken')
    navigate(`/join/${pendingToken}`)
  }
}, [session])
```
(Ehhez `useNavigate` és `session` prop szükséges az `Auth.jsx`-ben — ha jelenleg nem kapja meg propként, vedd át `App.jsx`-ből ugyanúgy, ahogy a `Dashboard` kapja.)

- [ ] **Step 4: Böngészős ellenőrzés**

Másold ki a Task 9-ben generált meghívó linket, nyisd meg **másik böngésző-tabban kijelentkezve** (vagy inkognitóban), regisztrálj egy új teszt email-lel (pl. `teszt-tag@gmail.com`). Expected: regisztráció után automatikusan a `/join/<token>` oldalra kerülsz, látod "Csatlakozol a Teszt Csapat csapathoz mint Erőnléti edző?" szöveget, "Csatlakozás" gombra kattintva sikeres üzenet, majd a Dashboard-on megjelenik a "Teszt Csapat".

Ellenőrizd DB-ből:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -c "select tm.role, p.email from team_members tm join profiles p on p.id = tm.user_id where tm.team_id = '37a4ab72-5170-4de0-b2e1-faff4a8f08f1';"
```
Expected: két sor — `coach` / `teszt.migracio1@gmail.com` és `fitness_coach` / `teszt-tag@gmail.com`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/JoinTeam.jsx src/App.jsx src/pages/Auth.jsx
git commit -m "feat: add invite link redemption flow"
```

---

### Task 11: Jogosultsági mátrix szerkesztő — `TeamMembersPanel.jsx` bővítése

**Files:**
- Modify: `src/components/TeamMembersPanel.jsx`

**Interfaces:**
- Consumes: `MODULES`, `ROLES`, `ACCESS_LEVELS` (Task 7)

- [ ] **Step 1: Permission mátrix state és lekérdezés hozzáadása**

`src/components/TeamMembersPanel.jsx` tetején bővítsd az importot:
```javascript
import { ROLES, MODULES, ACCESS_LEVELS } from '../lib/permissions'
```
A komponens elején, a meglévő state-ek mellé:
```javascript
const [permissions, setPermissions] = useState({}) // { [role]: { [module_key]: access_level } }
const [savingPermissions, setSavingPermissions] = useState(false)
```
A `fetchMembersAndInvites` függvénybe (a `try` blokk végére, a `pendingInvites` beállítása után) told be:
```javascript
if (isOwner) {
  const { data: permData, error: permError } = await supabase
    .from('team_module_permissions')
    .select('role, module_key, access_level')
    .eq('team_id', team.id)

  if (permError) throw permError

  const permMap = {}
  for (const row of permData || []) {
    if (!permMap[row.role]) permMap[row.role] = {}
    permMap[row.role][row.module_key] = row.access_level
  }
  setPermissions(permMap)
}
```

- [ ] **Step 2: Mátrix szerkesztő UI és mentés hozzáadása**

A komponens `return`-jében, a "Csapattagok" kártya és a "Függő meghívók" kártya közé (vagy után) illeszd be:

```jsx
{isOwner && (
  <div className="card">
    <h3 className="text-lg font-bold text-white mb-4">Jogosultságok</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left text-slate-400 p-2">Modul</th>
            {ROLES.map((r) => (
              <th key={r.key} className="text-left text-slate-400 p-2">
                {r.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod) => (
            <tr key={mod.key} className="border-t border-slate-700">
              <td className="p-2 text-white">{mod.name}</td>
              {ROLES.map((r) => (
                <td key={r.key} className="p-2">
                  <select
                    value={permissions[r.key]?.[mod.key] || 'none'}
                    onChange={(e) => handlePermissionChange(r.key, mod.key, e.target.value)}
                    className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                  >
                    {ACCESS_LEVELS.map((lvl) => (
                      <option key={lvl.key} value={lvl.key}>
                        {lvl.name}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <button
      onClick={handleSavePermissions}
      disabled={savingPermissions}
      className="btn btn-primary mt-4 disabled:opacity-50"
    >
      {savingPermissions ? 'Mentés...' : 'Jogosultságok mentése'}
    </button>
  </div>
)}
```

A komponens függvényei közé (a `handleRemoveMember` után) told be:
```javascript
const handlePermissionChange = (role, moduleKey, accessLevel) => {
  setPermissions((prev) => ({
    ...prev,
    [role]: { ...prev[role], [moduleKey]: accessLevel },
  }))
}

const handleSavePermissions = async () => {
  setSavingPermissions(true)
  try {
    const rows = []
    for (const role of ROLES.map((r) => r.key)) {
      for (const mod of MODULES.map((m) => m.key)) {
        rows.push({
          team_id: team.id,
          role,
          module_key: mod,
          access_level: permissions[role]?.[mod] || 'none',
        })
      }
    }

    const { error } = await supabase
      .from('team_module_permissions')
      .upsert(rows, { onConflict: 'team_id,role,module_key' })

    if (error) throw error
    alert('Jogosultságok elmentve!')
  } catch (error) {
    console.error('Error saving permissions:', error)
    alert('Hiba történt a mentés során')
  } finally {
    setSavingPermissions(false)
  }
}
```

- [ ] **Step 2: Böngészős ellenőrzés**

`npm run dev`, jelentkezz be `teszt.migracio1@gmail.com`-mal (tulajdonos), Csapatok oldal → "Jogosultságok" táblázat. Állítsd a "Gyógytornász" sor "Mérkőzések" celláját "Megtekint"-re, kattints "Jogosultságok mentése". Expected: "Jogosultságok elmentve!" alert.

Ellenőrizd DB-ből:
```
psql "postgresql://postgres.nyrtfogyijaeytqtgvey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -c "select access_level from team_module_permissions where team_id = '37a4ab72-5170-4de0-b2e1-faff4a8f08f1' and role = 'physiotherapist' and module_key = 'matches';"
```
Expected: `view`.

- [ ] **Step 3: Commit**

```bash
git add src/components/TeamMembersPanel.jsx
git commit -m "feat: add editable permission matrix UI"
```

---

### Task 12: Dashboard sidebar szűrés jogosultság alapján

**Files:**
- Modify: `src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `useTeams()` → `currentUserPermissions` (Task 8); `DASHBOARD_MODULE_TO_PERMISSION_KEY`, `isModuleVisible` (Task 7)

- [ ] **Step 1: Sidebar modul-lista szűrése**

`src/pages/Dashboard.jsx` tetején add hozzá az importot:
```javascript
import { useTeams } from '../context/TeamContext'
import { DASHBOARD_MODULE_TO_PERMISSION_KEY, isModuleVisible } from '../lib/permissions'
```

A `Dashboard` komponens elején (a meglévő `useState` hívások mellé):
```javascript
const { currentUserPermissions } = useTeams()
```

A `modules` tömb definíciója után, a `nav` renderelés előtt szűrd a listát:
```javascript
const visibleModules = modules.filter((module) => {
  const permissionKey = DASHBOARD_MODULE_TO_PERMISSION_KEY[module.id]
  return isModuleVisible(currentUserPermissions, permissionKey)
})
```

A `nav` blokkban cseréld a `modules.map(...)`-ot `visibleModules.map(...)`-ra (mindkét helyen, ha a sidebar és a home-oldali kártyagrid is a `modules` tömböt használja — ha a home dashboard kártyagrid külön logikát használ, azt is cseréld `visibleModules`-ra).

> Megjegyzés: a `TeamProvider` a `Dashboard` komponensen belül van deklarálva (`<TeamProvider session={session}>...<Dashboard/ tartalma>...</TeamProvider>`), tehát a `useTeams()` hívás csak a `TeamProvider`-en belüli JSX-ben működik — ha a `Dashboard` maga a `TeamProvider`-t rendereli és nem annak gyereke, a `useTeams()` hívást egy belső komponensbe kell tenni, ami már a `TeamProvider` alatt van. Ellenőrizd a jelenlegi `Dashboard.jsx` struktúráját (`<TeamProvider session={session}>` sor környéke) a pontos beillesztési pont eldöntéséhez.

- [ ] **Step 2: Böngészős ellenőrzés — vezetőedző lát mindent**

`npm run dev`, jelentkezz be `teszt.migracio1@gmail.com`-mal (coach). Expected: minden modul látszik a sidebar-ban (9 modul + Dashboard + Profil), mert a `coach` szerepkör alapértelmezésben mindenhez `edit`/`view` hozzáférést kap.

- [ ] **Step 3: Böngészős ellenőrzés — korlátozott szerepkör**

Jelentkezz be a Task 10-ben létrehozott `teszt-tag@gmail.com` fiókkal (`fitness_coach` a "Teszt Csapat"-ban). Expected sidebar: Dashboard, Csapatok, Makrociklus Tervező, Edzésnaptár, Gyakorlat Könyvtár, Edzéssablonok, Mérkőzések (mert a Task 11-ben `view`-ra állítottad a fizio sorban, de a fitness_coach-nál változatlanul `view` default), Mérési modul, Ranglista, Progresszió — de **NEM** Rehabilitáció (mert `fitness_coach` + `rehab` = `none` a default mátrixban).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: filter dashboard sidebar modules by team role permissions"
```

---

## Végső regressziós ellenőrzés

- [ ] **Teljes flow újra végigfuttatása egy tiszta böngésző-session-ben:** csapat tulajdonos meghívót generál → új user regisztrál és csatlakozik a linkkel → tulajdonos módosít egy jogosultságot → az új user frissíti az oldalt és a módosított jogosultság szerint látja/nem látja a modult.
- [ ] **Meglévő, migráció előtti funkciók törésmentessége:** `malajka23@gmail.com`-mal bejelentkezve (eredeti, migrált user) az `U16`/`U18` csapatok minden adata (36 játékos, 1264 mérés, 28 edzés, 5 meccs) továbbra is elérhető és szerkeszthető — ez igazolja, hogy a régi `created_by`-tulajdonos automatikusan `coach` taggá lett a Task 1 backfill során, és az új RLS policy-k nem zárták ki a valódi adatokból.
