import { describe, it, expect } from 'vitest'
import { NAV_GROUPS, filterNav } from './navigation'
import { buildCommands, filterCommands, normalize } from './commands'

const allGroups = filterNav(NAV_GROUPS, {}, true)
const labels = (cmds) => cmds.map((c) => c.label)

describe('normalize', () => {
  it('kisbetűsít és eltávolítja az ékezeteket', () => {
    expect(normalize('Mérések')).toBe('meresek')
    expect(normalize('Naptár ŐÜÓ')).toBe('naptar ouo')
  })
})

describe('buildCommands', () => {
  it('minden látható menüponthoz ad "Oldalak" parancsot, plusz a Profilt', () => {
    const cmds = buildCommands(allGroups)
    const pages = cmds.filter((c) => c.group === 'Oldalak')
    const itemCount = allGroups.reduce((n, g) => n + g.items.length, 0)

    expect(pages).toHaveLength(itemCount + 1)
    expect(labels(pages)).toContain('Mérések')
    expect(pages.find((c) => c.label === 'Profil').path).toBe('/dashboard/profil')
  })

  it('a "Műveletek" csak navigálnak a megfelelő oldalra', () => {
    const actions = buildCommands(allGroups).filter((c) => c.group === 'Műveletek')

    expect(actions.map((c) => [c.label, c.path])).toEqual([
      ['Új mérés rögzítése', '/dashboard/meresek'],
      ['Edzés hozzáadása a naptárhoz', '/dashboard/naptar'],
      ['Új gyakorlat', '/dashboard/gyakorlatok'],
      ['Játékos hozzáadása', '/dashboard/csapatok'],
    ])
    for (const c of actions) {
      expect(c.id).toBeTruthy()
      expect(c.icon).toBeTruthy()
      expect(Array.isArray(c.keywords)).toBe(true)
    }
  })

  it('rejtett mérés modulnál sem az oldal, sem a hozzá tartozó művelet nincs ott', () => {
    const groups = filterNav(NAV_GROUPS, { measurement: 'none', calendar: 'view' }, false)
    const names = labels(buildCommands(groups))

    expect(names).not.toContain('Mérések')
    expect(names).not.toContain('Új mérés rögzítése')
    expect(names).toContain('Naptár')
    expect(names).toContain('Edzés hozzáadása a naptárhoz')
  })

  it('az azonosítók egyediek', () => {
    const ids = buildCommands(allGroups).map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('filterCommands', () => {
  const cmds = buildCommands(allGroups)

  it('üres keresésre mindent visszaad', () => {
    expect(filterCommands(cmds, '')).toEqual(cmds)
    expect(filterCommands(cmds, '   ')).toEqual(cmds)
  })

  it('ékezet nélkül is megtalálja', () => {
    expect(labels(filterCommands(cmds, 'meres'))).toContain('Mérések')
  })

  it('kis- és nagybetűre érzéketlen', () => {
    expect(labels(filterCommands(cmds, 'NAPTAR'))).toContain('Naptár')
  })

  it('több szó esetén mindegyiknek illeszkednie kell (kulcsszavakra is)', () => {
    expect(labels(filterCommands(cmds, 'uj meres'))).toContain('Új mérés rögzítése')
    expect(labels(filterCommands(cmds, '1rm'))).toContain('Új mérés rögzítése')
  })

  it('nincs találat értelmetlen szóra', () => {
    expect(filterCommands(cmds, 'zzz')).toEqual([])
  })
})
