// Téma-logika: a mentett mód olvasása/írása és a tényleges téma feloldása.
// A hook-ok a src/hooks/useTheme.js és useThemeColors.js fájlokban vannak.
// FIGYELEM: az index.html boot scriptje ugyanezeket a szabályokat duplikálja,
// mert modulok betöltése előtt fut. Változtatáskor mindkét helyet frissítsd.

export const THEME_STORAGE_KEY = 'tf-theme'
export const THEME_MODES = ['system', 'light', 'dark']

// A kapcsoló rejtett, az app kényszerítve sötét, amíg a Task 15 be nem kapcsolja.
export const THEME_SWITCH_ENABLED = false

export function readStoredMode() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return THEME_MODES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function writeStoredMode(mode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // privát mód / tiltott tárhely: a téma ekkor csak a munkamenetre él
  }
}

export function resolveTheme(mode, systemPrefersDark) {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

// A feature flag csak itt érvényesül, a resolveTheme tiszta marad.
export function effectiveMode(mode) {
  return THEME_SWITCH_ENABLED ? mode : 'dark'
}

export function applyTheme(resolved) {
  document.documentElement.dataset.theme = resolved
}
