# G4 — TypeScript infrastructure (incremental adoption, allowJs)

Goal: allow **new** files to be written in TS/TSX going forward, while all existing
`.js`/`.jsx` files keep working, untouched and **not** type-checked. No existing file
was converted or renamed.

## Dev dependencies installed

`typescript@7.0.2`, `@types/react`, `@types/react-dom`, `@types/node`.

Vite already compiles `.ts`/`.tsx` via esbuild at build time — `tsc` here is used
**only** for type-checking (`noEmit: true`), never for emitting JS.

## tsconfig.json

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,

    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "useDefineForClassFields": true,

    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",

    "jsx": "react-jsx",

    "noEmit": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,

    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,

    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

Key point: `allowJs: true` + `checkJs: false` is what makes this "infra only" — JS/JSX
files are allowed into the program (so `.ts` files can import them without errors)
but are **not** type-checked. `strict: true` therefore only bites on new `.ts`/`.tsx`
files. The `paths` alias mirrors the `'@'` → `./src` alias already set in
`vite.config.js`'s `resolve.alias`, so path imports type-check consistently with how
Vite resolves them at build/dev time.

No `tsconfig.node.json` was added: the standard Vite template only needs one when
`vite.config.ts` itself is a TypeScript file. `vite.config.js` was left untouched
(still `.js`), so a second config file would add nothing here — skipped to keep the
change minimal, per scope.

### Compiler quirk encountered

TypeScript 7 (the new native/`tsgo`-based compiler line) **removed the `baseUrl`
option** (`TS5102`) and requires `paths` values to be relative-looking (leading `./`,
`TS5090`). Ended up dropping `baseUrl` entirely and writing `"@/*": ["./src/*"]`
directly — resolves the same way for this project since there's a single root.

## npm script added

```json
"typecheck": "tsc --noEmit"
```

## Proof-of-concept TS files (not wired into any existing component)

`src/lib/format.ts`:
```ts
export function formatHungarianDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('hu-HU')
}
```

`src/lib/format.test.ts` — 3 cases (valid ISO date, `null`, `undefined`), following
the existing `describe`/`it`/`expect` style used by `src/lib/attendance.test.js`.

## Verification

### `npm run typecheck`
```
> tsc --noEmit
```
Exit code `0`, **no output** — 0 errors. Confirms the 60+ existing `.jsx`/`.js`
files are *not* being type-checked (a leaked `checkJs` would have flooded this with
thousands of errors); only the new, clean `src/lib/format.ts` is checked.

### `npm test`
```
 Test Files  8 passed (8)
      Tests  67 passed (67)
```
8 test files (7 pre-existing + new `src/lib/format.test.ts`), 67 tests total
(64 pre-existing + 3 new). All pass. This confirms Vitest runs `.ts` test files
under the existing `jsdom`/`globals` setup with no extra config. (The interleaved
"kaboom" stack traces in the console are expected — `ErrorBoundary.test.jsx`
intentionally throws to test the error boundary; pre-existing, unrelated to this
change.)

### `npm run build`
```
✓ 2966 modules transformed.
✓ built in 13.71s
```
Clean production build, same chunk set as before plus no new entry chunk (the new
`.ts` files aren't imported by any existing code yet, so esbuild doesn't need to
bundle them into the app — they were still successfully included in the `tsc`
type-check program). `dist/` was removed afterward (not committed).

## Files changed/added

- `tsconfig.json` (new)
- `package.json` (added `typecheck` script + 4 devDependencies)
- `package-lock.json` (lockfile update from install)
- `src/lib/format.ts` (new)
- `src/lib/format.test.ts` (new)
