import { X, Save, TrendingUp } from 'lucide-react'

export default function MeasurementModal({
  players,
  exercises,
  measurementForm,
  setMeasurementForm,
  setShowMeasurementModal,
  handleCreateMeasurement,
  calculate1RM,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full p-6 border border-slate-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Új Mérés Rögzítése</h3>
          <button onClick={() => setShowMeasurementModal(false)} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleCreateMeasurement} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Játékos *</label>
            <select value={measurementForm.player_id} onChange={(e) => setMeasurementForm({ ...measurementForm, player_id: e.target.value })} required className="input-field">
              <option value="">Válassz játékost</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.jersey_number ? `#${player.jersey_number} ` : ''}{player.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gyakorlat *</label>
            <select value={measurementForm.exercise_id} onChange={(e) => setMeasurementForm({ ...measurementForm, exercise_id: e.target.value })} required className="input-field">
              <option value="">Válassz gyakorlatot</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </select>
          </div>
          {measurementForm.exercise_id && exercises.find(e => e.id === measurementForm.exercise_id)?.unit === 'reps' ? (
            // Only show "Ismétlések" for reps exercises
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ismétlések *</label>
              <input
                type="number"
                min="1"
                value={measurementForm.value}
                onChange={(e) => setMeasurementForm({ ...measurementForm, value: e.target.value, reps: '1' })}
                required
                className="input-field"
                placeholder="pl. 15"
              />
            </div>
          ) : measurementForm.exercise_id && exercises.find(e => e.id === measurementForm.exercise_id)?.unit === 'cm' ? (
            // Only show single field for cm exercises (e.g., height)
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {exercises.find(e => e.id === measurementForm.exercise_id)?.name} (cm) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={measurementForm.value}
                onChange={(e) => setMeasurementForm({ ...measurementForm, value: e.target.value, reps: '1' })}
                required
                className="input-field"
                placeholder="pl. 180"
              />
            </div>
          ) : measurementForm.exercise_id && exercises.find(e => e.id === measurementForm.exercise_id)?.category === 'player_params' ? (
            // Only show single field for player parameter exercises (e.g., weight)
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {exercises.find(e => e.id === measurementForm.exercise_id)?.name} ({exercises.find(e => e.id === measurementForm.exercise_id)?.unit}) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={measurementForm.value}
                onChange={(e) => setMeasurementForm({ ...measurementForm, value: e.target.value, reps: '1' })}
                required
                className="input-field"
                placeholder={exercises.find(e => e.id === measurementForm.exercise_id)?.unit === 'kg' ? "pl. 75" : "pl. 100"}
              />
            </div>
          ) : (
            // Show both fields for other exercises (kg, etc.)
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Érték *</label>
                <input type="number" step="0.1" value={measurementForm.value} onChange={(e) => setMeasurementForm({ ...measurementForm, value: e.target.value })} required className="input-field" placeholder="pl. 100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ismétlések</label>
                <input type="number" min="1" value={measurementForm.reps} onChange={(e) => setMeasurementForm({ ...measurementForm, reps: e.target.value })} className="input-field" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Dátum *</label>
            <input type="date" value={measurementForm.measured_at} onChange={(e) => setMeasurementForm({ ...measurementForm, measured_at: e.target.value })} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Jegyzetek</label>
            <textarea value={measurementForm.notes} onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })} className="input-field resize-none" rows="3" placeholder="Opcionális jegyzetek..." />
          </div>
          {measurementForm.value && measurementForm.reps && measurementForm.exercise_id &&
           exercises.find(e => e.id === measurementForm.exercise_id)?.unit !== 'reps' &&
           exercises.find(e => e.id === measurementForm.exercise_id)?.unit !== 'cm' && (
            <div className="bg-primary-900/30 border border-primary-700 rounded-lg p-3">
              <p className="text-sm text-primary-300">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Kalkulált 1RM: <strong>{calculate1RM(parseFloat(measurementForm.value), parseInt(measurementForm.reps))} {exercises.find(e => e.id === measurementForm.exercise_id)?.unit}</strong>
              </p>
            </div>
          )}
          <div className="flex items-center space-x-3 pt-4">
            <button type="submit" className="flex-1 btn-primary flex items-center justify-center space-x-2">
              <Save className="w-5 h-5" />
              <span>Rögzítés</span>
            </button>
            <button type="button" onClick={() => setShowMeasurementModal(false)} className="flex-1 btn-secondary">Mégse</button>
          </div>
        </form>
      </div>
    </div>
  )
}
