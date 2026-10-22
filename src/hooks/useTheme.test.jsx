import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTheme } from './useTheme'

function mockMatchMedia(initialDark) {
  let listener = null
  const mql = {
    matches: initialDark,
    addEventListener: vi.fn((_type, fn) => { listener = fn }),
    removeEventListener: vi.fn(() => { listener = null }),
  }
  window.matchMedia = vi.fn(() => mql)
  return {
    setDark(value) {
      mql.matches = value
      listener?.({ matches: value })
    },
  }
}

describe('useTheme', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('applies the system preference and follows OS changes live in system mode', () => {
    const media = mockMatchMedia(true)
    const { result } = renderHook(() => useTheme())

    expect(result.current.mode).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('dark')

    act(() => media.setDark(false))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('ignores OS changes once an explicit mode is chosen', () => {
    const media = mockMatchMedia(true)
    const { result } = renderHook(() => useTheme())

    act(() => result.current.setMode('dark'))
    act(() => media.setDark(false))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('tf-theme')).toBe('dark')
  })

  it('keeps separate hook instances in sync', () => {
    mockMatchMedia(true)
    const root = renderHook(() => useTheme())
    const switcher = renderHook(() => useTheme())

    act(() => switcher.result.current.setMode('light'))

    expect(root.result.current.mode).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
