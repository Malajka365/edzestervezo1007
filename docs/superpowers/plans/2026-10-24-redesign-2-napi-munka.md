# Újratervezés 2. szakasz: Napi munka – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customisable widget home page (drag, resize, per-widget settings, catalog, role defaults), a "Mai edzés" page with one-save attendance, session creation from every calendar view, a faster exercise library, a logged player-availability status, and Jelenlét as its own permission module.

**Architecture:** DB changes are three idempotent SQL migrations the user runs in the Supabase SQL Editor. Pure logic lives in small `src/lib/*` modules with unit tests (layout normalisation, availability from log, session/attendance resolution, todos, trend averaging); React pages and widgets consume them through React Query hooks. The home grid is a CSS grid (4/2/1 columns) ordered by the stored array, reordered with `@dnd-kit/sortable`, resized with a snapping corner handle.

**Tech Stack:** React 18, Vite 5, Tailwind 3 (phase-1 tokens), React Query 5, Supabase JS, lucide-react, Vitest + Testing Library, new: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

**Spec:** `docs/superpowers/specs/2026-10-24-redesign-2-napi-munka-design.md` (read its "Rögzített részletek" section — those rules are binding). Visual reference: `docs/redesign/kezdolap-widgetek.html`.

## Global Constraints

- Branch `claude/redesign-2-napi-munka` (based on the phase-1 branch). Never touch `master`; never push unless the controller says so.
- All phase-1 rules: token classes only (no `slate-*`, `primary-*`, legacy `btn*`/`card`/`input-field`), primitives from `src/components/ui`, Hungarian UI copy, no emoji, both themes readable, no horizontal page scroll at 375 px. `npm test`, `npm run build`, `npm run redesign:check -- src` pass at the end of every task.
- New dependencies: only `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- DB changes only via new files in `supabase/migrations/` named `20261024000001_…`, `…02_…`, `…03_…`; idempotent (`if not exists`, `on conflict do nothing`, `drop … if exists`). The executor cannot run them; tests mock Supabase.
- `user_dashboard_prefs` table is NOT altered; the new layout lives in its `widgets` JSONB.
- Availability statuses: `'available' | 'limited' | 'injured'` → labels „Bevethető", „Korlátozott", „Sérült" → StatusPill `ok | warn | bad`.
- Attendance statuses stay as today: `jelen, hiányzik, beteg, sérült, egyéb` (`src/lib/attendance.js`). Session-linked rows use `training_type: 'edzés'`, `date` = session date, `event_time` = session `start_time`.
- New permission module key `attendance` (label „Jelenlét"); defaults coach/fitness_coach/physiotherapist = `edit`.
- New routes: `/dashboard/mai-edzes` (nav item „Mai edzés", group Áttekintés, after Kezdőlap, `permissionKey: 'calendar'`), `/dashboard/jelenlet` (nav item „Jelenlét", group Csapat, between Játékosok and Egészség, `permissionKey: 'attendance'`).

## Review Focus

1. A stored layout in the old shape `[{key, visible}]`, including hidden items and unknown keys, loads without crash: hidden and unknown items dropped, others get default sizes. (Task 4)
2. A session day that already has legacy, session-less attendance rows shows them as recorded and links them on save instead of inserting duplicates. (Task 3)
3. A player with no availability rows, or whose only rows start after the viewed date, is „Bevethető". (Task 2)
4. Two sessions today, both already finished → the page still shows today's sessions, not tomorrow's. (Task 3)
5. A widget whose module permission was revoked is hidden but survives in the stored JSON when the user saves other changes. (Task 4)

---

### Task 1: Migrations, permission module, routes and nav entries

**Files:**
- Create: `supabase/migrations/20261024000001_attendance_module.sql`, `supabase/migrations/20261024000002_attendance_session_link.sql`, `supabase/migrations/20261024000003_player_availability.sql`, `docs/MIGRACIOK-2-SZAKASZ.md`
- Modify: `src/lib/permissions.js`, `src/lib/permissions.test.js`, `src/lib/navigation.js`, `src/lib/navigation.test.js`, `src/App.jsx`
- Create (placeholders replaced in Tasks 6–7): `src/pages/TodaySession.jsx`, `src/pages/Attendance.jsx` — each renders `PageHeader` with its title and an `EmptyState` „Hamarosan".

**Interfaces:**
- Produces: `MODULES` contains `{ key: 'attendance', name: 'Jelenlét' }` (after `rehab`); nav items `{ id: 'today', label: 'Mai edzés', path: '/dashboard/mai-edzes', icon: Timer, permissionKey: 'calendar' }` and `{ id: 'attendance', label: 'Jelenlét', path: '/dashboard/jelenlet', icon: CheckSquare, permissionKey: 'attendance' }`; tables `player_availability`, column `player_attendance.training_session_id`.

- [ ] **Step 1: Write the three SQL files.**
  - `…01_attendance_module.sql`: find the `team_module_permissions.module_key` CHECK constraint name via `pg_constraint` (where `conrelid = 'public.team_module_permissions'::regclass` and definition contains `module_key`) in a `DO $$ … $$` block, drop it, add `team_module_permissions_module_key_check` with the 9 old keys + `'attendance'`; backfill `insert … select t.id, m.role, 'attendance', 'edit' from teams t cross join (values ('coach'),('fitness_coach'),('physiotherapist')) m(role) on conflict do nothing`; `create or replace function public.handle_new_team()` — copy the body from `20260720120000_team_membership_schema.sql` verbatim and add the three `attendance`/`edit` rows (keep SECURITY DEFINER / search_path exactly as the original).
  - `…02_attendance_session_link.sql`: `alter table public.player_attendance add column if not exists training_session_id uuid references public.training_sessions(id) on delete set null`; `create unique index if not exists player_attendance_session_player_uniq on public.player_attendance (training_session_id, player_id) where training_session_id is not null`; drop the four existing `player_attendance` policies (names from `20260720120500_rehab_module_rls.sql`) and recreate them with `has_team_access(team_id,'attendance',L) or has_team_access(team_id,'rehab',L)` (L = `'view'` for select, `'edit'` otherwise).
  - `…03_player_availability.sql`: table `player_availability(id uuid pk default gen_random_uuid(), team_id uuid not null references teams on delete cascade, player_id uuid not null references players on delete cascade, status text not null check (status in ('available','limited','injured')), started_on date not null default current_date, expected_return date, note text, created_by uuid default auth.uid() references auth.users, created_at timestamptz not null default now())`; index `(team_id, player_id, started_on desc, created_at desc)`; RLS on; select: `has_team_access(team_id,'players','view') or has_team_access(team_id,'rehab','view')`; insert/update/delete: `has_team_access(team_id,'rehab','edit')`.
- [ ] **Step 2: Write `docs/MIGRACIOK-2-SZAKASZ.md`** (Hungarian): run the three files in order in Dashboard → SQL Editor before deploying; how to verify (`select module_key, count(*) from team_module_permissions group by 1`; `select count(*) from player_availability`).
- [ ] **Step 3: Failing tests.** `permissions.test.js`: `MODULES.map(m=>m.key)` includes `'attendance'`. `navigation.test.js`: `findNavItemByPath('/dashboard/mai-edzes').id === 'today'`, `findNavItemByPath('/dashboard/jelenlet').id === 'attendance'`; `filterNav(NAV_GROUPS, { calendar:'view' }, false)` overview items = `['home','today']`; with `{ players:'view' }` the team group has no `attendance`; total items while loading = 14. Update the existing "12 items" assertions to 14.
- [ ] **Step 4:** Run `npx vitest run src/lib/permissions.test.js src/lib/navigation.test.js` → FAIL.
- [ ] **Step 5:** Implement the `permissions.js`, `navigation.js` changes, routes `mai-edzes` → `TodaySession`, `jelenlet` → `Attendance` (lazy, like the others), placeholder pages. `MOBILE_TAB_IDS` unchanged.
- [ ] **Step 6:** `npm test`, `npm run build`, `npm run redesign:check -- src` → all pass.
- [ ] **Step 7: Commit** `feat(phase2): attendance module, availability table, session-linked attendance (migrations + nav)`.

---

### Task 2: Availability logic, hook and UI

**Files:**
- Create: `src/lib/availability.js`, `src/lib/availability.test.js`, `src/hooks/useAvailability.js`, `src/components/availability/AvailabilityPill.jsx`, `src/components/availability/AvailabilityEditor.jsx` (Modal), `src/components/availability/AvailabilityHistory.jsx`
- Modify: `src/pages/Rehabilitation.jsx` (player grid: pill + „Státusz" button), `src/pages/PlayerProfileRehab.jsx` (pill in header + history panel with edit/delete), `src/pages/Teams.jsx` (pill on player cards), `src/pages/PlayerProfile.jsx` (pill in header)
- Test: `src/test/components/Availability.test.jsx`

**Interfaces:**
- Produces:
  - `AVAILABILITY = { available: { label:'Bevethető', tone:'ok' }, limited: { label:'Korlátozott', tone:'warn' }, injured: { label:'Sérült', tone:'bad' } }`
  - `currentAvailability(entries: Entry[], onDate?: string /* YYYY-MM-DD, default today */) -> Map<playerId, { status, expected_return|null, note|null, entryId|null, started_on|null }>` — per player the entry with max `started_on` ≤ onDate, ties by max `created_at`; players without such an entry are absent from the map.
  - `availabilityOf(map, playerId) -> { status:'available', … }` default when absent.
  - `useAvailability(teamId, onDate?) -> { byPlayer: Map, entries, loading, setStatus({playerId,status,started_on,expected_return,note}), updateEntry(id, patch), deleteEntry(id) }` (React Query key `['availability', teamId]`; mutations invalidate it).
  - `<AvailabilityPill status />`, `<AvailabilityEditor open onClose player teamId entry? />`, `<AvailabilityHistory playerId teamId canEdit />`.

- [ ] **Step 1: Failing tests** (`availability.test.js`): empty entries → `availabilityOf(map,'p1').status === 'available'`; two entries for p1 (`started_on '2026-10-01' injured`, `'2026-10-10' limited`) with onDate `'2026-10-05'` → injured, onDate `'2026-10-20'` → limited; same `started_on`, later `created_at` wins; only entry starts `'2026-11-01'`, onDate `'2026-10-24'` → available.
- [ ] **Step 2:** `npx vitest run src/lib/availability.test.js` → FAIL.
- [ ] **Step 3:** Implement `availability.js` and `useAvailability.js` (select `*` from `player_availability` where `team_id`, all rows; inserts set `team_id`).
- [ ] **Step 4: Component test** (`Availability.test.jsx`, Supabase mocked like other tests): the editor submits `{ status:'injured', started_on, expected_return, note }` for the chosen player; a user without `rehab` edit (`canEditModule` false) sees no „Státusz" button and no edit/delete in history.
- [ ] **Step 5:** Implement components and wire them into the four pages (edit controls only with `canEditModule(perms,'rehab')`).
- [ ] **Step 6:** `npm test`, `npm run build`, `npm run redesign:check -- src` → pass.
- [ ] **Step 7: Commit** `feat(phase2): player availability log with editor, history and pills`.

---

### Task 3: Session picking and session attendance logic

**Files:**
- Create: `src/lib/sessionAttendance.js`, `src/lib/sessionAttendance.test.js`

**Interfaces:**
- Consumes: `availabilityOf` (Task 2).
- Produces:
  - `pickSession(sessions: Session[], today: string) -> { mode: 'today'|'next'|'none', session: Session|null, todays: Session[] }` — `todays` = sessions with `date === today` sorted by `start_time` (nulls last); if any → mode `today`, `session = todays[0]`; else first future by date then `start_time` → `next`; else `none`.
  - `resolveRoster({ session, players, linkedRows, dayRows, sessionsThatDay, availabilityByPlayer }) -> { rows: RosterRow[], recorded: boolean }` where `RosterRow = { player, status, notes, rowId|null, adopt: boolean }`. Rules (spec „Rögzített részletek"): linked rows win; else unlinked `dayRows` are adopted when `sessionsThatDay.length === 1` or `row.event_time` equals `session.start_time` (compare `HH:MM`); players without a row default to `jelen`, or `sérült` if availability is `injured`. `recorded` = at least one linked or adopted row.
  - `buildAttendanceWrites(session, rows, teamId) -> { inserts: object[], updates: { id, patch }[] }` — new rows `{ team_id, player_id, date: session.date, event_time: session.start_time, training_type: 'edzés', training_session_id: session.id, status, notes }`; adopted/linked rows become updates with `{ status, notes, training_session_id: session.id }`.
  - `canRecordAttendance(session, today) -> boolean` — `session.date <= today`.

- [ ] **Step 1: Failing tests:** pickSession — two sessions today at `09:00` and `17:30` and one tomorrow, `today` after both → mode `today`, session the `09:00` one; none today, two future → the earliest; none → `none`. resolveRoster — no rows, one injured player → that row `sérült`, others `jelen`, `recorded` false; one unlinked dayRow, single session that day → adopted (`adopt: true`, `rowId` set, `recorded` true); two sessions that day and unlinked row `event_time '17:30:00'` matching session `start_time '17:30:00'` → adopted, non-matching → ignored. buildAttendanceWrites — adopted row produces an update containing `training_session_id`, unrecorded player an insert with `training_type: 'edzés'`. canRecordAttendance — future date false.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS; full `npm test`.
- [ ] **Step 5: Commit** `feat(phase2): session picking and session attendance resolution`.

---

### Task 4: Dashboard layout model

**Files:**
- Create: `src/lib/dashboardLayout.js`, `src/lib/dashboardLayout.test.js`
- Modify: `src/lib/dashboardWidgets.js` (registry fields; components wired in later tasks), `src/hooks/useDashboardPrefs.js` (store via `toStored`)

**Interfaces:**
- Registry entry (in `dashboardWidgets.js`, keyed by `type`): `{ type, name, icon, category: 'Áttekintés'|'Csapat és egészség'|'Teljesítmény'|'Eszközök', module_key: string|null, component, defaultSize: [w,h], minSize: [w,h], allowMultiple?: true, settings?: [{ key, label, options: [[value, label]] }], defaultSettings?: object, comingSoon?: true }`. Types: existing 9 keep their keys (`upcoming_week`, `next_match`, `weekly_attendance` (module_key → `'attendance'`), `rehab_status`, `recent_measurements`, `leaderboard_top3`, `season_progress`, `team_overview`, `quick_actions`) plus new `today_session`, `availability`, `todos`, `measurement_trend`, `measurement_coverage`, `weekly_load`, `favorite_exercises`, `note`, and comingSoon `team_wellness`, `injury_summary`, `rehab_bookings`. Settings/defaults/sizes exactly as the spec's widget table and „Alap-elrendezés" list.
- `Item = { id: string, type: string, w: 1-4, h: 1-3, settings: object }`
- `DEFAULT_LAYOUTS = { coach: [...], fitness_coach: [...], physiotherapist: [...] }` as `[type, w, h, settings?]` from the spec.
- `defaultLayout(role, perms) -> Item[]`; `normalizeLayout(saved: unknown, role, perms) -> Item[]` (null/[] → default; old `{key,visible}` → visible ones become `{ id:key, type:key, default size, defaultSettings }`; unknown types dropped; clamps w/h to `[minSize, 4|3]`); `visibleItems(items, perms) -> Item[]` (permission + not comingSoon); `toStored(items) -> object[]` (each `{ ...item, key: item.type, visible: true }`); `addItem(items, type) -> Item[]` (new id `crypto.randomUUID()`; no-op if not `allowMultiple` and present); `newId()`.

- [ ] **Step 1: Failing tests:** old shape `[{key:'upcoming_week',visible:true},{key:'next_match',visible:false},{key:'nope',visible:true}]` → one item `upcoming_week` with its default size; `null` for role `physiotherapist` with perms lacking `measurement` → default physio layout without measurement widgets; `visibleItems` hides an item whose module is `none` while `toStored(items)` still contains it (Review Focus 5); `addItem` twice for `note` → two items with different ids, twice for `todos` → one; `toStored` items carry `key` and `visible: true`; w=9 clamps to 4.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; `useDashboardPrefs.savePrefs` stores `toStored(items)`. **Step 4:** run → PASS; full suite.
- [ ] **Step 5: Commit** `feat(phase2): dashboard layout model with migration of saved layouts`.

---

### Task 5: Home grid with edit mode, drag, resize, settings and catalog

**Files:**
- Modify: `src/pages/DashboardHome.jsx`, `src/pages/dashboard-home/WidgetCard.jsx`; delete `src/pages/dashboard-home/CustomizeEditor.jsx` (and its usages)
- Create: `src/pages/dashboard-home/HomeGrid.jsx`, `WidgetFrame.jsx`, `WidgetCatalog.jsx` (Drawer), `WidgetSettings.jsx` (Drawer), `useResizeHandle.js`
- Test: `src/test/components/HomeGrid.test.jsx`
- `package.json`: add the three `@dnd-kit` packages.

**Interfaces:**
- Consumes: Task 4 API; registry `component` receives props `{ settings, size: { w, h }, onSettingsChange(patch) }` (existing widgets ignore them until Task 8).
- Produces: `<HomeGrid items perms editing onChange(items) />`; header actions „Szerkesztés"/„Kész", in edit mode also „Widget hozzáadása" and „Alaphelyzet".

- [ ] **Step 1: Failing tests:** renders the normalised default for a coach; edit mode shows drag handles and remove buttons; removing a widget calls `savePrefs` with it gone (debounce: use fake timers, 600 ms); catalog lists only permitted types, shows comingSoon types disabled with „4. szakasz", adding `note` appends an item; settings drawer for `upcoming_week` changes `days` to `'14'` and saves; size chips set `w/h`; keyboard reorder (dnd-kit `KeyboardSensor`: focus handle, Space, ArrowDown, Space) moves the item down one place.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implement. Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[132px] lg:grid-flow-row-dense gap-3.5`; span classes from literal lookup maps (`{1:'lg:col-span-1',…}`, `sm:col-span-2` max on tablet, rows `{1:'row-span-1',2:'row-span-2',3:'row-span-3'}`; below `sm` rows auto, min-height 150 px). Resize handle only at `lg` and in edit mode; snaps by measured column/row size, respects `minSize`. Save debounced 600 ms via `savePrefs(toStored(items))`.
- [ ] **Step 4:** run → PASS; full suite, build, redesign:check.
- [ ] **Step 5: Commit** `feat(phase2): customisable home grid (drag, resize, settings, catalog, reset)`.

---

### Task 6: Mai edzés page

**Files:**
- Replace: `src/pages/TodaySession.jsx`
- Create: `src/pages/today-session/useTodaySession.js`, `SessionHeader.jsx`, `SessionPlan.jsx`, `AvailabilitySummary.jsx`, `AttendanceRoster.jsx`, `SessionNotes.jsx`
- Test: `src/test/components/TodaySession.test.jsx`

**Interfaces:**
- Consumes: `pickSession`, `resolveRoster`, `buildAttendanceWrites`, `canRecordAttendance` (Task 3); `useAvailability` (Task 2); `TrainingSessionModal` (existing) for edit.
- Produces: `useTodaySession(teamId, sessionIdParam?) -> { pick, session, players, roster, recorded, loading, saveAttendance(rows), saveNotes(text) }`. Availability is read with `useAvailability(teamId, session.date)` so a past session shows the status valid on that day (spec „Rögzített részletek").

- [ ] **Step 1: Failing tests** (Supabase mocked): with a gym session today whose `session_data.exercises` has 2 items → table shows both names and `sets × reps`; roster defaults all `jelen` except an injured player `sérült`; clicking „Mentés" calls insert with `training_session_id` and `training_type: 'edzés'`; with no session today and one tomorrow → „Ma nincs edzés" and the tomorrow session, roster read-only with „Az edzés napján rögzíthető"; `?session=<id>` selects that session; user without `attendance` edit sees read-only roster.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (layout: lg two columns — plan left, availability + roster right; header actions „Szerkesztés" (calendar edit) and „Naptárban"). Roster rows: name, number, availability pill, status `SegmentedControl` (5 values), note input; one primary „Mentés", then „Mentve · HH:MM". **Step 4:** run → PASS; full checks.
- [ ] **Step 5: Commit** `feat(phase2): Mai edzés page with plan, availability and one-save attendance`.

---

### Task 7: Jelenlét page and calendar creation from every view

**Files:**
- Replace: `src/pages/Attendance.jsx` (PageHeader „Jelenlét" + `TeamAttendanceCalendar`, edit gated by `canEditModule(perms,'attendance')`)
- Modify: `src/pages/Rehabilitation.jsx` (remove the „Csapat jelenlét" tab; player rehab attendance tab unchanged), `src/components/TeamAttendanceCalendar.jsx` (accept `canEdit` prop), `src/pages/calendar/MonthView.jsx`, `src/pages/calendar/WeekView.jsx`, `src/pages/calendar/DayView.jsx`, `src/pages/Calendar.jsx`
- Create: `src/pages/calendar/SessionActions.jsx` (Drawer/Popover: „Megnyitás a Mai edzés oldalon" → `/dashboard/mai-edzes?session=<id>`, „Szerkesztés", „Törlés")
- Test: `src/test/components/CalendarCreate.test.jsx`, update `CalendarTemplates.test.jsx` if needed

- [ ] **Step 1: Failing tests:** clicking an empty day in MonthView (calendar edit) opens `TrainingSessionModal` with that date prefilled; same for the WeekView „+ edzés" slot; without calendar edit nothing opens; clicking an existing session shows SessionActions whose first link points to `/dashboard/mai-edzes?session=<id>`; Rehabilitation renders no „Csapat jelenlét" tab; Attendance page without `attendance` edit renders the calendar read-only.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (pass an `onCreate(date)` prop from `Calendar.jsx` to the views; reuse the existing modal state). **Step 4:** run → PASS; full checks.
- [ ] **Step 5: Commit** `feat(phase2): Jelenlét page and session creation from month/week views`.

---

### Task 8: Existing widgets get settings

**Files:**
- Modify: `src/pages/dashboard-home/widgets/UpcomingWeekWidget.jsx` (title „Következő napok"; `days` 7|14, `types` all|match|train), `NextMatchWidget.jsx` (`last` yes|no — previous result when `h>1`), `WeeklyAttendanceWidget.jsx` (`period` week|month|season; most-absent list when `h>1`), `RecentMeasurementsWidget.jsx` (`n` 3|5|8; „csúcs" pill when value is the player's best for that exercise — lowest for sprint/time units), `LeaderboardTop3Widget.jsx` (title „Ranglista"; `metric` rel|sq|att, `n` 3|5|all; relative strength = existing Leaderboard calculation, extract it to `src/lib/strength.js` `relativeStrength(oneRm, bodyWeight)` and reuse), `QuickActionsWidget.jsx` (`set` coach|fit|physio; only permitted actions)
- Test: `src/test/components/Widgets.test.jsx`, `src/lib/strength.test.js`

- [ ] **Step 1: Failing tests:** one assertion per setting: UpcomingWeek with `types:'match'` lists only matches; RecentMeasurements `n:'3'` renders 3 rows and marks a personal best; Ranglista `metric:'att', n:'5'` renders 5 rows sorted by attendance; QuickActions `set:'fit'` shows „Új mérés" and hides it without `measurement` edit; `relativeStrength(120, 80) === 1.5`. React Query keys include the settings.
- [ ] **Step 2–4:** FAIL → implement → PASS; full checks.
- [ ] **Step 5: Commit** `feat(phase2): settings for existing home widgets`.

---

### Task 9: New widgets

**Files:**
- Create in `src/pages/dashboard-home/widgets/`: `TodaySessionWidget.jsx` (`detail` blocks|compact; „Jelenlét" and „Részletek" → `/dashboard/mai-edzes`), `AvailabilityWidget.jsx` (`show` issues|all), `TodosWidget.jsx` (`src` all|perf|health), `MeasurementTrendWidget.jsx` (`who` team|playerId, `ex` exercise id, `per` 8|26|52 weeks; SVG line like PlayerProfile), `MeasurementCoverageWidget.jsx` (`limit` 4|6|8), `WeeklyLoadWidget.jsx` (planned load per day of the current week from `training_load_factors`, same source as the calendar week view), `FavoriteExercisesWidget.jsx` (from `user_exercise_favorites`; click opens the exercise in the library), `NoteWidget.jsx` (textarea, saves into `settings.text` through `onSettingsChange`, debounced)
- Create: `src/lib/todos.js` + test, `src/lib/trend.js` + test
- Modify: `src/lib/dashboardWidgets.js` (wire components)

**Interfaces:**
- `computeTodos({ now, perms, measurementsByPlayer, players, sessionsLast7, attendanceDates, availabilityByPlayer, nextPhaseStart, coverageWeeks=6 }) -> Todo[]` with `Todo = { id, tone:'warn'|'bad'|'info', text, to }`; rules exactly as spec („Teendők szabályai" + „lejárt visszatérés"), each only with its permission.
- `weeklyTeamAverage(measurements, { weeks, now, lowerIsBetter? }) -> { weekStart, value }[]` — weeks without measurements omitted.

- [ ] **Step 1: Failing tests:** todos — a player last measured 7 weeks ago with `measurement` perm → one warn todo; same without perm → none; a session 3 days ago with no attendance on that date → todo, with a legacy unlinked row on that date → none; injured player with `expected_return` in 3 days → todo, with `expected_return` 2 days ago → „lejárt visszatérés" todo. trend — measurements in weeks 1 and 3 only → two points. Widget tests: Availability `show:'issues'` lists only limited/injured; TodaySession widget without session today shows the next one; Note text persists through `onSettingsChange`.
- [ ] **Step 2–4:** FAIL → implement → PASS; full checks.
- [ ] **Step 5: Commit** `feat(phase2): new home widgets (today, availability, todos, trend, coverage, load, favourites, note)`.

---

### Task 10: Exercise library loading

**Files:**
- Modify: `src/pages/exercise-library/useExerciseLibraryData.js`, `src/pages/ExerciseLibrary.jsx`, `src/lib/exerciseMedia.js` (thumbnail fallback → `null`, card shows a neutral icon)
- Test: `src/test/components/ExerciseLibraryLoading.test.jsx`

**Interfaces:**
- `useExerciseLibraryData()` additionally returns `musclesLoading: boolean`; `loading` becomes false as soon as the exercise list resolves.

- [ ] **Step 1: Failing tests** (Supabase mocked with manually resolved promises): after only the `training_exercises` query resolves, cards render and the muscle filter shows a loading state; the four other queries are all started before any resolves (assert call order/timing); opening a card shows the modal with name and difficulty before the detail request resolves; a card whose thumbnail is missing never requests a `.gif`.
- [ ] **Step 2–4:** FAIL → implement (`Promise.all` for favourites/user, muscles, equipment; `exercise_muscles` pages requested concurrently using `count: 'exact', head: true` then ranges) → PASS; full checks.
- [ ] **Step 5: Commit** `perf(phase2): exercise library renders after one request; instant detail`.

---

### Task 11: Final verification and hand-off notes

- [ ] **Step 1:** `npm test`, `npm run build`, `npm run redesign:check -- src` → pass.
- [ ] **Step 2:** Check every route in both themes at desktop and 375 px with mocked/empty data where login is unavailable; note what could not be verified.
- [ ] **Step 3:** Update `docs/MIGRACIOK-2-SZAKASZ.md` if any migration changed; the PR description (written by the controller) must say: run the three migrations in the SQL Editor **before** deploying.
- [ ] **Step 4: Commit** any fixes `chore(phase2): final checks`.
