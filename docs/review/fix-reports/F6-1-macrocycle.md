# F6-1 — MacrocyclePlanner dekompozíció (modálok kiszervezése)

## Cél
A `src/pages/MacrocyclePlanner.jsx` (1771 sor, a kódbázis legnagyobb fájlja) méretének és kognitív terhelésének csökkentése jól határolt darabok külön fájlba szervezésével, **nulla viselkedésváltozással**. Mechanikus dekompozíció, nem újraírás.

## Elvégzett lépések

### 1. lépés — 5 modál kiszervezése ✅ ELVÉGEZVE
Az öt önálló modál JSX-blokk a render végéről új komponensfájlokba került a `src/pages/macrocycle/` könyvtár alatt. A szülő megtartotta a `{showX && <Modal ... />}` feltételes mintát (a delete modálnál `{showDeleteModal && seasonToDelete && ...}` — a `seasonToDelete` guard megőrizve). Minden modál pontosan azokat a state-eket és handlereket kapja propként, amelyeket korábban closure-ből használt.

### 2. lépés — adat-réteg hook 🟡 ELHALASZTVA (deferred)
A kiszervezendő adatműveletek (`updateSeason`, `deleteSeason`, `saveTemplate`, `loadTemplate`, `deleteTemplate`) **szorosan összefonódnak a szülőben élő modál-UI state-tel**:
- `updateSeason` olvassa `editSeason`-t, hívja `setShowEditModal`-t
- `deleteSeason` olvassa `seasonToDelete`-t, hívja `setShowDeleteModal` / `setSeasonToDelete`
- `saveTemplate` olvassa `templateName`-t, hívja `setShowTemplateModal` / `setTemplateName`
- `deleteTemplate` a `confirmState` / `setConfirmState` mechanizmust használja
- `loadTemplate` hívja `setShowLoadTemplateModal`-t, olvassa `macrocycleData`-t

Egy tiszta, csak-adat hook vagy a modál-UI state-et is magába rántaná (scope creep), vagy sok settert kellene paraméterként átfűzni — mindkettő megnöveli egy rejtett viselkedésváltozás kockázatát. Az utasítás szerint (bizonytalanság esetén halasztás; a biztonságos > kockázatos) a 2. lépést elhalasztottam. A biztonságos ~219 soros csökkentés jobb, mint egy kockázatos nagyobb.

## Sor-statisztika

| Fájl | Sorok |
|------|-------|
| MacrocyclePlanner.jsx (előtte) | 1771 |
| MacrocyclePlanner.jsx (utána) | **1552** (−219) |
| macrocycle/CreateSeasonModal.jsx | 78 |
| macrocycle/EditSeasonModal.jsx | 67 |
| macrocycle/DeleteSeasonModal.jsx | 31 |
| macrocycle/SaveTemplateModal.jsx | 43 |
| macrocycle/LoadTemplateModal.jsx | 61 |

Ráadás takarítás: a `X` (lucide-react) import eltávolítva a fő fájlból, mert csak a create modálban használtuk (átkerült oda). A `Trash2` a fő fájlban maradt (a fejléc törlés gombja használja) és a LoadTemplateModal-ban is importálva.

## Ellenőrzés

- **`npm run build`**: ✅ tiszta (`✓ built in 11.54s`), nincs hiba.
- **Dangling referenciák**: a fő fájl minden modál-belső változót (newSeason, editSeason, templateName, templates, stb.) továbbra is birtokol és propként ad át — nincs árva hivatkozás. A build sikeressége ezt megerősíti.
- **Megőrzött logika**: grid renderelés, cellakattintás/tervezés/meccs-szinkron üzleti logika (getCellColor, handleCellClick, syncMatchWithMacrocycle, savePlanning, handleManualSave) érintetlen a fő fájlban. A `confirmState`/ConfirmDialog és a `canEdit` (canEditModule gating) érintetlen. PDF export érintetlen.

## Modálonkénti prop-audit (a #1 hibaforrás)

| Modál | Átadott propok (szülő) | Felhasznált propok (gyerek) | Egyezés |
|-------|------------------------|------------------------------|:-------:|
| **CreateSeasonModal** | `newSeason`, `setNewSeason`, `onSubmit={handleCreateSeason}`, `onClose`, `loading` | `newSeason`, `setNewSeason`, `onSubmit`, `onClose` (X + Mégse gomb), `loading` | ✓ |
| **EditSeasonModal** | `editSeason`, `setEditSeason`, `onSubmit={updateSeason}`, `onClose`, `loading` | `editSeason`, `setEditSeason`, `onSubmit` (form submit-ben `e.preventDefault(); onSubmit()`), `onClose`, `loading` | ✓ |
| **DeleteSeasonModal** | `seasonToDelete`, `onConfirm={deleteSeason}`, `onClose` (setShowDeleteModal(false)+setSeasonToDelete(null)), `loading` | `seasonToDelete` (`.name`), `onConfirm`, `onClose`, `loading` | ✓ |
| **SaveTemplateModal** | `templateName`, `setTemplateName`, `onSubmit={saveTemplate}`, `onClose` (setShowTemplateModal(false)+setTemplateName('')), `loading` | `templateName`, `setTemplateName`, `onSubmit`, `onClose`, `loading` | ✓ |
| **LoadTemplateModal** | `templates`, `onLoad={loadTemplate}`, `onDelete={deleteTemplate}`, `onClose` | `templates` (map, length), `onLoad`, `onDelete`, `onClose` | ✓ |

Minden prop mind átadva a szülő által, mind felhasználva a gyerekben — nincs eltérés.

## Megjegyzések / kockázatok
- A modálok megnyitási/bezárási feltételei (`showCreateModal` stb.) a szülőben maradtak — a feltételes render viselkedése bit-azonos.
- Az `onClose` handlerek megőrzik az eredeti mellékhatásokat (pl. delete: state null-ozás; template: név ürítés).
- A 2. lépés (adat hook) tudatosan elhalasztva a UI-state összefonódás miatt.
