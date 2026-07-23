import { X, Save, Users } from 'lucide-react'

export default function TeamMeasurementModal({
  players,
  exercises,
  selectedPlayers,
  teamMeasurementForm,
  setTeamMeasurementForm,
  setShowTeamMeasurementModal,
  handleCreateTeamMeasurement,
  updatePlayerData,
  calculate1RM,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-6xl w-full h-[90vh] flex flex-col border border-slate-700">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-700 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white">Csapat Felmérés</h3>
            <p className="text-sm text-slate-400 mt-1">Rögzítsd az egész csapat mérését egyszerre</p>
          </div>
          <button onClick={() => setShowTeamMeasurementModal(false)} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleCreateTeamMeasurement} className="flex flex-col flex-1 overflow-hidden">
          {/* Common Fields - Fixed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 pb-4 border-b border-slate-700 flex-shrink-0">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Gyakorlat *</label>
              <select
                value={teamMeasurementForm.exercise_id}
                onChange={(e) => setTeamMeasurementForm({ ...teamMeasurementForm, exercise_id: e.target.value })}
                required
                className="input-field"
              >
                <option value="">Válassz gyakorlatot</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name} ({exercise.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dátum *</label>
              <input
                type="date"
                value={teamMeasurementForm.measured_at}
                onChange={(e) => setTeamMeasurementForm({ ...teamMeasurementForm, measured_at: e.target.value })}
                required
                className="input-field"
              />
            </div>
          </div>

          {/* Players Table - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center sticky top-0 bg-slate-800 py-2 z-10">
              <Users className="w-5 h-5 mr-2 text-primary-400" />
              Játékosok ({selectedPlayers.length})
            </h4>
            <div className="overflow-x-auto pb-4">
              {teamMeasurementForm.exercise_id && exercises.find(e => e.id === teamMeasurementForm.exercise_id)?.unit === 'reps' ? (
                // Simplified table for "ismétlés" exercises
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Játékos</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Ismétlések</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Jegyzetek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {players.filter(p => selectedPlayers.includes(p.id)).map((player) => {
                      const playerData = teamMeasurementForm.playerData[player.id] || {}
                      return (
                        <tr key={player.id} className="hover:bg-slate-700/50 transition-colors">
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {player.jersey_number && (
                                <span className="text-lg font-bold text-primary-400">#{player.jersey_number}</span>
                              )}
                              <span className="text-white font-medium">{player.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="1"
                              value={playerData.value || ''}
                              onChange={(e) => updatePlayerData(player.id, 'value', e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="pl. 15"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={playerData.notes || ''}
                              onChange={(e) => updatePlayerData(player.id, 'notes', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Opcionális"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : teamMeasurementForm.exercise_id && (exercises.find(e => e.id === teamMeasurementForm.exercise_id)?.unit === 'cm' || exercises.find(e => e.id === teamMeasurementForm.exercise_id)?.category === 'player_params') ? (
                // Simplified table for "cm" exercises and player parameters (e.g., height, weight)
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Játékos</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                        {exercises.find(e => e.id === teamMeasurementForm.exercise_id)?.name} ({exercises.find(e => e.id === teamMeasurementForm.exercise_id)?.unit})
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Jegyzetek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {players.filter(p => selectedPlayers.includes(p.id)).map((player) => {
                      const playerData = teamMeasurementForm.playerData[player.id] || {}
                      const selectedExercise = exercises.find(e => e.id === teamMeasurementForm.exercise_id)
                      return (
                        <tr key={player.id} className="hover:bg-slate-700/50 transition-colors">
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {player.jersey_number && (
                                <span className="text-lg font-bold text-primary-400">#{player.jersey_number}</span>
                              )}
                              <span className="text-white font-medium">{player.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={playerData.value || ''}
                              onChange={(e) => updatePlayerData(player.id, 'value', e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder={selectedExercise?.unit === 'kg' ? "pl. 75" : selectedExercise?.unit === 'cm' ? "pl. 180" : "pl. 15"}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={playerData.notes || ''}
                              onChange={(e) => updatePlayerData(player.id, 'notes', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Opcionális"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                // Full table for other exercises
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Játékos</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Súly/Érték</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Ismétlések</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">1RM</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Jegyzetek</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-slate-700">
                  {players.filter(p => selectedPlayers.includes(p.id)).map((player) => {
                    const playerData = teamMeasurementForm.playerData[player.id] || {}
                    const calculated1RM = playerData.value && playerData.reps
                      ? calculate1RM(parseFloat(playerData.value), parseInt(playerData.reps || 1))
                      : null

                    return (
                      <tr key={player.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {player.jersey_number && (
                              <span className="text-lg font-bold text-primary-400">
                                #{player.jersey_number}
                              </span>
                            )}
                            <span className="text-white font-medium">{player.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            step="0.1"
                            value={playerData.value || ''}
                            onChange={(e) => updatePlayerData(player.id, 'value', e.target.value)}
                            className="w-24 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="100"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="1"
                            value={playerData.reps || '1'}
                            onChange={(e) => updatePlayerData(player.id, 'reps', e.target.value)}
                            className="w-16 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-3 py-3">
                          {calculated1RM && exercises.find(e => e.id === teamMeasurementForm.exercise_id)?.unit !== 'reps' && exercises.find(e => e.id === teamMeasurementForm.exercise_id)?.unit !== 'cm' ? (
                            <span className="text-primary-400 font-semibold text-sm">
                              {calculated1RM} {exercises.find(e => e.id === teamMeasurementForm.exercise_id)?.unit}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={playerData.notes || ''}
                            onChange={(e) => updatePlayerData(player.id, 'notes', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Opcionális"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              )}
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="flex items-center space-x-3 p-6 pt-4 border-t border-slate-700 flex-shrink-0">
            <button type="submit" className="flex-1 btn-primary flex items-center justify-center space-x-2">
              <Save className="w-5 h-5" />
              <span>Összes Mérés Rögzítése</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTeamMeasurementModal(false)}
              className="flex-1 btn-secondary"
            >
              Mégse
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
