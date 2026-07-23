# KT1 — `alert()` → toast + néma fetch-hibák láthatóvá tétele

**Státusz:** DONE
**Dátum:** 2026-07-23
**Kapcsolódó review:** `docs/review/02-kodminoseg.md` (1.2, 1.3, 3.2 pontok), `docs/review/00-osszefoglalo-prioritasok.md`

## Mit csináltunk

1. **`react-hot-toast` bevezetése** (`npm i react-hot-toast`). Egyetlen `<Toaster>`
   a `src/App.jsx`-ben, sötét témához igazított konfiggal (slate-800 háttér `#1e293b`,
   fehér szöveg, `#334155` keret, `top-right` pozíció, 4s időtartam, zöld/piros
   success/error ikon a slate háttérhez).
2. **Mind a 82 `alert()` hívás lecserélve** toast hívásra 19 fájlban. A vezető
   ✅ / ❌ emoji eltávolítva (a toastnak saját ikonja van). A magyar szövegek
   szó szerint megmaradtak.
3. **`confirm()` hívások érintetlenül** maradtak (12 fájl) — külön, későbbi feladat.
4. **18 fetch-hiba toast** hozzáadva az oldalak elsődleges, felhasználó által látott
   adatbetöltő függvényeinek `catch` ágához (a `console.error` megmaradt debughoz).

## Emoji / típus besorolás szabálya

- `Hiba` szót tartalmaz VAGY `❌` → `toast.error(...)`
- `✅` VAGY sikert jelző kulcsszó (`sikeresen`, `elmentve`, `törölve`, `rögzítve`,
  `betöltve`, `frissítve`, `mentve`) → `toast.success(...)`
- egyéb (validáció / info figyelmeztetés, pl. „A gyakorlat neve kötelező!”,
  „Nincs exportálható adat!”) → `toast.error(...)`

## Fájlonkénti bontás

| Fájl | alert→toast (success / error) | fetch-hiba toast |
|------|------|------|
| src/components/AnamnesisForm.jsx | 2 (1 / 1) | 0 |
| src/components/AttendanceCalendar.jsx | 5 (3 / 2) | 1 (fetchAttendance) |
| src/components/DocumentUpload.jsx | 4 (1 / 3) | 0 |
| src/components/QuickAddTrainingModal.jsx | 1 (0 / 1) | 0 |
| src/components/TeamAttendanceCalendar.jsx | 6 (3 / 3) | 1 (fetchAttendance) |
| src/components/TeamMembersPanel.jsx | 3 (1 / 2) | 1 (fetchMembersAndInvites) |
| src/components/TrainingLocations.jsx | 3 (0 / 3) | 1 (fetchLocations) |
| src/components/TrainingSessionModal.jsx | 2 (0 / 2) | 1 (fetchTemplates) |
| src/context/TeamContext.jsx | 0 | 1 (fetchTeams) |
| src/pages/Calendar.jsx | 3 (0 / 3) | 1 (fetchSeasons) |
| src/pages/ExerciseLibrary.jsx | 9 (3 / 6) | 1 (fetchExercises) |
| src/pages/Leaderboard.jsx | 2 (0 / 2) | 1 (fetchLeaderboard) |
| src/pages/MacrocyclePlanner.jsx | 14 (3 / 11) | 1 (fetchSeasons) |
| src/pages/Matches.jsx | 2 (0 / 2) | 1 (fetchMatches) |
| src/pages/Measurements.jsx | 12 (5 / 7) | 1 (fetchMeasurements) |
| src/pages/PlayerProfileRehab.jsx | 5 (2 / 3) | 1 (fetchAnamnesisData) |
| src/pages/PlayerProgress.jsx | 1 (0 / 1) | 1 (fetchPlayers) |
| src/pages/Rehabilitation.jsx | 0 | 1 (fetchPlayers) |
| src/pages/Teams.jsx | 3 (0 / 3) | 1 (fetchPlayers) |
| src/pages/TrainingLoad.jsx | 2 (0 / 2) | 1 (fetchExercises) |
| src/pages/TrainingTemplates.jsx | 3 (0 / 3) | 1 (fetchTemplates) |
| **Összesen** | **82 (25 / 57)** | **18** |

`TeamContext.jsx` és `Rehabilitation.jsx` nem tartalmazott `alert()`-et, ezért oda
csak a fetch-hiba toast + a `react-hot-toast` import került be.

## Döntések (judgment calls)

- **Egy toast oldalanként a mount-hibára.** Sok oldal 3–5 különálló fetch-et indít
  mountoláskor (pl. Measurements: players/exercises/measurements; Calendar: 5 load).
  Hálózatkiesésnél mind elhasalna → 3–5 egyforma toast lenne. Ezt elkerülendő
  minden fetch-hiba toast **közös `{ id: 'adat-betoltes' }` id-t** kapott: a
  react-hot-toast azonos id-nál nem stackel, hanem frissíti a meglévőt, így
  egyszerre legfeljebb **egy** „Nem sikerült betölteni…” toast látszik. Ezért elég
  volt oldalanként az elsődleges (mountoláskor futó, felhasználó által látott)
  betöltő függvényt ellátni toasttal; a másodlagos lookup-fetcheket (dropdownokat
  töltő exercises/players) nem duplikáltuk.
- **Egységes generikus üzenet** minden fetch-hibánál: „Nem sikerült betölteni az
  adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.” — mivel a
  közös id miatt úgysem stackelnek, nem volt szükség fetchenként eltérő szövegre.
- **`TeamContext.fetchRoleAndPermissions` kihagyva.** A `fetchTeams` már lefedi a
  hálózati hiba esetét a mountoláskor; a jogosultság-betöltés minden csapatváltáskor
  fut, ott a toast zajos lenne (és a közös generikus üzenet amúgy is megjelenik a
  `fetchTeams` ágon hálózatkiesésnél).
- **Nem kaptak fetch-toastot:** save/update/delete catch-ek (ezek már toast.error-t
  kapnak az alert-cseréből), a PDF-export „Nincs exportálható adat” ágak
  (validáció, nem betöltés), és a háttér/csendes komponensek (pl.
  `SupabaseConnectionTest` — érintetlen).
- **Template literálok megmaradtak** backtickkel, csak az `alert(` → `toast.error(`
  és az emoji-eltávolítás történt, pl.
  `` toast.error(`Hiba történt a mentés során!\n\nRészletek: ${errorMessage}`) ``.
- **`return alert(...)` → `return toast.error(...)`** (Measurements.jsx:346) — a
  `return` megmaradt, működik, mert a `toast.error` string id-t ad vissza.

## Build

```
✓ 2895 modules transformed.
dist/index.html                     0.49 kB │ gzip:   0.32 kB
dist/assets/index-BVwT-XDR.css     38.71 kB │ gzip:   7.00 kB
dist/assets/index.es-CBNFJkuq.js  150.42 kB │ gzip:  51.39 kB
dist/assets/index-GnpDkukW.js   1,661.70 kB │ gzip: 452.66 kB
✓ built in 10.21s
```

Tiszta build (a chunk-méret figyelmeztetés és a browserslist-adat elavulás
korábbról meglévő, nem ehhez a változtatáshoz kötődő zaj).

## Verifikáció

- `grep -rn "alert(" src/` → **0 találat**.
- `grep toast.(success|error)` → **100** hívás 21 fájlban (= 82 alert-csere + 18 fetch-toast).
- `confirm()` érintetlen (12 fájl).
