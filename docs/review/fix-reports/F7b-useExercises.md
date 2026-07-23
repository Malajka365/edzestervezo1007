# F7b — Shared `useExercises` query with cache invalidation

**Step 2 of the React Query migration.** Centralises the global (non-team-scoped)
`exercises` catalog behind a single cached query, following the Step-1 `usePlayers`
pattern exactly. The catalog is scoped to the signed-in user by RLS
(`created_by = auth.uid()`), so the query key is just `['exercises']` — no id.

New hook: `src/hooks/useExercises.js` — `useQuery({ queryKey: ['exercises'] })`,
`select('*').order('name')`, `staleTime` inherited from the provider default (5 min).
Call sites destructure the raw query result (`const { data: exercises = [] } = useExercises()`),
mirroring `usePlayers`.

## Per-file migration

| File | Before | After | Local derived state preserved |
|------|--------|-------|-------------------------------|
| `src/pages/Measurements.jsx` | `useState` + `fetchExercises()` (`.eq('created_by', user.id)`) | `useExercises()`; `fetchExercises` removed; effect no longer calls it | Mutates exercises → see invalidation below |
| `src/pages/Leaderboard.jsx` | `fetchExercises()` (`unit='kg'`, `category!='player_params'`) + auto-select first | `useExercises()` → `useMemo` client-side filter `unit==='kg' && category!=='player_params'`; auto-select moved to an effect | Filtered subset + first-exercise default |
| `src/pages/PlayerProfile.jsx` | `fetchExercises()` (`.order('name')`) + auto-select first | `useExercises()`; auto-select moved to an effect | First-exercise default |
| `src/pages/PlayerProgress.jsx` | `fetchExercises()` (`.order('name')`) | `useExercises()`; `fetchExercises` + its effect removed | none (uses full list) |
| `src/pages/TrainingLoad.jsx` | `fetchExercises()` (`unit='kg'`) | `useExercises()` → `useMemo` client-side filter `unit==='kg'` | Filtered subset (kg-only) |

Select forms differed across call sites; the hook uses the **superset** form
`select('*').order('name')`. Measurements' redundant `.eq('created_by', user.id)`
is dropped because RLS already enforces `created_by = auth.uid()` (identical rows).
Per-screen `unit`/`category` filters became client-side `useMemo` derivations.

Auto-select behaviour (Leaderboard, PlayerProfile): the old code re-selected the
first exercise inside `fetchExercises` (which ran per team change). It is now an
effect that sets the default only when nothing is selected yet
(`if (exercises.length > 0 && !selectedExercise)`). Since the catalog is global,
it no longer resets on team switch — a benign, arguably-better change.

Also removed a now-unused `toast` import from `TrainingLoad.jsx` (its only use was
the deleted `fetchExercises` catch).

## Invalidation points (all in `Measurements.jsx`)

`const queryClient = useQueryClient()` added. After each successful exercise
mutation the optimistic `setExercises(...)` was replaced with
`queryClient.invalidateQueries({ queryKey: ['exercises'] })`:

1. **Update** (`handleCreateExercise`, `editingExercise` branch) — after the
   `.update(...)` succeeds.
2. **Create** (`handleCreateExercise`, else branch) — after the `.insert(...)` succeeds.
3. **Delete** (`handleDeleteExercise` confirm action) — after the `.delete()` succeeds.

Grep confirms **no other file mutates `exercises`** (insert/update/delete). The only
other remaining `from('exercises')` calls are: the hook itself, the three
mutations above, and one **intentionally-kept single-row lookup** in
`Leaderboard.jsx` (`.select('id').eq('name','Testsúly').single()`) that resolves
the body-weight `exercise_id` for a `measurements` filter — that is not the list
fetch, so it is out of scope for this task and left unchanged.

## Freshness reasoning (add/delete → all screens see fresh data)

`Measurements` is an active observer of `['exercises']`. On a successful
create/update/delete, `invalidateQueries(['exercises'])` marks the query stale and
immediately refetches active observers, so the Measurements list (filter dropdown,
management modal, header count) updates in place. The other screens
(`Leaderboard`, `PlayerProfile`, `PlayerProgress`, `TrainingLoad`) are separate
routes; each mounts its own `useExercises` observer on navigation. Because the
query was invalidated (stale), React Query refetches on their next mount/focus
rather than serving the pre-mutation cache — so every screen using `useExercises`
sees the updated catalog. All screens share the one `['exercises']` cache entry,
eliminating the previous 5-independent-fetches pattern.

## Scope / non-regression

- `training_exercises` and `ExerciseLibrary.jsx` **untouched** — different table.
  `git status` does not list `ExerciseLibrary.jsx`; `from('training_exercises')`
  appears only there.
- No other query migrated (players already done in Step 1; measurements/sessions/
  matches stay manual).
- Loading/empty/error UI, `canEdit` gating, PDF exports, PHV logic — all preserved.
- `npm run build` — clean.
