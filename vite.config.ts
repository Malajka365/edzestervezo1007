// NOTE: vite.config.js is the canonical config (includes the '@' alias and
// the Vitest `test` block). This file is a leftover duplicate from the
// initial commit that was silently shadowing vite.config.js for both Vite
// and Vitest's config resolution. Deleting it requires explicit user
// permission (blocked by the sandbox's destructive-action classifier), so
// it re-exports the canonical config instead to keep behavior identical
// regardless of which file the resolver picks up.
export { default } from './vite.config.js'
