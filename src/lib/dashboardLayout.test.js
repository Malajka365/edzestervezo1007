import { describe, it, expect } from 'vitest'
import { WIDGET_CATALOG } from './widgetCatalog'
import { DEFAULT_LAYOUTS, defaultLayout, normalizeLayout, visibleItems, toStored, addItem } from './dashboardLayout'

const ALL = {
  players: 'edit', macrocycle: 'edit', calendar: 'edit', exercises: 'edit', templates: 'edit',
  matches: 'edit', measurement: 'edit', stats: 'view', rehab: 'edit', attendance: 'edit',
}

describe('widget catalog', () => {
  it('describes every type with category, sizes and module', () => {
    for (const [type, w] of Object.entries(WIDGET_CATALOG)) {
      expect(w.type).toBe(type)
      expect(['Áttekintés', 'Csapat és egészség', 'Teljesítmény', 'Eszközök']).toContain(w.category)
      expect(w.defaultSize[0]).toBeGreaterThanOrEqual(w.minSize[0])
      expect(w.defaultSize[1]).toBeGreaterThanOrEqual(w.minSize[1])
    }
    expect(WIDGET_CATALOG.weekly_attendance.module_key).toBe('attendance')
    expect(WIDGET_CATALOG.team_wellness.comingSoon).toBe(true)
    expect(WIDGET_CATALOG.note.allowMultiple).toBe(true)
  })
})

describe('defaultLayout', () => {
  it('builds the coach default from the spec with sizes and settings', () => {
    const items = defaultLayout('coach', ALL)
    expect(items.map((i) => [i.type, i.w, i.h])).toEqual([
      ['today_session', 2, 2], ['availability', 1, 2], ['next_match', 1, 1], ['todos', 1, 1],
      ['upcoming_week', 2, 1], ['weekly_attendance', 1, 1], ['season_progress', 1, 1], ['quick_actions', 2, 1],
    ])
    expect(items.find((i) => i.type === 'quick_actions').settings).toMatchObject({ set: 'coach' })
  })

  it('drops widgets the user may not see', () => {
    const items = defaultLayout('fitness_coach', { ...ALL, measurement: 'none' })
    expect(items.map((i) => i.type)).not.toContain('recent_measurements')
    expect(items.map((i) => i.type)).not.toContain('measurement_coverage')
    expect(items.map((i) => i.type)).toContain('leaderboard_top3')
  })

  it('falls back to the coach layout for an unknown role', () => {
    expect(defaultLayout(null, ALL).map((i) => i.type)).toEqual(DEFAULT_LAYOUTS.coach.map(([t]) => t))
  })
})

describe('normalizeLayout', () => {
  it('converts the old {key, visible} shape, dropping hidden and unknown widgets', () => {
    const items = normalizeLayout(
      [{ key: 'upcoming_week', visible: true }, { key: 'next_match', visible: false }, { key: 'nope', visible: true }],
      'coach',
      ALL
    )
    expect(items).toEqual([
      { id: 'upcoming_week', type: 'upcoming_week', w: 2, h: 2, settings: WIDGET_CATALOG.upcoming_week.defaultSettings },
    ])
  })

  it('uses the role default when nothing is saved', () => {
    expect(normalizeLayout(null, 'physiotherapist', ALL).map((i) => i.type)).toEqual([
      'availability', 'rehab_status', 'todos', 'weekly_attendance', 'quick_actions',
    ])
  })

  it('keeps a deliberately emptied home page empty', () => {
    expect(normalizeLayout([], 'coach', ALL)).toEqual([])
  })

  it('keeps new-shape items and clamps their sizes', () => {
    const items = normalizeLayout([{ id: 'n1', type: 'note', w: 9, h: 0, settings: { text: 'hi' } }], 'coach', ALL)
    expect(items).toEqual([{ id: 'n1', type: 'note', w: 4, h: 1, settings: { text: 'hi' } }])
  })

  it('fills missing settings with the defaults', () => {
    const [item] = normalizeLayout([{ id: 'u', type: 'upcoming_week', w: 2, h: 1, settings: { days: '14' } }], 'coach', ALL)
    expect(item.settings).toEqual({ ...WIDGET_CATALOG.upcoming_week.defaultSettings, days: '14' })
  })
})

describe('visibleItems and toStored', () => {
  it('hides a widget whose permission was revoked but keeps it when storing', () => {
    const items = normalizeLayout(
      [{ id: 'r', type: 'rehab_status', w: 2, h: 1, settings: {} }, { id: 'n', type: 'note', w: 1, h: 1, settings: {} }],
      'coach',
      ALL
    )
    expect(visibleItems(items, { ...ALL, rehab: 'none' }).map((i) => i.id)).toEqual(['n'])
    expect(toStored(items).map((i) => i.id)).toEqual(['r', 'n'])
  })

  it('never shows coming-soon widgets', () => {
    expect(visibleItems([{ id: 'x', type: 'team_wellness', w: 1, h: 2, settings: {} }], ALL)).toEqual([])
  })

  it('stores the legacy key and visible fields next to the new ones', () => {
    expect(toStored([{ id: 'a', type: 'todos', w: 1, h: 1, settings: {} }])).toEqual([
      { id: 'a', type: 'todos', w: 1, h: 1, settings: {}, key: 'todos', visible: true },
    ])
  })
})

describe('addItem', () => {
  it('adds multi-instance widgets repeatedly with unique ids', () => {
    const once = addItem([], 'note')
    const twice = addItem(once, 'note')
    expect(twice).toHaveLength(2)
    expect(twice[0].id).not.toBe(twice[1].id)
    expect(twice[1]).toMatchObject({ type: 'note', w: 1, h: 1 })
  })

  it('adds single-instance widgets only once', () => {
    expect(addItem(addItem([], 'todos'), 'todos')).toHaveLength(1)
  })
})
