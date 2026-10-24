import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamTestProvider from '@/test/TeamTestProvider'

vi.mock('@/lib/supabase', () => {
  const b = {}
  for (const m of ['from', 'select', 'eq', 'is', 'in', 'order', 'gte', 'lte', 'insert', 'update', 'delete', 'upsert', 'single', 'maybeSingle', 'limit']) b[m] = () => b
  b.then = (res) => res({ data: [], error: null })
  return { supabase: b }
})
vi.mock('@/hooks/usePlayers', () => ({ usePlayers: () => ({ data: [], isLoading: false }) }))
vi.mock('@/components/TeamAttendanceCalendar', () => ({
  default: ({ canEdit }) => <div data-testid="team-attendance">canEdit:{String(canEdit)}</div>,
}))

const { default: MonthView } = await import('@/pages/calendar/MonthView')
const { default: WeekView } = await import('@/pages/calendar/WeekView')
const { default: SessionActions } = await import('@/pages/calendar/SessionActions')
const { default: Rehabilitation } = await import('@/pages/Rehabilitation')
const { default: Attendance } = await import('@/pages/Attendance')

const D = (iso) => new Date(`${iso}T12:00:00`)
const label = (d) => d.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })
const SESSION = { id: 's1', date: '2026-10-22', start_time: '17:30:00', type: 'gym', location: 'Csarnok' }
const days = [D('2026-10-21'), D('2026-10-22')]

const viewProps = (over = {}) => ({
  currentDate: days[0],
  daysOfWeek: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],
  daysOfWeekShort: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],
  trainingDayOptions: {},
  getDaysInMonth: () => days,
  getWeekDays: () => days,
  getDayData: () => null,
  getTrainingSessionsForDate: (d) => (d.getDate() === 22 ? [SESSION] : []),
  getMatchesForDate: () => [],
  isToday: () => false,
  isCurrentMonth: () => true,
  setCurrentDate: vi.fn(),
  setView: vi.fn(),
  hasBallTraining: () => false,
  canEdit: true,
  updateLoadFactor: vi.fn(),
  getLoadFactor: () => null,
  getTacticsTechnique: () => null,
  updateTacticsTechnique: vi.fn(),
  onSessionClick: vi.fn(),
  ...over,
})

describe('Naptár: edzés létrehozása bármely nézetből', () => {
  it('havi nézetben a nap + gombja előtöltött dátummal hív', () => {
    const props = viewProps({ onCreate: vi.fn() })
    render(<MonthView {...props} />)
    fireEvent.click(screen.getByRole('button', { name: `Edzés hozzáadása: ${label(days[0])}` }))
    expect(props.onCreate).toHaveBeenCalledWith(days[0])
    expect(props.setView).not.toHaveBeenCalled()
  })

  it('havi nézetben az üres napra kattintás is létrehozást nyit', () => {
    const props = viewProps({ onCreate: vi.fn() })
    render(<MonthView {...props} />)
    fireEvent.click(screen.getByText('21'))
    expect(props.onCreate).toHaveBeenCalledWith(days[0])
  })

  it('heti nézetben a + edzés gomb létrehozást nyit', () => {
    const props = viewProps({ onCreate: vi.fn() })
    render(<WeekView {...props} />)
    fireEvent.click(screen.getByRole('button', { name: `Edzés hozzáadása: ${label(days[1])}` }))
    expect(props.onCreate).toHaveBeenCalledWith(days[1])
  })

  it('szerkesztési jog nélkül nincs + gomb, az üres nap a napi nézetre visz', () => {
    const props = viewProps({ onCreate: undefined, canEdit: false })
    render(<MonthView {...props} />)
    expect(screen.queryByRole('button', { name: /Edzés hozzáadása/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('21'))
    expect(props.setView).toHaveBeenCalledWith('day')
  })

  it('meglévő edzésre kattintás az edzés-panelt nyitja', () => {
    const props = viewProps({ onCreate: vi.fn() })
    render(<MonthView {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Edzés 17:30/ }))
    expect(props.onSessionClick).toHaveBeenCalledWith(SESSION)
  })
})

describe('SessionActions', () => {
  const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

  it('a Mai edzés oldalra mutat, joggal szerkeszthető és törölhető', () => {
    const onEdit = vi.fn()
    wrap(<SessionActions session={SESSION} canEdit onClose={() => {}} onEdit={onEdit} onDelete={() => {}} />)
    const panel = screen.getByRole('dialog')
    expect(within(panel).getByRole('link', { name: 'Megnyitás a Mai edzés oldalon' })).toHaveAttribute('href', '/dashboard/mai-edzes?session=s1')
    fireEvent.click(within(panel).getByRole('button', { name: 'Szerkesztés' }))
    expect(onEdit).toHaveBeenCalledWith(SESSION)
    expect(within(panel).getByRole('button', { name: 'Törlés' })).toBeInTheDocument()
  })

  it('jog nélkül csak a megnyitás látszik', () => {
    wrap(<SessionActions session={SESSION} canEdit={false} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Szerkesztés' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Törlés' })).not.toBeInTheDocument()
  })
})

describe('Jelenlét saját oldalon', () => {
  const TEAM = { id: 't1', name: 'Felnőtt' }
  const wrap = (ui, perms) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={client}>
        <TeamTestProvider value={{ teams: [TEAM], selectedTeam: TEAM, currentUserPermissions: perms }}>{ui}</TeamTestProvider>
      </QueryClientProvider>
    )
  }

  it('az Egészség oldalon már nincs Csapat jelenlét fül', () => {
    wrap(<Rehabilitation />, { rehab: 'edit' })
    expect(screen.queryByRole('tab', { name: /Csapat jelenlét/ })).not.toBeInTheDocument()
  })

  it('a Jelenlét oldal szerkesztési jog nélkül csak olvasható naptárat ad', () => {
    wrap(<Attendance />, { attendance: 'view' })
    expect(screen.getByRole('heading', { level: 1, name: 'Jelenlét' })).toBeInTheDocument()
    expect(screen.getByTestId('team-attendance')).toHaveTextContent('canEdit:false')
  })

  it('a Jelenlét oldal joggal szerkeszthető', () => {
    wrap(<Attendance />, { attendance: 'edit' })
    expect(screen.getByTestId('team-attendance')).toHaveTextContent('canEdit:true')
  })
})
