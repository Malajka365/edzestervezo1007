import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamTestProvider from '@/test/TeamTestProvider'

const db = vi.hoisted(() => ({ tables: {}, errors: {} }))
vi.mock('@/lib/supabase', () => {
  function query(table) {
    const filters = []
    const q = {}
    for (const m of ['select', 'order', 'limit', 'lte', 'lt', 'in', 'is']) q[m] = () => q
    q.eq = (c, v) => (filters.push((r) => r[c] === undefined || r[c] === v), q)
    q.gte = (c, v) => (filters.push((r) => r[c] === undefined || r[c] >= v), q)
    q.then = (res) =>
      res(db.errors[table] ? { data: null, error: db.errors[table] } : { data: (db.tables[table] || []).filter((r) => filters.every((f) => f(r))), error: null })
    return q
  }
  return { supabase: { from: query, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } } }
})
const PLAYERS = [
  { id: 'p1', name: 'Kiss Péter', jersey_number: 7 },
  { id: 'p2', name: 'Nagy Ádám', jersey_number: 3 },
  { id: 'p3', name: 'Tóth Bence', jersey_number: 9 },
]
vi.mock('@/hooks/usePlayers', () => ({ usePlayers: () => ({ data: PLAYERS, isLoading: false }) }))

const { WIDGET_COMPONENTS } = await import('@/lib/dashboardWidgets')

const TEAM = { id: 't1', name: 'Felnőtt' }
const ALL = { players: 'view', rehab: 'view', calendar: 'view', attendance: 'view', measurement: 'view', macrocycle: 'view', exercises: 'view' }
function wrap(ui, perms = ALL) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TeamTestProvider value={{ teams: [TEAM], selectedTeam: TEAM, currentUserPermissions: perms }}>
        <MemoryRouter>{ui}</MemoryRouter>
      </TeamTestProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  vi.setSystemTime(new Date('2026-10-24T10:00:00'))
  db.errors = {}
  db.tables = {
    player_availability: [
      { id: 'a1', team_id: 't1', player_id: 'p2', status: 'injured', started_on: '2026-10-20', created_at: 'x' },
      { id: 'a2', team_id: 't1', player_id: 'p3', status: 'limited', started_on: '2026-10-20', created_at: 'x' },
    ],
    training_sessions: [{ id: 's2', team_id: 't1', date: '2026-10-25', start_time: '17:30:00', type: 'gym', location: 'Csarnok', session_data: {} }],
    measurements: [],
    player_attendance: [],
    training_seasons: [],
  }
})
afterEach(() => vi.useRealTimers())

describe('Jegyzet widget mentése', () => {
  it('az oldal elhagyásakor a még nem mentett szöveget elmenti', () => {
    const onSettingsChange = vi.fn()
    const Note = WIDGET_COMPONENTS.note
    const { unmount } = wrap(<Note settings={{}} onSettingsChange={onSettingsChange} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Jegyzet' }), { target: { value: 'holnap videó' } })
    unmount()
    expect(onSettingsChange).toHaveBeenCalledWith({ text: 'holnap videó' })
  })
})

describe('Új Kezdőlap-widgetek', () => {
  it('minden új típusnak van komponense', () => {
    for (const t of ['today_session', 'availability', 'todos', 'measurement_trend', 'measurement_coverage', 'weekly_load', 'favorite_exercises', 'note']) {
      expect(WIDGET_COMPONENTS[t], t).toBeTruthy()
    }
  })

  it('Ki bevethető: alapból csak a korlátozott és sérült játékosokat listázza', async () => {
    const Widget = WIDGET_COMPONENTS.availability
    wrap(<Widget settings={{ show: 'issues' }} size={{ w: 1, h: 2 }} />)
    expect(await screen.findByText('Nagy Ádám')).toBeInTheDocument()
    expect(screen.getByText('Tóth Bence')).toBeInTheDocument()
    expect(screen.queryByText('Kiss Péter')).not.toBeInTheDocument()
    expect(screen.getByText('1', { selector: '[data-count="available"]' })).toBeInTheDocument()
  })

  it('Ki bevethető: betöltési hibánál nem állítja, hogy mindenki bevethető', async () => {
    db.errors.player_availability = { message: 'permission denied' }
    const Widget = WIDGET_COMPONENTS.availability
    wrap(<Widget settings={{ show: 'issues' }} size={{ w: 1, h: 2 }} />)
    expect(await screen.findByText(/elérhetőség nem tölthető be/i)).toBeInTheDocument()
    expect(screen.queryByText('Mindenki bevethető.')).not.toBeInTheDocument()
  })

  it('Mai edzés widget: ha ma nincs, a következőt mutatja', async () => {
    const Widget = WIDGET_COMPONENTS.today_session
    wrap(<Widget settings={{ detail: 'blocks' }} size={{ w: 2, h: 2 }} />)
    expect(await screen.findByText(/Ma nincs edzés/)).toBeInTheDocument()
    expect(screen.getByText('17:30')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Részletek' })).toHaveAttribute('href', '/dashboard/mai-edzes?session=s2')
  })

  it('Jegyzet: a beírt szöveg késleltetve a beállításokba mentődik', async () => {
    const Widget = WIDGET_COMPONENTS.note
    const onSettingsChange = vi.fn()
    wrap(<Widget settings={{ text: '' }} size={{ w: 1, h: 1 }} onSettingsChange={onSettingsChange} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Jegyzet' }), { target: { value: 'Videó pénteken' } })
    expect(onSettingsChange).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(800)
    })
    expect(onSettingsChange).toHaveBeenCalledWith({ text: 'Videó pénteken' })
  })
})
