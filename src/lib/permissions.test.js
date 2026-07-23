import { describe, it, expect } from 'vitest'
import {
  MODULES,
  ROLES,
  ACCESS_LEVELS,
  DASHBOARD_MODULE_TO_PERMISSION_KEY,
  isModuleVisible,
  canEditModule,
} from './permissions'

describe('isModuleVisible', () => {
  it('returns true when access level is "view"', () => {
    expect(isModuleVisible({ players: 'view' }, 'players')).toBe(true)
  })

  it('returns true when access level is "edit"', () => {
    expect(isModuleVisible({ players: 'edit' }, 'players')).toBe(true)
  })

  it('returns false when access level is "none"', () => {
    expect(isModuleVisible({ players: 'none' }, 'players')).toBe(false)
  })

  it('returns false when the module key is missing from permissions', () => {
    expect(isModuleVisible({}, 'players')).toBe(false)
  })

  it('returns false when permissions is undefined', () => {
    expect(isModuleVisible(undefined, 'players')).toBe(false)
  })

  it('returns false when permissions is null', () => {
    expect(isModuleVisible(null, 'players')).toBe(false)
  })

  it('returns true when moduleKey is undefined (always-visible home case)', () => {
    expect(isModuleVisible({}, undefined)).toBe(true)
  })

  it('returns true when moduleKey is null (always-visible kalkulator case)', () => {
    expect(isModuleVisible({}, null)).toBe(true)
  })

  it('returns true when moduleKey is undefined even with no permissions object at all', () => {
    expect(isModuleVisible(undefined, undefined)).toBe(true)
  })
})

describe('canEditModule', () => {
  it('returns true only when access level is "edit"', () => {
    expect(canEditModule({ players: 'edit' }, 'players')).toBe(true)
  })

  it('returns false when access level is "view"', () => {
    expect(canEditModule({ players: 'view' }, 'players')).toBe(false)
  })

  it('returns false when access level is "none"', () => {
    expect(canEditModule({ players: 'none' }, 'players')).toBe(false)
  })

  it('returns false when the module key is missing from permissions', () => {
    expect(canEditModule({}, 'players')).toBe(false)
  })

  it('returns false when permissions is undefined', () => {
    expect(canEditModule(undefined, 'players')).toBe(false)
  })

  it('returns false when permissions is null', () => {
    expect(canEditModule(null, 'players')).toBe(false)
  })

  it('returns true when moduleKey is undefined (always-editable home/kalkulator case)', () => {
    expect(canEditModule({}, undefined)).toBe(true)
  })

  it('returns true when moduleKey is null', () => {
    expect(canEditModule({}, null)).toBe(true)
  })
})

describe('DASHBOARD_MODULE_TO_PERMISSION_KEY', () => {
  it('maps every dashboard sidebar id to its exact permission key', () => {
    expect(DASHBOARD_MODULE_TO_PERMISSION_KEY).toEqual({
      teams: 'players',
      macrocycle: 'macrocycle',
      calendar: 'calendar',
      exercises: 'exercises',
      templates: 'templates',
      matches: 'matches',
      measurement: 'measurement',
      leaderboard: 'stats',
      progress: 'stats',
      rehab: 'rehab',
    })
  })

  it('does NOT contain "home" (always visible, not permission-gated)', () => {
    expect(DASHBOARD_MODULE_TO_PERMISSION_KEY).not.toHaveProperty('home')
  })

  it('does NOT contain "trainingload" (1RM Kalkulátor, always visible)', () => {
    expect(DASHBOARD_MODULE_TO_PERMISSION_KEY).not.toHaveProperty('trainingload')
  })

  it('maps both leaderboard and progress dashboard ids to the same "stats" permission key', () => {
    expect(DASHBOARD_MODULE_TO_PERMISSION_KEY.leaderboard).toBe('stats')
    expect(DASHBOARD_MODULE_TO_PERMISSION_KEY.progress).toBe('stats')
  })
})

describe('MODULES', () => {
  it('has exactly 9 entries', () => {
    expect(MODULES).toHaveLength(9)
  })

  it('has exactly the expected keys, in order', () => {
    expect(MODULES.map((m) => m.key)).toEqual([
      'players',
      'macrocycle',
      'calendar',
      'exercises',
      'templates',
      'matches',
      'measurement',
      'stats',
      'rehab',
    ])
  })
})

describe('ROLES', () => {
  it('has exactly coach, fitness_coach, physiotherapist', () => {
    expect(ROLES.map((r) => r.key)).toEqual(['coach', 'fitness_coach', 'physiotherapist'])
  })

  it('has exactly 3 entries', () => {
    expect(ROLES).toHaveLength(3)
  })
})

describe('ACCESS_LEVELS', () => {
  it('has exactly none, view, edit, in order', () => {
    expect(ACCESS_LEVELS.map((a) => a.key)).toEqual(['none', 'view', 'edit'])
  })

  it('has exactly 3 entries', () => {
    expect(ACCESS_LEVELS).toHaveLength(3)
  })
})
