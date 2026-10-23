import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TeamTestProvider from '@/test/TeamTestProvider'

// Az élő séma szerinti sor: a típus a `type` oszlopban van (match_type nincs).
const MATCHES = [
  {
    id: 'm1',
    team_id: 't1',
    date: '2099-03-14',
    time: '18:00',
    opponent: 'Veszprém',
    type: 'cup',
    home_away: 'home',
    our_score: null,
    opponent_score: null,
    notes: '',
  },
]

// Láncolható, "thenable" Supabase-mock, ami rögzíti az update-payloadot.
const updates = []
vi.mock('@/lib/supabase', () => {
  const builder = {}
  const chain = () => builder
  for (const method of ['from', 'select', 'eq', 'order', 'insert', 'delete']) {
    builder[method] = chain
  }
  builder.update = (payload) => {
    updates.push(payload)
    return builder
  }
  builder.then = (resolve) => resolve({ data: MATCHES, error: null })
  return { supabase: builder }
})

const { default: Matches } = await import('@/pages/Matches')

const TEAM = { id: 't1', name: 'U19 Férfi' }

describe('Mérkőzések oldal', () => {
  it('a `type` oszlopból olvassa és oda menti a mérkőzés típusát', async () => {
    const user = userEvent.setup()
    render(
      <TeamTestProvider value={{ selectedTeam: TEAM, currentUserPermissions: { matches: 'edit' } }}>
        <Matches />
      </TeamTestProvider>
    )

    expect(await screen.findByText('Kupa')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    const dialog = screen.getByRole('dialog', { name: 'Mérkőzés szerkesztése' })
    expect(within(dialog).getByLabelText('Típus')).toHaveValue('cup')

    await user.selectOptions(within(dialog).getByLabelText('Típus'), 'tournament')
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }))

    await waitFor(() => expect(updates).toHaveLength(1))
    expect(updates[0]).toMatchObject({ type: 'tournament' })
    expect(updates[0]).not.toHaveProperty('match_type')
  })
})
