import { describe, it, expect } from 'vitest'
import { computeTodos } from './todos'
import { currentAvailability } from './availability'

const ALL = { measurement: 'view', attendance: 'view', players: 'view', rehab: 'view', macrocycle: 'view' }
const PLAYERS = [
  { id: 'p1', name: 'Kiss Péter' },
  { id: 'p2', name: 'Nagy Ádám' },
]
const base = {
  today: '2026-10-24',
  perms: ALL,
  players: PLAYERS,
  lastMeasuredByPlayer: new Map([['p1', '2026-10-20'], ['p2', '2026-10-20']]),
  sessionsLast7: [],
  attendanceDates: new Set(),
  availabilityByPlayer: new Map(),
  season: null,
  src: 'all',
}

describe('computeTodos', () => {
  it('flags players without a measurement for the coverage period, only with measurement access', () => {
    const lastMeasuredByPlayer = new Map([['p1', '2026-09-01'], ['p2', '2026-10-20']])
    const todos = computeTodos({ ...base, lastMeasuredByPlayer })
    expect(todos).toHaveLength(1)
    expect(todos[0]).toMatchObject({ tone: 'warn', category: 'perf', to: '/dashboard/meresek' })
    expect(todos[0].text).toContain('1 játékosnak')
    expect(todos[0].text).toContain('6 hete')
    expect(computeTodos({ ...base, lastMeasuredByPlayer, perms: { ...ALL, measurement: 'none' } })).toEqual([])
  })

  it('counts never-measured players as missing', () => {
    const todos = computeTodos({ ...base, lastMeasuredByPlayer: new Map([['p1', '2026-10-20']]) })
    expect(todos[0].detail).toBe('Nagy Ádám')
  })

  it('flags a past session with no attendance on its day, not when legacy rows exist', () => {
    const sessionsLast7 = [{ id: 's1', date: '2026-10-21' }]
    const missing = computeTodos({ ...base, sessionsLast7 })
    expect(missing).toEqual([
      expect.objectContaining({ category: 'plan', to: '/dashboard/mai-edzes?session=s1' }),
    ])
    expect(computeTodos({ ...base, sessionsLast7, attendanceDates: new Set(['2026-10-21']) })).toEqual([])
  })

  it('reports injured players returning within 7 days and overdue returns', () => {
    const availabilityByPlayer = currentAvailability(
      [
        { id: 'a', player_id: 'p1', status: 'injured', started_on: '2026-10-01', expected_return: '2026-10-27' },
        { id: 'b', player_id: 'p2', status: 'injured', started_on: '2026-10-01', expected_return: '2026-10-22' },
      ],
      '2026-10-24'
    )
    const todos = computeTodos({ ...base, availabilityByPlayer })
    expect(todos.map((t) => [t.tone, t.category])).toEqual([
      ['bad', 'health'],
      ['info', 'health'],
    ])
    expect(todos[0].text).toContain('Nagy Ádám')
    expect(todos[0].text).toContain('lejárt')
    expect(todos[1].text).toContain('Kiss Péter')
  })

  it('filters by source and ignores health items without access', () => {
    const availabilityByPlayer = currentAvailability(
      [{ id: 'a', player_id: 'p1', status: 'injured', started_on: '2026-10-01', expected_return: '2026-10-27' }],
      '2026-10-24'
    )
    const lastMeasuredByPlayer = new Map([['p1', '2026-01-01'], ['p2', '2026-10-20']])
    const args = { ...base, availabilityByPlayer, lastMeasuredByPlayer }
    expect(computeTodos({ ...args, src: 'health' }).map((t) => t.category)).toEqual(['health'])
    expect(computeTodos({ ...args, src: 'perf' }).map((t) => t.category)).toEqual(['perf'])
    expect(computeTodos({ ...args, perms: { measurement: 'view' } }).map((t) => t.category)).toEqual(['perf'])
  })

  it('announces a season ending within a week', () => {
    const todos = computeTodos({ ...base, season: { name: '2026/27', start_date: '2026-08-01', end_date: '2026-10-29' } })
    expect(todos).toEqual([expect.objectContaining({ category: 'plan', tone: 'info' })])
    expect(todos[0].text).toContain('5 nap múlva')
  })
})
