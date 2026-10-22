import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MeasurementModal from '../pages/measurements/MeasurementModal'
import ExerciseManagementModal from '../pages/measurements/ExerciseManagementModal'

const players = [{ id: 'p1', name: 'Kiss Pál', jersey_number: 7 }]
const exercises = [{ id: 'e1', name: 'Fekvenyomás', unit: 'kg', category: 'strength' }]

describe('MeasurementModal', () => {
  it('footer submit button submits the form (form="…" wiring)', () => {
    const handleCreateMeasurement = vi.fn((e) => e.preventDefault())
    render(
      <MeasurementModal
        players={players}
        exercises={exercises}
        measurementForm={{ player_id: 'p1', exercise_id: 'e1', value: '100', reps: '5', measured_at: '2026-01-01', notes: '' }}
        setMeasurementForm={() => {}}
        setShowMeasurementModal={() => {}}
        handleCreateMeasurement={handleCreateMeasurement}
        calculate1RM={() => 117}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Rögzítés' }))

    expect(handleCreateMeasurement).toHaveBeenCalledTimes(1)
  })
})

describe('ExerciseManagementModal', () => {
  it('edit and delete icon buttons call their handlers; delete has a danger hover cue', () => {
    const openEditExercise = vi.fn()
    const handleDeleteExercise = vi.fn()
    render(
      <ExerciseManagementModal
        exercises={exercises}
        canEdit
        openEditExercise={openEditExercise}
        handleDeleteExercise={handleDeleteExercise}
        setShowExerciseManagementModal={() => {}}
      />
    )

    fireEvent.click(screen.getByLabelText('Szerkesztés'))
    const del = screen.getByLabelText('Törlés')
    fireEvent.click(del)

    expect(openEditExercise).toHaveBeenCalledWith(exercises[0])
    expect(handleDeleteExercise).toHaveBeenCalledWith('e1')
    expect(del.className).toContain('hover:!text-bad')
  })
})
