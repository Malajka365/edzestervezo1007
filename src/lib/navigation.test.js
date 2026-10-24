import { describe, it, expect } from 'vitest'
import {
  NAV_GROUPS,
  PROFILE_ITEM,
  MOBILE_TAB_IDS,
  getNavForRole,
  filterNav,
  getMobileTabs,
  findNavItemByPath,
  getGroupOfItem,
} from './navigation'

const allItemIds = (groups) => groups.flatMap((g) => g.items.map((i) => i.id))
const groupIds = (groups) => groups.map((g) => g.id)

describe('NAV_GROUPS', () => {
  it('has 14 items in 5 groups with the expected labels', () => {
    expect(allItemIds(NAV_GROUPS)).toHaveLength(14)
    expect(NAV_GROUPS.map((g) => [g.id, g.label])).toEqual([
      ['overview', 'Áttekintés'],
      ['planning', 'Tervezés'],
      ['content', 'Edzéstartalom'],
      ['performance', 'Teljesítmény'],
      ['team', 'Csapat'],
    ])
  })

  it('gives every item an id, label, path, icon and permissionKey', () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        expect(item.id).toEqual(expect.any(String))
        expect(item.label).toEqual(expect.any(String))
        expect(item.path).toMatch(/^\/dashboard/)
        expect(item.icon).toBeTruthy()
        expect(item.permissionKey === null || typeof item.permissionKey === 'string').toBe(true)
      }
    }
  })

  it('marks only the home item as end-matched', () => {
    const home = findNavItemByPath('/dashboard')
    expect(home.end).toBe(true)
    const others = allItemIds(NAV_GROUPS).filter((id) => id !== 'home')
    for (const id of others) {
      expect(getGroupOfItem(id)).not.toBeNull()
    }
    expect(NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.end).map((i) => i.id)).toEqual(['home'])
  })

  it('exposes the profile item outside of the groups', () => {
    expect(PROFILE_ITEM).toEqual({ id: 'profile', label: 'Profil', path: '/dashboard/profil' })
    expect(allItemIds(NAV_GROUPS)).not.toContain('profile')
  })
})

describe('phase 2 nav items', () => {
  it('finds the Mai edzés and Jelenlét pages by path', () => {
    expect(findNavItemByPath('/dashboard/mai-edzes').id).toBe('today')
    expect(findNavItemByPath('/dashboard/jelenlet').id).toBe('attendance')
  })

  it('shows Mai edzés right after Kezdőlap with calendar view', () => {
    const result = filterNav(NAV_GROUPS, { calendar: 'view' }, false)
    expect(result[0].items.map((i) => i.id)).toEqual(['home', 'today'])
  })

  it('hides Jelenlét without the attendance permission', () => {
    const result = filterNav(NAV_GROUPS, { players: 'view' }, false)
    expect(allItemIds(result)).not.toContain('attendance')
    expect(allItemIds(filterNav(NAV_GROUPS, { attendance: 'view' }, false))).toContain('attendance')
  })
})

describe('getNavForRole', () => {
  it.each(['coach', 'fitness_coach', 'physiotherapist', null])('returns the full nav for role %s', (role) => {
    expect(getNavForRole(role)).toEqual(NAV_GROUPS)
  })
})

describe('filterNav', () => {
  it('returns all 14 items while permissions are loading', () => {
    const result = filterNav(NAV_GROUPS, {}, true)
    expect(allItemIds(result)).toHaveLength(14)
    expect(groupIds(result)).toEqual(groupIds(NAV_GROUPS))
  })

  it('keeps only visible items and drops groups left empty', () => {
    const result = filterNav(NAV_GROUPS, { matches: 'view' }, false)
    expect(groupIds(result)).toEqual(['overview', 'performance'])
    expect(result[0].items.map((i) => i.id)).toEqual(['home', 'matches'])
    expect(result[1].items.map((i) => i.id)).toEqual(['trainingload'])
  })

  it('hides both stats items when stats is "none"', () => {
    const result = filterNav(NAV_GROUPS, { stats: 'none' }, false)
    const ids = allItemIds(result)
    expect(ids).not.toContain('leaderboard')
    expect(ids).not.toContain('progress')
  })

  it('shows both stats items when stats is "view"', () => {
    const ids = allItemIds(filterNav(NAV_GROUPS, { stats: 'view' }, false))
    expect(ids).toEqual(expect.arrayContaining(['leaderboard', 'progress']))
  })

  it('always keeps items with a null permissionKey', () => {
    const ids = allItemIds(filterNav(NAV_GROUPS, {}, false))
    expect(ids).toEqual(['home', 'trainingload'])
  })

  it('does not mutate NAV_GROUPS', () => {
    const before = JSON.stringify(NAV_GROUPS.map((g) => g.items.map((i) => i.id)))
    filterNav(NAV_GROUPS, {}, false)
    filterNav(NAV_GROUPS, { matches: 'view' }, false)
    expect(JSON.stringify(NAV_GROUPS.map((g) => g.items.map((i) => i.id)))).toBe(before)
  })
})

describe('getMobileTabs', () => {
  it('exposes four tab ids in the fixed order', () => {
    expect(MOBILE_TAB_IDS).toEqual(['home', 'calendar', 'teams', 'exercises'])
  })

  it('returns the visible tab items in MOBILE_TAB_IDS order', () => {
    const tabs = getMobileTabs(filterNav(NAV_GROUPS, {}, true))
    expect(tabs.map((t) => t.id)).toEqual(['home', 'calendar', 'teams', 'exercises'])
  })

  it('omits a hidden item', () => {
    const groups = filterNav(NAV_GROUPS, { calendar: 'none', players: 'view', exercises: 'view' }, false)
    expect(getMobileTabs(groups).map((t) => t.id)).toEqual(['home', 'teams', 'exercises'])
  })
})

describe('findNavItemByPath', () => {
  it('ignores a trailing slash', () => {
    expect(findNavItemByPath('/dashboard/naptar/').id).toBe('calendar')
  })

  it('finds the home item for /dashboard', () => {
    expect(findNavItemByPath('/dashboard').id).toBe('home')
  })

  it('finds the profile item', () => {
    expect(findNavItemByPath('/dashboard/profil').id).toBe('profile')
  })

  it('returns null for an unknown path', () => {
    expect(findNavItemByPath('/x')).toBeNull()
  })
})

describe('getGroupOfItem', () => {
  it('returns the group containing the item', () => {
    expect(getGroupOfItem('calendar').id).toBe('planning')
    expect(getGroupOfItem('leaderboard').id).toBe('performance')
  })

  it('returns null for an unknown item or the profile item', () => {
    expect(getGroupOfItem('nope')).toBeNull()
    expect(getGroupOfItem('profile')).toBeNull()
  })
})
