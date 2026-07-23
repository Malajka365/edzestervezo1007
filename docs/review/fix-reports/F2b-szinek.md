# F2b - Dashboard modul színek egyszerűsítése

**Fájl:** `src/pages/Dashboard.jsx`
**Alapja:** `docs/review/05-design-ux.md` — 10 véletlenszerű accent szín helyett 4 funkcionális kategória.

## Változtatás összefoglalója

A `modules` tömb `color` property-jét kategorizáltam. Ugyanazokat az objektumokat használja a sidebar navigáció (szín nélkül, csak ikon+név), a home quick-access grid kártyák (`module.color`, sor ~406) és az "under development" placeholder fejléc (`activeModuleData?.color`, sor ~449) — mindkét renderhelyen automatikusan érvényesül az új szín, mivel a forrás ugyanaz a `modules` tömb.

## Modulonkénti szín-változás

| Modul (id) | Régi szín | Új szín | Kategória |
|---|---|---|---|
| home | `bg-blue-500` | `bg-blue-500` (nincs változás) | — |
| teams | `bg-green-500` | `bg-blue-500` | Csapatkezelés |
| macrocycle | `bg-purple-500` | `bg-purple-500` (nincs változás) | Tervezés |
| calendar | `bg-indigo-500` | `bg-purple-500` | Tervezés |
| exercises | `bg-purple-600` | `bg-purple-500` | Tervezés |
| templates | `bg-teal-500` | `bg-purple-500` | Tervezés |
| matches | `bg-pink-500` | `bg-purple-500` | Tervezés |
| measurement | `bg-orange-500` | `bg-emerald-500` | Mérés & statisztika |
| trainingload | `bg-cyan-500` | `bg-emerald-500` | Mérés & statisztika |
| leaderboard | `bg-yellow-500` | `bg-emerald-500` | Mérés & statisztika |
| progress | `bg-green-500` | `bg-emerald-500` | Mérés & statisztika |
| rehab | `bg-red-500` | `bg-red-500` (nincs változás) | Rehabilitáció |

10 egyedi szín helyett 4 funkcionális szín maradt: kék (csapatkezelés + dashboard), lila (tervezés), zöld (mérés & statisztika), piros (rehabilitáció).

## Bónusz `category` mező

A feladat opcionális bónuszaként megvizsgáltam egy `category: '...'` mező hozzáadását minden modul objektumhoz. Ez a fájlon belül renderelést nem igényelne (a mezőt egyszerűen nem használná semmi jelenleg), így technikailag "trivially cheap" lenne — de mivel jelenleg semmilyen render-logika nem fogyasztaná, és a scope explicit "values-only change"-t kért a `color` property-kre, nem adtam hozzá, hogy ne bővítsem a diff-et funkcionálisan felesleges változással. Ha a jövőben kategória szerinti csoportosítás/szűrés kell a sidebarban, ez egy különálló, kis feature-ként vezethető be.

## Verifikáció

`npm run build` — sikeres, hibák és warningok nélkül (csak a szokásos browserslist/baseline-browser-mapping frissítési figyelmeztetések, amik a build előtt is jelen voltak és nem kapcsolódnak ehhez a változáshoz).

## Érintett fájl

- `src/pages/Dashboard.jsx` (kizárólag a `modules` tömb `color` property-i módosultak, semmilyen más struktúra vagy render-logika nem változott)
