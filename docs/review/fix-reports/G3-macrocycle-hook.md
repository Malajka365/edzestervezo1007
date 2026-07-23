# G3 — Extract MacrocyclePlanner data layer into `useMacrocycleData`

**Status:** Complete — zero behavior change.
**Files:** `src/pages/MacrocyclePlanner.jsx` (1552 → 1225 lines), new `src/pages/macrocycle/useMacrocycleData.js` (446 lines).
**Tests:** 64/64 pass. **Build:** clean.

This was deferred in F6-1 because the data operations were entangled with modal/UI
state. The fix: the hook owns the DATA state and exposes pure, parameterized
operations that read **no** component UI state. The component keeps all UI state
(modals, `editSeason`, `seasonToDelete`, `templateName`, `confirmState`,
`activeDropdown`, grid interaction) and passes UI values *into* the hook operations,
closing/resetting modals only on a success flag returned by the hook.

---

## Step 0 — Entanglement map (as-was, before refactor)

| Function | Reads (data) | Reads (UI) | Setters called | Side effects |
|---|---|---|---|---|
| `fetchSeasons` | `selectedTeam` | — | `setSeasons`, `setCurrentSeason`, `setMacrocycleData`, → `loadSeason` | supabase select, toast.error |
| `loadSeason` | `selectedTeam` | — | `setCurrentSeason`, `setMacrocycleData` | supabase select |
| `handleCreateSeason` | `seasons`, `selectedTeam` | `newSeason`, `e` | `setLoading`, `setSeasons`, `setShowCreateModal`, `setNewSeason`, → `loadSeason` | supabase insert, toast.error, modal close, form reset |
| `updateSeason` | `seasons`, `currentSeason` | **`editSeason`** | `setLoading`, `setSeasons`, **`setShowEditModal`**, → `loadSeason` | supabase update, toast, modal close |
| `deleteSeason` | `seasons`, `currentSeason` | **`seasonToDelete`** | `setLoading`, `setSeasons`, **`setShowDeleteModal`**, **`setSeasonToDelete`**, `setCurrentSeason`, `setMacrocycleData`, → `loadSeason` | supabase delete×2, toast, modal close |
| `fetchTemplates` | `selectedTeam` | — | `setTemplates` | supabase select |
| `saveTemplate` | `currentSeason`, `macrocycleData`, `selectedTeam` | **`templateName`** | `setLoading`, **`setShowTemplateModal`**, **`setTemplateName`**, → `fetchTemplates` | supabase insert, toast×N, modal close+reset (success AND missing-table) |
| `loadTemplate` | `currentSeason`, `macrocycleData` | — | `setMacrocycleData`, **`setShowLoadTemplateModal`**, → `savePlanning` | supabase upsert, toast, modal close |
| `deleteTemplate` | — | **`confirmState`** | **`setConfirmState`** (wraps action), → `fetchTemplates` | supabase delete, toast (inside ConfirmDialog action) |
| `savePlanning` | `currentSeason`, `selectedTeam`, `macrocycleData.mesocycles` | — | — | supabase upsert |
| `handleManualSave` | `currentSeason`, `selectedTeam`, `macrocycleData` | — | **`setIsSaving`**, **`setSaveMessage`** | supabase upsert (UI feedback) |
| `syncMatchWithMacrocycle` | `currentSeason`, `selectedTeam`, `macrocycleData.weeks` | — | — | supabase matches CRUD |
| grid handlers (`handleToggle`, `handleDailyClick`, `handleCycleSave`, `handleOptionSelect`) | `macrocycleData` | `cycleInput`, `activeDropdown`, `activeCycleEdit` | `setMacrocycleData`, `setActive*`, → `savePlanning` | (UI + auto-save) |

---

## Boundary applied

**Moved into the hook** (data state + pure ops): `seasons`, `currentSeason`,
`templates`, `macrocycleData`, `loading`; ops `fetchSeasons`, `loadSeason`,
`createSeason`, `updateSeason`, `deleteSeason`, `fetchTemplates`, `saveTemplate`,
`loadTemplate`, `deleteTemplate` (raw action only), `savePlanning`; the pure
`generateWeeks` helper; and the two `selectedTeam` data-loading `useEffect`s.

**Left in the component** (UI-coupled — correct to leave): all modal/form/dropdown
UI state; `handleManualSave` (owns `isSaving`/`saveMessage`); `syncMatchWithMacrocycle`,
`getDateFromWeekAndDay`, all grid mutation handlers, `getCellColor`, `getCellValue`
(grid interaction, read hook data + call `setMacrocycleData`/`savePlanning`);
`exportToPDF` (owns `exporting`/`tableRef`); `openEditModal`/`openDeleteModal`;
thin wrappers `handleUpdateSeason`, `handleDeleteSeason`, `handleSaveTemplate`,
`handleLoadTemplate`, `handleDeleteTemplate`, `handleCreateSeason` that feed UI
state into hook ops and close/reset modals on the returned success flag.

**Extra op not in the original brief list:** `handleCreateSeason`'s DB logic was
extracted to hook `createSeason(seasonData)` (same pattern as the others) rather
than leaking `setSeasons`/`setLoading` back to the component. The `e.preventDefault`
+ modal-close/reset stays in the component wrapper.

---

## Per-operation verification

| Operation | Read UI state before? | Param-based now? | Behavior identical? |
|---|---|---|---|
| `fetchSeasons` | no | n/a | yes |
| `loadSeason` | no | `season` (was) | yes |
| `createSeason` | `newSeason` | `seasonData` param | yes — wrapper closes+resets on `true` |
| `updateSeason` | `editSeason` | `seasonData` param | yes — returns bool; wrapper closes on `true` only (matches old: close on success only) |
| `deleteSeason` | `seasonToDelete` | `seasonId` param | yes — returns bool; wrapper closes+clears on `true` only |
| `fetchTemplates` | no | n/a | yes |
| `saveTemplate` | `templateName` | `name` param | yes — returns `true` on success **and** missing-table (both close+reset in old), `false` on validation/generic error (stay open) |
| `loadTemplate` | no | `template` (was) | yes — returns bool; wrapper closes on `true` |
| `deleteTemplate` | `confirmState` | `templateId` param | yes — raw action in hook; component re-wraps in ConfirmDialog exactly as before |
| `savePlanning` | no | `planning` (was) | yes — still callable by grid handlers |

**Hook reads zero component UI state: confirmed.** The hook file imports only
`react`, `supabase`, `toast`; it references no modal/`editSeason`/`seasonToDelete`/
`templateName`/`confirmState`/`activeDropdown`/`isSaving`/`saveMessage` identifier.
All modal-close/form-reset side effects live in the component wrappers.

---

## End-to-end trace of the two most entangled flows

**Delete season** (UI → hook → toast → modal close):
1. `DeleteSeasonModal.onConfirm` → component `handleDeleteSeason()`.
2. Reads UI `seasonToDelete`, calls hook `deleteSeason(seasonToDelete.id)`.
3. Hook: `setLoading(true)` → delete `macrocycle_planning` by `season_id` → delete
   `training_seasons` by `id` → `setSeasons(filter)` → if it was `currentSeason`,
   clear `currentSeason`+`macrocycleData` and `loadSeason(updatedSeasons[0])` →
   returns `true`. On error: `toast.error('Hiba történt a szezon törlése során!')`,
   returns `false`, `finally setLoading(false)`.
4. Back in component: on `true` → `setShowDeleteModal(false)`, `setSeasonToDelete(null)`.
   On `false` the modal stays open — identical to the original (which only closed
   inside the `try` on success).

**Save template** (UI → hook → toast → modal close):
1. `SaveTemplateModal.onSubmit` → component `handleSaveTemplate()`.
2. Reads UI `templateName`, calls hook `saveTemplate(templateName)`.
3. Hook: validates `name.trim() && currentSeason` (else toast, return `false`, stay
   open) → `setLoading(true)` → insert into `macrocycle_templates`
   (`planning`/`mesocycles`/`week_count` from `macrocycleData`). Missing-table branch:
   the migration-instructions toast, return `true` (old behavior closed+reset here).
   Success: `toast.success('Sablon sikeresen mentve!')`, `fetchTemplates()`, return
   `true`. Generic error: `toast.error(...)`, return `false`. `finally setLoading(false)`.
4. Back in component: on `true` → `setShowTemplateModal(false)`, `setTemplateName('')`.
   Close+reset happens for success and missing-table, stays open for validation/error —
   identical to the original two close sites.

---

## Verification results

- `npm test` → **64/64 pass** (unchanged; the "kaboom" line is the intentional
  ErrorBoundary test).
- `npm run build` → **clean** (built in ~13s, no errors).
- Line count: component **1552 → 1225** (−327); hook **446** new lines.
- Static grep confirms no dangling references to removed identifiers
  (`setSeasons`/`setCurrentSeason`/`setTemplates`/`setLoading`/`generateWeeks`/
  `fetchSeasons`/`fetchTemplates`/`useEffect`) remain in the component.

## Concerns / notes

- Closure semantics preserved: hook ops read hook state (same render snapshot the
  original component closures used); `savePlanning` reads `macrocycleData.mesocycles`
  from the hook closure exactly as before (grid handlers only mutate `planning`, never
  `mesocycles`, so no divergence).
- The `mesocycles` field is never edited by any UI path (only read from DB / template);
  left untouched.
- A live browser smoke test of the four modal flows + grid auto-save is recommended
  (env requires a logged-in team + Supabase); static + test + build verification is green.
