import { describe, it, expect } from 'vitest'
import { slugify, validateMediaFile, buildMediaPath } from './exerciseMedia'

describe('slugify', () => {
  it('kisbetűsít, ékezetet bont, kötőjelez', () => {
    expect(slugify('Fekvenyomás rúddal')).toBe('fekvenyomas-ruddal')
  })
  it('levágja a vezető/záró kötőjeleket és összevonja', () => {
    expect(slugify('  Bench   Press!! ')).toBe('bench-press')
  })
  it('üres bemenetre üres stringet ad', () => {
    expect(slugify('')).toBe('')
  })
})

describe('validateMediaFile', () => {
  it('elfogad gif/png/jpeg-et a limit alatt', () => {
    expect(validateMediaFile({ type: 'image/gif', size: 1000 }).ok).toBe(true)
    expect(validateMediaFile({ type: 'image/png', size: 1000 }).ok).toBe(true)
    expect(validateMediaFile({ type: 'image/jpeg', size: 1000 }).ok).toBe(true)
  })
  it('elutasít más MIME-et', () => {
    const r = validateMediaFile({ type: 'video/mp4', size: 1000 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/formátum|típus/i)
  })
  it('elutasít 8 MB fölött', () => {
    const r = validateMediaFile({ type: 'image/gif', size: 8 * 1024 * 1024 + 1 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/méret|MB/i)
  })
})

describe('buildMediaPath', () => {
  it('custom/<slug>-<now>.<ext> alakot ad', () => {
    expect(buildMediaPath('Bench Press', 'gif', 1700000000000))
      .toBe('custom/bench-press-1700000000000.gif')
  })
})
