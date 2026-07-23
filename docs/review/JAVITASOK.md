# Javítási folyamat követése — „Top 5" lista

A [00-osszefoglalo-prioritasok.md](00-osszefoglalo-prioritasok.md) „Ha csak 5 dolgot javítanék először" listájának végrehajtása.

| # | Feladat | Státusz | Commit | Megjegyzés |
|---|---------|---------|--------|------------|
| 1 | K2 — 4 tábla RLS verziókövetése + profiles csapattárs-láthatóság | ✅ KÉSZ | `07ff1a3` (migráció: 20260720121000) | Élesben alkalmazva, allow/deny tesztelve |
| 2 | K3 — Mobil menü-hiba (Dashboard.jsx) + halott kód törlése | ✅ KÉSZ | `9f52bbc` | Élőben ellenőrizve: mind a 12 modulnézetben van hamburger mobil nézetben |
| 3 | GY1 — 1,2 MB kép optimalizálása (BodyDiagram) | ✅ KÉSZ | `02b50be` | Az SVG-csere elvetve (arány-eltérés → mentett fájdalompont-koordináták elcsúsztak volna); helyette PNG→WebP tömörítés azonos méretben: 1 239 KB → 41 KB |
| 4 | GY2 — „Amnézis" → „Anamnézis" feliratok javítása | ✅ KÉSZ | `7f206c4` | 15 felirat javítva, 2 DB-kötött érték szándékosan változatlan (category='anamnézis', id='anamnesis') |
| 5 | KT1 — Toast-értesítések + néma hibák láthatóvá tétele | ✅ KÉSZ | `49498c5` + `aba355d` | react-hot-toast; 82 alert() lecserélve, 18 néma fetch-hiba kap látható hibaüzenetet; élőben füst-tesztelve; a 12 fájlnyi confirm() külön feladat marad |

**Mind az 5 kész.** (2026-07-20)

Részletes jelentések: [fix-reports/](fix-reports/)

## Hátralévő javaslatok (a review-tervből, később)

- KT1 második fele: `confirm()` párbeszédek saját modálra cserélése (12 fájl)
- KT2 — óriásfájlok darabolása · KT3 — React Query · KT4 — duplikált komponensek · KT5 — jogosultság-UI a többi 8 modulban
- D1-D4 design/UX · GY4 code splitting · opcionális: URL-routing, TypeScript, tesztek, GDPR-csomag

## 2. kör — hátralévő feladatok végrehajtása

| Fázis | Feladat | Státusz | Commit | Megjegyzés |
|---|---------|---------|--------|------------|
| F1a | GY4 — Code splitting (React.lazy + lazy PDF libek) | ✅ KÉSZ | `34d928f` | Fő chunk 1,65 MB → 366 KB (39 chunk); élőben tesztelve |
| F1b | D1 — Reszponzivitás (Auth/JoinTeam/Profile/TeamMembersPanel) | ✅ KÉSZ | `7acd4fc` | Mátrix mobil-kártyanézettel; 375px-en élőben tesztelve |
| F2a | KT1/2 — ConfirmDialog + 15 confirm() csere | ✅ KÉSZ | `8c4a051` | 15 hely, 13 fájl; élőben tesztelve (modál nyit/zár) |
| F2b | D2 — Dashboard kártyaszínek 10→4 kategória | ✅ KÉSZ | `23bfd84` | kék=csapat, lila=tervezés, zöld=mérés, piros=rehab |
| F3 | D3+D4 — Loading egységesítés + üres állapotok | ✅ KÉSZ | `1d133ee` + `fe5c1ed` | 9 loading csere, EmptyState 3 oldalon (4 oldalon már volt jó) |
| F4 | KT5 — canEditModule a maradék 8 modulba | ✅ KÉSZ | `480294a` | 13 fájl; élőben tesztelve (view: gomb rejtve, none: modul rejtve, edit: gomb látszik) |
| F5 | KT4 — Duplikációk (naptárak, PDF util) | ✅ KÉSZ | `260ce8d` + `5c015d7` | -170 duplikált sor; lib/attendance.js + lib/pdfExport.js; élőben tesztelve |
| F6-1 | KT2 — MacrocyclePlanner darabolás | ✅ KÉSZ | `397de9e` | -219 sor, 5 modál kiemelve; Opus review CLEAN + élő teszt |
| F6-2 | KT2 — Calendar darabolás | ✅ KÉSZ | `6846b46` | 1548→819 sor, 3 nézet kiemelve; Opus review CLEAN (37 prop) + élő teszt |
| F6-3 | KT2 — Measurements darabolás | ✅ KÉSZ | `78cfe4b` | 1224→683 sor, 5 modál; Opus review CLEAN (33 prop) + élő teszt |
| F6-4 | KT2 — ExerciseLibrary darabolás | ✅ KÉSZ | `001dd0d` | 1350→742 sor, create+edit modál; Opus review CLEAN (nincs swap) + élő teszt |
| F7a | KT3 — React Query infra + usePlayers | ✅ KÉSZ | `dd9f154`+`5156073` | 7 fájl, cache-invalidáció mind a 3 mutációnál; Opus review CLEAN (numerikus jersey-sort, success-path invalidáció) |
| F7b | KT3 — useExercises hook | ✅ KÉSZ | `a28e76e` | 5 fájl, globális exercises cache, 3 invalidáció; Opus review CLEAN (nincs tábla-swap) + élő teszt |

## Ráadás — élőben talált pre-existing bug

| Feladat | Státusz | Commit | Megjegyzés |
|---|---|---|---|
| GY3 — üres születési dátum/mezszám → játékos-létrehozás elhasal | ✅ KÉSZ | (Teams.jsx sanitizePlayerForm) | Élőben izoláltan igazolva: üres string date → hiba, null → siker |

## Ráadás 2 — stabilitás + architektúra

| Feladat | Státusz | Commit | Megjegyzés |
|---|---|---|---|
| Error boundary — komponens-hiba barátságos fallback-kel (nem fehér képernyő) | ✅ KÉSZ | `b0fdba2` | ErrorBoundary komponens az App route-ok körül |
| F8 — URL-alapú routing minden modulra (linkelhető, működő Vissza gomb) | ✅ KÉSZ | `91c8107` | nested react-router route-ok + Outlet layout; Opus review CLEAN (NavLink end + TeamProvider-Outlet igazolva) + élő teszt (direct URL, Vissza, mobil) |

## 3. kör — tesztek, biztonság, hátralévők (G-fázisok)

| Fázis | Feladat | Státusz | Commit | Megjegyzés |
|---|---|---|---|---|
| G1a | Vitest + Testing Library infra | ✅ KÉSZ | `d45de09` | + shadow vite.config.ts eltávolítva |
| G1b | Unit tesztek (permissions, attendance) — 44 teszt | ✅ KÉSZ | `d5a831d` | |
| G1c | Komponens-tesztek (ConfirmDialog, ErrorBoundary, EmptyState, Auth) — 19 teszt | ✅ KÉSZ | `14b5346` | |
| G1-rev | Mutációs teszt-minőség review | ✅ STRONG | — | 7/7 szándékos törés elkapva, 0 hamis zöld |
| G2a | Jelszó-szabály: min 10 kar + erősség-jelző | ✅ KÉSZ | `3b9967b` | + teendő: Supabase Dashboardon szerver-oldali minimum 10-re |
| G2b | Meghívó e-mail-címhez kötése | ✅ KÉSZ | `586f111`+`60a2a4d` | Élő teszt: rossz e-mail elutasítva, régi (NULL) meghívók működnek |
| G3 | MacrocyclePlanner data-hook (F6 Step 2) | ✅ KÉSZ | `70ae14b` | 1552→1225 sor, useMacrocycleData hook; Opus review CLEAN (6/6 success-flag audit, stale-closure SAFE) + élő teszt |
| G4 | TypeScript infra (allowJs) | ⏳ | — | |
