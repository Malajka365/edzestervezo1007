import { useCallback, useEffect, useState } from 'react'
import {
  applyTheme,
  effectiveMode,
  readStoredMode,
  resolveTheme,
  writeStoredMode,
} from '../lib/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

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

  const setMode = useCallback((next) => {
    writeStoredMode(next)
    setModeState(next)
  }, [])

  return { mode, resolved, setMode }
}
