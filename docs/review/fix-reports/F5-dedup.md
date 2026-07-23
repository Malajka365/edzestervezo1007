# F5 — Kódduplikáció megszüntetése (jelenlét-naptárak + PDF export)

**Kapcsolódó review pont:** `docs/review/02-kodminoseg.md` 2.1 és 2.2

Két, egymástól független duplikációt szüntettünk meg, mindkettőt közös
`src/lib/` modulba kiszervezve. **Nincs viselkedésváltozás** — a jelenlét-UX
és a generált PDF-ek tartalma/elrendezése változatlan.

---

## Cél 1 — `AttendanceCalendar` vs `TeamAttendanceCalendar`

### Megközelítés: **kiszervezés (extraction-only)**

A két komponenst NEM olvasztottuk össze. A közös részt egy új
`src/lib/attendance.js` modulba emeltük, amit mindkét komponens importál:

- `ATTENDANCE_STATUSES` — a státuszdefiníciók egyetlen forrása
  (érték + magyar címke + Tailwind pöttyszín).
- `TRAINING_TYPES` — az edzésjelleg opciók egyetlen forrása.
- `getStatusColor(status)` / `getStatusLabel(status)` — korábban
  karakterről karakterre azonos `switch`-ek mindkét fájlban.
- `cleanAttendanceData(data)` — az üres mezők `null`-ra konvertálása.
- `saveAttendance({ id, data })` — insert (ha nincs `id`) / update a
  `player_attendance` táblán; `'inserted'` / `'updated'` visszatérés a
  megfelelő toast kiválasztásához.
- `deleteAttendance(id)` — törlés a `player_attendance` táblán.

A komponensek megjelenítési logikája (egyéni játékos-lista vs. havi/heti/napi
csapat-naptár) érintetlen maradt. A modál `<select>` opcióit most a közös
konstansokból mappeljük — azonos értékek, címkék és sorrend.

### Megőrzött friss viselkedés
- **`canEdit` prop gating** — mindkét komponensben változatlan (gomb/akció
  feltételes megjelenítés).
- **Inline spinner** — `AttendanceCalendar` `LoadingSpinner size="inline"`,
  `TeamAttendanceCalendar` saját spinner-div — érintetlen.

### Hívási helyek (propok változatlanok)
- `src/pages/PlayerProfileRehab.jsx:426`
  → `<AttendanceCalendar player={player} teamId={selectedTeam.id} canEdit={canEdit} />`
- `src/pages/Rehabilitation.jsx:320`
  → `<TeamAttendanceCalendar teamId={selectedTeam.id} canEdit={canEdit} />`

Egyik call-site propjai sem változtak.

---

## Cél 2 — PDF export duplikáció

### Új közös helper: `src/lib/pdfExport.js`

`exportTablePdf({ orientation, title, subtitles, columns, rows, startY,
headStyles, bodyStyles, columnStyles, alternateRowStyles, didParseCell,
filename, checkEmpty, beforeTable })`

Egységesíti a közös részt: dokumentum-létrehozás, cím + alcímsorok,
`autoTable` alapstílus (`fillColor: [59, 130, 246]`, `theme: 'grid'`,
`alternateRowStyles`), mentés, üres-adat ág és hibakezelés (toast).

**Lazy import megőrizve:** a `jspdf` és `jspdf-autotable` dinamikus importja
a helper FÜGGVÉNYÉN BELÜL történik, így a könyvtárak továbbra is csak
igény szerint töltődnek be. A build igazolja: `jspdf.es.min`,
`jspdf.plugin.autotable`, `html2canvas` külön chunk maradt, a `pdfExport`
is önálló (1.36 kB) chunk.

### Átállított oldalak
- **`Leaderboard.jsx`** — portré, dobogó-kiemelés `didParseCell`-lel,
  medál-színek. Az oldal csak az adat-formálást (`columns`, `rows`,
  `filename`, oszlopstílusok) tartja meg.
- **`TrainingLoad.jsx`** — fekvő (`landscape`), 1RM százalék tábla.
- **`PlayerProgress.jsx`** — összetettebb export (chart-kép `html2canvas`-szal,
  statisztika-blokk, majd új oldalon a tábla). A `beforeTable(doc)` async
  callbackkel illeszkedik a közös helperbe; `checkEmpty: false`, mert ennek
  az oldalnak eredetileg sem volt üres-adat őrfeltétele — így a viselkedés
  bit-pontosan azonos. A `html2canvas` importja szintén a callbackben,
  lazy maradt.

### Hatókörön kívül hagyva
- **`MacrocyclePlanner.jsx`** — a PDF-je kizárólag `html2canvas`
  kép-dump (nincs `autoTable`, nincs táblázat), így nem illik az
  `exportTablePdf` mintába. Szándékosan érintetlen.

---

## Sor-statisztika (duplikáció-csökkentés bizonyítéka)

| Fájl | Előtte | Utána | Δ |
|------|-------:|------:|---:|
| `src/components/AttendanceCalendar.jsx` | 408 | 367 | −41 |
| `src/components/TeamAttendanceCalendar.jsx` | 703 | 662 | −41 |
| `src/pages/Leaderboard.jsx` | 423 | 391 | −32 |
| `src/pages/TrainingLoad.jsx` | 401 | 368 | −33 |
| `src/pages/PlayerProgress.jsx` | 782 | 759 | −23 |
| **Összes eltávolított sor** | | | **−170** |

Új, újrahasznosítható modulok:
- `src/lib/attendance.js` — 71 sor
- `src/lib/pdfExport.js` — 84 sor
- **Összesen 155 sor**, amely a korábban ~2×-esen duplikált logikát váltja ki.

---

## Ellenőrzés
- `npm run build` — **hibamentes** (built in ~10 s).
- Lazy PDF chunk-ok megmaradtak (külön `jspdf`, `autotable`, `html2canvas`,
  `pdfExport` build-artefaktumok).
- Mindkét naptár call-site propjai változatlanok.

## Commitok
1. `refactor: extract shared attendance logic from calendar components`
2. `refactor: extract shared PDF export helper`
