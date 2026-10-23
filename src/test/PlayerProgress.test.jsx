import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

const LIVE = { line: 'rgb(1 1 1)', muted: 'rgb(2 2 2)', surface: 'rgb(3 3 3)', accent: 'rgb(4 4 4)', ok: 'rgb(5 5 5)', warn: 'rgb(6 6 6)', bad: 'rgb(7 7 7)' }
const LIGHT = { line: 'rgb(11 11 11)', muted: 'rgb(12 12 12)', surface: 'rgb(13 13 13)', accent: 'rgb(14 14 14)', ok: 'rgb(15 15 15)', warn: 'rgb(16 16 16)', bad: 'rgb(17 17 17)' }

vi.mock('../hooks/useThemeColors', () => ({
  useThemeColors: () => LIVE,
  readThemeColors: vi.fn(() => LIGHT),
}))

vi.mock('../context/TeamContext', () => ({
  useTeams: () => ({ selectedTeam: { id: 't1', name: 'Csapat' } }),
}))
vi.mock('../hooks/usePlayers', () => ({
  usePlayers: () => ({ data: [{ id: 'p1', name: 'Kiss Pál', jersey_number: 7 }] }),
}))
vi.mock('../hooks/useExercises', () => ({
  useExercises: () => ({ data: [{ id: 'e1', name: 'Fekvenyomás', unit: 'kg', category: 'strength' }] }),
}))

vi.mock('../lib/supabase', () => {
  const rows = [
    { id: 'm1', value: '80', reps: 5, one_rm: '90', measured_at: '2026-01-01', notes: '', exercise: { unit: 'kg' } },
    { id: 'm2', value: '90', reps: 5, one_rm: '100', measured_at: '2026-02-01', notes: '', exercise: { unit: 'kg' } },
  ]
  const q = { select: () => q, eq: () => q, gte: () => q, lte: () => q, order: () => q, then: (res) => res({ data: rows, error: null }) }
  return { supabase: { from: () => q } }
})

// Recharts rajzolás jsdom-ban nem működik: a prop-okat data-attribútumként tesszük ki.
vi.mock('recharts', () => {
  const Pass = ({ children }) => <div>{children}</div>
  return {
    ResponsiveContainer: Pass,
    LineChart: Pass,
    Line: ({ stroke, dataKey }) => <i data-testid={`line-${dataKey}`} data-stroke={stroke} />,
    CartesianGrid: ({ stroke }) => <i data-testid="grid" data-stroke={stroke} />,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    ReferenceDot: () => null,
    ReferenceArea: () => null,
  }
})

const captured = { grid: null, line: null }
vi.mock('../lib/pdfCapture', () => ({
  captureForPdf: vi.fn(async () => {
    captured.grid = document.querySelector('[data-testid="grid"]').dataset.stroke
    captured.line = document.querySelector('[data-testid="line-value"]').dataset.stroke
    return { toDataURL: () => 'data:image/png;base64,' }
  }),
}))

vi.mock('../lib/pdfExport', () => ({
  exportTablePdf: vi.fn(async ({ beforeTable }) => {
    await beforeTable({ addImage() {}, setFontSize() {}, setFont() {}, text() {}, addPage() {} })
  }),
}))

import PlayerProgress from '../pages/PlayerProgress'
import { captureForPdf } from '../lib/pdfCapture'
import { readThemeColors } from '../hooks/useThemeColors'

describe('PlayerProgress PDF export', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0))
    captureForPdf.mockClear()
    readThemeColors.mockClear()
  })

  it('draws the chart with the light palette only while capturing it for the PDF', async () => {
    render(<PlayerProgress />)

    fireEvent.change(screen.getByLabelText('Játékos'), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText('Gyakorlat'), { target: { value: 'e1' } })

    await waitFor(() => expect(screen.getByTestId('grid')).toBeTruthy())
    // Normál működés: élő téma színei, egyetlen PDF gomb a fejlécben.
    expect(screen.getByTestId('grid').dataset.stroke).toBe(LIVE.line)
    expect(screen.getAllByRole('button', { name: /PDF exportálás/ })).toHaveLength(1)
    expect(readThemeColors).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /PDF exportálás/ }))
    })

    await waitFor(() => expect(captureForPdf).toHaveBeenCalledTimes(1))
    expect(readThemeColors).toHaveBeenCalledWith('light')
    expect(captured.grid).toBe(LIGHT.line)
    expect(captured.line).toBe(LIGHT.accent)

    // Export után vissza az élő témára.
    await waitFor(() => expect(screen.getByTestId('grid').dataset.stroke).toBe(LIVE.line))
  })

  it('disables the PDF button while exporting so a second export cannot start', async () => {
    let release
    captureForPdf.mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve({ toDataURL: () => 'data:image/png;base64,' }) })
    )
    render(<PlayerProgress />)

    fireEvent.change(screen.getByLabelText('Játékos'), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText('Gyakorlat'), { target: { value: 'e1' } })
    await waitFor(() => expect(screen.getByTestId('grid')).toBeTruthy())

    const button = screen.getByRole('button', { name: /PDF exportálás/ })
    expect(button).not.toBeDisabled()

    await act(async () => {
      fireEvent.click(button)
    })
    await waitFor(() => expect(captureForPdf).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: /PDF exportálás/ })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /PDF exportálás/ }))
    expect(captureForPdf).toHaveBeenCalledTimes(1)

    await act(async () => {
      release()
    })
    await waitFor(() => expect(screen.getByRole('button', { name: /PDF exportálás/ })).not.toBeDisabled())
  })
})
