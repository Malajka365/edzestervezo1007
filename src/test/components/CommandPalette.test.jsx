import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn(async () => ({ error: null })) } },
}))

import TeamTestProvider from '@/test/TeamTestProvider'
import AppShell from '@/components/shell/AppShell'

const session = { user: { id: 'u1', email: 'edzo@example.com' } }
const team = { id: 't1', name: 'U19 Férfi', created_by: 'u1' }

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>
}

function renderShell(value = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <TeamTestProvider value={{ teams: [team], selectedTeam: team, permissionsLoading: true, ...value }}>
        <Routes>
          <Route path="/dashboard" element={<AppShell session={session} />}>
            <Route index element={<Where />} />
            <Route path="*" element={<Where />} />
          </Route>
        </Routes>
      </TeamTestProvider>
    </MemoryRouter>
  )
}

describe('Parancspaletta', () => {
  it('Ctrl+K megnyitja, a fókusz a keresőmezőn van', async () => {
    renderShell()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.keyboard('{Control>}k{/Control}')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveFocus()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('a lefelé nyíl majd Enter a második parancs oldalára visz és bezár', async () => {
    renderShell()
    await userEvent.keyboard('{Control>}k{/Control}')

    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    const secondLabel = options[1].textContent

    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Enter}')

    expect(secondLabel).toContain('Mérkőzések')
    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard/merkozesek')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Escape bezárja', async () => {
    renderShell()
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ékezet nélküli keresés szűr, és Enter a találatra navigál', async () => {
    renderShell()
    await userEvent.keyboard('{Control>}k{/Control}')
    await userEvent.keyboard('meres')

    expect(screen.getAllByRole('option').map((o) => o.textContent).join(' ')).toContain('Mérések')
    await userEvent.keyboard('{Enter}')

    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard/meresek')
  })

  it('találat nélkül "Nincs találat." jelenik meg', async () => {
    renderShell()
    await userEvent.keyboard('{Control>}k{/Control}')
    await userEvent.keyboard('zzz')

    expect(screen.getByText('Nincs találat.')).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('a keresés gombok (mobil fejléc és oldalsáv) megnyitják', async () => {
    renderShell()

    await userEvent.click(screen.getByRole('button', { name: 'Keresés' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(screen.getByRole('button', { name: /Keresés, parancsok/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('a jogosultság szerint rejtett oldalak nincsenek a listában', async () => {
    renderShell({ permissionsLoading: false, currentUserPermissions: { measurement: 'none', calendar: 'view' } })
    await userEvent.keyboard('{Control>}k{/Control}')
    await userEvent.keyboard('meres')

    expect(screen.getByText('Nincs találat.')).toBeInTheDocument()
  })
})
