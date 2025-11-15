# 💪 Gyakorlat Könyvtár - Használati Útmutató

## Áttekintés

A Gyakorlat Könyvtár egy átfogó kondicionális gyakorlat adatbázis, amely izomcsoportonként rendezi a gyakorlatokat. Egyszerű keresési és szűrési lehetőségekkel, részletes utasításokkal és vizuális elemekkel.

## Funkciók

### 🔍 Keresés és Szűrés

1. **Szöveges Keresés**
   - Gyakorlat név vagy leírás alapján
   - Valós idejű szűrés

2. **Izomcsoport Szűrés**
   - 🔴 Mellkas (Chest)
   - 🔵 Hát (Back)
   - 🟡 Váll (Shoulders)
   - 🟣 Kar (Arms)
   - 🟢 Láb (Legs)
   - 🟠 Törzs (Core)

3. **Nehézségi Szint**
   - 🟢 Kezdő (Beginner)
   - 🟡 Haladó (Intermediate)
   - 🔴 Profi (Advanced)

4. **Típus Szerinti**
   - Edzőterem (Gym)
   - Mindkettő (Both - testsúlyos is)

5. **⭐ Kedvencek**
   - Gyors hozzáférés a gyakran használt gyakorlatokhoz

### 📋 Gyakorlat Részletek

Minden gyakorlathoz tartozik:

- **Alapinformációk**
  - Név
  - Nehézségi szint
  - Izomcsoport
  - Másodlagos izmok

- **Eszközök**
  - Szükséges felszerelés listája
  - (pl. barbell, dumbbells, bodyweight)

- **Végrehajtás**
  - Lépésről lépésre utasítások
  - Számozott lista

- **Tippek**
  - Fontos tudnivalók
  - Gyakori hibák elkerülése

- **Ajánlott Paraméterek**
  - Sorozatok száma
  - Ismétlések
  - Pihenőidő
  - Időtartam (statikus gyakorlatoknál)

## Adatbázis Struktúra

### Új Oszlopok a `training_exercises` Táblában

```sql
muscle_group TEXT           -- Elsődleges izomcsoport
secondary_muscles TEXT[]    -- Másodlagos izmok tömbje
difficulty TEXT             -- beginner, intermediate, advanced
equipment TEXT[]            -- Szükséges eszközök tömbje
image_url TEXT              -- Gyakorlat képe (opcionális)
instructions TEXT[]         -- Végrehajtási lépések tömbje
tips TEXT[]                 -- Tippek tömbje
is_favorite BOOLEAN         -- Kedvenc jelölés
usage_count INTEGER         -- Használat számlálás
```

### Indexek

```sql
idx_exercises_muscle_group  -- Gyors szűrés izomcsoport szerint
idx_exercises_difficulty    -- Gyors szűrés nehézség szerint
idx_exercises_favorite      -- Kedvencek gyors betöltése
```

## Előre Feltöltött Gyakorlatok

### Mellkas (Chest)
- ✅ Bench Press (Fekve nyomás)
- ✅ Push-ups (Fekvőtámasz)

### Hát (Back)
- ✅ Pull-ups (Húzódzkodás)
- ✅ Bent-over Row (Előrehajlított evezés)

### Váll (Shoulders)
- ✅ Overhead Press (Vállból nyomás)
- ✅ Lateral Raise (Oldalemelés)

### Kar (Arms)
- ✅ Bicep Curl (Bicepsz hajlítás)
- ✅ Tricep Dips (Tricepsz tolódzkodás)

### Láb (Legs)
- ✅ Squat (Guggolás)
- ✅ Deadlift (Felhúzás)

### Törzs (Core)
- ✅ Plank (Alátámasztás)
- ✅ Russian Twist (Orosz csavar)

## Használat

### 1. Gyakorlat Keresése

```
1. Nyisd meg a "Gyakorlat Könyvtár" menüt
2. Használd a keresőt vagy szűrőket
3. Kattints egy gyakorlatra a részletek megtekintéséhez
```

### 2. Kedvencekhez Adás

```
1. Kattints a ⭐ ikonra a gyakorlat kártyán
2. Vagy a részletes nézetben a "Kedvencekhez" gombra
3. Szűrj a "Kedvencek" gombbal
```

### 3. Hozzáadás Sablonhoz

```
1. Nyisd meg a gyakorlat részleteit
2. Kattints a "Hozzáadás sablonhoz" gombra
3. Válaszd ki a sablont (hamarosan!)
```

## Jövőbeli Fejlesztések

### Tervezett Funkciók

- [ ] **Gyakorlat Létrehozás**
  - Saját gyakorlatok hozzáadása
  - Kép/videó feltöltés
  - Egyedi paraméterek

- [ ] **Sablon Integráció**
  - Drag & drop gyakorlatok sablonokba
  - Gyors hozzáadás gomb
  - Sablon előnézet

- [ ] **Videó Támogatás**
  - YouTube/Vimeo beágyazás
  - Saját videó feltöltés
  - Slow-motion lejátszás

- [ ] **Progresszió Követés**
  - Gyakorlat előzmények
  - Súly/ismétlés grafikon
  - PR (Personal Record) jelölés

- [ ] **Szuper Szettek**
  - Gyakorlat párosítás
  - Köredzés (Circuit) tervező
  - HIIT programok

- [ ] **Szűrők Bővítése**
  - Felszerelés szerinti szűrés
  - Időtartam szerinti
  - Kalória égető potenciál

- [ ] **Közösségi Funkciók**
  - Gyakorlat értékelés
  - Kommentek
  - Megosztás

## Technikai Részletek

### Komponens Struktúra

```
ExerciseLibrary.jsx
├── Header (Cím + Új gyakorlat gomb)
├── Filters (Keresés + Szűrők)
├── Exercise List (Csoportosítva izomcsoport szerint)
│   ├── Group Header (Összecsukható)
│   └── Exercise Cards (Grid layout)
│       ├── Exercise Info
│       ├── Favorite Button
│       └── Add to Template Button
└── Exercise Detail Modal
    ├── Header
    ├── Description
    ├── Equipment
    ├── Instructions
    ├── Tips
    ├── Parameters
    └── Action Buttons
```

### State Management

```javascript
- exercises: Összes gyakorlat
- filteredExercises: Szűrt gyakorlatok
- searchTerm: Keresési kifejezés
- selectedMuscleGroup: Kiválasztott izomcsoport
- selectedDifficulty: Kiválasztott nehézség
- selectedType: Kiválasztott típus
- showFavoritesOnly: Csak kedvencek megjelenítése
- selectedExercise: Részletek modal
- expandedGroups: Csoportok összecsukva/kinyitva
```

### API Hívások

```javascript
// Gyakorlatok lekérése
const { data } = await supabase
  .from('training_exercises')
  .select('*')
  .order('muscle_group', { ascending: true })
  .order('name', { ascending: true })

// Kedvenc toggle
await supabase
  .from('training_exercises')
  .update({ is_favorite: !currentFavorite })
  .eq('id', exerciseId)
```

## Stílus és UX

### Színkódok

- **Mellkas**: `bg-red-600`
- **Hát**: `bg-blue-600`
- **Váll**: `bg-yellow-600`
- **Kar**: `bg-purple-600`
- **Láb**: `bg-green-600`
- **Törzs**: `bg-orange-600`

### Nehézségi Szintek

- **Kezdő**: `text-green-400`
- **Haladó**: `text-yellow-400`
- **Profi**: `text-red-400`

### Interakciók

- Hover effektek minden kártyán
- Smooth transitions
- Collapse/expand animációk
- Modal fade-in/out

## Tesztelés

### Ellenőrzési Lista

- [ ] Keresés működik
- [ ] Összes szűrő működik
- [ ] Kedvenc toggle működik
- [ ] Modal megnyílik/bezárul
- [ ] Csoportok összecsukhatók
- [ ] Responsive design (mobil/tablet/desktop)
- [ ] Üres állapot megjelenik
- [ ] Szűrők törlése működik

## Hibakeresés

### Gyakori Problémák

**Nem jelennek meg a gyakorlatok:**
```sql
-- Ellenőrizd az adatbázist
SELECT * FROM training_exercises LIMIT 10;
```

**Kedvenc nem mentődik:**
```javascript
// Ellenőrizd a console-t
console.log('Toggle favorite:', exerciseId, currentFavorite)
```

**Szűrés nem működik:**
```javascript
// Ellenőrizd a filterExercises függvényt
console.log('Filtered:', filteredExercises.length)
```

## Következő Lépések

1. ✅ Gyakorlat könyvtár létrehozva
2. ✅ Adatbázis migráció futtatva
3. ✅ Minta gyakorlatok feltöltve
4. ⏳ Sablon integráció (következő)
5. ⏳ Gyakorlat létrehozás form
6. ⏳ Videó támogatás

---

**Verzió:** 1.0  
**Utolsó frissítés:** 2025-01-17  
**Készítette:** TeamFlow Development Team
