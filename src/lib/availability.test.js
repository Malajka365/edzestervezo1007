import { describe, it, expect } from 'vitest'
import { AVAILABILITY, currentAvailability, availabilityOf } from './availability'

const entry = (over) => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  player_id: 'p1',
  status: 'injured',
  started_on: '2026-10-01',
  expected_return: null,
  note: null,
  created_at: '2026-10-01T08:00:00Z',
  ...over,
})

describe('AVAILABILITY', () => {
  it('maps the three statuses to Hungarian labels and pill tones', () => {
    expect(AVAILABILITY.available).toEqual({ label: 'Bevethető', tone: 'ok' })
    expect(AVAILABILITY.limited).toEqual({ label: 'Korlátozott', tone: 'warn' })
    expect(AVAILABILITY.injured).toEqual({ label: 'Sérült', tone: 'bad' })
  })
})

describe('currentAvailability', () => {
  it('treats a player without entries as available', () => {
    const map = currentAvailability([], '2026-10-24')
    expect(availabilityOf(map, 'p1').status).toBe('available')
  })

  it('uses the latest entry that started on or before the given day', () => {
    const entries = [
      entry({ id: 'a', status: 'injured', started_on: '2026-10-01' }),
      entry({ id: 'b', status: 'limited', started_on: '2026-10-10' }),
    ]
    expect(availabilityOf(currentAvailability(entries, '2026-10-05'), 'p1').status).toBe('injured')
    expect(availabilityOf(currentAvailability(entries, '2026-10-20'), 'p1')).toMatchObject({
      status: 'limited',
      entryId: 'b',
      started_on: '2026-10-10',
    })
  })

  it('breaks ties on the same start day by the later created_at', () => {
    const entries = [
      entry({ id: 'late', status: 'available', started_on: '2026-10-10', created_at: '2026-10-10T12:00:00Z' }),
      entry({ id: 'early', status: 'injured', started_on: '2026-10-10', created_at: '2026-10-10T08:00:00Z' }),
    ]
    expect(availabilityOf(currentAvailability(entries, '2026-10-24'), 'p1').entryId).toBe('late')
  })

  it('ignores entries that start after the given day', () => {
    const entries = [entry({ status: 'injured', started_on: '2026-11-01' })]
    expect(availabilityOf(currentAvailability(entries, '2026-10-24'), 'p1').status).toBe('available')
  })

  it('keeps players apart', () => {
    const entries = [
      entry({ player_id: 'p1', status: 'injured' }),
      entry({ player_id: 'p2', status: 'limited', expected_return: '2026-10-30', note: 'térd' }),
    ]
    const map = currentAvailability(entries, '2026-10-24')
    expect(availabilityOf(map, 'p1').status).toBe('injured')
    expect(availabilityOf(map, 'p2')).toMatchObject({ status: 'limited', expected_return: '2026-10-30', note: 'térd' })
    expect(availabilityOf(map, 'p3').status).toBe('available')
  })
})
