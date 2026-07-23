# I3 — Dashboard Widget Customization Editor

## Status
Done.

## Editor location
Extracted to `src/pages/dashboard-home/CustomizeEditor.jsx` (modal, matches app's
existing `fixed inset-0 bg-black/50 ... card` modal style). `DashboardHome.jsx`
now: enables the "Testreszabás" button, computes `allowedWidgets` /
`sourceList`, holds `editorOpen` state, and conditionally mounts
`<CustomizeEditor />` — local editing state lives entirely inside the editor
component and is discarded on unmount (Mégse / backdrop-independent close),
so it never touches saved prefs until Mentés.

## Save payload shape
`savePrefs(items)` where `items` is `[{ key: string, visible: boolean }, ...]`
in the user-edited order — exactly the shape `useDashboardPrefs.savePrefs`
upserts into `user_dashboard_prefs.widgets`. On success: `toast.success('Kezdőlap elmentve!')`
then close; on failure: `toast.error(...)`, editor stays open.

## Edge cases handled
- Widgets not yet in saved prefs are appended at the end as `visible:false`
  (`mergeWithAllowed` merges saved/default order with `filterAllowedWidgets`).
- Zero allowed widgets → editor renders "Nincs testreszabható elem."; the
  Mentés button still works and persists an empty array (grid then shows the
  existing `EmptyState`).
- "Alaphelyzet" replaces local state with `getDefaultWidgets(role, permissions)`
  merged back through the same allowed-widget list (so widgets outside the
  role default set stay visible in the editor as hidden, not disappear).
- First row's up-arrow and last row's down-arrow are disabled.

## Tests + build
`npm test` → 67/67 pass. `npm run build` → clean.

## Concerns
None blocking. Not covered by automated tests (none existed for
DashboardHome/editor before this change, and none were requested) — worth a
follow-up component test for the editor's reorder/toggle/save/reset flows.
