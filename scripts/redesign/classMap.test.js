import { describe, it, expect } from 'vitest'
import { mapClass, migrateSource, findLegacy } from './classMap.js'

describe('mapClass', () => {
  it('keeps variant prefixes', () => {
    expect(mapClass('hover:bg-slate-600')).toBe('hover:bg-surface-3')
    expect(mapClass('lg:group-hover:text-slate-400')).toBe('lg:group-hover:text-muted')
    expect(mapClass('disabled:bg-slate-700')).toBe('disabled:bg-surface-2')
  })

  it('keeps opacity suffixes', () => {
    expect(mapClass('bg-slate-700/50')).toBe('bg-surface-2/50')
    expect(mapClass('hover:bg-slate-700/50')).toBe('hover:bg-surface-2/50')
    expect(mapClass('border-red-500/50')).toBe('border-bad/50')
  })

  it('maps slate surfaces, borders and text', () => {
    expect(mapClass('bg-slate-900')).toBe('bg-bg')
    expect(mapClass('bg-slate-950')).toBe('bg-bg')
    expect(mapClass('bg-slate-800')).toBe('bg-surface')
    expect(mapClass('bg-slate-500')).toBe('bg-surface-3')
    expect(mapClass('border-slate-700')).toBe('border-line')
    expect(mapClass('divide-slate-600')).toBe('divide-line')
    expect(mapClass('border-slate-500')).toBe('border-line-strong')
    expect(mapClass('text-white')).toBe('text-fg')
    expect(mapClass('text-slate-300')).toBe('text-fg')
    expect(mapClass('text-slate-500')).toBe('text-muted')
    expect(mapClass('text-slate-700')).toBe('text-subtle')
    expect(mapClass('placeholder-slate-400')).toBe('placeholder-subtle')
  })

  it('maps primary to accent', () => {
    expect(mapClass('text-primary-400')).toBe('text-accent')
    expect(mapClass('bg-primary-600')).toBe('bg-accent')
    expect(mapClass('bg-primary-700')).toBe('bg-accent-hover')
    expect(mapClass('bg-primary-900')).toBe('bg-accent-soft')
    expect(mapClass('bg-primary-500/20')).toBe('bg-accent-soft')
    expect(mapClass('border-primary-500')).toBe('border-accent')
    expect(mapClass('ring-primary-400')).toBe('ring-accent')
  })

  it('maps status colours', () => {
    expect(mapClass('text-red-400')).toBe('text-bad')
    expect(mapClass('bg-red-600')).toBe('bg-bad')
    expect(mapClass('hover:bg-red-700')).toBe('hover:bg-bad/90')
    expect(mapClass('bg-red-900')).toBe('bg-bad-soft')
    expect(mapClass('bg-red-500/10')).toBe('bg-bad-soft')
    expect(mapClass('text-green-400')).toBe('text-ok')
    expect(mapClass('bg-emerald-500/20')).toBe('bg-ok-soft')
    expect(mapClass('border-green-500')).toBe('border-ok')
    expect(mapClass('text-yellow-400')).toBe('text-warn')
    expect(mapClass('bg-amber-500')).toBe('bg-warn')
    expect(mapClass('bg-orange-900')).toBe('bg-warn-soft')
  })

  it('returns null when there is no mapping', () => {
    expect(mapClass('bg-purple-600')).toBeNull()
    expect(mapClass('text-blue-400')).toBeNull()
    expect(mapClass('from-pink-500')).toBeNull()
    expect(mapClass('p-4')).toBeNull()
    expect(mapClass('bg-surface')).toBeNull()
  })
})

describe('migrateSource', () => {
  it('rewrites className strings and reports unmapped', () => {
    const r = migrateSource('<div className="p-4 bg-slate-800 text-purple-400">')
    expect(r.code).toBe('<div className="p-4 bg-surface text-purple-400">')
    expect(r.unmapped).toEqual(['text-purple-400'])
  })

  it('leaves non-className strings untouched', () => {
    const src = "console.log('bg-slate-800') // bg-slate-800"
    const r = migrateSource(src)
    expect(r.code).toBe(src)
    expect(r.unmapped).toEqual([])
  })

  it("handles className={'...'} and template literals with interpolation", () => {
    const src =
      "<a className={'text-slate-400 hover:text-white'} />\n" +
      "<b className={`flex bg-slate-800 ${active ? 'bg-primary-600 text-white' : 'text-slate-400'} p-2`} />"
    const r = migrateSource(src)
    expect(r.code).toBe(
      "<a className={'text-muted hover:text-fg'} />\n" +
        "<b className={`flex bg-surface ${active ? 'bg-accent text-fg' : 'text-muted'} p-2`} />",
    )
  })

  it('does not touch non-class code around className expressions', () => {
    const src =
      "const color = 'bg-slate-800'\n" +
      '<i className={cn(x === \'bg-slate-700\' && "bg-slate-700", `a ${b} text-white`)} title="bg-slate-700" />'
    const r = migrateSource(src)
    expect(r.code).toContain("const color = 'bg-slate-800'")
    expect(r.code).toContain('title="bg-slate-700"')
    expect(r.code).toContain('"bg-surface-2"')
    expect(r.code).toContain('`a ${b} text-fg`')
  })

  it('is not confused by quotes in comments inside the expression', () => {
    const src = "<i className={/* don't */ 'bg-slate-800'} /> <p className=\"text-white\" />"
    const r = migrateSource(src)
    expect(r.code).toBe("<i className={/* don't */ 'bg-surface'} /> <p className=\"text-fg\" />")
  })

  it('deduplicates unmapped classes', () => {
    const r = migrateSource('<a className="text-blue-400"/><b className="text-blue-400 from-pink-500"/>')
    expect(r.unmapped).toEqual(['text-blue-400', 'from-pink-500'])
  })
})

describe('findLegacy', () => {
  it('finds emoji', () => {
    expect(findLegacy('<span>✅ Mentve</span>')).toContain('✅')
  })

  it('does not flag (c), (R), TM', () => {
    expect(findLegacy('<p>© 2026 TeamFlow® ™</p>')).toEqual([])
  })

  it('finds the btn class', () => {
    expect(findLegacy('className="btn btn-primary"')).toContain('btn')
  })

  it('does not flag btn outside className', () => {
    expect(findLegacy('const btn = document.querySelector(".x"); btn.click()')).toEqual([])
  })

  it('is empty for token classes', () => {
    expect(findLegacy('className="bg-surface text-fg"')).toEqual([])
    expect(findLegacy('className="text-accent-fg bg-on-status border-line-strong"')).toEqual([])
  })

  it('finds legacy colours, including variants and opacity', () => {
    const found = findLegacy(
      'className="hover:bg-slate-700/50 text-white lg:text-red-400 ring-primary-500 placeholder-slate-400 bg-black"',
    )
    expect(found).toEqual(
      expect.arrayContaining([
        'hover:bg-slate-700/50',
        'text-white',
        'lg:text-red-400',
        'ring-primary-500',
        'placeholder-slate-400',
        'bg-black',
      ]),
    )
  })

  it('exempts bg-black/<opacity> overlay scrims', () => {
    expect(findLegacy('className="fixed inset-0 bg-black/50"')).toEqual([])
    expect(findLegacy('className="text-black border-black"')).toEqual(['text-black', 'border-black'])
  })

  it('returns distinct values', () => {
    expect(findLegacy('className="text-white text-white"')).toEqual(['text-white'])
  })
})

describe('fix round 1', () => {
  it('flags legacy colours behind bracket variants', () => {
    expect(findLegacy('className="data-[state=open]:bg-slate-700"')).toEqual(['data-[state=open]:bg-slate-700'])
    expect(findLegacy('className="aria-[x=y]:bg-slate-700"')).toEqual(['aria-[x=y]:bg-slate-700'])
    expect(findLegacy('className="group-[.is-open]:text-white"')).toEqual(['group-[.is-open]:text-white'])
    expect(findLegacy('className="group-hover/item:text-white"')).toEqual(['group-hover/item:text-white'])
  })

  it('migrates bracket-variant classes the same way check finds them', () => {
    const r = migrateSource(
      '<i className="data-[state=open]:bg-slate-700 group-[.is-open]:text-white aria-[x=y]:text-purple-400" />',
    )
    expect(r.code).toBe(
      '<i className="data-[state=open]:bg-surface-2 group-[.is-open]:text-fg aria-[x=y]:text-purple-400" />',
    )
    expect(r.unmapped).toEqual(['aria-[x=y]:text-purple-400'])
    expect(mapClass('data-[state=open]:bg-slate-700')).toBe('data-[state=open]:bg-surface-2')
  })

  it('flags legacy component classes only as className tokens', () => {
    const found = findLegacy('className="btn-primary input-field card"')
    expect(found).toEqual(expect.arrayContaining(['btn-primary', 'input-field', 'card']))
    expect(findLegacy('className="btn-secondary"')).toEqual(['btn-secondary'])
    expect(findLegacy('const card = 1; const inputField = 2')).toEqual([])
    expect(findLegacy('className="cardinal card-body"')).toEqual([])
    expect(findLegacy("className={`flex ${x ? 'card' : ''}`}")).toEqual(['card'])
  })

  it('detects ring-offset, caret, decoration and directional borders', () => {
    const src =
      'className="ring-offset-slate-800 caret-white decoration-red-500 border-t-slate-700 border-x-blue-500 border-s-white"'
    expect(findLegacy(src)).toEqual([
      'ring-offset-slate-800',
      'caret-white',
      'decoration-red-500',
      'border-t-slate-700',
      'border-x-blue-500',
      'border-s-white',
    ])
  })

  it('maps directional borders where the table applies, leaves the rest unmapped', () => {
    expect(mapClass('border-t-slate-700')).toBe('border-t-line')
    expect(mapClass('hover:border-b-slate-500')).toBe('hover:border-b-line-strong')
    expect(mapClass('border-l-primary-500')).toBe('border-l-accent')
    expect(mapClass('border-x-red-500/50')).toBe('border-x-bad/50')
    expect(mapClass('ring-offset-slate-800')).toBeNull()
    expect(mapClass('caret-white')).toBeNull()
    expect(mapClass('decoration-red-500')).toBeNull()
    const r = migrateSource('<i className="border-t-slate-700 ring-offset-slate-800" />')
    expect(r.code).toBe('<i className="border-t-line ring-offset-slate-800" />')
    expect(r.unmapped).toEqual(['ring-offset-slate-800'])
  })

  it('accepts decimal opacity', () => {
    expect(mapClass('bg-slate-700/2.5')).toBe('bg-surface-2/2.5')
    expect(mapClass('bg-red-500/12.5')).toBe('bg-bad-soft')
    expect(findLegacy('className="bg-slate-700/2.5 hover:text-white/87.5"')).toEqual([
      'bg-slate-700/2.5',
      'hover:text-white/87.5',
    ])
    expect(findLegacy('className="bg-black/2.5"')).toEqual([])
  })
})
