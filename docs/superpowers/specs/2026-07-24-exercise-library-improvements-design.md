# Gyakorlat Könyvtár — teljesítmény, izom-keresés, GIF-feltöltéses felvitel

## Cél

A Gyakorlat Könyvtár (`ExerciseLibrary`) mostanra 949 gyakorlatot tartalmaz 4
modalitásban. Három probléma:

1. **Teljesítmény**: a lista betöltéskor mind a 949 sort behúzza (teljes oszlopokkal)
   és az összes kártyát (949 GIF-kérés) egyszerre rendereli → lassú.
2. **Izom-keresés hiánya**: csak névre/leírásra és a 12 izomcsoportra lehet szűrni,
   a részletes izmokra (46, latin névvel) nem.
3. **Új-gyakorlat felvitel**: a `gif_path` kézzel beírt szöveg, nincs fájlfeltöltés;
   az eszközök és másodlagos izmok vesszős szabadszöveg; nincs részletes izom-réteg.

## Nem cél (YAGNI)

- Szerver-oldali lapozás/keresés (a katalógus fix méretű, ~949; kliens-oldal elég).
- Árva Storage-GIF-ek automatikus takarítása törléskor.
- Külön izom-választó legördülő a listaszűrőben (a keresőmező izomneves találata elég).
- Drag&drop, tömeges import, kép-vágás/szerkesztés.

## Döntések (jóváhagyva)

- **Böngészés**: az izomcsoport-szűrőből eltűnik az „Összes"; mindig pontosan egy
  csoport aktív (alap: `mell`). Így böngészéskor legfeljebb egy csoportnyi kártya
  renderelődik (≤ ~68).
- **Keresés**: ha a keresőmező nem üres, a keresés minden csoporton átível (az
  izomcsoport-választás ilyenkor nem korlátoz), és a névre, angol névre ÉS az
  izomnevekre (magyar + latin) is talál. A találatok ablakozva jelennek meg.
- **Izom-keresés**: a meglévő keresőmezőbe integrálva (nincs új vezérlő).
- **Create/Edit modal**: GIF/kép feltöltés + eszköz/másodlagos választók a
  kód-listákból + OPCIONÁLIS részletes izom-réteg (fő/segéd/stabilizáló).

## Architektúra

### 1. Adat-réteg — `src/pages/exercise-library/useExerciseLibraryData.js`

**Karcsú lista-lekérdezés.** A `fetchExercises` a listához csak ezeket az oszlopokat
kéri le (nem `select('*')`):
`id, slug, name, name_en, muscle_group, secondary_muscles, equipment, difficulty, modality, gif_path`.
Rendezés: `name`. A nehéz mezők (`description`, `instructions`, `tips`, `parameters`)
kimaradnak — a részletnézet külön tölti be.

**Izom-index egyszer.** Új `fetchMuscleIndex`: egyetlen lekérdezés
`exercise_muscles.select('exercise_id, role, muscles(code,name_latin,name_hu,name_en,muscle_group)')`,
amelyből két struktúra épül:
- `musclesByExercise: Map<exerciseId, Array<{code, role, name_hu, name_latin, name_en, muscle_group}>>`
  — a részletnézet izom-listája (fő/segéd/stabilizáló), így a kattintáskori külön
  lekérdezés megszűnik.
- `muscleSearchByExercise: Map<exerciseId, string>` — gyakorlatonként a hozzá tartozó
  izmok `name_hu` + `name_latin` neveiből képzett, kisbetűsített kereső-szöveg.

**Katalógus-listák a modalhoz.** Új `muscles` (46) és `equipmentTypes` (17) betöltés
(egyszer, kis lekérdezés), a szótár-táblákból (`muscles`, `equipment_types`). A 12
izomcsoport a meglévő `MUSCLE_GROUPS` konstansból jön.

**Új műveletek.**
- `fetchExerciseDetail(id)` — a teljes sor (`select('*').eq('id',id).single()`) a
  részletnézethez (leírás/lépések/tippek/paraméterek).
- `saveExerciseMuscles(exerciseId, rows)` — a részletes izmok mentése: a gyakorlat
  meglévő `exercise_muscles` sorainak törlése, majd `rows` (`[{muscle_code, role}]`)
  beszúrása. `create`/`update` után hívódik, ha a form nem üres részletes izom-listát ad.
- `createExercise` / `updateExercise` változatlanul írja a `training_exercises` sort,
  visszaadja az érintett sor `id`-jét (a create insert `.select('id').single()`-lel),
  hogy a hívó a `saveExerciseMuscles`-t meghívhassa.

A `favorites` és `toggleFavorite` változatlan.

### 2. Szűrés + renderelés — `src/pages/ExerciseLibrary.jsx`

**Állapot.** `selectedType` (régi gym/both/ball) szűrő-állapot és -logika törlése.
`selectedMuscleGroup` alapértéke `'mell'` (nem `'all'`). Új `visibleCount` (alap 60)
az ablakozáshoz; szűrő/keresés változásakor visszaáll 60-ra.

**Izomcsoport-szűrő UI.** A gombsorból kikerül az „Összes"; a `muscleGroups` lista a 12
csoport (nincs `all` elem). Mindig pontosan egy aktív.

**Szűrő-logika (`filterExercises`).**
1. `searchActive = searchTerm.trim() !== ''`.
2. Alaphalmaz:
   - `searchActive` → az összes gyakorlat, ahol a `searchTerm` (kisbetűs) illeszkedik
     a `name`, `name_en` VAGY a `muscleSearchByExercise.get(id)` szövegre.
   - különben → a `muscle_group === selectedMuscleGroup` gyakorlatok.
3. Rátét mindkét módban: `modality` (ha nem „összes"), `difficulty` (ha nem „összes"),
   `favorites` (ha bekapcsolva).
4. Az eredmény sorba rendezve, majd renderhez `slice(0, visibleCount)`.

**Renderelés.** A `visibleCount`-ra vágott halmazt a meglévő
`groupExercisesByMuscleGroup` szerint csoportfejlécekkel jeleníti meg. Ha a teljes szűrt
halmaz > `visibleCount`, a lista alján egy „Továbbiak" gomb növeli a `visibleCount`-ot
(+60). A számláló („X gyakorlat") a teljes szűrt méretet mutatja, és jelzi, hány látszik.

**Részletnézet.** Kártyára kattintva `fetchExerciseDetail(id)` tölti a teljes sort; az
izmok a `musclesByExercise` gyorsítótárból jönnek (nincs új kérés). GIF a
`gif_path`-ból (`exerciseGifUrl`).

### 3. Create/Edit modal + közös mezők

**Közös komponensek.** A két modal (`CreateExerciseModal`, `EditExerciseModal`) közös,
összetettebb mezői külön, újrahasznosítható komponensekbe kerülnek
(`src/pages/exercise-library/` alatt):
- `MediaUpload` — fájlválasztó + előnézet + feltöltés-állapot; visszaadja a `gif_path`-ot.
- `ChipMultiSelect` — kód-lista (eszközök / másodlagos csoportok) chip-es több-választója.
- `MusclePicker` — kereshető izom-választó (46, csoportosítva) + szerep (fő/segéd/
  stabilizáló) minden kiválasztotthoz; értéke `[{muscle_code, role}]`.

**GIF/kép feltöltés.** Új segéd a `src/lib/exerciseMedia.js`-ben:
`uploadExerciseMedia(file, slugBase)` →
- validál: MIME `image/gif|image/png|image/jpeg`, méret ≤ 8 MB (különben hibát dob);
- útvonal: `custom/${slugify(slugBase)}-${Date.now()}.${ext}` (a `slugBase` a `name_en`
  vagy `name`; ütközés a timestamp miatt kizárt);
- `supabase.storage.from('exercise-gifs').upload(path, file, {contentType, upsert:false})`;
- visszaadja a `path`-ot (ez lesz a `gif_path`).
A modal az előnézetet a `exerciseGifUrl(gif_path)`-ból mutatja. A régi „GIF útvonal"
szabadszöveg-mező helyére kerül; haladóként a kész útvonal olvashatóan látszik.

**Mezők igazítása.**
- Eszközök: `ChipMultiSelect` a 17 `equipmentTypes` kódból (a régi vesszős input helyett).
- Másodlagos izomcsoportok: `ChipMultiSelect` a 12 `MUSCLE_GROUPS`-ból.
- Izomcsoport / nehézség / modalitás: meglévő select-ek.
- „Típus" (gym/both/ball) select kikerül a UI-ból; mentéskor `type='gym'` marad.
- Részletes izmok: `MusclePicker` (opcionális). Ha nem üres, mentés után
  `saveExerciseMuscles`.
- Leírás / lépések / tippek: változatlan.

**Edit.** Ugyanezek a mezők, előtöltve; a részletes izmok a `musclesByExercise`
gyorsítótárból töltődnek a formba (`[{muscle_code, role}]` alakra képezve).

### 4. DB / RLS

Nincs séma-migráció. A szükséges jogosultságok már megvannak:
- `training_exercises`: „Authenticated users can create/update/delete" policyk.
- `exercise_muscles`: „write exercise_muscles" (`for all to authenticated`).
- Storage `exercise-gifs`: „authenticated manage exercise gifs" (upload/update).
- `muscles` / `equipment_types`: publikus SELECT policy.
- Törléskor az `exercise_muscles` FK `on delete cascade` takarít. A Storage-objektum
  árván maradhat (hatókörön kívül).

## Adatfolyam (összefoglaló)

- **Betöltés**: `fetchExercises` (karcsú lista) ‖ `fetchMuscleIndex` ‖ `muscles` +
  `equipment_types` + `favorites`. A lista + az izom-index a memóriában.
- **Böngészés**: kiválasztott csoport → szűrt lista → ablakozott render.
- **Keresés**: kereső-szöveg → név/angol/izomnév illesztés minden csoporton →
  ablakozott render.
- **Részletnézet**: `fetchExerciseDetail` + cache-elt izmok.
- **Felvitel**: form → (opcionális) `uploadExerciseMedia` → `createExercise`
  (`id` vissza) → ha van részletes izom: `saveExerciseMuscles` → lista frissítés.

## Tesztelés

- **Unit (Vitest)**:
  - `slugify` + `uploadExerciseMedia` útvonal-építés és validáció (méret/MIME hiba).
  - Szűrő-logika: böngészés (egy csoport) vs keresés (több csoport, izomnév-találat).
  - `saveExerciseMuscles` diff (törlés + beszúrás alakja) — a Supabase-hívások mockolva.
- **Kézi (localhost)**: csoportváltás gyorsasága; izomnév-keresés; új gyakorlat GIF-fel,
  eszközzel, részletes izommal → megjelenik a listában, részletnézetben, és megtalálható
  izom-kereséssel.

## Fájlok

- Módosul: `src/pages/exercise-library/useExerciseLibraryData.js`,
  `src/pages/ExerciseLibrary.jsx`, `src/pages/exercise-library/CreateExerciseModal.jsx`,
  `src/pages/exercise-library/EditExerciseModal.jsx`, `src/lib/exerciseMedia.js`.
- Új: `src/pages/exercise-library/MediaUpload.jsx`,
  `src/pages/exercise-library/ChipMultiSelect.jsx`,
  `src/pages/exercise-library/MusclePicker.jsx`.
