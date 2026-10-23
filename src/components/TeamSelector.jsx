import { useState } from 'react'
import { useTeams } from '../context/TeamContext'
import { ChevronDown, Users, Plus, Check } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

export default function TeamSelector() {
  const { teams, selectedTeam, setSelectedTeam, loading } = useTeams()
  const [isOpen, setIsOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-surface-2 rounded-lg">
        <LoadingSpinner size="xs" />
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-surface-2 rounded-lg">
        <Users className="w-5 h-5 text-muted" />
        <span className="text-sm text-muted">Nincs csapat</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-surface-2 hover:bg-surface-3 rounded-lg transition-colors min-w-[200px]"
      >
        <Users className="w-5 h-5 text-accent" />
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-fg truncate">
            {selectedTeam?.name || 'Válassz csapatot'}
          </p>
          {selectedTeam?.sport && (
            <p className="text-xs text-muted truncate">{selectedTeam.sport}</p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-full min-w-[250px] bg-surface border border-line rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2 border-b border-line">
              <p className="text-xs text-muted uppercase font-semibold px-2 py-1">
                Csapatok ({teams.length})
              </p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setSelectedTeam(team)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 transition-colors ${
                    selectedTeam?.id === team.id
                      ? 'bg-accent text-accent-fg'
                      : 'text-fg hover:bg-surface-2'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{team.name}</p>
                    {team.sport && (
                      <p className="text-xs opacity-75 truncate">{team.sport}</p>
                    )}
                  </div>
                  {selectedTeam?.id === team.id && (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
