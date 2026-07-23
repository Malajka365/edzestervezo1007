# F7a — Shared `usePlayers` query (React Query, step 1 of 2)

Addresses **KT3** (docs/review/03-teljesitmeny.md): every module switch re-fetched
the full players roster independently. Seven screens each ran their own
`supabase.from('players')` query with no cache, so navigating between modules
repeatedly hit the network for identical data.

## Infrastructure

- `npm i @tanstack/react-query` (added `@tanstack/react-query` to dependencies).
- `src/App.jsx`: module-scoped `QueryClient` created once, with defaults
  `staleTime: 5 * 60 * 1000` (roster rarely changes mid-session) and
  `refetchOnWindowFocus: false`. App wrapped in `<QueryClientProvider>` —
  existing `<Toaster>` and `<Router>` kept intact inside it.
- `src/hooks/usePlayers.js` (new dir): `usePlayers(teamId)` using `useQuery`,
  keyed `['players', teamId]`, `enabled: !!teamId`. Query is
  `select('*').eq('team_id', teamId).order('name', { ascending: true })` —
  the superset of every call site's columns. Returns the standard React Query
  result; call sites destructure `{ data: players = [], isLoading, ... }`.

## Per-file migration

| File | Old players fetch | Now | teamId source |
|------|-------------------|-----|---------------|
| `pages/Teams.jsx` | `useState` + `useEffect` + `select('*').order('jersey_number')`; mutations did optimistic `setPlayers` | `usePlayers(selectedTeam?.id)`; mutations invalidate cache | `selectedTeam?.id` |
| `pages/Measurements.jsx` | `fetchPlayers` `select('*').order('name')` in `[selectedTeam]` effect | `usePlayers(selectedTeam?.id)`; removed `fetchPlayers` call from effect | `selectedTeam?.id` |
| `pages/Leaderboard.jsx` | inline `select('id, name, jersey_number')` **inside** `fetchLeaderboard` | `usePlayers(selectedTeam?.id)`; leaderboard effect now guards on `players.length > 0` and depends on `players` | `selectedTeam?.id` |
| `pages/PlayerProgress.jsx` | `fetchPlayers` `select('*').order('name')` | `usePlayers(selectedTeam?.id)`; removed `fetchPlayers` | `selectedTeam?.id` |
| `pages/Rehabilitation.jsx` | `fetchPlayers` `select('*').order('name')`, drove `loading` + stats | `usePlayers(selectedTeam?.id)`, `isLoading` → `loading`; stats effect unchanged | `selectedTeam?.id` |
| `pages/TrainingLoad.jsx` | `fetchPlayers` `select('*').order('jersey_number')` | `usePlayers(selectedTeam?.id)`, `useMemo`-sorted by jersey | `selectedTeam?.id` |
| `components/TeamAttendanceCalendar.jsx` | `fetchPlayers` `select('id, name, jersey_number').order('name')` in `[currentDate, teamId]` effect | `usePlayers(teamId)`; players no longer refetched on month change | `teamId` prop (= `selectedTeam.id`) |

## Invalidation points (all in `Teams.jsx`)

`Teams.jsx` is the only file that mutates players (confirmed by grep — no
`insert`/`update`/`delete` on `players` elsewhere). A shared
`invalidatePlayers()` helper calls
`queryClient.invalidateQueries({ queryKey: ['players', selectedTeam.id] })`:

| Mutation | Old side-effect | New |
|----------|-----------------|-----|
| `handleCreatePlayer` | `setPlayers([...players, data])` | `invalidatePlayers()` |
| `handleUpdatePlayer` | `setPlayers(players.map(...))` | `invalidatePlayers()` |
| `handleDeletePlayer` | `setPlayers(players.filter(...))` | `invalidatePlayers()` |

DB calls themselves are unchanged.

## Correctness reasoning

- **Add a player in Teams → roster updates without manual refresh.** After the
  insert succeeds, `invalidateQueries(['players', selectedTeam.id])` marks that
  cache key stale. Teams' own `usePlayers` observer is active, so React Query
  refetches immediately and the card list re-renders. Other screens' observers
  (inactive while unmounted) are marked stale and refetch on their next mount,
  so a subsequent module switch shows the new player rather than a stale cache.
- **Switch teams → players refetch for the new team.** The query key includes
  `teamId`; selecting a different team changes the key to
  `['players', newTeamId]`, a distinct cache entry that fetches on first use.

## Per-file query differences handled

- **select**: Leaderboard and TeamAttendanceCalendar previously selected only
  `id, name, jersey_number`. The shared query uses `select('*')` (a superset),
  so both keep working; no missing columns.
- **order**: 4 files ordered by `name`, 2 (Teams, TrainingLoad) by
  `jersey_number`, Leaderboard was unordered. The shared query orders by `name`.
  To avoid regressing display order, **Teams** re-sorts its filtered list by
  jersey number client-side, and **TrainingLoad** `useMemo`-sorts by jersey
  number (memoized to keep a stable reference — its `fetchLatest1RM` effect
  depends on `players`, so a fresh array each render would loop).

## Cleanup

- Removed now-unused `toast` imports from `PlayerProgress.jsx` and
  `Rehabilitation.jsx` (their only `toast` call lived in the deleted
  `fetchPlayers`). Removed unused `useEffect` import from `Teams.jsx`.

## Verification

- `npm run build` — clean (built in ~11s, no errors).
- Out of scope and untouched: measurements, exercises, sessions, matches,
  attendance, anamnesis, documents queries all remain as-is.
