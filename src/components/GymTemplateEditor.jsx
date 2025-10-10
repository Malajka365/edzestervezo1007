import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

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
        <h3 className="text-lg font-semibold text-white">Gyakorlatok</h3>
        <button
          type="button"
          onClick={handleAddExercise}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Gyakorlat hozzáadása</span>
        </button>
      </div>

      {exercises.length === 0 ? (
        <div className="text-center py-8 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
          <p className="text-slate-400">Még nincs gyakorlat hozzáadva</p>
          <p className="text-sm text-slate-500 mt-2">Kattints a "Gyakorlat hozzáadása" gombra</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
            >
              {/* Header with move and delete */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveExercise(index, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <GripVertical className="w-4 h-4 text-slate-400 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveExercise(index, 'down')}
                    disabled={index === exercises.length - 1}
                    className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <GripVertical className="w-4 h-4 text-slate-400 -rotate-90" />
                  </button>
                </div>

                <span className="text-slate-400 font-semibold">{index + 1}.</span>

                <input
                  type="text"
                  value={exercise.name}
                  onChange={(e) => handleUpdateExercise(exercise.id, 'name', e.target.value)}
                  className="flex-1 input-field"
                  placeholder="Gyakorlat neve"
                />

                <button
                  type="button"
                  onClick={() => handleDeleteExercise(exercise.id)}
                  className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                  title="Törlés"
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Exercise details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Sets */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Sorozatok
                  </label>
                  <input
                    type="number"
                    value={exercise.sets}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'sets', parseInt(e.target.value) || 0)}
                    className="input-field w-full"
                    min="1"
                  />
                </div>

                {/* Reps */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Ismétlések
                  </label>
                  <input
                    type="text"
                    value={exercise.reps}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'reps', e.target.value)}
                    className="input-field w-full"
                    placeholder="pl. 8-10"
                  />
                </div>

                {/* Load Type */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Terhelés típusa
                  </label>
                  <select
                    value={exercise.load_type}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'load_type', e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="percentage">% 1RM</option>
                    <option value="weight">Súly (kg)</option>
                    <option value="rpe">RPE</option>
                    <option value="bodyweight">Testsúly</option>
                  </select>
                </div>

                {/* Load Value */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Terhelés értéke
                  </label>
                  <input
                    type="text"
                    value={exercise.load}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'load', e.target.value)}
                    className="input-field w-full"
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
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Pihenő (mp)
                  </label>
                  <input
                    type="number"
                    value={exercise.rest_seconds}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'rest_seconds', parseInt(e.target.value) || 0)}
                    className="input-field w-full"
                    min="0"
                  />
                </div>

                {/* Tempo */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Tempó
                  </label>
                  <input
                    type="text"
                    value={exercise.tempo}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'tempo', e.target.value)}
                    className="input-field w-full"
                    placeholder="pl. 3-0-1-0"
                  />
                </div>

                {/* Notes (full width) */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Megjegyzések
                  </label>
                  <input
                    type="text"
                    value={exercise.notes}
                    onChange={(e) => handleUpdateExercise(exercise.id, 'notes', e.target.value)}
                    className="input-field w-full"
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
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Összesen gyakorlatok:</span>
            <span className="font-semibold text-primary-400">{exercises.length} db</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-300">Becsült időtartam:</span>
            <span className="font-semibold text-primary-400">
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
