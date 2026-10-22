import { describe, it, expect } from 'vitest'
import { buildMacrocycleMatchInsert, toMatchRow } from './matches'

describe('buildMacrocycleMatchInsert', () => {
  it('a makrociklus-szinkron sora a `type` oszlopba írja a típust', () => {
    const row = buildMacrocycleMatchInsert({
      teamId: 't1',
      seasonId: 's1',
      date: '2026-10-03',
      homeAway: 'away',
      weekIndex: 4,
      dayIndex: 5,
    })

    expect(row).toEqual({
      team_id: 't1',
      season_id: 's1',
      date: '2026-10-03',
      home_away: 'away',
      created_from_macrocycle: true,
      macrocycle_week_index: 4,
      macrocycle_day_index: 5,
      opponent: null,
      time: '18:00',
      type: 'league',
    })
    expect(row).not.toHaveProperty('match_type')
  })
})

describe('toMatchRow', () => {
  it('az űrlap típusát `type`-ként menti, az üres eredményt null-ra cseréli', () => {
    const row = toMatchRow({
      date: '2026-10-03',
      opponent: 'Veszprém',
      type: 'cup',
      home_away: 'home',
      our_score: '',
      opponent_score: '28',
    })

    expect(row).toMatchObject({ type: 'cup', our_score: null, opponent_score: 28 })
    expect(row).not.toHaveProperty('match_type')
  })
})
