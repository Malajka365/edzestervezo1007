import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}))

import TeamTestProvider from '@/test/TeamTestProvider'
import AppShell from '@/components/shell/AppShell'

const session = { user: { id: 'u1', email: 'edzo@example.com' } }
const team = { id: 't1', name: 'U19 Férfi', created_by: 'u1' }

function renderShell(value = {}, route = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TeamTestProvider value={{ teams: [team], selectedTeam: team, ...value }}>
        <Routes>
          <Route path="/dashboard" element={<AppShell session={session} />}>
            <Route index element={<div>Kezdőlap tartalom</div>} />
            <Route path="meresek" element={<div>Mérések tartalom</div>} />
          </Route>
        </Routes>
      </TeamTestProvider>
    </MemoryRouter>
  )
}

const tabBar = () => screen.getByRole('navigation', { name: 'Alsó menü' })

describe('Mobil keret', () => {
  it('nincs hamburger gomb, van keresés gomb', () => {
    renderShell()

    expect(screen.queryByRole('button', { name: 'Menü megnyitása' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keresés' })).toBeInTheDocument()
  })

  it('az alsó sáv a jogosultságnak megfelelő tabokat és a "Több" gombot mutatja', () => {
    renderShell({ currentUserPermissions: { calendar: 'view', players: 'view' } })

    const bar = within(tabBar())
    expect(bar.getByRole('link', { name: 'Naptár' })).toBeInTheDocument()
    expect(bar.getByRole('button', { name: 'Több' })).toBeInTheDocument()
  })

  it('naptár jogosultság nélkül nincs Naptár tab, de a "Több" megmarad', () => {
    renderShell({ currentUserPermissions: { calendar: 'none' } })

    const bar = within(tabBar())
    expect(bar.queryByRole('link', { name: 'Naptár' })).not.toBeInTheDocument()
    expect(bar.getByRole('button', { name: 'Több' })).toBeInTheDocument()
  })

  it('a "Több" megnyitja a teljes csoportosított menüt', async () => {
    renderShell({ permissionsLoading: true })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(within(tabBar()).getByRole('button', { name: 'Több' }))

    const sheet = within(screen.getByRole('dialog', { name: 'Menü' }))
    expect(sheet.getByText('Teljesítmény')).toBeInTheDocument()
    expect(sheet.getByText('Tervezés')).toBeInTheDocument()
    expect(sheet.getByRole('button', { name: /edzo@example.com/ })).toBeInTheDocument()
  })

  it('a lapon választott menüpont navigál és bezárja a lapot', async () => {
    renderShell({ permissionsLoading: true })

    await userEvent.click(within(tabBar()).getByRole('button', { name: 'Több' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Menü' }))
    await userEvent.click(sheet.getByRole('link', { name: 'Mérések' }))

    expect(screen.getByText('Mérések tartalom')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a menücsoport azonosítók nem ismétlődnek, ha az oldalsáv és a lap is látszik', async () => {
    renderShell({ permissionsLoading: true })

    await userEvent.click(within(tabBar()).getByRole('button', { name: 'Több' }))

    const ids = Array.from(document.querySelectorAll('[id*="nav-group-"]')).map((el) => el.id)
    expect(ids.length).toBeGreaterThan(5)
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dup).toEqual([])
  })

  it('az Escape előbb a felhasználói menüt zárja be, csak a második a "Több" lapot', async () => {
    renderShell({ permissionsLoading: true })

    await userEvent.click(within(tabBar()).getByRole('button', { name: 'Több' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Menü' }))
    await userEvent.click(sheet.getByRole('button', { name: /edzo@example.com/ }))
    expect(sheet.getByRole('button', { name: 'Kijelentkezés' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Kijelentkezés' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Menü' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Menü' })).not.toBeInTheDocument()
  })
})
