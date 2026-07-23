// Small typed formatting helpers.
// Proof-of-concept for the TS infra (see docs/review/fix-reports/G4-typescript.md) —
// not wired into any existing component yet.

/**
 * Formats an ISO date string as a Hungarian-locale date (e.g. "2026. 07. 23.").
 * Returns an empty string for null/undefined/empty input instead of throwing.
 */
export function formatHungarianDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('hu-HU')
}
