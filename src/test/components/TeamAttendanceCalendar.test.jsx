import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Láncolható, "thenable" Supabase-mock: a jelenlét-lekérdezés ATTENDANCE-t adja.
const ATTENDANCE = [
  {
    id: 'a1',
    date: '2026-09-15',
    player_id: 'p1',
    status: 'beteg',
    training_type: 'regeneráció',
    event_time: '10:00',
    notes: 'régi jegyzet',
    players: { name: 'Kiss Péter', jersey_number: 7 },
  },
]
vi.mock('@/lib/supabase', () => {
  const builder = {}
  const chain = () => builder
  for (const method of ['from', 'select', 'eq', 'gte', 'lte', 'insert', 'update', 'delete']) {
    builder[method] = chain
  }
  builder.then = (resolve) => resolve({ data: ATTENDANCE, error: null })
  return { supabase: builder }
})

vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({ data: [{ id: 'p1', name: 'Kiss Péter', jersey_number: 7 }] }),
}))

const saveAttendance = vi.fn(async () => 'inserted')
vi.mock('@/lib/attendance', async (importOriginal) => ({
  ...(await importOriginal()),
  saveAttendance: (...args) => saveAttendance(...args),
}))

const { default: TeamAttendanceCalendar } = await import('@/components/TeamAttendanceCalendar')

describe('TeamAttendanceCalendar', () => {
  beforeEach(() => {
    // 2026. szept. 30. (szerda): a hét hétfő szept. 28 - vasárnap okt. 4.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 30, 12))
    saveAttendance.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('a napi nézet "Jelenlét felvitele" gombja üres űrlapot nyit egy korábbi szerkesztés után', async () => {
    const user = userEvent.setup()
    render(<TeamAttendanceCalendar teamId="t1" />)

    // Meglévő bejegyzés megnyitása a havi nézetben: az űrlap feltöltődik.
    await user.click(await screen.findByRole('button', { name: /Kiss Péter/ }))
    expect(screen.getByLabelText('Megjegyzés')).toHaveValue('régi jegyzet')
    await user.click(screen.getByRole('button', { name: 'Bezárás' }))

    await user.click(screen.getByRole('button', { name: 'Nap' }))
    await user.click(screen.getByRole('button', { name: 'Jelenlét felvitele' }))

    const dialog = screen.getByRole('dialog', { name: 'Jelenlét - 2026-09-30' })
    expect(within(dialog).getByLabelText('Megjegyzés')).toHaveValue('')
    expect(within(dialog).getByLabelText('Játékos *')).toHaveValue('')
    expect(within(dialog).getByLabelText('Státusz *')).toHaveValue('jelen')
    expect(within(dialog).getByLabelText('Időpont')).toHaveValue('')
    expect(within(dialog).queryByRole('button', { name: 'Törlés' })).not.toBeInTheDocument()
  })

  it('a heti nézetben a hónapon átnyúló napra a helyes dátummal ment', async () => {
    const user = userEvent.setup()
    render(<TeamAttendanceCalendar teamId="t1" />)

    await user.click(screen.getByRole('button', { name: 'Hét' }))
    // Csütörtök = okt. 1., a következő hónapban.
    const addButtons = screen.getAllByRole('button', { name: 'Új jelenlét hozzáadása' })
    await user.click(addButtons[3])

    const dialog = screen.getByRole('dialog', { name: 'Jelenlét - 2026-10-01' })
    await user.selectOptions(within(dialog).getByLabelText('Játékos *'), 'p1')
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }))

    expect(saveAttendance).toHaveBeenCalledWith({
      id: null,
      data: expect.objectContaining({ date: '2026-10-01', player_id: 'p1', team_id: 't1' }),
    })
  })
})
