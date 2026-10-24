import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamTestProvider from '@/test/TeamTestProvider'

// Láncolható Supabase-mock; az insert hívásait rögzítjük.
const calls = vi.hoisted(() => ({ insert: [], rows: [] }))
vi.mock('@/lib/supabase', () => {
  const builder = {}
  const chain = () => builder
  for (const m of ['from', 'select', 'eq', 'is', 'in', 'order', 'gte', 'lte', 'update', 'delete', 'upsert', 'single', 'maybeSingle']) {
    builder[m] = chain
  }
  builder.insert = (payload) => {
    calls.insert.push(payload)
    return builder
  }
  builder.then = (resolve) => resolve({ data: calls.rows, error: null })
  return { supabase: builder }
})

const PLAYERS = [{ id: 'p1', name: 'Kiss Péter', position: 'Átlövő', jersey_number: 7 }]
vi.mock('@/hooks/usePlayers', () => ({ usePlayers: () => ({ data: PLAYERS, isLoading: false }) }))

const { default: AvailabilityEditor } = await import('@/components/availability/AvailabilityEditor')
const { default: AvailabilityHistory } = await import('@/components/availability/AvailabilityHistory')
const { default: Rehabilitation } = await import('@/pages/Rehabilitation')

const TEAM = { id: 't1', name: 'Felnőtt' }

function wrap(ui, perms = { rehab: 'edit', players: 'view' }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TeamTestProvider value={{ teams: [TEAM], selectedTeam: TEAM, currentUserPermissions: perms }}>{ui}</TeamTestProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  calls.insert.length = 0
  calls.rows = []
})

describe('AvailabilityEditor', () => {
  it('a kiválasztott státuszt, kezdőnapot, visszatérést és megjegyzést menti a játékoshoz', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    wrap(<AvailabilityEditor open onClose={onClose} player={PLAYERS[0]} teamId="t1" />)

    await user.click(screen.getByRole('button', { name: 'Sérült' }))
    const started = screen.getByLabelText('Kezdete')
    await user.clear(started)
    await user.type(started, '2026-10-20')
    await user.type(screen.getByLabelText('Várható visszatérés'), '2026-10-30')
    await user.type(screen.getByLabelText('Megjegyzés'), 'térdzúzódás')
    await user.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => expect(calls.insert).toHaveLength(1))
    expect(calls.insert[0]).toMatchObject({
      team_id: 't1',
      player_id: 'p1',
      status: 'injured',
      started_on: '2026-10-20',
      expected_return: '2026-10-30',
      note: 'térdzúzódás',
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})

describe('AvailabilityHistory', () => {
  it('szerkesztési jog nélkül nincs szerkesztés és törlés', async () => {
    calls.rows = [
      { id: 'e1', player_id: 'p1', team_id: 't1', status: 'injured', started_on: '2026-10-01', created_at: '2026-10-01T08:00:00Z' },
    ]
    wrap(<AvailabilityHistory playerId="p1" teamId="t1" canEdit={false} />, { rehab: 'view' })
    expect(await screen.findByText('Sérült')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /szerkesztése/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /törlése/ })).not.toBeInTheDocument()
  })
})

describe('Egészség oldal elérhetőség', () => {
  it('rehab szerkesztési joggal van Státusz gomb, csak megtekintéssel nincs', async () => {
    const { unmount } = wrap(<Rehabilitation />, { rehab: 'edit' })
    expect(await screen.findByRole('button', { name: 'Kiss Péter státusza' })).toBeInTheDocument()
    expect(screen.getByText('Bevethető')).toBeInTheDocument()
    unmount()

    wrap(<Rehabilitation />, { rehab: 'view' })
    expect(await screen.findByText('Kiss Péter')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kiss Péter státusza' })).not.toBeInTheDocument()
  })
})
