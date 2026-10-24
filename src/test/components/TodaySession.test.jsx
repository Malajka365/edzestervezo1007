import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamTestProvider from '@/test/TeamTestProvider'

// Táblánként válaszoló Supabase-mock; az insert/update hívásokat rögzítjük.
const db = vi.hoisted(() => ({ tables: {}, errors: {}, inserts: [], updates: [], failUpdate: false, nextId: 1 }))
vi.mock('@/lib/supabase', () => {
  function query(table) {
    const filters = []
    const q = {
      select: () => q,
      order: () => q,
      limit: () => q,
      eq: (col, val) => (filters.push((r) => r[col] === val), q),
      gte: (col, val) => (filters.push((r) => r[col] >= val), q),
      is: (col, val) => (filters.push((r) => (r[col] ?? null) === val), q),
      in: (col, vals) => (filters.push((r) => vals.includes(r[col])), q),
      maybeSingle: () => ({ then: (res) => res({ data: (db.tables[table] || []).filter((r) => filters.every((f) => f(r)))[0] ?? null, error: null }) }),
      single: () => q.maybeSingle(),
      insert: (payload) => {
        db.inserts.push({ table, payload })
        for (const r of payload) (db.tables[table] ||= []).push({ id: `new${db.nextId++}`, ...r })
        return { then: (res) => res({ data: null, error: null }) }
      },
      update: (patch) => {
        const u = { table, patch, id: null }
        db.updates.push(u)
        const error = db.failUpdate ? { message: 'network' } : null
        return { eq: (_c, id) => ((u.id = id), { then: (res) => res({ data: null, error }) }) }
      },
      then: (res) =>
        res(db.errors[table] ? { data: null, error: db.errors[table] } : { data: (db.tables[table] || []).filter((r) => filters.every((f) => f(r))), error: null }),
    }
    return q
  }
  return { supabase: { from: query } }
})

const PLAYERS = [
  { id: 'p1', name: 'Kiss Péter', jersey_number: 7 },
  { id: 'p2', name: 'Nagy Ádám', jersey_number: 3 },
]
vi.mock('@/hooks/usePlayers', () => ({ usePlayers: () => ({ data: PLAYERS, isLoading: false }) }))

const { default: TodaySession } = await import('@/pages/TodaySession')

const TEAM = { id: 't1', name: 'Felnőtt' }
const GYM = {
  id: 's1', team_id: 't1', date: '2026-10-24', start_time: '17:30:00', end_time: '19:00:00', location: 'Sportcsarnok B',
  type: 'gym', notes: '', template_id: null,
  session_data: { exercises: [
    { id: 'e1', name: 'Guggolás', sets: 5, reps: 5, load: '80%' },
    { id: 'e2', name: 'Nordic hamstring', sets: 3, reps: 6 },
  ] },
}

function renderPage({ path = '/dashboard/mai-edzes', perms = { calendar: 'edit', attendance: 'edit', players: 'view' } } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TeamTestProvider value={{ teams: [TEAM], selectedTeam: TEAM, currentUserPermissions: perms }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/dashboard/mai-edzes" element={<TodaySession />} />
          </Routes>
        </MemoryRouter>
      </TeamTestProvider>
    </QueryClientProvider>
  )
}

const statusGroup = (name) => screen.getByRole('group', { name: `${name} jelenléte` })

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-24T10:00:00'))
  db.inserts = []
  db.updates = []
  db.failUpdate = false
  db.errors = {}
  db.tables = {
    training_sessions: [GYM],
    player_attendance: [],
    player_availability: [{ id: 'a1', team_id: 't1', player_id: 'p2', status: 'injured', started_on: '2026-10-20', created_at: '2026-10-20T08:00:00Z' }],
    training_templates: [],
  }
})
afterEach(() => vi.useRealTimers())

describe('Mai edzés oldal', () => {
  it('megmutatja a mai konditermi tervet és a jelenlét alapértékeit, majd egy mentéssel rögzít', async () => {
    renderPage()
    expect(await screen.findByText('Guggolás')).toBeInTheDocument()
    expect(screen.getByText('Nordic hamstring')).toBeInTheDocument()
    expect(screen.getByText('5 × 5')).toBeInTheDocument()
    expect(screen.getByText(/Sportcsarnok B/)).toBeInTheDocument()

    expect(within(statusGroup('Kiss Péter')).getByRole('button', { name: 'Jelen' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(statusGroup('Nagy Ádám')).getByRole('button', { name: 'Sérült' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(statusGroup('Kiss Péter')).getByRole('button', { name: 'Hiányzik' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jelenlét mentése' }))

    await waitFor(() => expect(db.inserts).toHaveLength(1))
    const { table, payload } = db.inserts[0]
    expect(table).toBe('player_attendance')
    expect(payload).toHaveLength(2)
    expect(payload.find((r) => r.player_id === 'p1')).toMatchObject({ player_id: 'p1', status: 'hiányzik', training_session_id: 's1', training_type: 'edzés', date: '2026-10-24', event_time: '17:30:00', team_id: 't1' })
    expect(payload.find((r) => r.player_id === 'p2')).toMatchObject({ status: 'sérült' })
    expect(payload.map((r) => r.player_id)).toEqual(['p2', 'p1']) // mezszám szerint
  })

  it('ha ma nincs edzés, a következőt mutatja, a névsor csak olvasható', async () => {
    db.tables.training_sessions = [{ ...GYM, id: 's2', date: '2026-10-25' }]
    renderPage()
    expect(await screen.findByText(/Ma nincs edzés/)).toBeInTheDocument()
    expect(screen.getByText('Az edzés napján rögzíthető.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Jelenlét mentése' })).not.toBeInTheDocument()
  })

  it('a ?session= paraméter a megadott edzést nyitja meg', async () => {
    db.tables.training_sessions = [GYM, { ...GYM, id: 's9', date: '2026-10-22', start_time: '09:00:00', location: 'Műfüves pálya', session_data: {} }]
    renderPage({ path: '/dashboard/mai-edzes?session=s9' })
    expect(await screen.findByText(/Műfüves pálya/)).toBeInTheDocument()
    expect(screen.getByText('Ehhez az edzéshez nincs terv.')).toBeInTheDocument()
  })

  it('?session= mellett is látszanak a mai edzések fülei, és fülváltás után is megmaradnak', async () => {
    const BALL = { ...GYM, id: 's3', start_time: '09:00:00', location: 'Kézilabda-csarnok', type: 'ball', session_data: {} }
    db.tables.training_sessions = [GYM, BALL]
    renderPage({ path: '/dashboard/mai-edzes?session=s1' })
    expect(await screen.findByText(/Sportcsarnok B/)).toBeInTheDocument()
    const tab = await screen.findByRole('tab', { name: /09:00/ })
    fireEvent.click(tab)
    expect(await screen.findByText(/Kézilabda-csarnok/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /17:30/ })).toBeInTheDocument()
  })

  it('más csapat edzését a ?session= nem nyitja meg', async () => {
    db.tables.training_sessions = [GYM, { ...GYM, id: 'x1', team_id: 't2', location: 'Idegen csarnok' }]
    renderPage({ path: '/dashboard/mai-edzes?session=x1' })
    expect(await screen.findByText(/Sportcsarnok B/)).toBeInTheDocument()
    expect(screen.queryByText(/Idegen csarnok/)).not.toBeInTheDocument()
  })

  it('részleges hiba után az újramentés nem szúrja be újra a már mentett sorokat', async () => {
    db.tables.player_attendance = [
      { id: 'r2', team_id: 't1', player_id: 'p2', date: '2026-10-24', status: 'sérült', notes: null, training_session_id: 's1' },
    ]
    db.failUpdate = true
    renderPage()
    await screen.findByText('Guggolás')
    fireEvent.click(within(statusGroup('Nagy Ádám')).getByRole('button', { name: 'Jelen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jelenlét mentése' }))
    await waitFor(() => expect(db.updates).toHaveLength(1))
    expect(db.inserts).toHaveLength(1)

    db.failUpdate = false
    await waitFor(() => expect(within(statusGroup('Nagy Ádám')).getByRole('button', { name: 'Sérült' })).toHaveAttribute('aria-pressed', 'true'))
    fireEvent.click(within(statusGroup('Nagy Ádám')).getByRole('button', { name: 'Jelen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jelenlét mentése' }))
    await waitFor(() => expect(db.updates).toHaveLength(2))
    expect(db.inserts).toHaveLength(1)
  })

  it('ha az elérhetőség nem töltődik be, figyelmeztet', async () => {
    db.errors.player_availability = { message: 'permission denied' }
    renderPage()
    expect(await screen.findByText('Guggolás')).toBeInTheDocument()
    expect(await screen.findByText(/elérhetőség nem tölthető be/i)).toBeInTheDocument()
  })

  it('jelenlét-szerkesztési jog nélkül nincs mentés', async () => {
    renderPage({ perms: { calendar: 'view', attendance: 'view' } })
    expect(await screen.findByText('Guggolás')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Jelenlét mentése' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Kiss Péter jelenléte' })).not.toBeInTheDocument()
  })
})
