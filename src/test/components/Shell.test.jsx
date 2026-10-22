import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
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
import Sidebar from '@/components/shell/Sidebar'
import TeamSwitcher from '@/components/shell/TeamSwitcher'
import UserMenu from '@/components/shell/UserMenu'
import Modal from '@/components/ui/Modal'
import { useTheme } from '@/hooks/useTheme'

// Az App gyökerében futó példány alkalmazza a témát; a kapcsoló csak módot vált.
function ThemeRoot() {
  useTheme({ apply: true })
  return null
}

const session = { user: { id: 'u1', email: 'edzo@example.com' } }
const teamA = { id: 't1', name: 'U19 Férfi', created_by: 'u1' }
const teamB = { id: 't2', name: 'Felnőtt Női', created_by: 'u2' }

function renderWithContext(ui, { value = {}, route = '/dashboard' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TeamTestProvider value={value}>{ui}</TeamTestProvider>
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('csak a jogosultságnak megfelelő csoportokat mutatja', () => {
    renderWithContext(<Sidebar session={session} />, {
      value: { currentUserPermissions: { matches: 'view' }, permissionsLoading: false },
    })

    expect(screen.getByText('Áttekintés')).toBeInTheDocument()
    expect(screen.getByText('Teljesítmény')).toBeInTheDocument()
    expect(screen.queryByText('Tervezés')).not.toBeInTheDocument()
  })

  it('jogosultság-betöltés alatt minden menüpontot mutat', () => {
    renderWithContext(<Sidebar session={session} />, {
      value: { currentUserPermissions: {}, permissionsLoading: true },
    })

    expect(screen.getByText('Szezonterv')).toBeInTheDocument()
  })

  it('a keresés gomb meghívja az onOpenPalette-et', async () => {
    const onOpenPalette = vi.fn()
    renderWithContext(<Sidebar session={session} onOpenPalette={onOpenPalette} />, {
      value: { permissionsLoading: true },
    })

    await userEvent.click(screen.getByRole('button', { name: /Keresés, parancsok/ }))
    expect(onOpenPalette).toHaveBeenCalledTimes(1)
  })

  it('a gyorsbillentyű jelölése Macen ⌘K, egyébként Ctrl K', () => {
    const platform = vi.spyOn(window.navigator, 'platform', 'get')
    try {
      platform.mockReturnValue('MacIntel')
      const mac = renderWithContext(<Sidebar session={session} />, { value: { permissionsLoading: true } })
      expect(screen.getByText('⌘K')).toBeInTheDocument()
      mac.unmount()

      platform.mockReturnValue('Win32')
      renderWithContext(<Sidebar session={session} />, { value: { permissionsLoading: true } })
      expect(screen.getByText('Ctrl K')).toBeInTheDocument()
      expect(screen.queryByText('⌘K')).not.toBeInTheDocument()
    } finally {
      platform.mockRestore()
    }
  })
})

describe('UserMenu', () => {
  it('a szerepkör nevét mutatja', () => {
    renderWithContext(<UserMenu session={session} />, {
      value: { currentUserRole: 'physiotherapist' },
    })

    expect(screen.getByText('Gyógytornász')).toBeInTheDocument()
    expect(screen.getByText('edzo@example.com')).toBeInTheDocument()
  })

  it('ismeretlen szerepkörnél "Csapattag"', () => {
    renderWithContext(<UserMenu session={session} />, { value: { currentUserRole: null } })

    expect(screen.getByText('Csapattag')).toBeInTheDocument()
  })

  it('a menü gomb párbeszédként jelzi a felugró réteget', () => {
    renderWithContext(<UserMenu session={session} />)

    expect(screen.getByRole('button', { name: /edzo@example.com/ })).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('a menüben profil link, téma kapcsoló és kijelentkezés van', async () => {
    renderWithContext(<UserMenu session={session} />)

    await userEvent.click(screen.getByRole('button', { name: /edzo@example.com/ }))

    expect(screen.getByRole('link', { name: 'Profil' })).toHaveAttribute('href', '/dashboard/profil')
    expect(screen.getByRole('button', { name: 'Kijelentkezés' })).toBeInTheDocument()

    const themeGroup = screen.getByRole('group', { name: 'Téma' })
    expect(within(themeGroup).getByRole('button', { name: 'Rendszer' })).toBeInTheDocument()
    expect(within(themeGroup).getByRole('button', { name: 'Világos' })).toBeInTheDocument()
    expect(within(themeGroup).getByRole('button', { name: 'Sötét' })).toBeInTheDocument()
  })

  describe('téma kapcsoló', () => {
    beforeEach(() => {
      localStorage.clear()
      delete document.documentElement.dataset.theme
    })

    afterEach(() => {
      localStorage.clear()
      delete document.documentElement.dataset.theme
    })

    it('a Világos választása beállítja a data-theme-et és eltárolja a módot', async () => {
      renderWithContext(
        <>
          <ThemeRoot />
          <UserMenu session={session} />
        </>
      )

      await userEvent.click(screen.getByRole('button', { name: /edzo@example.com/ }))
      await userEvent.click(screen.getByRole('button', { name: 'Világos' }))

      expect(document.documentElement.dataset.theme).toBe('light')
      expect(localStorage.getItem('tf-theme')).toBe('light')
      expect(screen.getByRole('button', { name: 'Világos' })).toHaveAttribute('aria-pressed', 'true')
    })
  })
})

describe('TeamSwitcher', () => {
  it('a váltó gomb párbeszédként jelzi a felugró réteget', () => {
    renderWithContext(<TeamSwitcher />, { value: { teams: [teamA], selectedTeam: teamA } })

    expect(screen.getByRole('button', { name: /U19 Férfi/ })).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('másik csapatra kattintva meghívja a setSelectedTeam-et', async () => {
    const setSelectedTeam = vi.fn()
    renderWithContext(<TeamSwitcher />, {
      value: { teams: [teamA, teamB], selectedTeam: teamA, setSelectedTeam },
    })

    await userEvent.click(screen.getByRole('button', { name: /U19 Férfi/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Felnőtt Női' }))

    expect(setSelectedTeam).toHaveBeenCalledWith(teamB)
  })

  it('az "Új csapat létrehozása" megnyitja a modált', async () => {
    renderWithContext(<TeamSwitcher />, { value: { teams: [teamA], selectedTeam: teamA } })

    await userEvent.click(screen.getByRole('button', { name: /U19 Férfi/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Új csapat létrehozása' }))

    expect(screen.getByRole('dialog', { name: 'Új csapat' })).toBeInTheDocument()
  })
})

describe('AppShell', () => {
  function renderShell(value, route = '/dashboard/naptar') {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <TeamTestProvider value={value}>
          <Routes>
            <Route path="/dashboard" element={<AppShell session={session} />}>
              <Route index element={<div>Kezdőlap tartalom</div>} />
              <Route path="naptar" element={<div>Naptár tartalom</div>} />
              <Route path="profil" element={<div>Profil tartalom</div>} />
            </Route>
          </Routes>
        </TeamTestProvider>
      </MemoryRouter>
    )
  }

  it('csapat nélkül az üres állapotot mutatja az oldal helyett', () => {
    renderShell({ teams: [], loading: false })

    expect(screen.getByText('Hozd létre az első csapatodat')).toBeInTheDocument()
    expect(screen.queryByText('Naptár tartalom')).not.toBeInTheDocument()
  })

  it('sikertelen csapat-lekérésnél hibapanelt és újrapróbálást mutat, nem az üres állapotot', async () => {
    const fetchTeams = vi.fn()
    renderShell({ teams: [], loading: false, teamsError: new Error('network'), fetchTeams })

    expect(screen.getByText('Nem sikerült betölteni a csapatokat.')).toBeInTheDocument()
    expect(screen.queryByText('Hozd létre az első csapatodat')).not.toBeInTheDocument()
    expect(screen.queryByText('Naptár tartalom')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Újrapróbálás' }))
    expect(fetchTeams).toHaveBeenCalledTimes(1)
  })

  it('csapat nélkül is megjeleníti a profil oldalt', () => {
    renderShell({ teams: [], loading: false }, '/dashboard/profil')

    expect(screen.getByText('Profil tartalom')).toBeInTheDocument()
    expect(screen.queryByText('Hozd létre az első csapatodat')).not.toBeInTheDocument()
  })

  it('csapattal az oldal tartalmát mutatja', () => {
    renderShell({ teams: [teamA], selectedTeam: teamA })

    expect(screen.getByText('Naptár tartalom')).toBeInTheDocument()
    expect(screen.queryByText('Hozd létre az első csapatodat')).not.toBeInTheDocument()
  })

  describe('Ctrl+K', () => {
    const pressCtrlK = () =>
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
      })

    function renderWithPage(page) {
      return render(
        <MemoryRouter initialEntries={['/dashboard/naptar']}>
          <TeamTestProvider value={{ teams: [teamA], selectedTeam: teamA }}>
            <Routes>
              <Route path="/dashboard" element={<AppShell session={session} />}>
                <Route path="naptar" element={page} />
              </Route>
            </Routes>
          </TeamTestProvider>
        </MemoryRouter>
      )
    }

    it('megnyitja a parancspalettát', () => {
      renderWithPage(<div>Naptár tartalom</div>)

      pressCtrlK()

      expect(screen.getByRole('dialog', { name: 'Keresés, parancsok' })).toBeInTheDocument()
    })

    it('nyitott modal fölé nem nyitja meg a palettát', () => {
      renderWithPage(
        <Modal open onClose={() => {}} title="Új edzés">
          <input aria-label="Megnevezés" />
        </Modal>
      )

      pressCtrlK()

      expect(screen.getByRole('dialog', { name: 'Új edzés' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Keresés, parancsok' })).not.toBeInTheDocument()
    })
  })
})
