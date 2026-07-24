# Edzés-GIF katalógus – integráció

Ez a dokumentum írja le, hogyan kerül be a gyakorlat-GIF könyvtár a `training_exercises`
rendszerbe, és hogyan bővül a jelenlegi modell a részletes anatómiai réteggel.

## Adatmodell

**Meglévő tábla, bővítve:** `training_exercises`
Új oszlopok (mind additív, a régi app nem törik el):

| oszlop | jelentés |
|---|---|
| `slug` | egyedi, stabil azonosító (upsert kulcs, GIF-útvonal) |
| `name_en` | angol név (a `name` marad a magyar) |
| `name_original` | eredeti (portugál) forrásnév, visszakövethetőség |
| `modality` | edzésmodalitás: `erosites` / `kalisztenika` / `funkcionalis_hiit` / `nyujtas_mobilitas` (különbözik a meglévő `type = gym/both/ball` mezőtől, azt nem érinti) |
| `gif_path` | a Storage bucketen belüli útvonal, pl. `mell/bench-press.gif` |
| `source_file`, `source_category`, `catalog_note` | forrás-metaadat és besorolási megjegyzés |

A `muscle_group` mostantól a **12 fő csoport** kódját tárolja (lásd lent), a
`secondary_muscles` a másodlagos csoportokat (text tömb) – ahogy eddig is.

**Új szótártáblák:** `muscle_groups` (12 csoport, HU/EN), `muscles` (konkrét izmok
latin + HU + EN névvel, csoporthoz kötve), `equipment_types`.

**Új kapcsolótábla:** `exercise_muscles (exercise_id, muscle_code, role)` – ez a
részletes anatómiai réteg. A `role` lehet `primary` (fő mozgató), `secondary`
(segédizom) vagy `stabilizer`. Egy gyakorlathoz több izom is tartozik, latin névvel.

### A 12 izomcsoport kódja
`mell, hat, vall, bicepsz, tricepsz, alkar, quad, combhajlito, farizom, vadli, core, csipo`

## Alkalmazás lépései az új Supabase-projekten

1. **Migrációk lefuttatása** (a Dashboard → SQL editorban, vagy `supabase db push`):
   1. `20260724_000001_exercise_gif_catalog_schema.sql` – séma + szótárak
   2. `20260724_000002_exercise_gif_catalog_seed_chest.sql` – 63 mell-gyakorlat + izmok
   3. `20260724_000003_exercise_gifs_storage_bucket.sql` – publikus `exercise-gifs` bucket

2. **GIF-ek feltöltése** (egyszeri, lokálisan):
   ```
   $env:SUPABASE_URL="https://<uj-projekt-ref>.supabase.co"
   $env:SUPABASE_SERVICE_KEY="<service_role kulcs>"
   $env:GIF_SOURCE_DIR="D:\edzes gif\...\PECTORAL (1)"
   node scripts/upload-exercise-gifs.mjs
   ```

3. **App átkötése az új projektre:** a `.env` `VITE_SUPABASE_URL` jelenleg a régi,
   halott projektre mutat (`nyrtfogyijaeytqtgvey`). Írd át az új projekt URL-jére és
   anon kulcsára, majd újrabuildelj.

## Megjelenítés az appban

Az app a GIF-et így állítja elő (nincs beégetett projekt-URL):
```js
const { data } = supabase.storage.from('exercise-gifs').getPublicUrl(exercise.gif_path)
// data.publicUrl -> <img src=...>
```

## Ellenőrzendő futtatáskor
- A `training_exercises.created_by` oszlop NULL-t kap a seednél (globális katalógus-sorok).
  Ha van rá NOT NULL / RLS megkötés, azt igazítani kell (a globális könyvtár-sorokat
  minden hitelesített felhasználó olvashatja).
- Ha a `training_exercises`-ben már voltak `arms` / `legs` kódú sorok, azokat kézzel kell
  a pontos 12-es kódra állítani (a migráció ezeket szándékosan nem találgatja).

## Következő lépés
A mell után ugyanezzel a logikával jön a többi izomcsoport és mind a négy modalitás
(erősítés, kalisztenika, funkcionális/HIIT, nyújtás/mobilitás), majd az `ExerciseLibrary`
UI teljes átdolgozása (12 csoportos szűrők, GIF-kártyák, latin izom-részletnézet).
