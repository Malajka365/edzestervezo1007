import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_SWITCH_ENABLED } from './theme'

// Az index.html inline boot scriptjét futtatjuk le, hogy a theme.js szabályaival
// való egyezés (és a tárhely-hibák kezelése) tesztelve legyen.
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]

function runBoot({ stored, storageThrows = false, osDark = false, matchMediaThrows = false }) {
  delete document.documentElement.dataset.theme
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    if (storageThrows) throw new Error('denied')
    return stored ?? null
  })
  window.matchMedia = vi.fn(() => {
    if (matchMediaThrows) throw new Error('unsupported')
    return { matches: osDark }
  })
  new Function(script)()
  return document.documentElement.dataset.theme
}

describe('index.html boot script', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.matchMedia = originalMatchMedia
    delete document.documentElement.dataset.theme
  })

  it('mirrors the THEME_SWITCH_ENABLED flag of theme.js', () => {
    const flag = script.match(/THEME_SWITCH_ENABLED = (true|false)/)[1]
    expect(flag === 'true').toBe(THEME_SWITCH_ENABLED)
  })

  it('uses an explicit stored mode', () => {
    expect(runBoot({ stored: 'light', osDark: true })).toBe('light')
    expect(runBoot({ stored: 'dark', osDark: false })).toBe('dark')
  })

  it('follows the OS in system mode and for missing or invalid values', () => {
    expect(runBoot({ stored: 'system', osDark: false })).toBe('light')
    expect(runBoot({ stored: 'system', osDark: true })).toBe('dark')
    expect(runBoot({ stored: null, osDark: false })).toBe('light')
    expect(runBoot({ stored: 'blue', osDark: true })).toBe('dark')
  })

  it('still follows the OS when storage access throws (no dark to light flash)', () => {
    expect(runBoot({ storageThrows: true, osDark: false })).toBe('light')
    expect(runBoot({ storageThrows: true, osDark: true })).toBe('dark')
  })

  it('falls back to dark when matchMedia throws', () => {
    expect(runBoot({ matchMediaThrows: true })).toBe('dark')
  })
})
