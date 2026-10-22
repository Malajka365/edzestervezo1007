import { useCallback, useEffect, useState } from 'react'
import {
  THEME_STORAGE_KEY,
  applyTheme,
  effectiveMode,
  readStoredMode,
  resolveTheme,
  writeStoredMode,
} from '../lib/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const THEME_CHANGE_EVENT = 'tf-theme-change'

function systemPrefersDark() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY).matches
    : false
}

/**
 * Tema mód állapot: { mode, resolved, setMode }.
 * `mode` a felhasználó választása (system | light | dark), `resolved` a ténylegesen
 * alkalmazott téma. Rendszer módban a prefers-color-scheme változását is követi.
 */
export function useTheme() {
  const [mode, setModeState] = useState(readStoredMode)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  const resolved = resolveTheme(effectiveMode(mode), systemDark)

  useEffect(() => {
    if (mode !== 'system' || typeof window.matchMedia !== 'function') return undefined
    const mql = window.matchMedia(DARK_QUERY)
    const onChange = (event) => setSystemDark(event.matches)
    setSystemDark(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [mode])

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  // Több példány is él (az App gyökerében és a téma kapcsolóban): a módváltást
  // eseménnyel osztjuk meg, a más lapon történt módosítást a storage eseménnyel követjük.
  useEffect(() => {
    const onChange = (event) => setModeState(event.detail)
    const onStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setModeState(readStoredMode())
    }
    window.addEventListener(THEME_CHANGE_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setMode = useCallback((next) => {
    writeStoredMode(next)
    setModeState(next)
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: next }))
  }, [])

  return { mode, resolved, setMode }
}
