# Újratervezés 1. szakasz: Alapok – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two-theme design-token system, shared UI primitives, a new grouped app shell (desktop sidebar, mobile bottom bar, Ctrl+K palette), and every existing screen migrated onto them, with no behaviour or data changes.

**Architecture:** Colour tokens live as RGB channel CSS variables in `src/styles/tokens.css` and are exposed to Tailwind as semantic colour names, so `bg-surface`, `text-muted` and `bg-accent/20` work and flip with `data-theme`. Navigation is data (`src/lib/navigation.js`) filtered by role and permissions, then rendered by the shell components in `src/components/shell/`. Pages are migrated batch by batch with a codemod plus a legacy-class checker that acts as each batch's test.

**Tech Stack:** React 18, Vite 5, Tailwind 3, lucide-react, react-router 6, React Query 5, react-hot-toast, Vitest + Testing Library (jsdom), recharts, html2canvas/jspdf. New dependencies: only `@fontsource/barlow-condensed`, `@fontsource/figtree`, `@fontsource/ibm-plex-mono`.

**Spec:** `docs/superpowers/specs/2026-10-20-redesign-1-alapok-design.md`. Visual reference: `docs/redesign/teamflow-redesign.html` (token values, layout, component look).

## Global Constraints

- Branch: `claude/website-ui-ux-redesign-115795`. One PR into `master` at the end. Never touch `master` or the `pre-redesign-2026-10` tag.
- No database migrations, no Supabase schema/RLS changes, no change to `src/lib/permissions.js` logic.
- Route slugs under `/dashboard/*` unchanged. Only menu labels change.
- UI copy is Hungarian. Code comments follow the existing language of the file being edited.
- No feature may be removed or behave differently: save, delete, PDF/CSV export, permission filtering, invites, widget customisation.
- Theme: `localStorage` key `tf-theme`, values `'system' | 'light' | 'dark'`, default `'system'`, applied as `data-theme="light|dark"` on `<html>`. The switch stays hidden and the app is forced dark (`THEME_SWITCH_ENABLED = false`) until Task 15.
- Fonts self-hosted via `@fontsource`, `latin-ext` subsets, only these weights: Barlow Condensed 600/700, Figtree 400/500/600/700, IBM Plex Mono 400/500. `font-display: swap`.
- Icons: lucide-react only. No emoji used as an icon or status marker anywhere in `src/`.
- `npm test` and `npm run build` pass at the end of every task.

## Review Focus

1. Corrupt or unavailable `localStorage` (private mode throws, stored value `"blue"`) must fall back to `'system'` and never crash the boot script. Pinned in Task 1.
2. While permissions are still loading, the sidebar shows every item, not an empty menu, and it doesn't flash empty. After loading, empty groups disappear. Pinned in Task 3.
3. Palette search must be accent- and case-insensitive: Hungarian users type `meres` and `naptar` without accents. Pinned in Task 6.
4. A user with no team, or a `null` team role, gets a readable shell: role label "Csapattag", an empty state with "Új csapat létrehozása" in the main area, and no crash. Pinned in Task 4.
5. Escape closes only the top-most overlay (a ConfirmDialog opened inside a Modal) and focus returns to the trigger. Pinned in Task 2.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/styles/tokens.css` | All colour tokens (RGB channels), light on `:root`, dark under `[data-theme="dark"]` |
| `src/index.css` | Tailwind layers, base element styles, `.table` styles; legacy `.btn-*`/`.card`/`.input-field` rebased on tokens, then deleted in Task 15 |
| `tailwind.config.js` | Semantic colour + font family mapping |
| `index.html` | Inline theme boot script, `lang="hu"`, title |
| `src/lib/theme.js` | Theme resolve/read/write/apply, `THEME_SWITCH_ENABLED` flag |
| `src/hooks/useTheme.js` | React state for the theme mode |
| `src/hooks/useThemeColors.js` | Resolved token colours for recharts / canvas |
| `src/lib/pdfCapture.js` | Light print theme during `html2canvas` capture |
| `src/components/ui/*` | Primitives: Button, IconButton, Panel, StatusPill, Chip, Skeleton, Spinner, Field/Input/Select/Textarea, Tabs, SegmentedControl, Modal, Drawer, PageHeader, EmptyState, ConfirmDialog |
| `src/lib/navigation.js` | Nav groups data, role/permission filtering, path lookup, mobile tabs |
| `src/lib/commands.js` | Palette command building + accent-insensitive filtering |
| `src/components/shell/*` | AppShell, Sidebar, TeamSwitcher, UserMenu, MobileTopBar, BottomTabBar, MoreSheet, CommandPalette, NoTeamState |
| `src/components/team/CreateTeamModal.jsx` | Team create form, extracted from `Teams.jsx` |
| `scripts/redesign/classMap.js` | Legacy class → token class mapping and legacy detection, pure functions |
| `scripts/redesign/migrate-classes.mjs` | CLI: rewrite files in place, print unmapped classes |
| `scripts/redesign/check-legacy.mjs` | CLI: exit 1 if legacy colour classes or emoji remain in the given files |

---

### Task 1: Tokens, Tailwind mapping, fonts, theme library

**Files:**
- Create: `src/styles/tokens.css`, `src/lib/theme.js`, `src/lib/theme.test.js`, `src/hooks/useTheme.js`, `src/hooks/useThemeColors.js`
- Modify: `tailwind.config.js`, `src/index.css`, `index.html`, `src/main.jsx`, `package.json`

**Interfaces:**
- Produces:
  - Tailwind colours: `bg, surface, surface-2, surface-3, line, line-strong, fg, muted, subtle, accent, accent-hover, accent-fg, accent-soft, ok, ok-soft, warn, warn-soft, bad, bad-soft, on-status, t-strength, t-ball, t-tactic, t-match, t-rest`. All are `rgb(var(--<name>) / <alpha-value>)`, so `/20`-style opacity works.
  - Tailwind `fontFamily`: `display`, `body` (default sans), `mono`.
  - `theme.js`:
    - `THEME_STORAGE_KEY = 'tf-theme'`
    - `THEME_MODES = ['system','light','dark']`
    - `THEME_SWITCH_ENABLED = false`
    - `readStoredMode(): 'system'|'light'|'dark'`
    - `writeStoredMode(mode): void`
    - `resolveTheme(mode, systemPrefersDark: boolean): 'light'|'dark'`
    - `applyTheme(resolved): void`, which sets `document.documentElement.dataset.theme`
  - `useTheme(): { mode, resolved, setMode(mode) }`
  - `useThemeColors(): Record<string,string>`. Values are `'rgb(R G B)'` strings for every token. It re-reads when `data-theme` changes.

- [ ] **Step 1: Write the failing tests** in `src/lib/theme.test.js`:
  - `resolveTheme('light', true) === 'light'`
  - `resolveTheme('dark', false) === 'dark'`
  - `resolveTheme('system', true) === 'dark'`
  - `resolveTheme('system', false) === 'light'`
  - `readStoredMode()` returns `'system'` in each of these cases:
    - key missing;
    - stored value `'blue'`;
    - `localStorage.getItem` throws (stub with `vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('denied')})`).
  - `writeStoredMode('dark')` followed by `readStoredMode()` returns `'dark'`.
  - `writeStoredMode` does not throw when `setItem` throws.
  - `effectiveMode('light') === 'dark'` and `effectiveMode('system') === 'dark'` while `THEME_SWITCH_ENABLED` is false. `resolveTheme` stays pure; the flag is applied only through `effectiveMode` (used by `useTheme` and the boot script).

- [ ] **Step 2: Run it and confirm it fails**
  Run: `npx vitest run src/lib/theme.test.js`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/theme.js`.**
  - `effectiveMode(mode)` returns `'dark'` when `THEME_SWITCH_ENABLED` is false; otherwise it returns `mode`.
  - Implement `useTheme`. It listens to `matchMedia('(prefers-color-scheme: dark)')` changes when the mode is `'system'`.
  - Implement `useThemeColors`. It reads `getComputedStyle(document.documentElement).getPropertyValue('--x')` for each token and observes the `data-theme` attribute with a `MutationObserver`.

- [ ] **Step 4: Create `src/styles/tokens.css`.**
  - Store values as space-separated RGB channels, e.g. `--accent: 39 71 224;`.
  - Copy the light hex values from the bare `:root` block of `docs/redesign/teamflow-redesign.html`, and the dark ones from its `:root[data-theme="dark"]` block.
  - Put the light values under `:root, [data-theme="light"]` and the dark values under `[data-theme="dark"]` (no `prefers-color-scheme` media query; the boot script resolves "system"). The element-level `[data-theme="light"]` selector lets the PDF capture in Task 11 force light values inside a dark page.
  - Add the tokens the mockup lacks:

    | Token | Light | Dark |
    |---|---|---|
    | `surface-3` | `#E2E7F0` | `#232C40` |
    | `line-strong` | `#C3CBD8` | `#34405C` |
    | `subtle` | `#8A94A6` | `#5F6A80` |
    | `accent-hover` | `#1F3BC4` | `#96A9FF` |
    | `on-status` | `#FFFFFF` | `#0A0E16` |

  - Also set `color-scheme: light` / `dark` in each block.

- [ ] **Step 5: Map the tokens in Tailwind and the base styles.**
  - Map every token in `tailwind.config.js`.
  - Set `fontFamily.display = ['"Barlow Condensed"','"Arial Narrow"','sans-serif']`, `sans = ['Figtree','system-ui','-apple-system','"Segoe UI"','sans-serif']`, `mono = ['"IBM Plex Mono"','ui-monospace','Consolas','monospace']`.
  - Remove the `primary` palette **only in Task 15** (pages still use it until then).
  - In `src/index.css`:
    - import `./styles/tokens.css`;
    - set `body` to `bg-bg text-fg font-sans`;
    - delete the hard-coded `#0f172a`/white `:root` colours and the Inter declaration;
    - rebase `.btn-primary`, `.btn-secondary`, `.input-field` and `.card` on token classes (they stay alive until Task 15);
    - leave `.btn` undefined; Task 7's checker flags its remaining uses.
  - Add the `.table` base styles (`th`: mono, 10.5px, uppercase, `text-muted`; `td`: `border-line`; numeric cells `.num` with tabular-nums).

- [ ] **Step 6: Install and import the fonts.**
  - Run `npm i @fontsource/barlow-condensed @fontsource/figtree @fontsource/ibm-plex-mono`.
  - In `src/main.jsx`, import only the latin-ext + latin files for the listed weights, e.g. `@fontsource/figtree/latin-ext-400.css` and `@fontsource/figtree/latin-400.css`.

- [ ] **Step 7: Add the boot script to `index.html`.**
  - Add an inline `<script>` in `<head>`, before any stylesheet. It reads `tf-theme` inside try/catch, applies the same `effectiveMode` + `resolveTheme` rules (duplicated in about 8 lines because it runs before modules), and sets `data-theme`.
  - With the flag off it always sets `dark`. Mark the duplicated constant with a comment pointing to `src/lib/theme.js`.

- [ ] **Step 8: Verify**
  - Run `npx vitest run src/lib/theme.test.js`. Expected: PASS.
  - Run `npm test`. Expected: PASS.
  - Run `npm run build`. Expected: success.
  - Run `npm run dev` and open `/auth`. The app looks as before (dark), and the body font is Figtree.

- [ ] **Step 9: Commit**
  `git commit -m "feat(design): add theme tokens, Tailwind mapping, self-hosted fonts and theme library"`

---

### Task 2: UI primitives

**Files:**
- Create in `src/components/ui/`: `Button.jsx`, `IconButton.jsx`, `Panel.jsx`, `StatusPill.jsx`, `Chip.jsx`, `Skeleton.jsx`, `Spinner.jsx`, `Field.jsx` (exports `Field`, `Input`, `Select`, `Textarea`), `Tabs.jsx`, `SegmentedControl.jsx`, `Modal.jsx`, `Drawer.jsx`, `PageHeader.jsx`
- Modify: `src/components/ui/EmptyState.jsx`, `src/components/ui/ConfirmDialog.jsx`, `src/components/LoadingSpinner.jsx`, `src/App.jsx` (Toaster styles)
- Test: `src/test/components/ui-primitives.test.jsx`, `src/test/components/Modal.test.jsx`; keep `ConfirmDialog.test.jsx` and `EmptyState.test.jsx` passing (update class-based assertions only if they assert old colours)

**Interfaces:**
- Produces:
  - `Button({ variant='secondary'|'primary'|'ghost'|'danger', size='md'|'sm', icon?: LucideIcon, loading?: boolean, ...buttonProps })`. Default `type="button"`. With `loading`, it is disabled and shows `Spinner size="sm"`.
  - `IconButton({ icon, label, ...props })`. `label` becomes `aria-label` and `title`.
  - `Panel({ title?, icon?, actions?, padded=true, className, children })`.
  - `StatusPill({ status: 'ok'|'warn'|'bad'|'neutral', children })`.
  - `Chip({ selected=false, icon?, onClick, children })`. Renders `aria-pressed={selected}`.
  - `Skeleton({ className })`.
  - `Spinner({ size: 'sm'|'md'|'lg' })`. Renders `role="status"` and `aria-label="Betöltés"`.
  - `Field({ label, hint?, error?, htmlFor, children })`.
  - `Input`, `Select`, `Textarea`: forwardRef wrappers over native elements with token styles.
  - `Tabs({ items: {id,label,icon?}[], value, onChange })`. Uses `role="tablist"`/`tab` and `aria-selected`; arrow keys move between tabs.
  - `SegmentedControl({ items: {id,label,icon?}[], value, onChange, label })`.
  - `Modal({ open, onClose, title, size='md'|'lg'|'xl', footer?, children })`:
    - portal to `document.body`, `role="dialog"`, `aria-modal`, `aria-labelledby`;
    - Escape and backdrop click close it;
    - focus moves into the dialog on open and returns to the previously focused element on close;
    - focus is trapped (Tab cycles inside);
    - body scroll is locked;
    - only the top-most open overlay reacts to Escape (module-level stack array).
  - `Drawer({ open, onClose, title, side='right', children })`. Same overlay contract as `Modal`.
  - `PageHeader({ eyebrow?, title, description?, actions?, tabs? })`. `tabs` is a node rendered under the title row. The header is not sticky; the shell owns scrolling.
  - `LoadingSpinner` keeps its existing `size: 'full'|'inline'|'xs'` + `label` API and is re-implemented with `Spinner`.
  - `EmptyState` and `ConfirmDialog` keep their exact props. `ConfirmDialog` renders through `Modal` and uses `Button` (`danger` gives `variant="danger"`).

- [ ] **Step 1: Write failing tests**
  - In `ui-primitives.test.jsx`:
    - `Button` renders `type="button"` and is disabled when `loading`.
    - `Chip` exposes `aria-pressed="true"` when selected.
    - `Tabs`: ArrowRight moves selection; `onChange` is called with the next id.
    - `IconButton` has an accessible name equal to `label`.
  - In `Modal.test.jsx`:
    - (a) Escape calls `onClose`.
    - (b) Focus returns to the trigger button after close.
    - (c) With a `ConfirmDialog` open inside an open `Modal`, Escape calls only the ConfirmDialog's `onCancel`, not the Modal's `onClose`.
    - (d) Tab from the last focusable element wraps to the first.

- [ ] **Step 2: Run the tests and confirm they fail**
  Run: `npx vitest run src/test/components/ui-primitives.test.jsx src/test/components/Modal.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement the primitives**
  - Use the look from the mockup (radius 9px for buttons, 12–14px for panels; `font-display` uppercase for `PageHeader` titles).
  - Use token classes only. No `slate-*`, `primary-*` or `white`, except `text-accent-fg` / `text-on-status` on solid fills.
  - Style the Toaster in `App.jsx` with CSS vars: `background: 'rgb(var(--surface))'`, `color: 'rgb(var(--fg))'`, `border: '1px solid rgb(var(--line))'`; icon themes `rgb(var(--ok))` / `rgb(var(--bad))`.

- [ ] **Step 4: Run all tests**
  Run: `npm test`. Expected: PASS, including the existing ConfirmDialog, EmptyState and smoke tests.

- [ ] **Step 5: Commit**
  `git commit -m "feat(ui): add shared UI primitives and rebase ConfirmDialog/EmptyState/LoadingSpinner on them"`

---

### Task 3: Navigation model

**Files:**
- Create: `src/lib/navigation.js`, `src/lib/navigation.test.js`

**Interfaces:**
- Consumes: `isModuleVisible(permissions, moduleKey)` from `src/lib/permissions.js` (unchanged).
- Produces:
  - `NAV_GROUPS`: an array of `{ id, label, items: NavItem[] }`.
  - `NavItem`: `{ id, label, path, icon: LucideIcon, permissionKey: string|null, end?: boolean }`.
  - Content, in order (labels exact):

    | Group | Item | Path | Permission key |
    |---|---|---|---|
    | `overview` "Áttekintés" | `home` "Kezdőlap" | `/dashboard` | `null`, `end: true` |
    | | `matches` "Mérkőzések" | `/dashboard/merkozesek` | `matches` |
    | `planning` "Tervezés" | `macrocycle` "Szezonterv" | `/dashboard/makrociklus` | `macrocycle` |
    | | `calendar` "Naptár" | `/dashboard/naptar` | `calendar` |
    | | `templates` "Edzéssablonok" | `/dashboard/sablonok` | `templates` |
    | `content` "Edzéstartalom" | `exercises` "Gyakorlattár" | `/dashboard/gyakorlatok` | `exercises` |
    | `performance` "Teljesítmény" | `measurement` "Mérések" | `/dashboard/meresek` | `measurement` |
    | | `leaderboard` "Ranglista" | `/dashboard/ranglista` | `stats` |
    | | `progress` "Progresszió" | `/dashboard/progresszio` | `stats` |
    | | `trainingload` "1RM táblázat" | `/dashboard/kalkulator` | `null` |
    | `team` "Csapat" | `teams` "Játékosok" | `/dashboard/csapatok` | `players` |
    | | `rehab` "Egészség" | `/dashboard/rehabilitacio` | `rehab` |

  - `PROFILE_ITEM = { id:'profile', label:'Profil', path:'/dashboard/profil' }`.
  - `getNavForRole(role: string|null): NavGroup[]`. Returns `NAV_GROUPS` for `coach`, `fitness_coach`, `physiotherapist` and `null`. The role switch exists so a future `player` set slots in.
  - `filterNav(groups, permissions, permissionsLoading): NavGroup[]`.
  - `MOBILE_TAB_IDS = ['home','calendar','teams','exercises']`. The fifth slot is always "Több".
  - `getMobileTabs(filteredGroups): NavItem[]` returns the visible items in `MOBILE_TAB_IDS` order.
  - `findNavItemByPath(pathname): NavItem|PROFILE_ITEM|null` ignores a trailing slash.
  - `getGroupOfItem(itemId): NavGroup|null`.

- [ ] **Step 1: Write failing tests**
  - `filterNav(NAV_GROUPS, {}, true)` returns all 12 items.
  - `filterNav(NAV_GROUPS, { matches:'view' }, false)` returns:
    - group `overview` with `home` + `matches`;
    - group `performance` with only `trainingload`;
    - no `planning`, `content` or `team` groups.
  - `stats: 'none'` hides both `leaderboard` and `progress`.
  - `getMobileTabs` with `calendar` hidden returns `['home','teams','exercises']` (the remaining permitted ones).
  - `findNavItemByPath('/dashboard/naptar/')` has id `calendar`.
  - `findNavItemByPath('/dashboard')` has id `home`.
  - `findNavItemByPath('/dashboard/profil')` has id `profile`.
  - `findNavItemByPath('/x')` returns `null`.

- [ ] **Step 2: Run and confirm failure**
  Run: `npx vitest run src/lib/navigation.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/navigation.js`**
  Use lucide icons matching the mockup: `Sun` for home, `Trophy`, `CalendarRange`, `CalendarDays`, `ClipboardList`, `Dumbbell`, `Activity` for measurement, `Medal` for leaderboard, `TrendingUp`, `Calculator`, `Users`, `HeartPulse`.

- [ ] **Step 4: Run and confirm it passes**
  Run: `npx vitest run src/lib/navigation.test.js`. Expected: PASS.

- [ ] **Step 5: Commit**
  `git commit -m "feat(nav): grouped, role- and permission-aware navigation model"`

---

### Task 4: Desktop app shell, team switcher, no-team state

**Files:**
- Create in `src/components/shell/`: `AppShell.jsx`, `Sidebar.jsx`, `TeamSwitcher.jsx`, `UserMenu.jsx`, `NoTeamState.jsx`
- Create: `src/components/team/CreateTeamModal.jsx`
- Modify: `src/pages/Dashboard.jsx` (becomes a thin wrapper: `TeamProvider` + `AppShell`; remove the `modules` array, the `profiles.role` fetch and its realtime subscription, and the `getRoleLabel` helper), `src/pages/Teams.jsx` (use `CreateTeamModal` instead of its inline create form; show the team delete action only when the context boolean `isTeamOwner` is true)
- Test: `src/test/components/Shell.test.jsx`

**Interfaces:**
- Consumes:
  - from `useTeams()`: `teams`, `selectedTeam`, `setSelectedTeam`, `createTeam`, `loading`, `currentUserRole`, `currentUserPermissions`, `permissionsLoading`;
  - `getNavForRole`, `filterNav`, `findNavItemByPath`, `PROFILE_ITEM` (Task 3);
  - the primitives (Task 2);
  - `ROLES` from `permissions.js`.
- Produces:
  - `AppShell({ session })` renders the sidebar (lg+), the mobile chrome placeholder (filled in Task 5), and `<main>` with a single scroll container wrapping `<Suspense fallback={<LoadingSpinner size="inline"/>}><Outlet context={{ session }} /></Suspense>`.
    - The old `visibleModules` outlet-context field has no consumers (verified by grep), so it is dropped.
    - When `teams.length === 0 && !loading`, `<main>` renders `NoTeamState` instead of the Outlet, except on the `/dashboard/profil` route.
  - `TeamSwitcher({ compact?: boolean })` is a button plus popover:
    - the team list with a check on the selected team;
    - a divider, then "Új csapat létrehozása", which opens `CreateTeamModal`;
    - long names truncate.
  - `CreateTeamModal({ open, onClose })` uses `createTeam` from context with the same fields and validation as the current form in `Teams.jsx`, and toasts the same messages.
  - `UserMenu` shows:
    - the email;
    - the role label `ROLES.find(r=>r.key===currentUserRole)?.name ?? 'Csapattag'`;
    - links to Profil and sign out (`supabase.auth.signOut()`);
    - the theme `SegmentedControl` (Rendszer/Világos/Sötét), rendered only when `THEME_SWITCH_ENABLED`.
  - `NoTeamState` uses `EmptyState` with:
    - title "Hozd létre az első csapatodat";
    - description "Vagy kérj meghívót az edződtől, és nyisd meg a kapott linket.";
    - action "Új csapat létrehozása", which opens `CreateTeamModal`.

- [ ] **Step 1: Write failing tests** in `Shell.test.jsx`. Mock `@/lib/supabase` as `Auth.test.jsx` does, and wrap in a test `TeamContext` provider. Export the context or add a `TeamTestProvider` helper in `src/test/` that renders `TeamContext.Provider` with a given value; if `TeamContext` is not exported, export it.
  - Sidebar with permissions `{ matches:'view' }` (not loading) shows the group headings "Áttekintés" and "Teljesítmény", and does not show "Tervezés".
  - Sidebar with `permissionsLoading: true` shows "Szezonterv".
  - The UserMenu role label is "Gyógytornász" for `physiotherapist` and "Csapattag" for `null`.
  - With `teams: []` and `loading: false` at `/dashboard/naptar`, the text "Hozd létre az első csapatodat" is shown and the Outlet content is not.
  - Clicking another team in `TeamSwitcher` calls `setSelectedTeam` with that team.

- [ ] **Step 2: Run and confirm failure**
  Run: `npx vitest run src/test/components/Shell.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement the shell components and slim `Dashboard.jsx`**
  - Sidebar width is 248px.
  - The active item uses `NavLink` (`end` for home) and the `bg-accent-soft text-accent` style.
  - The "Keresés, parancsok" button with a `Ctrl K` hint calls `onOpenPalette` (wired in Task 6; until then it is a prop with a no-op default).

- [ ] **Step 4: Verify**
  - Run `npm test`. Expected: PASS.
  - Run `npm run build`. Expected: success.
  - Run the dev server and log in:
    - every sidebar link opens its page;
    - switching teams changes the data on the page;
    - the old pages still render their own headers (duplicated with the shell until migrated; acceptable mid-plan).

- [ ] **Step 5: Commit**
  `git commit -m "feat(shell): grouped sidebar, global team switcher, no-team state; drop profiles.role from shell"`

---

### Task 5: Mobile chrome

**Files:**
- Create in `src/components/shell/`: `MobileTopBar.jsx`, `BottomTabBar.jsx`, `MoreSheet.jsx`
- Modify: `src/components/shell/AppShell.jsx`
- Test: `src/test/components/MobileShell.test.jsx`

**Interfaces:**
- Consumes:
  - `getMobileTabs` and the filtered groups (Task 3);
  - `Drawer` (Task 2), used with `side="bottom"`. **Extend `Drawer` with `side: 'right'|'bottom'`** in this task;
  - `TeamSwitcher compact` and `UserMenu` (Task 4).
- Produces:
  - Below `lg`, `AppShell` renders `MobileTopBar` (`TeamSwitcher compact` + search `IconButton` labelled "Keresés") and a fixed `BottomTabBar`.
  - `BottomTabBar` shows the `getMobileTabs` items plus a fifth "Több" button.
  - "Több" opens `MoreSheet`: the full grouped nav, then `UserMenu` content.
  - Choosing an item navigates and closes the sheet.
  - Content gets bottom padding equal to the bar height plus `env(safe-area-inset-bottom)`.
  - The old hamburger and mobile header are deleted.

- [ ] **Step 1: Write failing tests**
  - With `calendar: 'none'`, the bottom bar has no "Naptár" button but still has "Több".
  - Clicking "Több" shows the "Teljesítmény" group heading.
  - Clicking "Mérések" in the sheet navigates to `/dashboard/meresek` (assert via `MemoryRouter` + a route that renders a marker) and closes the sheet.

- [ ] **Step 2: Run and confirm failure**
  Run: `npx vitest run src/test/components/MobileShell.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Verify**
  - Run `npm test`. Expected: PASS.
  - In the dev server at 375px width:
    - no hamburger is shown;
    - the bottom bar works;
    - "Több" lists everything.

- [ ] **Step 5: Commit**
  `git commit -m "feat(shell): mobile top bar, bottom tab bar and 'Több' sheet"`

---

### Task 6: Command palette

**Files:**
- Create: `src/lib/commands.js`, `src/lib/commands.test.js`, `src/components/shell/CommandPalette.jsx`, `src/hooks/useHotkey.js`
- Modify: `src/components/shell/AppShell.jsx`, `Sidebar.jsx`, `MobileTopBar.jsx` (wire `onOpenPalette`)
- Test: `src/test/components/CommandPalette.test.jsx`

**Interfaces:**
- Consumes: the filtered nav groups (Task 3) and `Modal` (Task 2).
- Produces:
  - `buildCommands(groups): Command[]` where `Command = { id, label, group: 'Oldalak'|'Műveletek', path, icon, keywords: string[] }`.
    - It produces one "Oldalak" command per visible nav item, plus "Profil".
    - It adds these "Műveletek", each only if its target page is visible:

      | Label | Path | Keywords |
      |---|---|---|
      | "Új mérés rögzítése" | `/dashboard/meresek` | `['meres','1rm']` |
      | "Edzés hozzáadása a naptárhoz" | `/dashboard/naptar` | `['edzes','uj']` |
      | "Új gyakorlat" | `/dashboard/gyakorlatok` | — |
      | "Játékos hozzáadása" | `/dashboard/csapatok` | — |

    - These only navigate; none of them opens a form.
  - `normalize(s): string` lowercases and strips diacritics via `NFD` and removes `\p{Diacritic}`.
  - `filterCommands(commands, query): Command[]` keeps commands where every whitespace-separated query token is a substring of `normalize(label + ' ' + keywords.join(' '))`. With an empty query it returns everything.
  - `useHotkey(combo: 'mod+k', handler)`, where `mod` is Ctrl on Windows/Linux and Meta on Mac. It ignores events from `contenteditable`, but still fires inside inputs (palette convention).

- [ ] **Step 1: Write failing tests**
  - `filterCommands(cmds,'meres')` includes the label "Mérések".
  - `filterCommands(cmds,'NAPTAR')` includes "Naptár".
  - `filterCommands(cmds,'uj meres')` includes "Új mérés rögzítése".
  - `filterCommands(cmds,'zzz')` is empty.
  - `buildCommands` with `measurement` hidden contains neither "Mérések" nor "Új mérés rögzítése".
  - Component test:
    - Ctrl+K opens the palette with focus in the input;
    - ArrowDown then Enter navigates to the second command's path;
    - Escape closes it.

- [ ] **Step 2: Run and confirm failure**
  Run: `npx vitest run src/lib/commands.test.js src/test/components/CommandPalette.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Results are a `role="listbox"`; options use `aria-selected`.
  - When nothing matches, show "Nincs találat."

- [ ] **Step 4: Verify**
  Run `npm test`. Expected: PASS.

- [ ] **Step 5: Commit**
  `git commit -m "feat(shell): Ctrl+K command palette with accent-insensitive search"`

---

### Task 7: Migration tooling (codemod + legacy checker)

**Files:**
- Create: `scripts/redesign/classMap.js`, `scripts/redesign/classMap.test.js`, `scripts/redesign/migrate-classes.mjs`, `scripts/redesign/check-legacy.mjs`
- Modify: `package.json` (scripts `"redesign:migrate": "node scripts/redesign/migrate-classes.mjs"`, `"redesign:check": "node scripts/redesign/check-legacy.mjs"`)

**Interfaces:**
- Produces:
  - `mapClass(cls: string): string|null`. It preserves variant prefixes (`hover:`, `focus:`, `disabled:`, `group-hover:`, `lg:` and so on) and opacity suffixes (`/50`). It returns `null` when it has no mapping.
  - `migrateSource(src: string): { code: string, unmapped: string[] }`. It rewrites class tokens only inside `className="..."`, `className={'...'}`, `className={\`...\`}` string parts and string literals in ternaries within className expressions. `unmapped` lists the distinct legacy colour classes it could not map.
  - `findLegacy(src: string): string[]`. It lists the distinct legacy colour classes, the token `btn` used as a class, and emoji found in the source.
    - **Legacy colour classes:** utilities prefixed `bg|text|border|ring|divide|from|via|to|placeholder|fill|stroke|outline|shadow|accent` with a colour of `slate|gray|zinc|neutral|stone|white|black|primary|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose`.
    - **Emoji:** `/\p{Extended_Pictographic}/u`.
  - CLIs:
    - `npm run redesign:migrate -- <files...>` rewrites in place and prints `file: unmapped...`.
    - `npm run redesign:check -- <files...>` prints findings and exits 1 if any are found.

- Mapping (`mapClass`). The rule is the same under any variant prefix, and the opacity suffix is kept:

  | Legacy | Token |
  |---|---|
  | `bg-slate-900`, `bg-slate-950` | `bg-bg` |
  | `bg-slate-800` | `bg-surface` |
  | `bg-slate-700` | `bg-surface-2` |
  | `bg-slate-600`, `bg-slate-500` | `bg-surface-3` |
  | `border-slate-700`, `border-slate-600`, `divide-slate-700`, `divide-slate-600` | `border-line` / `divide-line` |
  | `border-slate-500` | `border-line-strong` |
  | `text-white`, `text-slate-100`, `text-slate-200`, `text-slate-300` | `text-fg` |
  | `text-slate-400`, `text-slate-500` | `text-muted` |
  | `text-slate-600`, `text-slate-700` | `text-subtle` |
  | `placeholder-slate-400`, `placeholder-slate-500` | `placeholder-subtle` |
  | `bg-primary-500`, `bg-primary-600` | `bg-accent` |
  | `bg-primary-700` | `bg-accent-hover` |
  | `bg-primary-900`, `bg-primary-500/20` and other primary bg with `/≤30` | `bg-accent-soft` (drop the suffix) |
  | `text-primary-300` … `text-primary-600` | `text-accent` |
  | `border-primary-*`, `ring-primary-*` | `border-accent` / `ring-accent` |
  | `red-*` (`text`/`border`/`ring`), `bg-red-500`/`600`/`700` | `bad` (`hover:bg-red-700` → `hover:bg-bad/90`) |
  | `bg-red-900`, `bg-red-500/10`–`/30` | `bg-bad-soft` |
  | `green-*`, `emerald-*` | the same pattern with `ok` / `ok-soft` |
  | `yellow-*`, `amber-*`, `orange-*` | the same pattern with `warn` / `warn-soft` |

  Everything else (`blue`, `indigo`, `purple`, `pink`, `teal`, `cyan`, `sky`, gradients `from-`/`via-`/`to-`, and `text-white` as the `text-white` inside a solid accent/status button) is **not** auto-mapped. Those are judgement calls made in the page tasks. `text-white` maps to `text-fg` by default; the page task fixes the few solid-button cases to `text-accent-fg` / `text-on-status`, or replaces the button with `Button`.

- [ ] **Step 1: Write failing tests** in `scripts/redesign/classMap.test.js`:
  - `mapClass('hover:bg-slate-600') === 'hover:bg-surface-3'`
  - `mapClass('bg-slate-700/50') === 'bg-surface-2/50'`
  - `mapClass('text-primary-400') === 'text-accent'`
  - `mapClass('bg-purple-600') === null`
  - `migrateSource('<div className="p-4 bg-slate-800 text-purple-400">')` gives the code `'<div className="p-4 bg-surface text-purple-400">'` and `unmapped` `['text-purple-400']`.
  - `migrateSource` leaves a non-className string `'bg-slate-800'` (e.g. in a comment or log) untouched.
  - `findLegacy('<span>✅ Mentve</span>')` contains `'✅'`.
  - `findLegacy('className="btn btn-primary"')` contains `'btn'`.
  - `findLegacy('className="bg-surface text-fg"')` is empty.

- [ ] **Step 2: Run and confirm failure**
  Run: `npx vitest run scripts/redesign/classMap.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement `classMap.js` and the two CLIs**
  `migrateSource` uses a regex over `className=` attribute values and template/string literal pieces. A full JSX parser is not needed.

- [ ] **Step 4: Verify**
  - Run `npx vitest run scripts/redesign/classMap.test.js`. Expected: PASS.
  - Run `npm run redesign:check -- src/components/ui/Button.jsx`. Expected: exit 0.

- [ ] **Step 5: Commit**
  `git commit -m "chore(redesign): class migration codemod and legacy-class checker"`

---

## Page migration procedure (Tasks 8–14)

Every page task follows the same steps. Each task lists only its files and its specific changes.

- [ ] **A. Run `npm run redesign:migrate -- <task files>`.** Note the printed unmapped classes.
- [ ] **B. Header and team selector.**
  - Replace the page's own header block, usually a `sticky top-0` wrapper with a title, `TeamSelector` and buttons, with `<PageHeader title=… description=… actions=… tabs=…/>`.
  - Delete the `TeamSelector` import and usage. Pages with `h-screen`/`min-h-screen` wrappers or their own scroll containers lose them; the shell scrolls.
  - The page title equals the nav label (Task 3 table).
- [ ] **C. Buttons and tabs.**
  - Header and toolbar buttons become `Button`. The primary page action is `variant="primary"`, other header actions `secondary`, destructive ones `danger`.
  - Use at most one `primary` per header. This removes the multi-coloured header buttons.
  - Tab-like toggles become `Tabs` (content tabs) or `SegmentedControl` (view switches like Hónap/Hét/Nap).
- [ ] **D. Modals.**
  - Each bespoke `fixed inset-0` modal becomes `Modal` (keep its form body; footer actions as `Button`s).
  - Inline status chips become `StatusPill`.
  - Card wrappers (`card` class / `bg-slate-800 rounded-xl…`) become `Panel` or token classes.
- [ ] **E. Unmapped colours.**
  - Decorative category colours become `accent` or neutral tokens.
  - Session-type colours (erő / labdás / taktika / meccs / pihenő) become `t-strength` / `t-ball` / `t-tactic` / `t-match` / `t-rest`.
  - Gradients are removed (flat token surfaces).
- [ ] **F. Emoji and inline colours.**
  - Every emoji becomes the closest lucide icon, or is removed from copy (e.g. `'✅ Mentve'` becomes a toast with "Mentve").
  - Inline `style={{ backgroundColor: '#…' }}` hex used for semantic or chart colours becomes values from `useThemeColors()`. User-chosen data colours (e.g. BodyDiagram point colours stored in the DB) stay.
  - Recharts `stroke` / `fill` / `CartesianGrid` / `Tooltip` styles take `useThemeColors()` values.
- [ ] **G. Verify.**
  - Run `npm run redesign:check -- <task files>`. Expected: exit 0.
  - Run `npm test`. Expected: PASS.
  - Run `npm run build`. Expected: success.
  - In the dev server, for every page in the task, do these checks in **both** themes. To check light, temporarily run `document.documentElement.dataset.theme='light'` in devtools.
    - Every action in the task's checklist still works.
    - Text is readable.
    - At 375px width there is no horizontal page scroll (tables and the Szezonterv grid may scroll inside their own container).
- [ ] **H. Commit.** Use `refactor(<area>): migrate <pages> to design system`.

---

### Task 8: Entry screens and Profile

**Files:**
- `src/pages/Auth.jsx`
- `src/pages/JoinTeam.jsx`
- `src/components/ErrorBoundary.jsx`
- `src/App.jsx` (connError screen)
- `src/pages/Profile.jsx`
- delete `src/components/SupabaseConnectionTest.jsx`
- tests: `src/test/components/Auth.test.jsx`, `ErrorBoundary.test.jsx`

Specific changes:
- Auth:
  - Remove the "Adatbázis kapcsolat tesztelése" toggle and the `SupabaseConnectionTest` import, state and panel. Delete the component file (no other importers; verify with grep).
  - Use a two-column layout on lg (brand panel with "TeamFlow" in `font-display`, plus the form card), one column on mobile.
  - Use `SegmentedControl` for Bejelentkezés/Regisztráció.
  - Keep all field names, validation copy ("Minimum 10 karakter" etc.) and submit logic.
- Profile:
  - The `App.jsx` route element becomes `<Profile session={session} />` without the `<main className="p-6">` wrapper; Profile renders its own `PageHeader title="Profil"`.
  - Relabel the role field to "Titulus" (keep the same DB column and options).
  - Replace the inline success/error banner with toasts (`toast.success` / `toast.error`) using the same messages.
- JoinTeam: replace `className="btn btn-primary w-full"` with `<Button variant="primary" className="w-full">`.
- Tests:
  - Add to `Auth.test.jsx`: `queryByText(/Adatbázis kapcsolat/)` is not in the document.
  - Existing Auth tests must still pass (adjust selectors only if the tab buttons changed role; `SegmentedControl` buttons keep their visible text).

---

### Task 9: Kezdőlap

**Files:**
- `src/pages/DashboardHome.jsx`
- `src/pages/dashboard-home/CustomizeEditor.jsx`, `WidgetCard.jsx`
- `src/pages/dashboard-home/widgets/*.jsx` (9 files)

Specific changes:
- Add `PageHeader title="Kezdőlap"` with a description of today's date in Hungarian long form via `Intl.DateTimeFormat('hu-HU',{weekday:'long',month:'long',day:'numeric'})`, and the "Testreszabás" action as `Button`.
- `WidgetCard` becomes a `Panel` wrapper.
- `CustomizeEditor` becomes a `Modal`.
- Widget content: token classes only. Status colours go through `StatusPill`.
- Checklist:
  - customise, reorder, hide/show widget, persist after reload;
  - quick actions navigate.

---

### Task 10: Játékosok

**Files:**
- `src/pages/Teams.jsx`
- `src/pages/PlayerProfile.jsx`
- `src/components/TeamMembersPanel.jsx`
- `src/components/TrainingLocations.jsx`

Specific changes:
- Teams:
  - Title "Játékosok".
  - Header actions: "Új játékos" (primary), "Helyszínek" (secondary), and a "Csapat" overflow menu `IconButton` (MoreHorizontal) containing "Csapat szerkesztése" and, only for the owner, "Csapat törlése". The create form already moved to `CreateTeamModal` in Task 4.
- PlayerProfile:
  - Still opened from Teams by state (URL comes in phase 3).
  - Give it `PageHeader` with a back `Button variant="ghost" icon={ArrowLeft}` "Vissza a játékosokhoz", plus proper page padding.
- TeamMembersPanel: permission matrix selects become `Select`; the role list uses `StatusPill neutral`.
- Checklist:
  - add, edit and delete a player;
  - player profile charts in both themes;
  - invite link create and copy;
  - permission matrix edit and save;
  - locations CRUD;
  - team edit;
  - delete hidden for non-owner.

---

### Task 11: Szezonterv and Mérkőzések, plus the PDF print theme

**Files:**
- Create: `src/lib/pdfCapture.js`, `src/lib/pdfCapture.test.js`
- `src/pages/MacrocyclePlanner.jsx`, `src/pages/macrocycle/*.jsx` (5 modals)
- `src/pages/Matches.jsx`

**Interfaces:**
- Produces: `captureForPdf(element: HTMLElement, options?: object): Promise<HTMLCanvasElement>`.
  - It sets `data-theme="light"` on `element` for the duration of the capture, so tokens resolve to light values inside it.
  - It calls `html2canvas(element, { backgroundColor: '#ffffff', ...options })`.
  - It restores the previous attribute value, or removes the attribute, in `finally`.

Specific changes:
- Test (`pdfCapture.test.js`, mock `html2canvas`):
  - During the mocked call, `element.dataset.theme === 'light'`; afterwards the attribute is restored.
  - When `html2canvas` rejects, the attribute is still restored.
- MacrocyclePlanner:
  - Use `captureForPdf` instead of `html2canvas(... backgroundColor:'#1e293b')`.
  - The header keeps one primary action ("Mentés"); the other six coloured buttons become secondary/ghost `Button`s or move into a "Továbbiak" overflow `IconButton` menu.
  - Replace the emoji save-status strings (`✅`/`❌`) with a small `StatusPill` ("Mentve" / "Mentés sikertelen").
  - Grid cell colours that encode meaning map to tokens:

    | Phase / meaning | Token |
    |---|---|
    | Intensity / load levels | `ok` / `warn` / `bad` soft fills |
    | Match days | `t-match` |
    | Rest days | `t-rest` |
    | Other phase colours | Stay as data colours if they come from the DB; otherwise `accent` shades via opacity |

  - Keep the grid behaviour unchanged.
  - Translate the mixed English labels to Hungarian ("Max Power" → "Maximális erő", "Home/Away" → "Hazai/Idegen"). Keep "Korrekció".
- Matches:
  - Use `Tabs` for Összes/Közelgő/Lejátszott.
  - Remove the emoji in the delete message.
  - Match-type pills become `StatusPill`/`Chip`.
- Checklist:
  - create/edit/delete season;
  - edit cells and autosave;
  - manual save;
  - load and save template;
  - PDF export is readable and white-background in both themes;
  - match create/edit/delete;
  - macrocycle match sync still works.

---

### Task 12: Naptár and Edzéssablonok

**Files:**
- `src/pages/Calendar.jsx`, `src/pages/calendar/MonthView.jsx`, `WeekView.jsx`, `DayView.jsx`
- `src/components/QuickAddTrainingModal.jsx`, `TrainingSessionModal.jsx`
- `src/pages/TrainingTemplates.jsx`
- `src/components/GymTemplateEditor.jsx`, `BallTemplateEditor.jsx`, `TacticTemplateEditor.jsx`

Specific changes:
- Calendar:
  - `SegmentedControl` for Hónap/Hét/Nap.
  - The "Gyors hozzáadás" gradient button becomes a primary `Button`.
  - Session-type colours use the `t-*` tokens.
  - Emoji icons in Day/Week/Month views become lucide icons.
  - `TrainingSessionModal`: the fixed `grid-cols-3`/`grid-cols-2` become `grid-cols-1 sm:grid-cols-2|3`.
  - Month and week grids keep 7 columns on ≥ sm. Below sm, the week view stacks days vertically. The month view keeps 7 columns with compact cells: dots instead of titles.
- Templates:
  - Fix the header count order to `filtered / total` ("12 / 30 sablon").
  - TacticTemplateEditor emoji headings become icons.
- Checklist:
  - create a session from Day view and via quick add;
  - edit and delete a session;
  - week load factors and tactics form save;
  - template create, duplicate, edit, delete for each of Gym/Ball/Tactic.

---

### Task 13: Gyakorlattár

**Files:** `src/pages/ExerciseLibrary.jsx`, `src/pages/exercise-library/*.jsx` (CreateExerciseModal, EditExerciseModal, MediaUpload, MusclePicker, ChipMultiSelect)

Specific changes:
- Muscle-group and difficulty filters use `Chip`. The 12 coloured muscle chips become neutral chips; selected state uses the `Chip` selected style.
- While `loading`, render a grid of 8 `Skeleton` cards instead of an empty area. This is visual only; the data-loading speed-up is phase 2.
- The detail modal becomes `Modal size="lg"`.
- Remove the `btn` class at `ExerciseLibrary.jsx:709`.
- Checklist:
  - search, filters and favourites;
  - "Továbbiak" pagination;
  - open detail;
  - create and edit exercise with media upload;
  - group collapse.

---

### Task 14: Teljesítmény and Egészség

**Files:**
- `src/pages/Measurements.jsx`, `src/pages/measurements/*.jsx` (5 modals)
- `src/pages/TrainingLoad.jsx`, `src/pages/Leaderboard.jsx`, `src/pages/PlayerProgress.jsx`
- `src/pages/Rehabilitation.jsx`, `src/pages/PlayerProfileRehab.jsx`
- `src/components/AnamnesisForm.jsx`, `DocumentUpload.jsx`, `BodyDiagram.jsx`, `AttendanceCalendar.jsx`, `TeamAttendanceCalendar.jsx`

If this is too large for one review, split it at the Teljesítmény / Egészség boundary into 14a and 14b, each with its own commit.

Specific changes:
- Measurements: the four coloured header buttons become one primary ("Új mérés") plus secondary ("Csapat felmérés", "Gyakorlatok kezelése", "Új gyakorlat").
- TrainingLoad: page title "1RM táblázat".
- Leaderboard: fix the typo "Teststúly" → "Testsúly" in visible copy only (lines ~210 and ~237; the DB lookup string stays as-is).
- PlayerProgress:
  - PDF export via `captureForPdf` (Task 11).
  - Keep only the header PDF button; remove the duplicate card-level button and keep a single entry point.
- Rehabilitation:
  - Title "Egészség".
  - The no-team branch is removed (the shell handles no-team).
  - Header tabs use `Tabs`.
- PlayerProfileRehab: the anamnesis emoji pills become icons + `StatusPill`.
- AnamnesisForm:
  - Step icons are lucide icons.
  - Step labels are visible on all widths (short labels below `lg`).
  - The fixed `grid-cols-2` becomes `grid-cols-1 sm:grid-cols-2`.
- Checklist:
  - single and team measurement entry;
  - CSV export;
  - exercise management;
  - 1RM table and PDF;
  - leaderboard and PDF;
  - progress chart, PHV analysis and PDF;
  - rehab overview and team attendance;
  - player rehab tabs;
  - anamnesis create/edit;
  - document upload/delete;
  - body diagram points.

---

### Task 15: Switch on themes, remove legacy styles, final verification, PR

**Files:**
- Modify: `src/lib/theme.js` (`THEME_SWITCH_ENABLED = true`), `index.html` (boot script constant), `src/index.css` (delete `.btn-primary`, `.btn-secondary`, `.input-field`, `.card`), `tailwind.config.js` (delete the `primary` palette)
- Test: `src/lib/theme.test.js` (update the `effectiveMode` test for the flag-on behaviour: `effectiveMode('light') === 'light'`)

- [ ] **Step 1: Update the `effectiveMode` test** to the flag-on expectation.
  Run `npx vitest run src/lib/theme.test.js`. Expected: FAIL.
- [ ] **Step 2: Flip the flag** in `theme.js` and in the `index.html` boot script.
  Run the same test. Expected: PASS.
- [ ] **Step 3: Delete the legacy classes and the `primary` palette.**
  - Delete the legacy classes from `index.css` and the `primary` palette from Tailwind.
  - Run `npm run redesign:check -- $(git ls-files 'src/**/*.jsx' 'src/**/*.js')`. Expected: exit 0 across the whole `src/`.
  - If the check finds leftovers, fix them in this task.
- [ ] **Step 4: Run the full verification**
  - Run `npm test`. Expected: PASS.
  - Run `npm run build`. Expected: success.
  - Manually, at desktop width and at 375px:
    - every route under `/dashboard/*`, plus `/auth` and `/join/<any token>`, works in Rendszer/Világos/Sötét;
    - the choice persists after reload with no flash;
    - switching the OS theme while on "Rendszer" updates live.
- [ ] **Step 5: Commit**
  `git commit -m "feat(design): enable light/dark/system theme switch and remove legacy styles"`
- [ ] **Step 6: Push the branch and open the PR** into `master`.
  - Title: "Újratervezés 1. szakasz: dizájnrendszer, új menü, mobil".
  - The body links the spec and plan, lists the reviewer-confirmed decisions from the spec's "Rögzített részletek" section, and states that the pre-redesign state is tagged `pre-redesign-2026-10`.
