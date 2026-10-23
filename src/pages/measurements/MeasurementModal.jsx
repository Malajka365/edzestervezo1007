import { Save, TrendingUp } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'

export default function MeasurementModal({
  players,
  exercises,
  measurementForm,
  setMeasurementForm,
  setShowMeasurementModal,
  handleCreateMeasurement,
  calculate1RM,
}) {
  const close = () => setShowMeasurementModal(false)
  const selectedExercise = measurementForm.exercise_id
    ? exercises.find((e) => e.id === measurementForm.exercise_id)
    : undefined

  return (
    <Modal
      open
      onClose={close}
      title="Új mérés rögzítése"
      footer={
        <>
          <Button onClick={close}>Mégse</Button>
          <Button type="submit" form="measurement-form" variant="primary" icon={Save}>
            Rögzítés
          </Button>
        </>
      }
    >
      <form id="measurement-form" onSubmit={handleCreateMeasurement} className="space-y-4">
        <Field label="Játékos *" htmlFor="measurement-player">
          <Select
            id="measurement-player"
            value={measurementForm.player_id}
            onChange={(e) => setMeasurementForm({ ...measurementForm, player_id: e.target.value })}
            required
          >
            <option value="">Válassz játékost</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.jersey_number ? `#${player.jersey_number} ` : ''}
                {player.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gyakorlat *" htmlFor="measurement-exercise">
          <Select
            id="measurement-exercise"
            value={measurementForm.exercise_id}
            onChange={(e) => setMeasurementForm({ ...measurementForm, exercise_id: e.target.value })}
            required
          >
            <option value="">Válassz gyakorlatot</option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </Select>
        </Field>
        {selectedExercise?.unit === 'reps' ? (
          // Only show "Ismétlések" for reps exercises
          <Field label="Ismétlések *" htmlFor="measurement-value">
            <Input
              id="measurement-value"
              type="number"
              min="1"
              value={measurementForm.value}
              onChange={(e) =>
                setMeasurementForm({ ...measurementForm, value: e.target.value, reps: '1' })
              }
              required
              placeholder="pl. 15"
            />
          </Field>
        ) : selectedExercise?.unit === 'cm' ? (
          // Only show single field for cm exercises (e.g., height)
          <Field label={`${selectedExercise.name} (cm) *`} htmlFor="measurement-value">
            <Input
              id="measurement-value"
              type="number"
              step="0.1"
              min="0"
              value={measurementForm.value}
              onChange={(e) =>
                setMeasurementForm({ ...measurementForm, value: e.target.value, reps: '1' })
              }
              required
              placeholder="pl. 180"
            />
          </Field>
        ) : selectedExercise?.category === 'player_params' ? (
          // Only show single field for player parameter exercises (e.g., weight)
          <Field
            label={`${selectedExercise.name} (${selectedExercise.unit}) *`}
            htmlFor="measurement-value"
          >
            <Input
              id="measurement-value"
              type="number"
              step="0.1"
              min="0"
              value={measurementForm.value}
              onChange={(e) =>
                setMeasurementForm({ ...measurementForm, value: e.target.value, reps: '1' })
              }
              required
              placeholder={selectedExercise.unit === 'kg' ? 'pl. 75' : 'pl. 100'}
            />
          </Field>
        ) : (
          // Show both fields for other exercises (kg, etc.)
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Érték *" htmlFor="measurement-value">
              <Input
                id="measurement-value"
                type="number"
                step="0.1"
                value={measurementForm.value}
                onChange={(e) => setMeasurementForm({ ...measurementForm, value: e.target.value })}
                required
                placeholder="pl. 100"
              />
            </Field>
            <Field label="Ismétlések" htmlFor="measurement-reps">
              <Input
                id="measurement-reps"
                type="number"
                min="1"
                value={measurementForm.reps}
                onChange={(e) => setMeasurementForm({ ...measurementForm, reps: e.target.value })}
              />
            </Field>
          </div>
        )}
        <Field label="Dátum *" htmlFor="measurement-date">
          <Input
            id="measurement-date"
            type="date"
            value={measurementForm.measured_at}
            onChange={(e) => setMeasurementForm({ ...measurementForm, measured_at: e.target.value })}
            required
          />
        </Field>
        <Field label="Jegyzetek" htmlFor="measurement-notes">
          <Textarea
            id="measurement-notes"
            value={measurementForm.notes}
            onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })}
            className="resize-none"
            rows="3"
            placeholder="Opcionális jegyzetek..."
          />
        </Field>
        {measurementForm.value &&
          measurementForm.reps &&
          selectedExercise &&
          selectedExercise.unit !== 'reps' &&
          selectedExercise.unit !== 'cm' && (
            <div className="rounded-[9px] border border-accent bg-accent-soft p-3">
              <p className="text-sm text-accent">
                <TrendingUp className="mr-1 inline h-4 w-4" aria-hidden="true" />
                Kalkulált 1RM:{' '}
                <strong>
                  {calculate1RM(parseFloat(measurementForm.value), parseInt(measurementForm.reps))}{' '}
                  {selectedExercise.unit}
                </strong>
              </p>
            </div>
          )}
      </form>
    </Modal>
  )
}
