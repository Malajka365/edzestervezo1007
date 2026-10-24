import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamTestProvider from '@/test/TeamTestProvider'

const db = vi.hoisted(() => ({ tables: {} }))
vi.mock('@/lib/supabase', () => {
  function query(table) {
    const q = {}
    for (const m of ['select', 'eq', 'gte', 'lte', 'lt', 'order', 'limit', 'in', 'is']) q[m] = () => q
    q.then = (res) => res({ data: db.tables[table] || [], error: null })
    return q
  }
  return { supabase: { from: query } }
})

const { default: UpcomingWeekWidget } = await import('@/pages/dashboard-home/widgets/UpcomingWeekWidget')
const { default: QuickActionsWidget } = await import('@/pages/dashboard-home/widgets/QuickActionsWidget')
const { default: RecentMeasurementsWidget } = await import('@/pages/dashboard-home/widgets/RecentMeasurementsWidget')

const TEAM = { id: 't1', name: 'Felnőtt' }
function wrap(ui, perms = {}) {
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
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-24T10:00:00'))
  db.tables = {
    training_sessions: [{ id: 's1', date: '2026-10-25', start_time: '17:30:00', type: 'gym' }],
    matches: [{ id: 'm1', date: '2026-10-26', time: '14:00:00', opponent: 'Vasas SC' }],
    measurements: [
      { id: 'a', value: 120, measured_at: '2026-10-20', player: { id: 'p1', name: 'Kiss Péter' }, exercise: { id: 'sq', name: 'Guggolás', unit: 'kg' } },
      { id: 'b', value: 110, measured_at: '2026-10-10', player: { id: 'p1', name: 'Kiss Péter' }, exercise: { id: 'sq', name: 'Guggolás', unit: 'kg' } },
      { id: 'c', value: 40, measured_at: '2026-10-05', player: { id: 'p2', name: 'Nagy Ádám' }, exercise: { id: 'cmj', name: 'CMJ', unit: 'cm' } },
      { id: 'd', value: 41, measured_at: '2026-10-01', player: { id: 'p2', name: 'Nagy Ádám' }, exercise: { id: 'cmj', name: 'CMJ', unit: 'cm' } },
    ],
  }
})
afterEach(() => vi.useRealTimers())

describe('Kezdőlap widgetek beállításai', () => {
  it('Következő napok: csak mérkőzések', async () => {
    wrap(<UpcomingWeekWidget settings={{ days: '7', types: 'match' }} size={{ w: 2, h: 2 }} />)
    expect(await screen.findByText('vs Vasas SC')).toBeInTheDocument()
    expect(screen.queryByText('Konditerem')).not.toBeInTheDocument()
  })

  it('Friss mérések: n sor és csúcs-jelölés', async () => {
    wrap(<RecentMeasurementsWidget settings={{ n: '3' }} />)
    expect(await screen.findAllByText('Kiss Péter')).toHaveLength(2)
    expect(screen.getAllByText('Nagy Ádám')).toHaveLength(1)
    expect(screen.getAllByText('csúcs')).toHaveLength(1)
  })

  it('Gyors műveletek: erőnléti csomag csak mérési joggal', () => {
    const { unmount } = wrap(<QuickActionsWidget settings={{ set: 'fit' }} />, { measurement: 'edit' })
    expect(screen.getByRole('button', { name: 'Új mérés' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1RM táblázat' })).toBeInTheDocument()
    unmount()
    wrap(<QuickActionsWidget settings={{ set: 'fit' }} />, { measurement: 'view' })
    expect(screen.queryByRole('button', { name: 'Új mérés' })).not.toBeInTheDocument()
  })
})
