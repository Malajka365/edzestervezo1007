import { Save } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'

export default function ExerciseModal({
  editingExercise,
  exerciseForm,
  setExerciseForm,
  setShowExerciseModal,
  setEditingExercise,
  handleCreateExercise,
}) {
  const handleClose = () => {
    setShowExerciseModal(false)
    setEditingExercise(null)
    setExerciseForm({ name: '', category: 'strength', unit: 'kg', description: '' })
  }

  return (
    <Modal
      open
      onClose={handleClose}
      title={editingExercise ? 'Gyakorlat szerkesztése' : 'Új gyakorlat'}
      footer={
        <>
          <Button onClick={() => setShowExerciseModal(false)}>Mégse</Button>
          <Button type="submit" form="exercise-form" variant="primary" icon={Save}>
            Létrehozás
          </Button>
        </>
      }
    >
      <form id="exercise-form" onSubmit={handleCreateExercise} className="space-y-4">
        <Field label="Gyakorlat neve *" htmlFor="exercise-name">
          <Input
            id="exercise-name"
            type="text"
            value={exerciseForm.name}
            onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
            required
            placeholder="pl. Guggolás"
          />
        </Field>
        <Field label="Kategória" htmlFor="exercise-category">
          <Select
            id="exercise-category"
            value={exerciseForm.category}
            onChange={(e) => setExerciseForm({ ...exerciseForm, category: e.target.value })}
          >
            <option value="strength">Erő</option>
            <option value="cardio">Kardió</option>
            <option value="flexibility">Rugalmasság</option>
            <option value="player_params">Játékos paraméterek</option>
            <option value="other">Egyéb</option>
          </Select>
        </Field>
        <Field label="Mértékegység" htmlFor="exercise-unit">
          <Select
            id="exercise-unit"
            value={exerciseForm.unit}
            onChange={(e) => setExerciseForm({ ...exerciseForm, unit: e.target.value })}
          >
            {exerciseForm.category === 'player_params' ? (
              <>
                <option value="kg">kg</option>
                <option value="cm">cm</option>
              </>
            ) : (
              <>
                <option value="kg">kg</option>
                <option value="cm">cm</option>
                <option value="reps">ismétlés</option>
                <option value="m">m</option>
                <option value="sec">másodperc</option>
                <option value="min">perc</option>
              </>
            )}
          </Select>
        </Field>
        <Field label="Leírás" htmlFor="exercise-description">
          <Textarea
            id="exercise-description"
            value={exerciseForm.description}
            onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
            className="resize-none"
            rows="3"
          />
        </Field>
      </form>
    </Modal>
  )
}
