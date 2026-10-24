import { describe, it, expect } from 'vitest'
import { weeklyAverage, weekStart } from './trend'

describe('weekStart', () => {
  it('returns the Monday of the week', () => {
    expect(weekStart('2026-10-24')).toBe('2026-10-19')
    expect(weekStart('2026-10-19')).toBe('2026-10-19')
  })
})

describe('weeklyAverage', () => {
  const rows = [
    { value: 100, measured_at: '2026-10-05' },
    { value: 110, measured_at: '2026-10-07' },
    { value: 120, measured_at: '2026-10-20' },
    { value: 90, measured_at: '2026-01-05' },
  ]

  it('averages per week, omits weeks without measurements and the out-of-window ones', () => {
    expect(weeklyAverage(rows, { weeks: 8, today: '2026-10-24' })).toEqual([
      { weekStart: '2026-10-05', value: 105 },
      { weekStart: '2026-10-19', value: 120 },
    ])
  })

  it('keeps older weeks when the window is longer', () => {
    expect(weeklyAverage(rows, { weeks: 52, today: '2026-10-24' })[0]).toEqual({ weekStart: '2026-01-05', value: 90 })
  })
})
