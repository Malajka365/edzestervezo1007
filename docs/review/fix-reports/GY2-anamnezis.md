# GY2 — "Amnézis" → "Anamnézis" terminology fix

Source finding: `docs/review/05-design-ux.md` ("Amnézis" finding). The medical
term "Anamnézis" (patient history) was misspelled as "Amnézis" (amnesia /
memory loss) throughout the rehab module UI.

## Method

1. `grep -rn "amnézis\|Amnézis\|anamnézis" src/ -i` (and a follow-up broad
   `mnézis` grep to catch any remaining substrings/case variants).
2. Classified every hit as either a **user-visible label/string** (fix) or a
   **data value / DB-bound string** (leave untouched — anything sent to or
   compared against the Supabase `player_documents.category` CHECK
   constraint or other DB values).
3. Edited only the display-text side of each occurrence; DB values,
   Supabase table/column names, and JS identifiers (`anamnesisData`,
   `AnamnesisForm`, `existingAnamnesis`, `player_anamnesis` table, etc. —
   already correctly spelled in English/identifier form) were left as-is.
4. `npm run build` — clean, no errors.

## Occurrence table

| # | File:Line | Before | After | Decision |
|---|-----------|--------|-------|----------|
| 1 | `src/components/DocumentUpload.jsx:185` | `<option value="anamnézis">Amnézis</option>` | `<option value="anamnézis">Anamnézis</option>` | Fixed label only. `value="anamnézis"` is the DB CHECK-constraint value (already correctly spelled) — **left unchanged**. |
| 2 | `src/components/AnamnesisForm.jsx:125` | `alert('✅ Amnézis sikeresen mentve!')` | `alert('✅ Anamnézis sikeresen mentve!')` | User-visible alert — fixed. |
| 3 | `src/components/AnamnesisForm.jsx:194` | `{existingAnamnesis ? 'Amnézis szerkesztése' : 'Új amnézis'}` | `{existingAnamnesis ? 'Anamnézis szerkesztése' : 'Új anamnézis'}` | User-visible header — fixed. `existingAnamnesis` identifier left unchanged (already correct English spelling, not DB-bound but not the misspelling either). |
| 4 | `src/pages/PlayerProfileRehab.jsx:91` | `confirm('Biztosan törölni szeretnéd ezt az amnézist?')` | `confirm('Biztosan törölni szeretnéd ezt az anamnézist?')` | User-visible confirm dialog — fixed. |
| 5 | `src/pages/PlayerProfileRehab.jsx:101` | `alert('✅ Amnézis törölve!')` | `alert('✅ Anamnézis törölve!')` | User-visible alert — fixed. |
| 6 | `src/pages/PlayerProfileRehab.jsx:134` | `// Amnézis kiválasztás kezelése` | `// Anamnézis kiválasztás kezelése` | Code comment (not rendered to users) — fixed for consistency/hygiene; zero functional risk. |
| 7 | `src/pages/PlayerProfileRehab.jsx:145` | `// Kiválasztott amnézisek pain_locations összevonása` | `// Kiválasztott anamnézisek pain_locations összevonása` | Code comment — fixed for consistency. |
| 8 | `src/pages/PlayerProfileRehab.jsx:155` | `// Egyedi ID generálása az amnézis ID és pont index kombinációjából` | `// Egyedi ID generálása az anamnézis ID és pont index kombinációjából` | Code comment — fixed for consistency. |
| 9 | `src/pages/PlayerProfileRehab.jsx:157` | `// Hozzáadjuk az amnézis dátumát azonosításhoz` | `// Hozzáadjuk az anamnézis dátumát azonosításhoz` | Code comment — fixed for consistency. |
| 10 | `src/pages/PlayerProfileRehab.jsx:180` | `<h3 ...>Amnézis felvételek</h3>` | `<h3 ...>Anamnézis felvételek</h3>` | User-visible stat card label (explicitly requested) — fixed. |
| 11 | `src/pages/PlayerProfileRehab.jsx:218` | `{/* Korábbi Amnézisek és Body Diagram */}` | `{/* Korábbi Anamnézisek és Body Diagram */}` | Code comment — fixed for consistency. |
| 12 | `src/pages/PlayerProfileRehab.jsx:221` | `{/* Korábbi Amnézisek Lista */}` | `{/* Korábbi Anamnézisek Lista */}` | Code comment — fixed for consistency. |
| 13 | `src/pages/PlayerProfileRehab.jsx:224` | `Korábbi amnézisek` | `Korábbi anamnézisek` | User-visible section heading — fixed. |
| 14 | `src/pages/PlayerProfileRehab.jsx:298` | `Jelölj be legalább egy amnézist a megjelenítéshez` | `Jelölj be legalább egy anamnézist a megjelenítéshez` | User-visible empty-state text — fixed. |
| 15 | `src/pages/PlayerProfileRehab.jsx:309` | `A kiválasztott {n} amnézis összes fájdalompontja látható` | `A kiválasztott {n} anamnézis összes fájdalompontja látható` | User-visible caption — fixed. |
| 16 | `src/pages/Rehabilitation.jsx:121` | `{ id: 'anamnesis', name: 'Amnézis', icon: ClipboardList }` | `{ id: 'anamnesis', name: 'Anamnézis', icon: ClipboardList }` | Fixed `name` (rendered tab label). `id: 'anamnesis'` is an internal tab-routing key compared against `playerActiveTab` state elsewhere in the file — **left unchanged**. |
| 17 | `src/pages/Rehabilitation.jsx:232` | `<p ...>Amnézissal</p>` | `<p ...>Anamnézissel</p>` | User-visible stats card label (explicitly requested) — fixed. |

### Left unchanged (not in the table above as edits, for clarity)

- `src/components/DocumentUpload.jsx:185` — `value="anamnézis"` (DB CHECK constraint value on `player_documents.category`).
- `src/pages/Rehabilitation.jsx:121` — `id: 'anamnesis'` (internal routing key, English spelling, not the misspelling).
- Various identifiers across `AnamnesisForm.jsx` / `PlayerProfileRehab.jsx`: `AnamnesisForm`, `existingAnamnesis`, `anamnesisData`, `selectedAnamnesisIds`, `toggleAnamnesisSelection`, `getMergedPainPoints`, `anamnesisDate`, Supabase table name `player_anamnesis` — none of these use the Hungarian misspelling; they're English-based identifiers/DB object names and are out of scope.

## Verification

- `grep -rn "mnézis" src/` after the fix shows only "anamnézis"/"Anamnézis" spellings — zero remaining "amnézis"/"Amnézis" occurrences.
- `npm run build` completed with no errors (only pre-existing chunk-size and Browserslist-data warnings, unrelated to this change).

## Summary

- 15 user-visible strings/labels fixed (table rows 1–5, 10, 13–17 are direct
  UI text; rows 6–9, 11–12 are code comments fixed alongside for hygiene).
- 2 occurrences intentionally left unchanged (DB CHECK-constraint value,
  internal routing id).
