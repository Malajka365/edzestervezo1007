# F8 — URL-based routing for dashboard modules

Converts the dashboard from state-based module switching (`activeModule` /
`setActiveModule`) to real, deep-linkable URL routing using nested routes, a
layout with `<Outlet />`, and `NavLink` navigation.

## Slug → route → NavLink table

| Module id     | URL                        | Route element (App.jsx)        | Sidebar NavLink `to`        |
|---------------|----------------------------|--------------------------------|-----------------------------|
| home          | `/dashboard` (index)       | `<DashboardHome />`            | `/dashboard` (`end`)        |
| teams         | `/dashboard/csapatok`      | `<Teams />`                    | `/dashboard/csapatok`       |
| macrocycle    | `/dashboard/makrociklus`   | `<MacrocyclePlanner />`        | `/dashboard/makrociklus`    |
| calendar      | `/dashboard/naptar`        | `<Calendar />`                 | `/dashboard/naptar`         |
| exercises     | `/dashboard/gyakorlatok`   | `<ExerciseLibrary />`          | `/dashboard/gyakorlatok`    |
| templates     | `/dashboard/sablonok`      | `<TrainingTemplates />`        | `/dashboard/sablonok`       |
| matches       | `/dashboard/merkozesek`    | `<Matches />`                  | `/dashboard/merkozesek`     |
| measurement   | `/dashboard/meresek`       | `<Measurements session />`     | `/dashboard/meresek`        |
| trainingload  | `/dashboard/kalkulator`    | `<TrainingLoad />`             | `/dashboard/kalkulator`     |
| leaderboard   | `/dashboard/ranglista`     | `<Leaderboard />`              | `/dashboard/ranglista`      |
| progress      | `/dashboard/progresszio`   | `<PlayerProgress />`           | `/dashboard/progresszio`    |
| rehab         | `/dashboard/rehabilitacio` | `<Rehabilitation />`           | `/dashboard/rehabilitacio`  |
| profile       | `/dashboard/profil`        | `<main><Profile session /></main>` | `/dashboard/profil` (user button) |

13 route elements wired (12 sidebar modules + profile), plus the index route.
Catch-all `<Route path="*" element={<Navigate to="/dashboard" replace />} />`
inside the dashboard children redirects unknown slugs.

## What moved where

- **App.jsx**: `/dashboard` became a layout route with nested children. All
  module `React.lazy` imports moved here (from Dashboard.jsx), plus a new lazy
  `DashboardHome`. Profile keeps its `<main className="p-6">` wrapper via the
  route element. Top-level `/auth`, `/join/:token`, `/`, `QueryClientProvider`,
  `Toaster`, `ErrorBoundary` unchanged.
- **Dashboard.jsx**: now a layout. `DashboardContent` renders sidebar + header +
  `<Suspense><Outlet context={{ session, visibleModules }} /></Suspense>`.
  `modules` array gained a `path` field per module; a `profileModule` entry
  provides the profile header title. Sidebar buttons → `NavLink` with
  `isActive`-driven active styling; each still calls `setSidebarOpen(false)` on
  click (mobile close preserved). User-profile button → `NavLink` to
  `/dashboard/profil`. Header title/description now derived from
  `useLocation().pathname` (slug→module lookup) instead of `activeModule` state.
  Removed: `activeModule`/`setActiveModule` state, the content ternary, the dead
  "under development" placeholder, and now-unused icon imports
  (`ChevronRight`).
- **DashboardHome.jsx (new)**: index route content (welcome card + quick-access
  grid + next steps). Reads `session` and `visibleModules` via
  `useOutletContext()`; grid buttons navigate via `useNavigate()` to
  `module.path`.

## Preserved / edge cases

- `TeamProvider` still wraps `DashboardContent`, so the `<Outlet />` (and every
  module + DashboardHome) renders inside it — `useTeams()` works everywhere.
- One `<Suspense fallback={<LoadingSpinner />}>` wraps the `<Outlet />` and
  catches all lazy children.
- Permission-based `visibleModules` still filters the sidebar links and the
  home quick-access grid; `permissionsLoading` shows all modules while loading.
- Header (mobile hamburger) is in the always-rendered layout → available on
  every module.
- Direct navigation to any valid slug loads its module directly (nested routes).
- Unknown `/dashboard/*` → redirect to `/dashboard`.
- `/`, `/auth`, and `/join/:token` behavior unchanged. ErrorBoundary retained.
- `npm run build` passes clean (DashboardHome emitted as its own chunk).
