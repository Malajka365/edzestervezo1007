# F3 — Loading Unification & Empty States

Addresses D3 (mixed loading patterns) and D4 (blank empty screens) from
`docs/review/05-design-ux.md`.

## Part 1 — Loading unification (D3)

### `src/components/LoadingSpinner.jsx`

Added two new `size` variants alongside the existing default (`size="full"`,
unchanged, still full-screen):

- `size="inline"` — centered block (icon + label, `py-8`) for card/section
  loading states.
- `size="xs"` — small horizontal icon+text, for compact one-liners and nav
  badges.
- `label` prop overrides the default `"Betöltés..."` text; pass `label={null}`
  for icon-only.

### Loading replacements (bare "Betöltés..." → `LoadingSpinner`)

| File | Line(s) replaced | Variant used |
|---|---|---|
| `src/components/AttendanceCalendar.jsx` | spinner div + `<p>Betöltés...</p>` | `size="inline"` |
| `src/components/TeamMembersPanel.jsx` | `<div className="text-slate-400 text-sm">Betöltés...</div>` | `size="xs"` |
| `src/components/TeamSelector.jsx` | icon + `<span>Betöltés...</span>` inside nav badge | `size="xs"` |
| `src/components/TrainingLocations.jsx` | `<p>Betöltés...</p>` | `size="inline"` |
| `src/pages/PlayerProfile.jsx` | spinner div + `<p>Betöltés...</p>` | `size="inline"` |
| `src/pages/PlayerProgress.jsx` | spinner div + `<p>Betöltés...</p>` | `size="inline"` |
| `src/pages/Leaderboard.jsx` | spinner div + `<p>Betöltés...</p>` | `size="inline"` |
| `src/pages/Rehabilitation.jsx` | spinner div + `<p>Betöltés...</p>` | `size="inline"` |
| `src/pages/TrainingLoad.jsx` | spinner div + `<p>Betöltés...</p>` | `size="inline"` |

**Total: 9 replacements.**

### Skipped (not loading indicators)

- `src/pages/MacrocyclePlanner.jsx` — 4 occurrences of "Betöltés"/"Betöltése"
  are a "Load template" action button/modal title (Hungarian noun "betöltés"
  = load, not a loading spinner state). Left untouched per instructions
  ("Mentés..." style labels stay).

### Not touched (already used ad-hoc `animate-spin` divs but no bare
"Betöltés..." text, so out of the literal D3 grep scope): `Matches.jsx`,
`TrainingTemplates.jsx`, `Auth.jsx`, `AnamnesisForm.jsx`,
`SupabaseConnectionTest.jsx`, `TeamAttendanceCalendar.jsx`. These render a
spinner with no text label, so there was no "Betöltés..." string to replace;
left as-is to keep the change surgical and grep-driven per D3's finding.

## Part 2 — Empty states (D4)

### `src/components/ui/EmptyState.jsx` (new)

Props: `icon` (lucide component, optional), `title`, `description`,
`actionLabel`, `onAction` (button rendered only when both are provided).
Styled with the app's `.card` class, centered, `py-12`, matching
`ConfirmDialog.jsx`'s conventions (plain function component, Tailwind
utility classes, no external deps).

### Empty states added

| Page | Copy used | Action button |
|---|---|---|
| `src/pages/Teams.jsx` (player list) | Title: "Még nincs játékos" · Desc: "Ebben a csapatban még nincs egyetlen játékos sem rögzítve." | "Játékos hozzáadása" → opens existing add-player modal (only shown if user can edit players) |
| `src/pages/Measurements.jsx` (measurement table) | No filters — Title: "Még nincs mérés" · Desc: "Rögzíts egy mérést, hogy nyomon követhesd a játékosok fejlődését." → button "Mérés rögzítése" opens existing add-measurement modal. With active filters — Title: "Nincs találat" · Desc: "Próbálj meg más szűrőket használni." (no button) | Conditional on `hasActiveFilters` |
| `src/pages/Rehabilitation.jsx` (player list) | No search — Title: "Még nincs játékos" · Desc: "A csapatodhoz még nem tartozik játékos, akihez rehabilitációs adatot rögzíthetnél." With search — Title: "Nincs találat" · Desc: "Próbálj meg más keresési kifejezést." | None (players come from team roster; no create action in this view) |

**Total: 3 pages converted, 4 distinct copy states.**

### Checked and left as-is (already have a good empty state: icon + title +
description + working action button, or icon+title+description where no
create action makes sense)

- `src/pages/Matches.jsx` — already has Trophy icon, "Nincs még mérkőzés"
  title, description and "Első mérkőzés hozzáadása" button.
- `src/pages/TrainingTemplates.jsx` — already has Trophy icon, "Nincs még
  sablon" title, description and add-template button.
- `src/pages/ExerciseLibrary.jsx` — already has Dumbbell icon, "Nincs
  találat" title, description and "Szűrők törlése" button (filter-clear
  action, appropriate since exercises come from a shared library, not
  page-local creation).
- `src/pages/TrainingLoad.jsx` — "Nincs adat" / "Válassz gyakorlatot" states
  already have icon + title + description; no create action applies (it's a
  read-only calculator view), so no button is needed.
- `src/pages/Calendar.jsx` — the "Nincs edzés erre a napra" line lives nested
  inside a day-detail card that already has its own header and "Edzés
  hozzáadása" button directly above it. Wrapping it in `EmptyState` (itself a
  `.card`) would nest cards awkwardly for a small transient panel, so it was
  left as plain text per the task's "if trivially identifiable" caveat.

### Not touched (per scope)

`src/pages/Dashboard.jsx`, `Auth.jsx`, `JoinTeam.jsx`, `TeamContext` — as
instructed.

## Verification

- `npm run build` — clean, no errors (only pre-existing browserslist/
  baseline-data warnings, unrelated to this change).
- All edits are render-only; no data-fetching/state logic was changed.

## Commits

1. `1d133ee` — `style: unify loading indicators with LoadingSpinner variants`
2. `fe5c1ed` — `feat: add EmptyState component and empty-state guidance to list views`

Note: `src/pages/Rehabilitation.jsx` contains both a loading-spinner swap and
an empty-state swap on adjacent lines of the same ternary chain; it was not
possible to cleanly hunk-split it, so its loading-spinner change rides along
in commit 2 rather than commit 1. Both changes in that file are render-only.
