import { describe, it, expect } from 'vitest'
import { pickSession, resolveRoster, buildAttendanceWrites, canRecordAttendance } from './sessionAttendance'
import { currentAvailability } from './availability'

const S = (id, date, start_time = null) => ({ id, date, start_time, team_id: 't1' })
const PLAYERS = [
  { id: 'p1', name: 'Kiss Péter', jersey_number: 7 },
  { id: 'p2', name: 'Nagy Ádám', jersey_number: 3 },
]

describe('pickSession', () => {
  it('keeps today’s sessions even after they finished, earliest first', () => {
    const sessions = [S('late', '2026-10-24', '17:30:00'), S('early', '2026-10-24', '09:00:00'), S('tomorrow', '2026-10-25', '17:30:00')]
    const pick = pickSession(sessions, '2026-10-24')
    expect(pick.mode).toBe('today')
    expect(pick.session.id).toBe('early')
    expect(pick.todays.map((s) => s.id)).toEqual(['early', 'late'])
  })

  it('puts sessions without a start time last within the day', () => {
    const pick = pickSession([S('x', '2026-10-24'), S('y', '2026-10-24', '18:00:00')], '2026-10-24')
    expect(pick.todays.map((s) => s.id)).toEqual(['y', 'x'])
  })

  it('falls back to the next future session', () => {
    const sessions = [S('past', '2026-10-20'), S('b', '2026-10-27', '10:00:00'), S('a', '2026-10-26', '18:00:00')]
    const pick = pickSession(sessions, '2026-10-24')
    expect(pick).toMatchObject({ mode: 'next', todays: [] })
    expect(pick.session.id).toBe('a')
  })

  it('returns none when nothing is today or later', () => {
    expect(pickSession([S('past', '2026-10-20')], '2026-10-24')).toEqual({ mode: 'none', session: null, todays: [] })
  })
})

describe('resolveRoster', () => {
  const session = S('s1', '2026-10-24', '17:30:00')

  it('defaults everyone to jelen, injured players to sérült, and is not recorded', () => {
    const availability = currentAvailability(
      [{ id: 'a', player_id: 'p2', status: 'injured', started_on: '2026-10-20', created_at: 'x' }],
      '2026-10-24'
    )
    const { rows, recorded } = resolveRoster({ session, players: PLAYERS, linkedRows: [], dayRows: [], sessionsThatDay: [session], availabilityByPlayer: availability })
    expect(recorded).toBe(false)
    expect(rows.map((r) => [r.player.id, r.status, r.rowId, r.adopt])).toEqual([
      ['p1', 'jelen', null, false],
      ['p2', 'sérült', null, false],
    ])
  })

  it('limited players still default to jelen', () => {
    const availability = currentAvailability([{ id: 'a', player_id: 'p1', status: 'limited', started_on: '2026-10-20' }], '2026-10-24')
    const { rows } = resolveRoster({ session, players: PLAYERS, linkedRows: [], dayRows: [], sessionsThatDay: [session], availabilityByPlayer: availability })
    expect(rows[0].status).toBe('jelen')
  })

  it('uses rows already linked to the session', () => {
    const linked = [{ id: 'r1', player_id: 'p1', status: 'hiányzik', notes: 'beteg gyerek', training_session_id: 's1' }]
    const { rows, recorded } = resolveRoster({ session, players: PLAYERS, linkedRows: linked, dayRows: [], sessionsThatDay: [session], availabilityByPlayer: new Map() })
    expect(recorded).toBe(true)
    expect(rows[0]).toMatchObject({ status: 'hiányzik', notes: 'beteg gyerek', rowId: 'r1', adopt: false })
  })

  it('adopts unlinked rows of the day when it is the only session that day', () => {
    const day = [{ id: 'old', player_id: 'p2', status: 'beteg', notes: null, event_time: null, training_session_id: null }]
    const { rows, recorded } = resolveRoster({ session, players: PLAYERS, linkedRows: [], dayRows: day, sessionsThatDay: [session], availabilityByPlayer: new Map() })
    expect(recorded).toBe(true)
    expect(rows[1]).toMatchObject({ status: 'beteg', rowId: 'old', adopt: true })
  })

  it('with two sessions that day adopts only rows whose time matches the session start', () => {
    const other = S('s2', '2026-10-24', '09:00:00')
    const day = [
      { id: 'match', player_id: 'p1', status: 'hiányzik', event_time: '17:30:00', training_session_id: null },
      { id: 'nomatch', player_id: 'p2', status: 'beteg', event_time: '09:00', training_session_id: null },
    ]
    const { rows } = resolveRoster({ session, players: PLAYERS, linkedRows: [], dayRows: day, sessionsThatDay: [other, session], availabilityByPlayer: new Map() })
    expect(rows[0]).toMatchObject({ rowId: 'match', adopt: true, status: 'hiányzik' })
    expect(rows[1]).toMatchObject({ rowId: null, adopt: false, status: 'jelen' })
  })
})

describe('buildAttendanceWrites', () => {
  it('inserts new rows linked to the session and updates adopted ones', () => {
    const session = S('s1', '2026-10-24', '17:30:00')
    const rows = [
      { player: PLAYERS[0], status: 'jelen', notes: '', rowId: null, adopt: false },
      { player: PLAYERS[1], status: 'beteg', notes: 'láz', rowId: 'old', adopt: true },
    ]
    const { inserts, updates } = buildAttendanceWrites(session, rows, 't1')
    expect(inserts).toEqual([
      {
        team_id: 't1',
        player_id: 'p1',
        date: '2026-10-24',
        event_time: '17:30:00',
        training_type: 'edzés',
        training_session_id: 's1',
        status: 'jelen',
        notes: null,
      },
    ])
    expect(updates).toEqual([{ id: 'old', patch: { status: 'beteg', notes: 'láz', training_session_id: 's1' } }])
  })
})

describe('canRecordAttendance', () => {
  it('allows today and past, not future sessions', () => {
    expect(canRecordAttendance(S('a', '2026-10-24'), '2026-10-24')).toBe(true)
    expect(canRecordAttendance(S('a', '2026-10-20'), '2026-10-24')).toBe(true)
    expect(canRecordAttendance(S('a', '2026-10-25'), '2026-10-24')).toBe(false)
  })
})
