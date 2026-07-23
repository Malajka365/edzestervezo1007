# H2 — Extract Measurements data layer into `useMeasurementsData`

**Status:** DONE — zero behavior change. 67/67 tests pass, `npm run build` clean.

- Component: `src/pages/Measurements.jsx` 659 → 538 lines
- New hook: `src/pages/measurements/useMeasurementsData.js` (216 lines)

Same pattern as the CLEAN `useMacrocycleData` / `useCalendarData` extractions:
parameterized ops, success-flag returns, pure helper exported from the hook file.

## Step-0 map

| Item | Classification | Destination |
|---|---|---|
| `measurements`, `loading` | data state | → hook |
| `fetchMeasurements` | data fetch | → hook, **parameterized** `(filters, sortField, sortDirection)` |
| `handleCreateMeasurement` | data write (reads `measurementForm`) | → hook `createMeasurement(formData)` |
| `handleCreateTeamMeasurement` | data write (reads `teamMeasurementForm`) | → hook `createTeamMeasurement(formData)` |
| `handleCreateExercise` | data write + `['exercises']` invalidate | → hook `createExercise(exerciseForm, editingExercise)` |
| `handleDeleteExercise` action | data write + `['exercises']` invalidate | → hook `deleteExercise(id)` (raw; component keeps confirm wrapper) |
| `calculate1RM` | pure helper (writes + modals) | → exported pure helper, component imports |
| filters/sort/modals/selectedPlayers/editingExercise/forms/confirmState | UI state | stays in component |
| load effects | reactive on UI state | **stay in component** |
| exportToCSV, handleSort, clearFilters, updatePlayerData, toggle\*, proceedToTeamMeasurement, openEditExercise | pure/UI | stays in component |

## Per-op table

| Op | Moved? | Reads UI state? | `['exercises']` invalidate preserved? | Success-flag? |
|---|---|---|---|---|
| `fetchMeasurements(filters, sortField, sortDirection)` | yes | no — filters/sort passed as args | n/a | n/a (returns void, same as before) |
| `createMeasurement(formData)` | yes | no — form passed as arg | n/a | yes → component closes modal + resets form on `true` |
| `createTeamMeasurement(formData)` | yes | no — form passed as arg | n/a | yes → same; empty-validation returns `false`, modal stays open |
| `createExercise(exerciseForm, editingExercise)` | yes | no — both passed as args | **YES — both update & insert branches** | yes → component closes modal + clears editingExercise + resets form on `true` |
| `deleteExercise(id)` | yes (raw action) | no — id passed as arg | **YES** | n/a — component wraps in `confirmState`/`ConfirmDialog` |

## Exercises-cache invalidation — explicit confirmation

`queryClient.invalidateQueries({ queryKey: ['exercises'] })` fires on the SAME success
condition as before, in all three exercise mutations:

1. `createExercise` — **update** branch (after successful `.update(...).select().single()`)
2. `createExercise` — **insert** branch (after successful `.insert(...).select().single()`)
3. `deleteExercise` — after successful `.delete()`

`queryClient` is obtained via `useQueryClient()` **inside the hook** (task-permitted choice);
the component no longer imports `useQueryClient` or `supabase`.

## Notes / deviations (all behavior-preserving)

- **Load effects stay in the component.** `fetchMeasurements` is parameterized with
  filters/sort so the hook reads zero UI state. Both load effects (`[selectedTeam]` and
  `[filters, sortField, sortDirection]`) remain in the component and pass the current
  filters/sort in. Moving the team-change effect into the hook would force the hook to
  read `filters` (forbidden by the verification), or drop active filters / double-fetch.
  This is the task's "too entangled → leave in component + note why" escape hatch.
- **`updateExercise` is not a standalone function** — exercise update is the
  `editingExercise` branch inside `createExercise`, so it is folded there (not a separate
  return value).
- **`createTeamMeasurement` takes only `formData`** — the original write iterates
  `teamMeasurementForm.playerData` and never reads `selectedPlayers`, so adding it would
  be a dead param. `selectedPlayers` remains pure UI state driving the modal only.
- **`calculate1RM` is exported from the hook file** and imported by the component
  (generateWeeks / getWeekDays / getDateKey precedent). Usage is unchanged — still passed
  to `MeasurementModal` and `TeamMeasurementModal`.
- Hook reads **zero** component UI state (no forms, modals, filters, sort, selectedPlayers,
  editingExercise, or confirmState). `selectedTeam` and `session` are props.

## Preserved exactly

Every supabase query/filter/select shape, every toast (including success toasts, moved into
the ops so they fire on the same success condition), the 3× `['exercises']` invalidation,
`calculate1RM` usage, `canEdit` gating, `confirmState`/`ConfirmDialog`, all 5 modal prop
shapes, and the measurement filter/sort behavior.

## Verification

- `npm test` → **67 passed (8 files)**
- `npm run build` → clean (`✓ built in 12.86s`)
- Component 659 → 538, hook 216 lines
