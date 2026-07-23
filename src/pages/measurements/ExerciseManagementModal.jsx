import { X, Dumbbell, Edit2, Trash2 } from 'lucide-react'

export default function ExerciseManagementModal({
  exercises,
  canEdit,
  openEditExercise,
  handleDeleteExercise,
  setShowExerciseManagementModal,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-white">Gyakorlatok Kezelése</h3>
            <p className="text-sm text-slate-400 mt-1">Szerkeszd vagy töröld a gyakorlatokat</p>
          </div>
          <button onClick={() => setShowExerciseManagementModal(false)} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {exercises.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Még nincs gyakorlat létrehozva</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="card hover:border-primary-500 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white">{exercise.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">
                          {exercise.category === 'strength' ? 'Erő' :
                           exercise.category === 'cardio' ? 'Kardió' :
                           exercise.category === 'flexibility' ? 'Rugalmasság' :
                           exercise.category === 'player_params' ? 'Játékos paraméterek' : 'Egyéb'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-primary-900/30 text-primary-400 rounded font-semibold">
                          {exercise.unit}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditExercise(exercise)}
                          className="p-2 text-slate-400 hover:text-primary-400 hover:bg-slate-700 rounded transition-colors"
                          title="Szerkesztés"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExercise(exercise.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                          title="Törlés"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {exercise.description && (
                    <p className="text-sm text-slate-400 mt-2">{exercise.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-700">
          <button
            onClick={() => setShowExerciseManagementModal(false)}
            className="w-full btn-secondary"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  )
}
