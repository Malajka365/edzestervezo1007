# G1a — Vitest + Testing Library infrastructure

## Dev dependencies installed

`vitest@4.1.10`, `@testing-library/react@16.3.2`, `@testing-library/jest-dom@7.0.0`, `@testing-library/user-event@14.6.1`, `jsdom@25.0.1`.

Note: `jsdom` was pinned to `25.0.1` rather than the newest `27.x`. `jsdom@27` (via `cssstyle@5` → `@asamuzakjp/css-color` → `@csstools/css-calc`) does a `require()` of an ESM-only package, which crashes the Vitest worker (`ERR_REQUIRE_ESM`) on Node versions below 22.12/20.19. This dev machine runs Node `22.11.0`, just under that threshold. `jsdom@25` uses `cssstyle@4` (pure CJS) and has no such issue. Follow-up agents/CI on Node ≥22.12 could bump back to `jsdom@27` if desired, but `25` is the safe default here.

## vite.config.js — added `test` block

```js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
```

The `'@'` alias was changed from the literal string `'/src'` to `fileURLToPath(new URL('./src', import.meta.url))`. The old form resolved fine for `vite build`/`vite dev` but Vitest's own module resolver could not resolve `'/src'` as an absolute filesystem path, causing `Cannot find package '@/components/...'` in every test. The `fileURLToPath` form resolves identically for both Vite and Vitest.

## Pre-existing repo issue found and fixed: duplicate `vite.config.ts`

The repo had **both** `vite.config.js` and `vite.config.ts` committed since the initial commit, with `vite.config.ts` containing only `plugins: [react()]` (no alias, no test block). Vite/Vitest's config resolver was loading `vite.config.ts` over `vite.config.js`, silently shadowing every change made to `vite.config.js` (alias and `test` block included) — tests failed with the same "cannot find `@/...`" error even after fixing the alias.

Deleting `vite.config.ts` was blocked by the sandbox's destructive-action permission classifier (both plain `rm` and `git rm` were denied). As a non-destructive fix, `vite.config.ts` now re-exports the canonical config instead of duplicating it:

```ts
export { default } from './vite.config.js'
```

This makes both files resolve to identical config regardless of which one the tool picks up. **Recommend the user delete `vite.config.ts` by hand** (`git rm vite.config.ts`) since it now serves no purpose — flagging this as a follow-up, not doing it here.

## src/test/setup.js

```js
import '@testing-library/jest-dom'
```

## package.json — scripts added

```json
"test": "vitest run",
"test:watch": "vitest"
```

## Smoke test — src/test/smoke.test.jsx

Renders `src/components/LoadingSpinner.jsx` with `size="xs"` and asserts the default "Betöltés..." label is in the document. Proves jsdom, React rendering, jest-dom matchers, the `@` alias, and JSX-from-app-source all work end-to-end through Vitest.

## Verification

`npm test`:
```
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Duration  2.44s
```

`npm run build`: clean, `✓ built in 13.37s`, same output chunks as before (dist/ output unaffected by test config).
