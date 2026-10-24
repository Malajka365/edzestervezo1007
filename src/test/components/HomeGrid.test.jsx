import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamTestProvider from '@/test/TeamTestProvider'

// A widget-komponenseket egyszerű dobozokra cseréljük (nincs Supabase).
vi.mock('@/lib/dashboardWidgets', () => {
  const make = (type) => {
    const C = ({ settings }) => <div data-testid={`body-${type}`}>{JSON.stringify(settings)}</div>
    return C
  }
  const types = ['today_session', 'availability', 'next_match', 'todos', 'upcoming_week', 'weekly_attendance', 'season_progress', 'quick_actions', 'note', 'rehab_status']
  return { WIDGET_COMPONENTS: Object.fromEntries(types.map((t) => [t, make(t)])) }
})

const prefsState = vi.hoisted(() => ({ prefs: null, saved: [] }))
vi.mock('@/hooks/useDashboardPrefs', () => ({
  useDashboardPrefs: () => ({
    prefs: prefsState.prefs,
    loading: false,
    savePrefs: async (items) => {
      prefsState.saved.push(items)
    },
  }),
}))
vi.mock('@/hooks/usePlayers', () => ({ usePlayers: () => ({ data: [], isLoading: false }) }))
vi.mock('@/hooks/useExercises', () => ({ useExercises: () => ({ data: [] }) }))

const { default: DashboardHome } = await import('@/pages/DashboardHome')

const ALL = {
  players: 'edit', macrocycle: 'edit', calendar: 'edit', exercises: 'edit', templates: 'edit',
  matches: 'edit', measurement: 'edit', stats: 'view', rehab: 'edit', attendance: 'edit',
}
const TEAM = { id: 't1', name: 'Felnőtt' }

function renderHome(perms = ALL) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TeamTestProvider value={{ teams: [TEAM], selectedTeam: TEAM, currentUserRole: 'coach', currentUserPermissions: perms }}>
        <MemoryRouter>
          <Routes>
            <Route element={<Outlet context={{ session: { user: { id: 'u1' } } }} />}>
              <Route index element={<DashboardHome />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TeamTestProvider>
    </QueryClientProvider>
  )
}

const widgetTitles = () => screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))
const lastSaved = () => prefsState.saved.at(-1)
const flushSave = async () => {
  await act(async () => {
    vi.advanceTimersByTime(700)
  })
}

beforeEach(() => {
  prefsState.prefs = null
  prefsState.saved = []
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

describe('Kezdőlap rács', () => {
  it('mentés nélkül a vezetőedző alap-elrendezését mutatja', () => {
    renderHome()
    expect(widgetTitles()).toEqual([
      'Mai edzés', 'Ki bevethető?', 'Következő mérkőzés', 'Teendők',
      'Következő napok', 'Heti jelenlét', 'Szezon', 'Gyors műveletek',
    ])
    expect(screen.queryByRole('button', { name: /áthelyezése/ })).not.toBeInTheDocument()
  })

  it('szerkesztésben fogantyú és eltávolítás látszik; eltávolítás után ment', async () => {
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    expect(screen.getAllByRole('button', { name: /áthelyezése/ }).length).toBe(8)
    fireEvent.click(screen.getByRole('button', { name: 'Szezon eltávolítása' }))
    expect(widgetTitles()).not.toContain('Szezon')
    await flushSave()
    expect(lastSaved().map((i) => i.type)).not.toContain('season_progress')
    expect(lastSaved()[0]).toMatchObject({ id: 'today_session', type: 'today_session', w: 2, h: 2 })
  })

  it('a Lejjebb gomb eggyel hátrébb viszi a widgetet', async () => {
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mai edzés lejjebb' }))
    expect(widgetTitles().slice(0, 2)).toEqual(['Ki bevethető?', 'Mai edzés'])
    await flushSave()
    expect(lastSaved()[1].type).toBe('today_session')
  })

  it('a katalógus csak engedélyezett widgetet kínál, a később érkezők letiltva, Jegyzet hozzáadható', async () => {
    renderHome({ ...ALL, rehab: 'none' })
    fireEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    fireEvent.click(screen.getByRole('button', { name: 'Widget hozzáadása' }))
    const catalog = screen.getByRole('dialog', { name: 'Widget hozzáadása' })
    expect(within(catalog).queryByText('Rehab-státusz')).not.toBeInTheDocument()
    const wellness = within(catalog).getByText('Csapat-wellness').closest('li')
    expect(within(wellness).getByText('4. szakasz')).toBeInTheDocument()
    expect(within(wellness).getByRole('button')).toBeDisabled()
    const todos = within(catalog).getByText('Teendők').closest('li')
    expect(within(todos).getByRole('button', { name: 'Fent van' })).toBeDisabled()
    fireEvent.click(within(within(catalog).getByText('Jegyzet').closest('li')).getByRole('button', { name: 'Hozzáad' }))
    expect(widgetTitles().at(-1)).toBe('Jegyzet')
    await flushSave()
    expect(lastSaved().at(-1).type).toBe('note')
  })

  it('a beállító panelen átírt időszak és méret azonnal érvényes és mentődik', async () => {
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: 'Következő napok beállítása' }))
    const panel = screen.getByRole('dialog', { name: 'Következő napok' })
    fireEvent.change(within(panel).getByLabelText('Időszak'), { target: { value: '14' } })
    fireEvent.click(within(panel).getByRole('button', { name: /Teljes sáv/ }))
    await flushSave()
    const item = lastSaved().find((i) => i.type === 'upcoming_week')
    expect(item.settings.days).toBe('14')
    expect([item.w, item.h]).toEqual([4, 1])
    expect(screen.getByTestId('body-upcoming_week')).toHaveTextContent('"days":"14"')
  })

  it('az Alaphelyzet visszaállítja a szerepkör alap-elrendezését', async () => {
    prefsState.prefs = [{ id: 'n', type: 'note', w: 1, h: 1, settings: {} }]
    renderHome()
    expect(widgetTitles()).toEqual(['Jegyzet'])
    fireEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    fireEvent.click(screen.getByRole('button', { name: 'Alaphelyzet' }))
    expect(widgetTitles()[0]).toBe('Mai edzés')
  })
})
