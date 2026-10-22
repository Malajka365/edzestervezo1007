import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamTestProvider from '@/test/TeamTestProvider'

// Láncolható, "thenable" Supabase-mock: minden lekérdezés üres eredményt ad.
vi.mock('@/lib/supabase', () => {
  const builder = {}
  const chain = () => builder
  for (const method of ['from', 'select', 'eq', 'is', 'in', 'order', 'gte', 'lte', 'insert', 'update', 'delete', 'upsert', 'single']) {
    builder[method] = chain
  }
  builder.then = (resolve) => resolve({ data: [], error: null })
  return { supabase: builder }
})

const PLAYERS = [
  { id: 'p1', name: 'Kiss Péter', position: 'Átlövő', jersey_number: 7, birth_date: '2008-05-01' },
]
vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({ data: PLAYERS, isLoading: false }),
}))
vi.mock('@/hooks/useExercises', () => ({
  useExercises: () => ({ data: [] }),
}))

const { default: Teams } = await import('@/pages/Teams')
const { default: PlayerProfile } = await import('@/pages/PlayerProfile')
const { default: TeamMembersPanel } = await import('@/components/TeamMembersPanel')

const TEAM = { id: 't1', name: 'U19 Férfi' }
const FULL_ACCESS = {
  currentUserPermissions: { players: 'edit' },
}

function renderTeams(context) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TeamTestProvider value={{ teams: [TEAM], selectedTeam: TEAM, ...FULL_ACCESS, ...context }}>
        <Teams />
      </TeamTestProvider>
    </QueryClientProvider>
  )
}

describe('Játékosok oldal', () => {
  it('a fejlécben megjelenik az Új játékos és a Helyszínek gomb', async () => {
    renderTeams({ isTeamOwner: false })
    expect(screen.getByRole('heading', { level: 1, name: 'Játékosok' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Új játékos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Helyszínek' })).toBeInTheDocument()
    expect(screen.getByText('Kiss Péter')).toBeInTheDocument()
  })

  it('a csapat menüben nem tulajdonosnak nincs törlés', async () => {
    const user = userEvent.setup()
    renderTeams({ isTeamOwner: false })
    await user.click(screen.getByRole('button', { name: 'Csapat' }))
    expect(screen.getByRole('menuitem', { name: 'Csapat szerkesztése' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Csapat törlése' })).not.toBeInTheDocument()
  })

  it('a csapat menüben a tulajdonosnak van törlés, a szerkesztés modált nyit', async () => {
    const user = userEvent.setup()
    renderTeams({ isTeamOwner: true })
    await user.click(screen.getByRole('button', { name: 'Csapat' }))
    expect(screen.getByRole('menuitem', { name: 'Csapat törlése' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Csapat szerkesztése' }))
    expect(screen.getByRole('dialog', { name: 'Csapat szerkesztése' })).toBeInTheDocument()
    expect(screen.getByLabelText('Csapat neve *')).toHaveValue('U19 Férfi')
  })

  it('az Új játékos gomb megnyitja az űrlapot', async () => {
    const user = userEvent.setup()
    renderTeams({ isTeamOwner: false })
    await user.click(screen.getByRole('button', { name: 'Új játékos' }))
    expect(screen.getByRole('dialog', { name: 'Új játékos' })).toBeInTheDocument()
  })

  it('a Helyszínek gomb megnyitja a helyszín-kezelőt, ahonnan új helyszín vehető fel', async () => {
    const user = userEvent.setup()
    renderTeams({ isTeamOwner: false })
    await user.click(screen.getByRole('button', { name: 'Helyszínek' }))
    expect(screen.getByRole('dialog', { name: 'Helyszínek – U19 Férfi' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Új helyszín' }))
    expect(screen.getByRole('dialog', { name: 'Új helyszín' })).toBeInTheDocument()
  })

  it('a játékos kártyára kattintva megnyílik a profil, és vissza lehet lépni', async () => {
    const user = userEvent.setup()
    renderTeams({ isTeamOwner: false })
    await user.click(screen.getByText('Kiss Péter'))
    expect(await screen.findByRole('button', { name: 'Vissza a játékosokhoz' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Vissza a játékosokhoz' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Játékosok' })).toBeInTheDocument()
  })
})

describe('PlayerProfile', () => {
  it('fejlécet és vissza gombot renderel', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<PlayerProfile player={PLAYERS[0]} onBack={onBack} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Kiss Péter' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Vissza a játékosokhoz' }))
    expect(onBack).toHaveBeenCalled()
  })
})

describe('TeamMembersPanel', () => {
  it('tulajdonosnak megjelenik a jogosultság-mátrix és a meghívás', async () => {
    const user = userEvent.setup()
    render(<TeamMembersPanel team={TEAM} isOwner />)
    await waitFor(() => expect(screen.getByText('Jogosultságok')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Jogosultságok mentése' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tag meghívása' }))
    expect(screen.getByRole('dialog', { name: 'Tag meghívása' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Meghívó link generálása' })).toBeDisabled()
  })

  it('nem tulajdonosnak nincs jogosultság-mátrix és meghívás', async () => {
    render(<TeamMembersPanel team={TEAM} isOwner={false} />)
    await waitFor(() => expect(screen.getByText('Csapattagok')).toBeInTheDocument())
    expect(screen.queryByText('Jogosultságok')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tag meghívása' })).not.toBeInTheDocument()
  })
})
