# H3 — ExerciseLibrary data-layer extraction into `useExerciseLibraryData`

**Status:** DONE. Zero behavior change. 67 tests pass, build clean.

Extracts the data layer of `src/pages/ExerciseLibrary.jsx` into
`src/pages/exercise-library/useExerciseLibraryData.js`, the same pattern as the
reviewer-CLEAN useMacrocycleData / useCalendarData / useMeasurementsData hooks.
This is the last data-hook extraction.

## Table clarity
This page uses `training_exercises` (the global exercise LIBRARY) +
`user_exercise_favorites`. This is a DIFFERENT table from `exercises` (Measurements
page / `useExercises` React Query hook). `useExercises` and the `exercises` table
were **not touched**. There is no React Query hook for `training_exercises`; this
is a plain useState-based extraction.

## Step 0 — MAP
| Item | Classification | Disposition |
|------|----------------|-------------|
| `fetchExercises` | Data fetch (training_exercises + user_exercise_favorites) | MOVED to hook |
| `createExercise` | Data write (reads newExercise form) | MOVED (parameterized `createExercise(newExercise)`) |
| `updateExercise` | Data write (reads editingExercise form) — separate fn | MOVED (parameterized `updateExercise(editingExercise)`) |
| `deleteExercise` | Data write (raw delete) wrapped in confirmState | Raw delete MOVED; confirm wrapper STAYS |
| `toggleFavorite(id)` | Data write (insert/delete favorites) | MOVED |
| `exercises`, `favorites`, `loading` | Data state | MOVED to hook |
| mount effect `fetchExercises()` | Load effect | MOVED to hook |
| `filteredExercises` + `filterExercises` | Derived (reads UI filter state) | STAYS (component memo-style) |
| `searchTerm`, `selectedMuscleGroup`, `selectedDifficulty`, `selectedType`, `showFavoritesOnly`, `selectedExercise`, `showCreateModal`, `showEditModal`, `editingExercise`, `newExercise`, `expandedGroups`, `confirmState` | UI state | STAY |
| `getDifficultyColor`, `getMuscleGroupInfo`, `groupExercisesByMuscleGroup`, `toggleGroupExpand`, `startEditExercise` | Pure helpers | STAY |
| `filterExercises` effect | Derived recompute | STAYS |

## Per-op table
| Op | Moved? | Reads UI state? | Success-flag? | Notes |
|----|--------|-----------------|---------------|-------|
| `fetchExercises()` | yes | no | n/a | uses `supabase.auth.getUser()` (unchanged) |
| `createExercise(newExercise)` | yes | no (form passed in) | yes → component resets form + closes create modal | validation returns false w/o loading toggle (matches original) |
| `updateExercise(editingExercise)` | yes | no (form passed in) | yes → component closes edit modal + clears editingExercise | same validation semantics |
| `deleteExercise(id)` (raw) | yes | no | n/a | component keeps confirmState/ConfirmDialog wrapper calling this |
| `toggleFavorite(id)` | yes | no | n/a | snapshot reads preserved (see trace) |

## toggleFavorite trace (functional-update preserved?)
The ORIGINAL used **snapshot** reads, NOT functional updates. Preserved EXACTLY:
1. `const { data:{user} } = await supabase.auth.getUser()` — auth unchanged.
2. `const isFavorite = favorites.includes(exerciseId)` — reads the current
   `favorites` snapshot from the closure.
3. delete branch → supabase delete on `user_exercise_favorites` (user_id +
   exercise_id) → `setFavorites(favorites.filter(id => id !== exerciseId))` (snapshot).
4. insert branch → supabase insert `{ user_id, exercise_id }` → `setFavorites([...favorites, exerciseId])` (snapshot).

The hook's `toggleFavorite` closes over the hook's `favorites`; every favorites
change re-renders the component, re-runs the hook, and rebinds the closure over
fresh `favorites` — identical semantics to the pre-extraction component. Switching
to a functional setState would be a behavior CHANGE, so it was deliberately NOT
done; "Preserve exactly" wins over the functional-update suggestion.

## Auth / signature note
The original page had **no `session` prop** (rendered as `<ExerciseLibrary />`)
and resolved the user via `supabase.auth.getUser()` inside fetchExercises and
toggleFavorite. To keep zero behavior change and avoid introducing coupling the
component can't satisfy, the hook signature is `useExerciseLibraryData()` (no
session param) and keeps the `getUser()` calls verbatim. The task's
`useExerciseLibraryData(session)` framing assumed session.user.id; the actual
source is getUser(), so no param is added.

## Hook reads zero component UI state?
Confirmed. The hook imports only `useState`, `useEffect`, `supabase`, `toast`.
It never references searchTerm/filters/forms/modals/confirmState/editingExercise/
newExercise. Form data enters solely as function arguments.

## Verification
- `npm test` → 8 files, **67 passed**.
- `npm run build` → built clean in ~13s.
- Component `ExerciseLibrary.jsx`: 806 → **675** lines. Hook: **226** lines.
- `supabase` and `toast` imports removed from the component (now unused there).

## Concerns
None. Faithful extraction; snapshot favorites logic preserved; supabase queries,
toasts, canEdit gating, ConfirmDialog, and both modal prop shapes
(`createExercise`/`updateExercise` zero-arg onClick handlers) unchanged.
