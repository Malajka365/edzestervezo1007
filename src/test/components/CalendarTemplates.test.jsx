import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TeamTestProvider from '@/test/TeamTestProvider'

// Láncolható, "thenable" Supabase-mock: táblánként adott adatot ad, a műveleteket rögzíti.
const { db, calls } = vi.hoisted(() => ({
  db: { training_templates: [], training_sessions: [], training_locations: [] },
  calls: [],
}))

vi.mock('@/lib/supabase', () => {
  const from = (table) => {
    const state = { table, op: 'select', payload: null }
    const builder = {}
    for (const method of ['select', 'eq', 'order', 'in', 'is', 'gte', 'lte', 'single']) {
      builder[method] = () => builder
    }
    builder.insert = (payload) => {
      state.op = 'insert'
      state.payload = payload
      return builder
    }
    builder.update = (payload) => {
      state.op = 'update'
      state.payload = payload
      return builder
    }
    builder.delete = () => {
      state.op = 'delete'
      return builder
    }
    builder.then = (resolve) => {
      calls.push({ ...state })
      resolve({ data: state.op === 'select' ? db[table] ?? [] : null, error: null })
    }
    return builder
  }
  return { supabase: { from } }
})

const { default: TrainingTemplates } = await import('@/pages/TrainingTemplates')
const { default: Calendar } = await import('@/pages/Calendar')
const { default: TrainingSessionModal } = await import('@/components/TrainingSessionModal')
const { default: QuickAddTrainingModal } = await import('@/components/QuickAddTrainingModal')
const { default: DayView } = await import('@/pages/calendar/DayView')
const { default: WeekView } = await import('@/pages/calendar/WeekView')
const { default: MonthView } = await import('@/pages/calendar/MonthView')
const { getWeekDays } = await import('@/pages/calendar/useCalendarData')

const TEAM = { id: 't1', name: 'U19 Férfi' }

const writes = (table, op) => calls.filter((c) => c.table === table && c.op === op)

beforeEach(() => {
  calls.length = 0
  db.training_templates = []
  db.training_sessions = []
  db.training_locations = []
})

describe('Edzéssablonok oldal', () => {
  const TEMPLATES = [
    { id: 'a', team_id: 't1', name: 'Erő 1. fázis', type: 'gym', category: 'Felső test', duration: 60, template_data: { exercises: [] } },
    { id: 'b', team_id: 't1', name: 'Lövés', type: 'ball', category: null, duration: 90, template_data: {} },
  ]

  function renderTemplates() {
    db.training_templates = TEMPLATES
    return render(
      <TeamTestProvider
        value={{ teams: [TEAM], selectedTeam: TEAM, currentUserPermissions: { templates: 'edit' } }}
      >
        <TrainingTemplates />
      </TeamTestProvider>
    )
  }

  it('a fejléc "szűrt / összes" sorrendben mutatja a darabszámot', async () => {
    const user = userEvent.setup()
    renderTemplates()
    expect(await screen.findByText(/2 \/ 2 sablon/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Konditerem' }))
    expect(screen.getByText(/1 \/ 2 sablon/)).toBeInTheDocument()
  })

  it('duplikáláskor "(másolat)" nevű sablon jön létre', async () => {
    const user = userEvent.setup()
    renderTemplates()
    await screen.findByText('Erő 1. fázis')
    await user.click(screen.getAllByRole('button', { name: 'Duplikálás' })[0])
    await waitFor(() => expect(writes('training_templates', 'insert')).toHaveLength(1))
    expect(writes('training_templates', 'insert')[0].payload[0].name).toBe('Erő 1. fázis (másolat)')
  })

  it('törlés megerősítés után törli a sablont', async () => {
    const user = userEvent.setup()
    renderTemplates()
    await screen.findByText('Erő 1. fázis')
    await user.click(screen.getAllByRole('button', { name: 'Törlés' })[0])
    expect(writes('training_templates', 'delete')).toHaveLength(0)
    const dialog = screen.getByRole('dialog', { name: 'Törlés megerősítése' })
    await user.click(within(dialog).getByRole('button', { name: 'Törlés' }))
    await waitFor(() => expect(writes('training_templates', 'delete')).toHaveLength(1))
  })

  it('új sablon: a Mentés létrehozza, a háttérre kattintás nem zárja be az ablakot', async () => {
    const user = userEvent.setup()
    renderTemplates()
    await screen.findByText('Erő 1. fázis')
    await user.click(screen.getByRole('button', { name: 'Új sablon' }))
    const dialog = screen.getByRole('dialog', { name: 'Új sablon létrehozása' })

    await user.type(within(dialog).getByLabelText('Sablon neve *'), 'Új erő')
    await user.click(dialog.parentElement)
    expect(screen.getByRole('dialog', { name: 'Új sablon létrehozása' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Sablon neve *')).toHaveValue('Új erő')

    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }))
    await waitFor(() => expect(writes('training_templates', 'insert')).toHaveLength(1))
    expect(writes('training_templates', 'insert')[0].payload[0]).toMatchObject({
      name: 'Új erő',
      type: 'gym',
      team_id: 't1',
    })
  })

  it('szerkesztéskor update fut, és mindhárom típus szerkesztője megnyílik', async () => {
    const user = userEvent.setup()
    renderTemplates()
    await screen.findByText('Erő 1. fázis')
    await user.click(screen.getAllByRole('button', { name: 'Szerkesztés' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Sablon szerkesztése' })
    expect(within(dialog).getByText('Gyakorlatok')).toBeInTheDocument() // Gym

    const type = within(dialog).getByLabelText('Típus *')
    await user.selectOptions(type, 'ball')
    expect(within(dialog).getByText('Keringési-mechanikai terhelés')).toBeInTheDocument()
    await user.selectOptions(type, 'tactic')
    expect(within(dialog).getByText('Taktikai Cél')).toBeInTheDocument()
    await user.selectOptions(type, 'gym')

    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }))
    await waitFor(() => expect(writes('training_templates', 'update')).toHaveLength(1))
  })
})

describe('Naptár oldal', () => {
  function renderCalendar(permissions = { calendar: 'edit' }) {
    return render(
      <TeamTestProvider
        value={{ teams: [TEAM], selectedTeam: TEAM, currentUserPermissions: permissions }}
      >
        <Calendar />
      </TeamTestProvider>
    )
  }

  it('a nézetváltó és a Gyors hozzáadás gomb megjelenik, hónap nézetben', async () => {
    const user = userEvent.setup()
    renderCalendar()
    expect(screen.getByRole('heading', { level: 1, name: 'Naptár' })).toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Nézet' })
    expect(within(group).getByRole('button', { name: 'Hónap', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gyors hozzáadás' })).toBeInTheDocument()

    await user.click(within(group).getByRole('button', { name: 'Hét' }))
    expect(screen.queryByRole('button', { name: 'Gyors hozzáadás' })).not.toBeInTheDocument()
    expect(screen.getByText('Taktika & Technika', { selector: 'h3' })).toBeInTheDocument()

    await user.click(within(group).getByRole('button', { name: 'Nap' }))
    expect(screen.getByRole('button', { name: 'Edzés hozzáadása' })).toBeInTheDocument()
  })

  it('Gyors hozzáadás megnyitja a modált, a háttérre kattintás nem zárja be', async () => {
    const user = userEvent.setup()
    renderCalendar()
    await user.click(screen.getByRole('button', { name: 'Gyors hozzáadás' }))
    const dialog = screen.getByRole('dialog', { name: 'Gyors edzés hozzáadás' })
    await user.click(dialog.parentElement)
    expect(screen.getByRole('dialog', { name: 'Gyors edzés hozzáadás' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Mégse' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('csak megtekintési joggal nincs Gyors hozzáadás és Edzés hozzáadása', async () => {
    const user = userEvent.setup()
    renderCalendar({ calendar: 'view' })
    expect(screen.queryByRole('button', { name: 'Gyors hozzáadás' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nap' }))
    expect(screen.queryByRole('button', { name: 'Edzés hozzáadása' })).not.toBeInTheDocument()
  })

  it('csapat nélkül üres állapotot mutat', () => {
    render(
      <TeamTestProvider value={{ selectedTeam: null }}>
        <Calendar />
      </TeamTestProvider>
    )
    expect(screen.getByText('Nincs kiválasztott csapat')).toBeInTheDocument()
  })
})

describe('Naptár nézetek', () => {
  const SESSION = {
    id: 's1',
    type: 'ball',
    date: '2026-10-21',
    start_time: '17:00:00',
    end_time: '18:30:00',
    location: 'Csarnok',
    notes: 'Gyors játék',
  }

  function dayViewProps(overrides = {}) {
    return {
      currentDate: new Date(2026, 9, 21),
      trainingDayOptions: {},
      getDayData: () => null,
      getTrainingSessionsForDate: () => [SESSION],
      getMatchesForDate: () => [],
      canEdit: true,
      setSelectedDateForSession: vi.fn(),
      setEditingSession: vi.fn(),
      setShowSessionModal: vi.fn(),
      deleteTrainingSession: vi.fn(),
      ...overrides,
    }
  }

  it('Nap nézet: új edzés, szerkesztés és törlés a megfelelő kezelőket hívja', async () => {
    const user = userEvent.setup()
    const props = dayViewProps()
    render(<DayView {...props} />)

    await user.click(screen.getByRole('button', { name: 'Edzés hozzáadása' }))
    expect(props.setSelectedDateForSession).toHaveBeenCalledWith(props.currentDate)
    expect(props.setEditingSession).toHaveBeenCalledWith(null)
    expect(props.setShowSessionModal).toHaveBeenCalledWith(true)

    await user.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    expect(props.setEditingSession).toHaveBeenLastCalledWith(SESSION)

    await user.click(screen.getByRole('button', { name: 'Törlés' }))
    expect(props.deleteTrainingSession).toHaveBeenCalledWith('s1')
  })

  function weekViewProps(overrides = {}) {
    return {
      currentDate: new Date(2026, 9, 21),
      daysOfWeek: ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'],
      trainingDayOptions: {},
      getWeekDays,
      getDayData: () => null,
      getTrainingSessionsForDate: () => [],
      getMatchesForDate: () => [],
      isToday: () => false,
      setCurrentDate: vi.fn(),
      setView: vi.fn(),
      hasBallTraining: () => true,
      canEdit: true,
      updateLoadFactor: vi.fn(),
      getLoadFactor: () => '',
      getTacticsTechnique: () => '',
      updateTacticsTechnique: vi.fn(),
      ...overrides,
    }
  }

  it('Hét nézet: a terhelési tényezők és a taktika mezők mentő kezelőket hívnak', async () => {
    const user = userEvent.setup()
    const props = weekViewProps()
    render(<WeekView {...props} />)

    await user.click(screen.getAllByRole('button', { name: 'Keringési terhelés: 3' })[0])
    expect(props.updateLoadFactor).toHaveBeenCalledWith(expect.any(Date), 'circulation', 3, true)

    await user.selectOptions(screen.getAllByLabelText('Terhelés:Pihenő')[0], '1:2')
    expect(props.updateLoadFactor).toHaveBeenCalledWith(expect.any(Date), 'ratio', '1:2', true)

    await user.type(screen.getAllByLabelText('Taktikai - Támadás')[0], 'x')
    expect(props.updateTacticsTechnique).toHaveBeenCalledWith(expect.any(Date), 'tactical_support', 'x')

    await user.selectOptions(screen.getAllByLabelText('Videó')[0], 'Igen')
    expect(props.updateTacticsTechnique).toHaveBeenCalledWith(expect.any(Date), 'video_url', 'Igen')
  })

  it('Hét nézet: labdás edzés nélküli napon a mezők tiltottak', () => {
    render(<WeekView {...weekViewProps({ hasBallTraining: () => false })} />)
    expect(screen.getAllByLabelText('Időtartam')[0]).toBeDisabled()
    expect(screen.getAllByLabelText('Gyak - Véd Közös')[0]).toBeDisabled()
  })

  it('Hónap nézet: egy napra kattintva a Nap nézetre vált', async () => {
    const user = userEvent.setup()
    const setCurrentDate = vi.fn()
    const setView = vi.fn()
    const currentDate = new Date(2026, 9, 21)
    render(
      <MonthView
        currentDate={currentDate}
        daysOfWeek={['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']}
        daysOfWeekShort={['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']}
        trainingDayOptions={{}}
        getDaysInMonth={(date) =>
          Array.from({ length: 31 }, (_, i) => new Date(date.getFullYear(), date.getMonth(), i + 1))
        }
        getDayData={() => null}
        getTrainingSessionsForDate={() => []}
        getMatchesForDate={() => []}
        isToday={() => false}
        isCurrentMonth={() => true}
        setCurrentDate={setCurrentDate}
        setView={setView}
      />
    )
    await user.click(screen.getByText('15'))
    expect(setView).toHaveBeenCalledWith('day')
    expect(setCurrentDate).toHaveBeenCalledWith(new Date(2026, 9, 15))
  })
})

describe('Edzés modálok', () => {
  it('új edzés: a Mentés beszúrja az edzést a csapathoz', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <TrainingSessionModal
        date={new Date(2026, 9, 21)}
        session={null}
        selectedTeam={TEAM}
        onClose={() => {}}
        onSave={onSave}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Új edzés hozzáadása' })
    await user.selectOptions(within(dialog).getByLabelText('Típus *'), 'tactic')
    await user.type(within(dialog).getByLabelText('Megjegyzések'), 'Bemelegítés')
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const [insert] = writes('training_sessions', 'insert')
    expect(insert.payload[0]).toMatchObject({
      team_id: 't1',
      date: '2026-10-21',
      type: 'tactic',
      notes: 'Bemelegítés',
      start_time: null,
    })
  })

  it('meglévő edzés szerkesztése update-et futtat', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <TrainingSessionModal
        date={null}
        session={{ id: 's1', date: '2026-10-21', type: 'gym', notes: '' }}
        selectedTeam={TEAM}
        onClose={() => {}}
        onSave={onSave}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Edzés szerkesztése' })
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(writes('training_sessions', 'update')).toHaveLength(1)
  })

  it('gyors hozzáadás: a bejelölt napokra edzést hoz létre', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <QuickAddTrainingModal
        currentDate={new Date(2026, 9, 15)}
        selectedTeam={TEAM}
        existingSessions={[]}
        onClose={() => {}}
        onSave={onSave}
      />
    )
    const save = screen.getByRole('button', { name: 'Változtatások mentése' })
    expect(save).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '2026-10-15 Konditerem' }))
    await user.click(screen.getByRole('button', { name: '2026-10-16 Labdás' }))
    expect(screen.getByText('2 új edzés létrehozása')).toBeInTheDocument()

    await user.click(save)
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const [insert] = writes('training_sessions', 'insert')
    expect(insert.payload.map((s) => `${s.date}:${s.type}`)).toEqual([
      '2026-10-15:gym',
      '2026-10-16:ball',
    ])
  })
})
