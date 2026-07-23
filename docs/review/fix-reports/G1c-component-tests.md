# G1c — Component Tests

**Status:** Complete — all tests passing.
**Commit:** `14b53467cfa2be0fed8a97e90645d8165d5299af`
**Test count:** 19 new tests (ConfirmDialog 7, ErrorBoundary 4, EmptyState 4, Auth 4) + 1 pre-existing smoke = 20 total, all green.
**All passing?** Yes — `npx vitest run src/test` → Test Files 5 passed (5), Tests 20 passed (20).
**Auth mocking:** `vi.mock('@/lib/supabase', …)` returns a `supabase.auth` with `signInWithPassword`/`signUp` as `vi.fn()`; render wrapped in `<MemoryRouter>`; errors surface via the component's local `message` state (no toast in Auth.jsx), asserted by visible error text.
**Skipped:** Sidebar/Dashboard permission-filtering render — `isModuleVisible` is unit-covered by the parallel agent; a full render needs TeamProvider + QueryClient + Router + Supabase mocks (heavier harness, future integration work).
**Concerns:** ErrorBoundary tests emit jsdom `Error: kaboom` stack traces on stderr (jsdom's `reportException` for the intentionally-thrown child) — cosmetic only, tests pass; the React `console.error` noise is silenced via a spy. Login/Register buttons share accessible names, so submit buttons are disambiguated by `type="submit"`.

## Test names

ConfirmDialog: renders title and message when open; renders nothing when closed; calls onConfirm on confirm click; calls onCancel on cancel click; calls onCancel on Escape; red confirm button + custom confirmLabel when danger=true; no danger styling when danger=false.
ErrorBoundary: renders children when no error; shows Hungarian fallback and does not propagate on throw; renders a working reload button; clears error state when resetKey changes.
EmptyState: renders title and description; renders action button and calls onAction; no button when actionLabel missing; no button when onAction missing.
Auth: shows min-6-chars hint after Regisztráció tab; calls signInWithPassword with typed email/password; surfaces error message on failed login; calls signUp from Regisztráció tab.
