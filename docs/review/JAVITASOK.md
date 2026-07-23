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
