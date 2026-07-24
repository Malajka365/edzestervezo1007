# Átadó dokumentum – Edzés-GIF katalógus (Code session)

Ez a leírás mindent tartalmaz, ami a folyamat folytatásához kell: a jelenlegi állapotot,
a MOST elvégzendő lépéseket (migrációk futtatása, GIF-feltöltés), és a maradék ~840 klip
katalogizálásának pontos módszerét. A repó: `C:\Users\MsGamer\Documents\GitHub\edzestervezo1007`.

---

## 1. Mi a cél
A `D:\edzes gif` mappában lévő ~900 edzés-GIF rendszerezése és bevitele az app
`training_exercises` gyakorlat-könyvtárába, típus (modalitás) + izomcsoport szerint, két rétegben:
- **coarse réteg:** 12 fő izomcsoport (elsődleges + másodlagosak),
- **részletes anatómiai réteg:** konkrét izmok latin névvel, szerep szerint (fő mozgató / segéd / stabilizáló).
Nyelv: magyar + angol név, az eredeti portugál nevet is megőrizzük. Minőség az elsődleges.

## 2. Jelenlegi állapot (KÉSZ)
A repóban már benne van és működik:
- **Migrációk** (`supabase/migrations/`):
  - `20260724000001_exercise_gif_catalog_schema.sql` – `training_exercises` bővítés + `muscle_groups`,
    `muscles`, `equipment_types`, `exercise_muscles` táblák, `muscle_role` enum, RLS, szótár-seed.
  - `20260724000002_exercise_gif_catalog_seed_chest.sql` – **63 mell-gyakorlat** + 315 izom-kapcsolat.
  - `20260724000003_exercise_gifs_storage_bucket.sql` – publikus `exercise-gifs` Storage bucket + policyk.
- **GIF-feltöltés:** `scripts/upload-exercise-gifs.mjs` + `scripts/exercise-gif-manifest.json` (jelenleg csak a mell 63 tétele).
- **App UI (kész, él):** `src/lib/exerciseTaxonomy.js` (ÚJ), `src/lib/exerciseMedia.js` (ÚJ),
  `src/pages/exercise-library/{useExerciseLibraryData.js,CreateExerciseModal.jsx,EditExerciseModal.jsx}`,
  `src/pages/ExerciseLibrary.jsx` – 12 csoportos szűrők, GIF a kártyákon és a részletnézetben,
  konkrét izmok latin névvel. (A képen már látszik, hogy a 12-es csoportfejlécek élnek.)

**Csak a Mell (63) van katalogizálva a ~900-ból.** A többi hátravan (lásd 5. pont).
`BodyDiagram.jsx` a rehab fájdalompont-térkép, NEM része ennek.

## 3. MOST elvégzendő – a mell-adat és a GIF-ek élesítése
> Az app élőben az adatbázisból olvas; a 63 mell-gyakorlat addig NEM jelenik meg, amíg a seedet le nem futtatod.

1. **Ellenőrizd, melyik Supabase-projektre csatlakozik az app.** A `.env` `VITE_SUPABASE_URL`-je jelenleg a
   RÉGI, halott projektre mutat (`nyrtfogyijaeytqtgvey`). Írd át az AKTUÁLIS projekt URL-jére + anon kulcsára.
2. **Futtasd le a 3 migrációt** ezen a projekten, sorrendben (schema → seed → storage). Módszer bármelyik:
   `supabase db push` (ha linkelve van), vagy a Dashboard SQL editorában bemásolva, vagy a Supabase MCP-vel.
3. **RLS/láthatóság ellenőrzése (fontos!):** a seed a `training_exercises` sorait `created_by = NULL`-lal viszi be
   (globális könyvtár). Ellenőrizd a `training_exercises` **SELECT RLS policyját**: ha az `created_by = auth.uid()`-hoz
   köti a láthatóságot, a seedelt sorok nem látszanak. Ekkor adj hozzá egy policyt, ami a globális
   (`created_by is null`) sorokat minden hitelesített usernek engedi olvasni, pl.:
   ```sql
   create policy "read global library exercises" on public.training_exercises
     for select to authenticated using (created_by is null);
   ```
   (Igazítsd a meglévő policy-mintához.)
4. **GIF-ek feltöltése** (a bucket-migráció után):
   ```
   $env:SUPABASE_URL="https://<uj-ref>.supabase.co"
   $env:SUPABASE_SERVICE_KEY="<service_role kulcs a Settings > API-ból>"
   $env:GIF_SOURCE_DIR="D:\edzes gif\5° GIFs DE MUSCULACIÓN-20260721T115027Z-1-001\5° GIFs DE MUSCULACIÓN\PECTORAL (1)"
   node scripts/upload-exercise-gifs.mjs
   ```
   (A `gif_path` = `mell/<slug>.gif`; a szkript a manifest `source_file`→`gif_path` alapján tölt fel, upsert.)
5. **Ellenőrzés:** `select count(*) from training_exercises where modality='erosites';` → 63 új + a régiek.
   Frissítsd az appot; a Mell alatt jelenjen meg mind, a részletnézetben GIF + latin izmok.

## 4. Adatmodell (pontos)
`training_exercises` (meglévő + bővített oszlopok): `id uuid`, `slug text` (unique, upsert kulcs),
`name` (magyar), `name_en`, `name_original` (eredeti portugál), `muscle_group` (12 kód egyike – elsődleges),
`secondary_muscles text[]` (12-kódú másodlagos csoportok), `equipment text[]`, `difficulty`
(`beginner|intermediate|advanced`), `type` (`gym|both|ball` – a régi kézilabdás mező, NE használd modalitásra),
`modality` (`erosites|kalisztenika|funkcionalis_hiit|nyujtas_mobilitas`), `category` (`'strength'`),
`gif_path` (Storage útvonal, `<muscle>/<slug>.gif`), `source_file`, `source_category`, `catalog_note`,
`description`, `instructions text[]`, `tips text[]`, `parameters jsonb`.

`muscles` (konkrét izmok): `code` (pk), `name_latin`, `name_hu`, `name_en`, `muscle_group` (FK muscle_groups).
`exercise_muscles`: `exercise_id` (FK training_exercises), `muscle_code` (FK muscles), `role`
(`primary|secondary|stabilizer`). Ez a részletes réteg.

**12 izomcsoport kód:** `mell, hat, vall, bicepsz, tricepsz, alkar, quad, combhajlito, farizom, vadli, core, csipo`.
**Eszköz kódok (equipment_types):** sajat_testsuly, rud, kezisulyzo, gep, kabel, smith, korlat, huzodzkodo_rud,
gumiszalag, kettlebell, trx, medicinlabda, stabillabda, gymstick, hengerlo, plusz_suly, egyeb.

## 5. A maradék ~840 klip katalogizálása – MÓDSZER
A mell mintát (`build_pilot2.py` + `build_integration.py` logikát) kövesd; a seedet **új migrációként** add hozzá
(pl. `20260724000010_seed_hat.sql`), és **bővítsd a manifestet** a GIF-feltöltéshez.

### Forrásmappák → modalitás + izomcsoport
- **`5° GIFs DE MUSCULACIÓN/…`** → `modality='erosites'`. Az almappák = elsődleges izomcsoport:
  `ABDOMEN CORE`→core (68), `BÍCEPS y ANTEBRAZO`→bicepsz/alkar (74), `DELTOIDES`→vall (43),
  `ESPALDA Y TRAPECIO`→hat (77), `MIEMBROS INFERIORES Y GLÚTEOS`→quad/combhajlito/farizom (95, per-gyakorlat!),
  `PANTORRILLA`→vadli (20), `PECTORAL`→mell (KÉSZ), `TRÍCEPS`→tricepsz (46).
  A `GIFs - BONOS` almappa extra klippek portugál izom-almappákban (Abdominal, Antebraço, Bíceps, Costas,
  Membros Inferiores, Ombro, Peito, Trapézio, Tríceps) – ugyanígy sorolható.
- **`6° GIFs DE CALISTENIA`** → `modality='kalisztenika'` (~130, lapos mappa, izmot a névből).
- **`7° GIFs DE ENTRENAMIENTO FUNCIONAL Y HIIT`** → `modality='funkcionalis_hiit'` (~190, lapos).
- **`8° MANUAL DE ESTIRAMIENTO Y MOVILIDAD/GIFs…`** → `modality='nyujtas_mobilitas'` (~130).
- **KIHAGYNI:** minden `.zip`, a Musculación-on belüli `BIBLIOTECA DI ESERCIZI` olasz duplikátum,
  és a `1° BIBLIOTECA PREMIUM` 406 db `Treinos (N).mp4` (sorszámozott, nem sorolható).

### Gyakorlatonként előállítandó
- **Nevek:** `name` (magyar), `name_en` (angol), `name_original` (a portugál fájlnév). A portugál nevekből
  fordíts (pl. Supino=fekvenyomás, Flexão=fekvőtámasz, Agachamento=guggolás, Remada=evezés, Rosca=bicepsz-hajlítás,
  Elevação=emelés, Afundo=kitörés, Puxada=lehúzás, Panturrilha=vádli, Glúteo=farizom, Alongamento=nyújtás).
- **`slug`:** az angol névből, kisbetűs, kötőjeles, egyedi (ütközésnél `-2`, `-3`).
- **`muscle_group`** (elsődleges) + **`secondary_muscles`** (12-kódú tömb) a fő mozgató izom csoportjából
  származtatva (lásd lent), NE a mappából vakon.
- **`equipment`** a névből (faixa elástica=gumiszalag, halteres=kezisulyzo, barra=rud, kettlebell, gymstick,
  TRX, barra fixa=huzodzkodo_rud, máquina=gep, cabo=kabel, peso corporal=sajat_testsuly, corda=egyeb…).
- **`difficulty`** heurisztika: térdelő/segített/fal/gépi → beginner; súlyozott/egykezes/pliometrikus/
  instabil/haladó variáns → advanced; alap → intermediate.
- **`gif_path`** = `<muscle_group>/<slug>.gif`.
- **`exercise_muscles`**: 1 `primary` + néhány `secondary` + `stabilizer`, konkrét izmokkal (latin).

### A `muscles` szótár BŐVÍTÉSE (fontos a részletes réteghez)
Jelenleg csak a mellhez tartozó izmok vannak benne. Minden új csoporthoz add hozzá a hiányzó izmokat
`insert ... on conflict do update`-tel. Latin nevekkel, javasolt mag:
- **hat:** latissimus_dorsi (megvan), trapezius_superior (megvan), trapezius_medius „Trapezius (pars transversa)",
  trapezius_inferior „Trapezius (pars ascendens)", rhomboidei „Musculi rhomboidei", teres_major (megvan),
  teres_minor „Teres minor", erector_spinae „Erector spinae", infraspinatus „Infraspinatus",
  deltoideus_posterior „Deltoideus (pars spinalis)", biceps_brachii (megvan).
- **vall:** deltoideus_anterior/lateralis (megvan), deltoideus_posterior, supraspinatus „Supraspinatus",
  infraspinatus, subscapularis „Subscapularis", teres_minor, trapezius_superior.
- **bicepsz/alkar:** biceps_brachii (megvan), brachialis „Brachialis", brachioradialis „Brachioradialis",
  flexores_carpi „Musculi flexores carpi", extensores_carpi „Musculi extensores carpi".
- **tricepsz:** triceps_brachii (megvan), anconeus „Anconeus".
- **quad:** rectus_femoris „Rectus femoris", vastus_lateralis, vastus_medialis, vastus_intermedius.
- **combhajlito:** biceps_femoris „Biceps femoris", semitendinosus „Semitendinosus", semimembranosus „Semimembranosus".
- **farizom:** gluteus_maximus „Gluteus maximus", gluteus_medius „Gluteus medius", gluteus_minimus „Gluteus minimus".
- **csipo:** iliopsoas „Iliopsoas", adductor_magnus „Adductor magnus", adductor_longus „Adductor longus",
  tensor_fasciae_latae „Tensor fasciae latae".
- **vadli:** gastrocnemius „Gastrocnemius", soleus „Soleus".
- **core:** rectus_abdominis (megvan), obliquus_externus „Obliquus externus abdominis",
  obliquus_internus „Obliquus internus abdominis", transversus_abdominis „Transversus abdominis",
  quadratus_lumborum „Quadratus lumborum".
(Magyar nevek: pl. Gluteus maximus = „Nagy farizom", Gastrocnemius = „Ikerizom", Soleus = „Lábikra-izom" stb.)

## 6. Seed-migráció formátum (a chest a minta)
Nézd meg `20260724000002_exercise_gif_catalog_seed_chest.sql`-t. Két rész:
1. `insert into training_exercises (...) values (...) on conflict (slug) do update set ...`
2. `insert into exercise_muscles (exercise_id, muscle_code, role) select e.id, v.muscle_code, v.role::muscle_role
   from (values ('<slug>','<muscle_code>','primary'), ...) as v(exercise_slug,muscle_code,role)
   join training_exercises e on e.slug = v.exercise_slug on conflict do nothing;`
Minden új izmot előbb a `muscles` táblába (schema-bővítő vagy külön migráció). A GIF-feltöltéshez a
`scripts/exercise-gif-manifest.json`-t bővítsd az új tételekkel: `{slug, muscle_group, source_file, gif_path, name_hu}`.

## 7. Gotchák
- **Ne** a `type` (gym/both/ball) mezőt használd modalitásra – arra a `modality` van.
- A `.env` a régi halott projektre mutat – írd át, mielőtt tesztelsz.
- RLS/`created_by` láthatóság (lásd 3.3).
- `on conflict (slug)` teszi idempotenssé a seedet – nyugodtan újrafuttatható.
- A `muscles`/`muscle_groups`/`equipment_types` szótár-insertek `on conflict do update` – bővíthetők.

## 8. Ajánlott sorrend a Code-ban
1) `.env` átírása → 2) 3 migráció futtatása → 3) RLS ellenőrzés/policy → 4) GIF-feltöltés (mell) →
5) `npm run dev`, ellenőrzés → 6) a maradék csoportok seedjeinek legyártása (5. pont) izomcsoportonként,
mindegyik után migráció + manifest-bővítés + feltöltés → 7) commit.
