import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  THEME_STORAGE_KEY,
  THEME_SWITCH_ENABLED,
  effectiveMode,
  readStoredMode,
  resolveTheme,
  writeStoredMode,
} from './theme'

describe('resolveTheme', () => {
  it('returns explicit modes as they are', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows the system preference in system mode', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('stored mode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to system when the key is missing', () => {
    expect(readStoredMode()).toBe('system')
  })

  it('falls back to system for an unknown stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'blue')
    expect(readStoredMode()).toBe('system')
  })

  it('falls back to system when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readStoredMode()).toBe('system')
  })

  it('round-trips a written mode', () => {
    writeStoredMode('dark')
    expect(readStoredMode()).toBe('dark')
  })

  it('does not throw when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => writeStoredMode('light')).not.toThrow()
  })
})

describe('effectiveMode', () => {
  it('forces dark while the theme switch is disabled', () => {
    expect(THEME_SWITCH_ENABLED).toBe(false)
    expect(effectiveMode('light')).toBe('dark')
    expect(effectiveMode('system')).toBe('dark')
  })
})
