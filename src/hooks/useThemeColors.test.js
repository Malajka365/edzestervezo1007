import { afterEach, describe, expect, it } from 'vitest'
import { readThemeColors } from './useThemeColors'

describe('readThemeColors', () => {
  let style

  afterEach(() => {
    style?.remove()
    style = null
  })

  const addTokens = () => {
    style = document.createElement('style')
    style.textContent = `
      :root { --accent: 1 2 3; --surface: 10 10 10; }
      [data-theme="light"] { --accent: 39 71 224; --surface: 255 255 255; }
      [data-theme="dark"] { --accent: 100 110 120; --surface: 18 24 38; }
    `
    document.head.appendChild(style)
  }

  it('resolves the tokens of the requested theme, not the live one', () => {
    addTokens()
    const light = readThemeColors('light')
    const dark = readThemeColors('dark')

    expect(light.accent).toBe('rgb(39 71 224)')
    expect(light.surface).toBe('rgb(255 255 255)')
    expect(dark.accent).toBe('rgb(100 110 120)')
  })

  it('removes the probe element afterwards', () => {
    addTokens()
    const before = document.body.children.length
    readThemeColors('light')
    expect(document.body.children.length).toBe(before)
  })

  it('tolerates missing tokens', () => {
    const colors = readThemeColors('light')
    expect(colors.accent).toBeUndefined()
    expect(colors).toEqual({})
  })
})
