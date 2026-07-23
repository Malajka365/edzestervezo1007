# GY4 — Code splitting a modul oldalakhoz + lusta PDF-lib betöltés

Forrás: `docs/review/03-teljesitmeny.md`, 1.1 és 1.3 pont ("Nincs code splitting", "jsPDF/html2canvas mindig letöltődik").

## Elvégzett munka

### 1. `React.lazy` a Dashboard modul-oldalaihoz (`src/pages/Dashboard.jsx`)

A korábbi statikus importok (Teams, Measurements, TrainingLoad, Leaderboard, PlayerProgress, Profile,
MacrocyclePlanner, Calendar, TrainingTemplates, Matches, ExerciseLibrary, Rehabilitation) mind
`lazy(() => import(...))`-ra váltak. A `DashboardContent` render ágában a teljes modul-tartalom
(a `home` nézet és a sidebar kivételével — azok a "váz" részei, nem lettek lazy-vé téve) egyetlen
`<Suspense fallback={<LoadingSpinner />}>` blokkba került. A `home` nézet tartalma és maga a sidebar
nem lazy — a Suspense wrapper körülöttük csak azért van, mert az if/else lánc egyben tartalmazza a
`home` ágat is; mivel a `home` ág nem importál lazy komponenst, sosem triggereli a fallback-et.

Nem lett módosítva: a `modules` tömb, a `visibleModules` szűrés, a header, a sidebar logika.

### 2. Lusta PDF-könyvtár betöltés (jsPDF, jspdf-autotable, html2canvas)

A statikus top-level importok eltávolítva az alábbi 4 fájlból, helyettük dinamikus `await import(...)`
az export handler függvényeken belül, csak a tényleges exportáláskor:

- `src/pages/Leaderboard.jsx` — `exportToPDF` most `async`; `jsPDF` és `jspdf-autotable` (`autoTable`)
  dinamikusan importálva a függvény elején.
- `src/pages/TrainingLoad.jsx` — ugyanaz a minta, `exportToPDF` `async`-cá alakítva.
- `src/pages/PlayerProgress.jsx` — `exportToPDF` már `async` volt; hozzáadva a `jsPDF`, `autoTable`,
  `html2canvas` dinamikus importja a függvény elején.
- `src/pages/MacrocyclePlanner.jsx` — `exportToPDF` már `async` volt; `jsPDF` (itt default exportként
  használt csomag) és `html2canvas` dinamikus importja hozzáadva.

A `jspdf-autotable` csomag `main` mezője szerint `default` exportot ad vissza (`dist/jspdf.plugin.autotable.js`),
ezért a dinamikus import mintája `const { default: autoTable } = await import('jspdf-autotable')` lett,
konzisztensen az eredeti `import autoTable from 'jspdf-autotable'` statikus importtal.

`recharts` nem lett módosítva (a taskban kért módon) — a code splitting #1-ből "ingyen" jön, mivel a
grafikonokat használó oldalak (PlayerProgress, TrainingLoad stb.) már maguk is lazy chunk-ok lettek,
így a `LineChart` chunk is csak az adott modul megnyitásakor töltődik be.

Nincs `manualChunks` vagy egyéb vite konfig módosítás.

## Ellenőrzés

`npm run build` lefutott hiba nélkül, 2895 modul transzformálva, 11.38s alatt.

### Build kimenet (teljes eszközlista, build után)

```
dist/index.html                                 0.49 kB │ gzip:   0.32 kB
dist/assets/body-diagram-DUQQsBfX.webp          41.30 kB
dist/assets/index-BXV9Kmz9.css                  39.18 kB │ gzip:   7.07 kB
dist/assets/chevron-left-e741hU1P.js             0.30 kB │ gzip:   0.25 kB
dist/assets/circle-Bqclbm1T.js                   0.30 kB │ gzip:   0.24 kB
dist/assets/filter-DmX_XLfO.js                   0.33 kB │ gzip:   0.26 kB
dist/assets/arrow-left-CTpLceKu.js               0.33 kB │ gzip:   0.26 kB
dist/assets/search-WlW6LEg8.js                   0.34 kB │ gzip:   0.27 kB
dist/assets/target-DtkS-kec.js                   0.40 kB │ gzip:   0.27 kB
dist/assets/activity-BZ5Nj9ll.js                 0.40 kB │ gzip:   0.30 kB
dist/assets/pen-tTA7pARN.js                      0.40 kB │ gzip:   0.31 kB
dist/assets/copy-B9baOmh4.js                     0.41 kB │ gzip:   0.31 kB
dist/assets/eye-BxbpVfwT.js                      0.43 kB │ gzip:   0.30 kB
dist/assets/upload-BpwWzOfe.js                   0.43 kB │ gzip:   0.32 kB
dist/assets/map-pin-Bdn7RaOg.js                  0.43 kB │ gzip:   0.32 kB
dist/assets/download-CARTlLVO.js                 0.43 kB │ gzip:   0.32 kB
dist/assets/zap-D0_athEB.js                      0.43 kB │ gzip:   0.31 kB
dist/assets/award-Dqpv1nvj.js                    0.44 kB │ gzip:   0.33 kB
dist/assets/plane-UxPFLcsJ.js                    0.48 kB │ gzip:   0.36 kB
dist/assets/square-pen-C17sJtLl.js               0.49 kB │ gzip:   0.34 kB
dist/assets/save-C3m0HH2J.js                     0.50 kB │ gzip:   0.33 kB
dist/assets/star-Zi1lHg3n.js                     0.64 kB │ gzip:   0.40 kB
dist/assets/trash-2--1Sxgbb7.js                  0.80 kB │ gzip:   0.39 kB
dist/assets/TrainingLoad-BVnf1WBg.js             9.32 kB │ gzip:   3.07 kB
dist/assets/Leaderboard-ChslhfL2.js              9.81 kB │ gzip:   3.30 kB
dist/assets/Profile-Cx-x5FEb.js                 10.19 kB │ gzip:   2.82 kB
dist/assets/Matches-BQRz-swC.js                 13.81 kB │ gzip:   3.85 kB
dist/assets/PlayerProgress-BVyvlxTf.js          18.29 kB │ gzip:   5.38 kB
dist/assets/purify.es-aGzT-_H7.js               22.15 kB │ gzip:   8.67 kB
dist/assets/ExerciseLibrary-B3zD3KxD.js         30.66 kB │ gzip:   5.50 kB
dist/assets/jspdf.plugin.autotable-CfO62xhj.js  30.98 kB │ gzip:   9.87 kB
dist/assets/TrainingTemplates-4elOPolv.js       32.77 kB │ gzip:   6.74 kB
dist/assets/MacrocyclePlanner-ko0Y2v8q.js       33.99 kB │ gzip:   8.49 kB
dist/assets/Measurements-CCRicT3P.js            37.13 kB │ gzip:   6.99 kB
dist/assets/Calendar-95fiZMlN.js                49.43 kB │ gzip:  10.15 kB
dist/assets/Teams-Bfs7dhsu.js                   50.17 kB │ gzip:  10.89 kB
dist/assets/Rehabilitation-Df8D5lkE.js          68.11 kB │ gzip:  13.85 kB
dist/assets/index.es-CvilgWiy.js               150.46 kB │ gzip:  51.42 kB
dist/assets/html2canvas.esm-CBrSDip1.js        201.42 kB │ gzip:  48.03 kB
dist/assets/LineChart-BzeLqQ2_.js              306.83 kB │ gzip:  92.33 kB
dist/assets/index-CLM4TnOy.js                  365.89 kB │ gzip: 107.67 kB
dist/assets/jspdf.es.min-4fz4qZCG.js           387.88 kB │ gzip: 127.31 kB
```

Fájlok száma: `dist/assets/*.js` → **39 JS chunk** (1 helyett).

### Előtte / utána

| | Előtte (review doc alapján, `03-teljesitmeny.md`) | Utána |
|---|---|---|
| Fő JS bundle | **1,65 MB** egyetlen chunkban | **365.89 kB** (`index-*.js`, gzip 107.67 kB) — kb. **78%-os csökkenés** |
| JS chunk-ok száma | 1 | 39 |
| jsPDF (387.88 kB), jspdf-autotable (30.98 kB), html2canvas (201.42 kB) | mindig a fő bundle-ben | külön chunk-ok, csak PDF-exportnál töltődnek be |
| recharts (`LineChart-*.js`, 306.83 kB) | a fő bundle-ben | külön chunk, csak grafikont használó modul megnyitásakor (érintetlen — a taskban kért módon nem lett külön kezelve, a code splitting mellékhatásaként vált külön chunk-ká) |

Megjegyzés: az "előtte" 1,65 MB-os érték a review dokumentumból (`03-teljesitmeny.md` 1.1 pont) származik;
a munkakönyvtárban a feladat megkezdésekor már voltak egyéb, a code splittinghez nem kapcsolódó, nem
commitolt módosítások (`TeamMembersPanel.jsx`, `Auth.jsx`, `JoinTeam.jsx`, `Profile.jsx`), ezért egy
"tiszta előtte" build nem lett újra lefuttatva (ez destruktív stash-t igényelt volna ezeken az
idegen, nem véglegesített változtatásokon).

### Statikus import ellenőrzés

```
grep -rn "^import.*(jspdf|html2canvas)" src/
```
→ nincs találat. A 4 érintett fájlban (`Leaderboard.jsx`, `TrainingLoad.jsx`, `PlayerProgress.jsx`,
`MacrocyclePlanner.jsx`) kizárólag dinamikus `await import(...)` maradt, az export handler
függvényeken belül.

## Érintett fájlok

- `src/pages/Dashboard.jsx`
- `src/pages/Leaderboard.jsx`
- `src/pages/TrainingLoad.jsx`
- `src/pages/PlayerProgress.jsx`
- `src/pages/MacrocyclePlanner.jsx`

## Commit

`perf: code-split module pages and lazy-load PDF libraries`
