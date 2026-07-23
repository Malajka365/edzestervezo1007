# G1b — Unit tests: permission matrix & attendance helpers

**Status:** Done
**Commit:** `d5a831d360d923f0d4ccf73776d36ddf7ad8c7ae`
**Tests added:** 44 (28 in `src/lib/permissions.test.js`, 16 in `src/lib/attendance.test.js`)
**All passing:** Yes — `npm test` reports 51 passed (44 mine + 7 from a parallel component-test file that appeared mid-session, unmodified by me).

## Test case names

`src/lib/permissions.test.js`
- isModuleVisible: view→true, edit→true, none→false, missing key→false, undefined perms→false, null perms→false, undefined moduleKey→true, null moduleKey→true, undefined+undefined→true
- canEditModule: edit→true, view→false, none→false, missing key→false, undefined perms→false, null perms→false, undefined moduleKey→true, null moduleKey→true
- DASHBOARD_MODULE_TO_PERMISSION_KEY: exact full mapping, no "home" key, no "trainingload" key, leaderboard & progress both → "stats"
- MODULES: exactly 9 entries, exact key order
- ROLES: exactly coach/fitness_coach/physiotherapist, 3 entries
- ACCESS_LEVELS: exactly none/view/edit in order, 3 entries

`src/lib/attendance.test.js`
- ATTENDANCE_STATUSES: exact 5 values in order
- getStatusColor: jelen/hiányzik/beteg/sérült/egyéb → correct color, unknown status → fallback, undefined → fallback, empty string → fallback
- getStatusLabel: jelen/hiányzik/beteg/sérült/egyéb → correct label, unknown status → echoes value, undefined → echoes undefined

## Skipped (with reason)
- `saveAttendance`/`deleteAttendance` — hit Supabase directly, out of scope for pure unit tests.
- `pdfExport.test.js` — the only export, `exportTablePdf`, has no logic outside the jspdf dynamic-import/try block; nothing pure to test without mocking jspdf, which was explicitly disallowed.
- `sanitizePlayerForm` (Teams.jsx) and `calculate1RM` (Measurements.jsx) — component-internal, not exported; testing them would require refactoring the components, which was out of scope. Recommend extracting both to `src/lib/` in a future refactor to make them unit-testable.

## Concerns
None. Full `npm test` run is clean (0 failures); only my two new files were staged/committed.
