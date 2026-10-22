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
    const { result } = renderHook(() => useTheme({ apply: true }))

    expect(result.current.mode).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('dark')

    act(() => media.setDark(false))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('ignores OS changes once an explicit mode is chosen', () => {
    const media = mockMatchMedia(true)
    const { result } = renderHook(() => useTheme({ apply: true }))

    act(() => result.current.setMode('dark'))
    act(() => media.setDark(false))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('tf-theme')).toBe('dark')
  })

  it('keeps separate hook instances in sync', () => {
    mockMatchMedia(true)
    const root = renderHook(() => useTheme({ apply: true }))
    const switcher = renderHook(() => useTheme())

    act(() => switcher.result.current.setMode('light'))

    expect(root.result.current.mode).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('does not touch data-theme from an instance without apply', () => {
    mockMatchMedia(true)
    document.documentElement.dataset.theme = 'light'
    renderHook(() => useTheme())

    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('does not re-apply system when a switcher remounts with blocked storage', () => {
    mockMatchMedia(true)
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    try {
      const root = renderHook(() => useTheme({ apply: true }))
      const first = renderHook(() => useTheme())
      act(() => first.result.current.setMode('light'))
      expect(document.documentElement.dataset.theme).toBe('light')

      first.unmount()
      // A menü újranyitása: új példány, a tároló nem olvasható, ezért 'system'-ről indul.
      const second = renderHook(() => useTheme())

      expect(second.result.current.mode).toBe('system')
      expect(root.result.current.mode).toBe('light')
      expect(document.documentElement.dataset.theme).toBe('light')
    } finally {
      getItem.mockRestore()
      setItem.mockRestore()
    }
  })
})
