# Csapat tagság és szerepkör-alapú jogosultságok

## Cél

Jelenleg egy csapatot (`teams`) kizárólag a létrehozója (`created_by`) éri el — minden RLS policy `created_by = auth.uid()` alapú. A cél, hogy egy csapathoz több felhasználó is csatlakozhasson (vezetőedző, erőnléti edző, gyógytornász), meghívó linken keresztül, és a csapat tulajdonosa app-on belül szabályozhassa, melyik szerepkör melyik modulhoz milyen szintű hozzáférést kap (nincs / megtekint / szerkeszt).

## Nem cél

- A `training_exercises` (Gyakorlat Könyvtár) tábla jelenleg globális, nem csapathoz kötött, és bármely bejelentkezett user szerkesztheti bármelyik gyakorlatot. Ez a scope nem foglalkozik ennek átalakításával — a modul jogosultsági mátrixban a "Gyakorlat Könyvtár" sor csak a modul **megjelenítését** (UI-szintű) szabályozza az adott csapatnál, az alatta lévő adatmodell globális marad.
- A meglévő `profiles.role` mező (globális, egy user egy szerepkör) megmarad, de a jogosultság-ellenőrzésben többé nem vesz részt — az új `team_members.role` az irányadó, csapatonként eltérhet ugyanannál a usernél.

## Adatmodell

### `team_members`
| oszlop | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK → teams(id) ON DELETE CASCADE | |
| user_id | uuid FK → auth.users(id) ON DELETE CASCADE | |
| role | text CHECK IN ('coach','fitness_coach','physiotherapist') | |
| joined_at | timestamptz default now() | |
| UNIQUE(team_id, user_id) | | egy user egy csapatban egy szerepkörrel |

Csapat létrehozásakor (trigger vagy app-oldali insert a `teams` insert után) a létrehozó automatikusan bekerül `role='coach'`-csal.

### `team_invites`
| oszlop | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK → teams(id) ON DELETE CASCADE | |
| token | text UNIQUE, default random (pl. `encode(gen_random_bytes(16),'hex')`) | |
| role | text CHECK IN ('coach','fitness_coach','physiotherapist') | a meghívóhoz rögzített szerepkör |
| created_by | uuid FK → auth.users(id) | |
| expires_at | timestamptz default now() + interval '7 days' | |
| used_at | timestamptz nullable | beváltáskor kitöltve |
| used_by | uuid FK → auth.users(id) nullable | |

### `team_module_permissions`
| oszlop | típus | megjegyzés |
|---|---|---|
| team_id | uuid FK → teams(id) ON DELETE CASCADE | |
| role | text CHECK IN ('coach','fitness_coach','physiotherapist') | |
| module_key | text | ld. modul-lista lent |
| access_level | text CHECK IN ('none','view','edit') | |
| PRIMARY KEY(team_id, role, module_key) | | |

Csapat létrehozásakor automatikusan feltöltődik az alábbi alapértelmezett mátrixszal (a felhasználó ezt utólag bármikor módosíthatja a Beállítások oldalon):

| module_key | Modul | coach | fitness_coach | physiotherapist |
|---|---|---|---|---|
| players | Csapatok / Játékosok | edit | edit | view |
| macrocycle | Makrociklus Tervező | edit | edit | none |
| calendar | Edzésnaptár | edit | edit | view |
| exercises | Gyakorlat Könyvtár | edit | edit | view |
| templates | Edzéssablonok | edit | edit | none |
| matches | Mérkőzések | edit | view | none |
| measurement | Mérési modul | edit | edit | view |
| stats | Ranglista / Progresszió | view | view | view |
| rehab | Rehabilitáció | edit | none | edit |

`trainingload` (1RM Kalkulátor) nem szerepel — nem ír adatbázisba, tisztán kliensoldali kalkulátor, mindenki eléri, aki bejelentkezett és van kiválasztott csapata.

## RLS policy minta

Minden csapathoz kötött tábla (players, measurements, matches, training_sessions, macrocycle_*, training_templates, player_anamnesis, player_documents, player_attendance, tactics_technique, training_load_factors, training_locations) meglévő `created_by = auth.uid()` / `team_id IN (SELECT id FROM teams WHERE created_by = auth.uid())` feltételei lecserélődnek egy segédfüggvényre:

```sql
create or replace function public.has_team_access(p_team_id uuid, p_module text, p_min_level text)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from team_members tm
    join team_module_permissions tmp
      on tmp.team_id = tm.team_id and tmp.role = tm.role
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tmp.module_key = p_module
      and (
        (p_min_level = 'view' and tmp.access_level in ('view','edit'))
        or (p_min_level = 'edit' and tmp.access_level = 'edit')
      )
  );
$$;
```

Policy példa (players tábla, players.team_id oszlopon keresztül):

```sql
create policy "team members can view players" on players
  for select using (has_team_access(team_id, 'players', 'view'));

create policy "team members can edit players" on players
  for insert with check (has_team_access(team_id, 'players', 'edit'));
-- update/delete hasonlóan
```

A `teams` tábla saját policy-ja: SELECT mindenkinek, aki tagja (`EXISTS team_members`), UPDATE/DELETE csak `coach` szerepkörű tagoknak.

## Meghívó folyamat

1. Csapat tulajdonos (bármely `coach` szerepkörű tag — ld. korábbi döntés: csak a tulajdonos, tehát `teams.created_by = auth.uid()`, nem minden coach) a Csapatok oldalon "Tag meghívása" gombra kattint, kiválasztja a szerepkört → insert `team_invites`, link megjelenik: `https://<app>/join/<token>`.
2. A meghívott megnyitja a linket:
   - Ha nincs bejelentkezve: regisztráció/belépés, utána visszairányítás ugyanarra a linkre.
   - Ha be van jelentkezve: megerősítő képernyő ("Csatlakozol a(z) X csapathoz mint Erőnléti edző?") → gombra insert `team_members` + update `team_invites.used_at/used_by`.
3. Érvénytelen eset kezelése: lejárt (`expires_at < now()`) vagy már felhasznált (`used_at is not null`) token → hibaüzenet, nincs csatlakozás.
4. Tulajdonos a Csapat Beállítások oldalon látja a tagokat (email, szerepkör, csatlakozás dátuma) + függő meghívókat (visszavonható: `delete from team_invites where used_at is null`).

## Jogosultsági mátrix szerkesztő UI

Új "Beállítások" tab a csapat nézetben, csak a tulajdonosnak (`teams.created_by = auth.uid()`) látható:
- Táblázat: sorok = 9 modul, oszlopok = 3 szerepkör, cellánként select (Nincs/Megtekint/Szerkeszt).
- Mentéskor upsert `team_module_permissions` a csapat összes (role, module_key) kombinációjára.
- Tagok lista + meghívó generálás ugyanitt (vagy külön "Tagok" tab).

## Frontend hatás

- `TeamContext`: jelenleg feltehetően `teams.created_by = user.id` alapján tölti be a csapatokat — bővül: csapatok, ahol a user `team_members`-ben szerepel, + a user aktuális szerepköre az adott csapatban.
- `Dashboard.jsx` sidebar modul-lista szűrése: a kiválasztott csapatban a user szerepköréhez tartozó `access_level != 'none'` modulok jelennek meg; `view`-only modulokban a szerkesztő gombok/formok rejtve vagy letiltva.
- `getRoleLabel` / `profiles.role` megjelenítés a felhasználói fiók sarkban marad (globális "alap" címke), de a ténylegesen érvényes szerepkört a kiválasztott csapatnál a `team_members.role` mutatja — ha ez eltér, a UI a csapat-specifikusat jelenítse meg a sidebar alján.

## Migráció / meglévő adatok

- Minden meglévő `teams` sorhoz insert `team_members(team_id, user_id=created_by, role='coach')`.
- Minden meglévő `teams` sorhoz insert `team_module_permissions` az alapértelmezett mátrixszal.
- Miután az új RLS policy-k élesek, a régi `created_by`-alapú policy-k eltávolítandók (nem maradhat két egymásnak ellentmondó policy — Postgres RLS-ben a policy-k OR-kapcsolatban vannak, tehát a régi policy megmaradása kikerülné az új korlátozást).

## Nyitott kockázatok

- `security definer` függvény (`has_team_access`) szükséges, mert az RLS policy-n belüli subquery más táblákra (team_members, team_module_permissions) is RLS-t futtatna, ha azokon is RLS van bekapcsolva rekurzívan — a függvény ezt megkerüli, de gondosan kell definiálni a jogosultságait (csak SELECT, csak a két segédtáblára).
- A meghívó link nyilvános route-ot igényel (`/join/:token`), ami a jelenlegi SPA-ban új React Router route hozzáadását jelenti.
