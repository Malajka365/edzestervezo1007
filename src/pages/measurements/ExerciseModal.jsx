import { X, Save } from 'lucide-react'

export default function ExerciseModal({
  editingExercise,
  exerciseForm,
  setExerciseForm,
  setShowExerciseModal,
  setEditingExercise,
  handleCreateExercise,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{editingExercise ? 'Gyakorlat Szerkesztése' : 'Új Gyakorlat'}</h3>
          <button onClick={() => {
            setShowExerciseModal(false)
            setEditingExercise(null)
            setExerciseForm({ name: '', category: 'strength', unit: 'kg', description: '' })
          }} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleCreateExercise} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gyakorlat neve *</label>
            <input type="text" value={exerciseForm.name} onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })} required className="input-field" placeholder="pl. Guggolás" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Kategória</label>
            <select value={exerciseForm.category} onChange={(e) => setExerciseForm({ ...exerciseForm, category: e.target.value })} className="input-field">
              <option value="strength">Erő</option>
              <option value="cardio">Kardió</option>
              <option value="flexibility">Rugalmasság</option>
              <option value="player_params">Játékos paraméterek</option>
              <option value="other">Egyéb</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Mértékegység</label>
            <select value={exerciseForm.unit} onChange={(e) => setExerciseForm({ ...exerciseForm, unit: e.target.value })} className="input-field">
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
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Leírás</label>
            <textarea value={exerciseForm.description} onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })} className="input-field resize-none" rows="3" />
          </div>
          <div className="flex items-center space-x-3 pt-4">
            <button type="submit" className="flex-1 btn-primary flex items-center justify-center space-x-2">
              <Save className="w-5 h-5" />
              <span>Létrehozás</span>
            </button>
            <button type="button" onClick={() => setShowExerciseModal(false)} className="flex-1 btn-secondary">Mégse</button>
          </div>
        </form>
      </div>
    </div>
  )
}
