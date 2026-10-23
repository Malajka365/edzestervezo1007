import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import Button from './ui/Button'
import IconButton from './ui/IconButton'
import { Input, Select } from './ui/Field'

export default function GymTemplateEditor({ templateData, onChange }) {
  const [exercises, setExercises] = useState(templateData?.exercises || [])

  const handleAddExercise = () => {
    const newExercise = {
      id: Date.now().toString(),
      name: '',
      sets: 3,
      reps: 10,
      load: '',
      load_type: 'percentage', // percentage, weight, rpe
      rest_seconds: 90,
      tempo: '',
      notes: '',
    }
    const updated = [...exercises, newExercise]
    setExercises(updated)
    onChange({ exercises: updated })
  }

  const handleUpdateExercise = (id, field, value) => {
    const updated = exercises.map(ex => 
      ex.id === id ? { ...ex, [field]: value } : ex
    )
    setExercises(updated)
    onChange({ exercises: updated })
  }

  const handleDeleteExercise = (id) => {
    const updated = exercises.filter(ex => ex.id !== id)
    setExercises(updated)
    onChange({ exercises: updated })
  }

  const handleMoveExercise = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= exercises.length) return

    const updated = [...exercises]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setExercises(updated)
    onChange({ exercises: updated })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-fg">Gyakorlatok</h3>
        <Button icon={Plus} onClick={handleAddExercise}>
          Gyakorlat hozzáadása
        </Button>
      </div>

      {exercises.length === 0 ? (
        <div className="text-center py-8 bg-surface-2/50 rounded-lg border-2 border-dashed border-line">
          <p className="text-muted">Még nincs gyakorlat hozzáadva</p>
          <p className="text-sm text-muted mt-2">Kattints a "Gyakorlat hozzáadása" gombra</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className="bg-surface-2/50 rounded-lg p-4 border border-line"
            >
              {/* Header with move and delete */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex flex-col gap-1">
                  <IconButton
                    icon={ChevronUp}
                    label="Feljebb"
                    size="sm"
                    onClick={() => handleMoveExercise(index, 'up')}
                    disabled={index === 0}
                  />
                  <IconButton
                    icon={ChevronDown}
                    label="Lejjebb"
                    size="sm"
                    onClick={() => handleMoveExercise(index, 'down')}
                    disabled={index === exercises.length - 1}
                  />
                </div>

                <span className="text-muted font-semibold">{index + 1}.</span>

                <Input
                  type="text"
                  value={exercise.name}
                  onChange={(e) => handleUpdateExercise(exercise.id, 'name', e.target.value)}
                  className="flex-1"
                  placeholder="Gyakorlat neve"
                />

                <IconButton
                  icon={Trash2}
                  label="Törlés"
                  onClick={() => handleDeleteExercise(exercise.id)}
                  className="hover:!bg-bad-soft hover:!text-bad"
                />
              </div>

              {/* Exercise details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Sets */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Sorozatok
                  </label>
                  <Input
                    type="number"
                    value={exercise.sets}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'sets', parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>

                {/* Reps */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Ismétlések
                  </label>
                  <Input
                    type="text"
                    value={exercise.reps}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'reps', e.target.value)}
                    placeholder="pl. 8-10"
                  />
                </div>

                {/* Load Type */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Terhelés típusa
                  </label>
                  <Select
                    value={exercise.load_type}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'load_type', e.target.value)}
                  >
                    <option value="percentage">% 1RM</option>
                    <option value="weight">Súly (kg)</option>
                    <option value="rpe">RPE</option>
                    <option value="bodyweight">Testsúly</option>
                  </Select>
                </div>

                {/* Load Value */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Terhelés értéke
                  </label>
                  <Input
                    type="text"
                    value={exercise.load}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'load', e.target.value)}
                    placeholder={
                      exercise.load_type === 'percentage' ? '75' :
                      exercise.load_type === 'weight' ? '80' :
                      exercise.load_type === 'rpe' ? '7-8' :
                      '-'
                    }
                  />
                </div>

                {/* Rest */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Pihenő (mp)
                  </label>
                  <Input
                    type="number"
                    value={exercise.rest_seconds}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'rest_seconds', parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>

                {/* Tempo */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Tempó
                  </label>
                  <Input
                    type="text"
                    value={exercise.tempo}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'tempo', e.target.value)}
                    placeholder="pl. 3-0-1-0"
                  />
                </div>

                {/* Notes (full width) */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted mb-1">
                    Megjegyzések
                  </label>
                  <Input
                    type="text"
                    value={exercise.notes}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'notes', e.target.value)}
                    placeholder="Végrehajtási utasítások..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {exercises.length > 0 && (
        <div className="bg-accent-soft border border-accent/30 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg">Összesen gyakorlatok:</span>
            <span className="font-semibold text-accent">{exercises.length} db</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-fg">Becsült időtartam:</span>
            <span className="font-semibold text-accent">
              {Math.round(exercises.reduce((total, ex) => 
                total + (ex.sets * (ex.rest_seconds || 0) / 60), 0
              ))} perc
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
