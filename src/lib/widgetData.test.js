import { describe, it, expect } from 'vitest'
import { relativeStrength } from './strength'
import {
  filterAgendaByType,
  markPersonalBests,
  rankPlayers,
  quickActionsFor,
  attendanceSummary,
  periodStart,
} from './widgetData'

describe('relativeStrength', () => {
  it('divides 1RM by body weight, two decimals', () => {
    expect(relativeStrength(120, 80)).toBe(1.5)
    expect(relativeStrength(100, 75)).toBe(1.33)
    expect(relativeStrength(100, 0)).toBeNull()
  })
})

describe('filterAgendaByType', () => {
  const items = [{ kind: 'session' }, { kind: 'match' }, { kind: 'session' }]
  it('keeps everything, only matches or only trainings', () => {
    expect(filterAgendaByType(items, 'all')).toHaveLength(3)
    expect(filterAgendaByType(items, 'match')).toEqual([{ kind: 'match' }])
    expect(filterAgendaByType(items, 'train')).toHaveLength(2)
  })
})

const m = (id, player, ex, value, at, unit = 'kg', reps = 1) => ({
  id, value, reps, measured_at: at,
  player: { id: player, name: player.toUpperCase() },
  exercise: { id: ex, name: ex, unit },
})

describe('markPersonalBests', () => {
  it('returns the newest n rows and marks a value equal to the player’s best', () => {
    const rows = [
      m('a', 'p1', 'squat', 120, '2026-10-20'),
      m('b', 'p1', 'squat', 115, '2026-10-10'),
      m('c', 'p2', 'sprint', 4.3, '2026-10-19', 's'),
      m('d', 'p2', 'sprint', 4.1, '2026-10-01', 's'),
    ]
    const out = markPersonalBests(rows, 3)
    expect(out.map((r) => [r.id, r.isBest])).toEqual([
      ['a', true],
      ['c', false], // időnél a kisebb a jobb
      ['b', false],
    ])
  })
})

describe('rankPlayers', () => {
  const measurements = [
    m('1', 'p1', 'Guggolás', 100, '2026-10-20'),
    m('2', 'p1', 'Testsúly', 80, '2026-10-20'),
    m('3', 'p2', 'Guggolás', 120, '2026-10-20'),
    m('4', 'p2', 'Testsúly', 100, '2026-10-20'),
  ]
  it('ranks by best 1RM', () => {
    expect(rankPlayers({ measurements, metric: 'orm', n: '3' }).map((r) => [r.playerId, r.value])).toEqual([
      ['p2', 120],
      ['p1', 100],
    ])
  })
  it('ranks by relative strength using the latest body weight', () => {
    expect(rankPlayers({ measurements, metric: 'rel', n: '3' }).map((r) => [r.playerId, r.value])).toEqual([
      ['p1', 1.25],
      ['p2', 1.2],
    ])
  })
  it('ranks by attendance and respects n', () => {
    const attendance = [
      { player_id: 'p1', status: 'jelen', players: { name: 'P1' } },
      { player_id: 'p1', status: 'hiányzik', players: { name: 'P1' } },
      { player_id: 'p2', status: 'jelen', players: { name: 'P2' } },
    ]
    const out = rankPlayers({ measurements: [], attendance, metric: 'att', n: '5' })
    expect(out.map((r) => [r.playerId, r.value])).toEqual([
      ['p2', 100],
      ['p1', 50],
    ])
    expect(rankPlayers({ measurements: [], attendance, metric: 'att', n: '3' }).length).toBe(2)
  })
})

describe('quickActionsFor', () => {
  it('fitness set offers measurement actions only with measurement edit', () => {
    expect(quickActionsFor('fit', { measurement: 'edit' }).map((a) => a.label)).toContain('Új mérés')
    expect(quickActionsFor('fit', { measurement: 'view' }).map((a) => a.label)).not.toContain('Új mérés')
  })
  it('coach set covers training, match and attendance', () => {
    expect(quickActionsFor('coach', { calendar: 'edit', matches: 'edit', attendance: 'edit' }).map((a) => a.label)).toEqual([
      'Új edzés', 'Új mérkőzés', 'Mai jelenlét',
    ])
  })
})

describe('attendanceSummary', () => {
  it('computes the present rate and the most absent players', () => {
    const rows = [
      { player_id: 'p1', status: 'jelen', players: { name: 'A' } },
      { player_id: 'p1', status: 'hiányzik', players: { name: 'A' } },
      { player_id: 'p2', status: 'jelen', players: { name: 'B' } },
      { player_id: 'p2', status: 'jelen', players: { name: 'B' } },
    ]
    expect(attendanceSummary(rows)).toEqual({ rate: 75, total: 4, mostAbsent: [{ playerId: 'p1', name: 'A', absent: 1 }] })
    expect(attendanceSummary([])).toEqual({ rate: null, total: 0, mostAbsent: [] })
  })
})

describe('periodStart', () => {
  it('week starts on Monday, month on the 1st, season on 1 August', () => {
    expect(periodStart('week', '2026-10-24')).toBe('2026-10-19')
    expect(periodStart('month', '2026-10-24')).toBe('2026-10-01')
    expect(periodStart('season', '2026-10-24')).toBe('2026-08-01')
    expect(periodStart('season', '2026-03-10')).toBe('2025-08-01')
  })
})
