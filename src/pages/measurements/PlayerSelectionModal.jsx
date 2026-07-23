import { X, Users } from 'lucide-react'

export default function PlayerSelectionModal({
  players,
  selectedPlayers,
  toggleAllPlayers,
  togglePlayerSelection,
  proceedToTeamMeasurement,
  setShowPlayerSelectionModal,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Játékosok Kiválasztása</h3>
            <p className="text-sm text-slate-400 mt-1">
              Válaszd ki, mely játékosok felmérését szeretnéd rögzíteni
            </p>
          </div>
          <button
            onClick={() => setShowPlayerSelectionModal(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-700">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPlayers.length === players.length}
                onChange={toggleAllPlayers}
                className="w-5 h-5 rounded border-slate-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-800"
              />
              <span className="text-white font-semibold">
                Összes kiválasztása ({players.length})
              </span>
            </label>
            <span className="text-sm text-slate-400">
              {selectedPlayers.length} kiválasztva
            </span>
          </div>

          {/* Players List */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {players.map((player) => (
              <label
                key={player.id}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedPlayers.includes(player.id)
                    ? 'bg-primary-900/30 border border-primary-600'
                    : 'bg-slate-700 hover:bg-slate-600 border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={() => togglePlayerSelection(player.id)}
                  className="w-5 h-5 rounded border-slate-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-800"
                />
                <div className="flex items-center space-x-3 flex-1">
                  {player.jersey_number && (
                    <span className="text-xl font-bold text-primary-400">
                      #{player.jersey_number}
                    </span>
                  )}
                  <span className="text-white font-medium">{player.name}</span>
                  {player.position && (
                    <span className="text-sm text-slate-400">• {player.position}</span>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-700">
            <button
              onClick={proceedToTeamMeasurement}
              disabled={selectedPlayers.length === 0}
              className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Users className="w-5 h-5" />
              <span>Tovább a Felméréshez ({selectedPlayers.length})</span>
            </button>
            <button
              onClick={() => setShowPlayerSelectionModal(false)}
              className="flex-1 btn-secondary"
            >
              Mégse
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
