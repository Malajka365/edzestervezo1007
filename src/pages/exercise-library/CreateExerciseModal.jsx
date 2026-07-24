import { X, Plus } from 'lucide-react'
import { MUSCLE_GROUPS, MODALITIES } from '../../lib/exerciseTaxonomy'
import MediaUpload from './MediaUpload'
import ChipMultiSelect from './ChipMultiSelect'
import MusclePicker from './MusclePicker'

export default function CreateExerciseModal({
  setShowCreateModal,
  newExercise,
  setNewExercise,
  createExercise,
  loading,
  equipmentTypes,
  muscles,
  detailMuscles,
  setDetailMuscles,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white">Új gyakorlat létrehozása</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Name (HU) */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Gyakorlat neve (magyar) *
                </label>
                <input
                  type="text"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="pl. Fekvenyomás"
                />
              </div>

              {/* Name (EN) */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Angol név
                </label>
                <input
                  type="text"
                  value={newExercise.name_en || ''}
                  onChange={(e) => setNewExercise({ ...newExercise, name_en: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="pl. Bench Press"
                />
              </div>

              {/* Muscle Group & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Izomcsoport
                  </label>
                  <select
                    value={newExercise.muscle_group}
                    onChange={(e) => setNewExercise({ ...newExercise, muscle_group: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {MUSCLE_GROUPS.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Nehézség
                  </label>
                  <select
                    value={newExercise.difficulty}
                    onChange={(e) => setNewExercise({ ...newExercise, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="beginner">Kezdő</option>
                    <option value="intermediate">Haladó</option>
                    <option value="advanced">Profi</option>
                  </select>
                </div>
              </div>

              {/* Modality & Type */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Modalitás
                  </label>
                  <select
                    value={newExercise.modality || 'erosites'}
                    onChange={(e) => setNewExercise({ ...newExercise, modality: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {MODALITIES.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GIF / media */}
              <MediaUpload
                value={newExercise.gif_path}
                onChange={(path) => setNewExercise({ ...newExercise, gif_path: path })}
                slugBase={newExercise.name_en || newExercise.name}
              />

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Leírás
                </label>
                <textarea
                  value={newExercise.description}
                  onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  placeholder="Rövid leírás a gyakorlatról..."
                />
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Szükséges eszközök
                </label>
                <ChipMultiSelect
                  options={(equipmentTypes || []).map((e) => ({ value: e.code, label: e.name_hu }))}
                  value={newExercise.equipment}
                  onChange={(v) => setNewExercise({ ...newExercise, equipment: v })}
                  placeholder="Eszköz hozzáadása..."
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Végrehajtás (lépések)
                </label>
                <div className="space-y-2">
                  {newExercise.instructions.map((instruction, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium mt-2">
                        {idx + 1}
                      </span>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={instruction}
                          onChange={(e) => {
                            const newInstructions = [...newExercise.instructions]
                            newInstructions[idx] = e.target.value
                            setNewExercise({ ...newExercise, instructions: newInstructions })
                          }}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={`${idx + 1}. lépés`}
                        />
                        <button
                          onClick={() => {
                            const newInstructions = newExercise.instructions.filter((_, i) => i !== idx)
                            setNewExercise({ ...newExercise, instructions: newInstructions })
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setNewExercise({
                        ...newExercise,
                        instructions: [...newExercise.instructions, '']
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Lépés hozzáadása
                  </button>
                </div>
              </div>

              {/* Tips */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tippek
                </label>
                <div className="space-y-2">
                  {newExercise.tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-yellow-400 mt-2">•</span>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={tip}
                          onChange={(e) => {
                            const newTips = [...newExercise.tips]
                            newTips[idx] = e.target.value
                            setNewExercise({ ...newExercise, tips: newTips })
                          }}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Tipp..."
                        />
                        <button
                          onClick={() => {
                            const newTips = newExercise.tips.filter((_, i) => i !== idx)
                            setNewExercise({ ...newExercise, tips: newTips })
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setNewExercise({
                        ...newExercise,
                        tips: [...newExercise.tips, '']
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tipp hozzáadása
                  </button>
                </div>
              </div>

              {/* Secondary Muscles */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Másodlagos izomcsoportok
                </label>
                <ChipMultiSelect
                  options={MUSCLE_GROUPS.map((g) => ({ value: g.id, label: g.name }))}
                  value={newExercise.secondary_muscles}
                  onChange={(v) => setNewExercise({ ...newExercise, secondary_muscles: v })}
                  placeholder="Csoport hozzáadása..."
                />
              </div>

              {/* Detail Muscles */}
              <MusclePicker muscles={muscles || []} value={detailMuscles} onChange={setDetailMuscles} />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={createExercise}
                  disabled={loading || !newExercise.name.trim()}
                  className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Létrehozás...' : 'Létrehozás'}
                </button>
              </div>
            </div>
          </div>
        </div>
  )
}
