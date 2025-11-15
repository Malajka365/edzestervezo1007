import { useState, useEffect } from 'react'
import { useTeams } from '../context/TeamContext'
import { supabase } from '../lib/supabase'
import PlayerProfile from './PlayerProfile'
import TrainingLocations from '../components/TrainingLocations'
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  X,
  Save,
  Loader2,
  Calendar,
  Hash,
  FileText,
  Search,
  MapPin,
} from 'lucide-react'
import TeamSelector from '../components/TeamSelector'

export default function Teams() {
  const { teams, selectedTeam, createTeam, updateTeam, deleteTeam } = useTeams()
  const [players, setPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [showLocationsModal, setShowLocationsModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [teamForm, setTeamForm] = useState({ name: '', sport: '', description: '' })
  const [playerForm, setPlayerForm] = useState({
    name: '',
    birth_date: '',
    position: '',
    jersey_number: '',
    notes: '',
  })

  // Fetch players when selected team changes
  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers()
    } else {
      setPlayers([])
    }
  }, [selectedTeam])

  const fetchPlayers = async () => {
    if (!selectedTeam) return
    
    try {
      setLoadingPlayers(true)
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('jersey_number', { ascending: true })

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    const result = await createTeam(teamForm)
    if (result.success) {
      setShowTeamModal(false)
      setTeamForm({ name: '', sport: '', description: '' })
    }
  }

  const handleUpdateTeam = async (e) => {
    e.preventDefault()
    const result = await updateTeam(editingTeam.id, teamForm)
    if (result.success) {
      setShowTeamModal(false)
      setEditingTeam(null)
      setTeamForm({ name: '', sport: '', description: '' })
    }
  }

  const handleDeleteTeam = async (teamId) => {
    if (confirm('Biztosan törölni szeretnéd ezt a csapatot? Minden játékos is törlődni fog!')) {
      await deleteTeam(teamId)
    }
  }

  const openEditTeam = (team) => {
    setEditingTeam(team)
    setTeamForm({
      name: team.name,
      sport: team.sport || '',
      description: team.description || '',
    })
    setShowTeamModal(true)
  }

  const handleCreatePlayer = async (e) => {
    e.preventDefault()
    if (!selectedTeam) return

    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ ...playerForm, team_id: selectedTeam.id }])
        .select()
        .single()

      if (error) throw error

      setPlayers([...players, data])
      setShowPlayerModal(false)
      setPlayerForm({
        name: '',
        birth_date: '',
        position: '',
        jersey_number: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error creating player:', error)
      alert('Hiba történt a játékos létrehozásakor')
    }
  }

  const handleUpdatePlayer = async (e) => {
    e.preventDefault()
    if (!editingPlayer) return

    try {
      const { data, error } = await supabase
        .from('players')
        .update({ ...playerForm, updated_at: new Date().toISOString() })
        .eq('id', editingPlayer.id)
        .select()
        .single()

      if (error) throw error

      setPlayers(players.map(p => p.id === editingPlayer.id ? data : p))
      setShowPlayerModal(false)
      setEditingPlayer(null)
      setPlayerForm({
        name: '',
        birth_date: '',
        position: '',
        jersey_number: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error updating player:', error)
      alert('Hiba történt a játékos frissítésekor')
    }
  }

  const handleDeletePlayer = async (playerId) => {
    if (confirm('Biztosan törölni szeretnéd ezt a játékost?')) {
      try {
        const { error } = await supabase
          .from('players')
          .delete()
          .eq('id', playerId)

        if (error) throw error

        setPlayers(players.filter(p => p.id !== playerId))
      } catch (error) {
        console.error('Error deleting player:', error)
        alert('Hiba történt a játékos törlésekor')
      }
    }
  }

  const openEditPlayer = (player) => {
    setEditingPlayer(player)
    setPlayerForm({
      name: player.name,
      birth_date: player.birth_date || '',
      position: player.position || '',
      jersey_number: player.jersey_number || '',
      notes: player.notes || '',
    })
    setShowPlayerModal(true)
  }

  const closeModal = () => {
    setShowTeamModal(false)
    setShowPlayerModal(false)
    setEditingTeam(null)
    setEditingPlayer(null)
    setTeamForm({ name: '', sport: '', description: '' })
    setPlayerForm({
      name: '',
      birth_date: '',
      position: '',
      jersey_number: '',
      height: '',
      weight: '',
      notes: '',
    })
  }

  // Filter players based on search query
  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (player.jersey_number && player.jersey_number.toString().includes(searchQuery)) ||
    (player.position && player.position.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // If a player is selected, show their profile
  if (selectedPlayer) {
    return (
      <PlayerProfile
        player={selectedPlayer}
        onBack={() => setSelectedPlayer(null)}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header - Dashboard stílusban */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-4 gap-4 flex-wrap lg:flex-nowrap">
          {/* Bal oldal: Cím */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Csapatok</h1>
              <p className="text-sm text-slate-400 hidden sm:block">
                {teams.length} csapat • {selectedTeam ? players.length + ' játékos' : 'Játékosok kezelése'}
              </p>
            </div>
          </div>

          {/* Középső gombok */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedTeam && (
              <button
                onClick={() => setShowLocationsModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                title="Edzés Helyszínek"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Edzés Helyszínek</span>
              </button>
            )}
            <button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              title="Új Csapat"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Új Csapat</span>
            </button>
          </div>

          {/* Jobb oldal: TeamSelector */}
          <div className="flex-shrink-0 w-full sm:w-auto order-3 lg:order-none">
            <TeamSelector />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className={`card cursor-pointer transition-all ${
              selectedTeam?.id === team.id
                ? 'border-primary-500 ring-2 ring-primary-500/50'
                : 'hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{team.name}</h3>
                  {team.sport && (
                    <p className="text-sm text-slate-400 truncate">{team.sport}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => openEditTeam(team)}
                  className="p-2 text-slate-400 hover:text-primary-400 hover:bg-slate-700 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {team.description && (
              <p className="text-sm text-slate-300 mb-3 line-clamp-2">{team.description}</p>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <span className="text-xs text-slate-400">
                {new Date(team.created_at).toLocaleDateString('hu-HU')}
              </span>
              {selectedTeam?.id === team.id && (
                <span className="text-xs text-primary-400 font-semibold">Kiválasztva</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Players Section */}
      {selectedTeam && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary-400" />
                Játékosok - {selectedTeam.name}
              </h3>
              <p className="text-sm text-slate-400 mt-1">{players.length} játékos</p>
            </div>
            <button
              onClick={() => setShowPlayerModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Új Játékos</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keresés név, mezszám vagy poszt szerint..."
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-slate-400 mt-2">
                {filteredPlayers.length} találat "{searchQuery}" keresésre
              </p>
            )}
          </div>

          {loadingPlayers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Még nincs játékos ebben a csapatban</p>
              <button
                onClick={() => setShowPlayerModal(true)}
                className="mt-4 text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                Adj hozzá egyet most
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlayers.map((player) => (
                <div 
                  key={player.id} 
                  onClick={() => setSelectedPlayer(player)}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold truncate">{player.name}</h4>
                      {player.position && (
                        <p className="text-sm text-slate-400 truncate">{player.position}</p>
                      )}
                    </div>
                    {player.jersey_number && (
                      <span className="text-2xl font-bold text-primary-400 ml-2">
                        #{player.jersey_number}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 mb-3">
                    {player.birth_date && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(player.birth_date).toLocaleDateString('hu-HU')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-3 border-t border-slate-600">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditPlayer(player)
                      }}
                      className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-slate-300 rounded text-sm transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Szerkeszt</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePlayer(player.id)
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-red-900 text-slate-300 hover:text-red-300 rounded text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedTeam && teams.length > 0 && (
        <div className="card text-center py-12">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 text-lg font-semibold mb-2">
            Válassz egy csapatot a felső menüből
          </p>
          <p className="text-slate-400 text-sm">
            A játékosok megjelenítéséhez először válassz ki egy csapatot
          </p>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingTeam ? 'Csapat Szerkesztése' : 'Új Csapat'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Csapat neve *
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  required
                  className="input-field"
                  placeholder="pl. U19 Férfi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sportág
                </label>
                <input
                  type="text"
                  value={teamForm.sport}
                  onChange={(e) => setTeamForm({ ...teamForm, sport: e.target.value })}
                  className="input-field"
                  placeholder="pl. Labdarúgás, Kézilabda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Leírás
                </label>
                <textarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="input-field resize-none"
                  rows="3"
                  placeholder="Rövid leírás a csapatról..."
                />
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button type="submit" className="flex-1 btn-primary flex items-center justify-center space-x-2">
                  <Save className="w-5 h-5" />
                  <span>{editingTeam ? 'Mentés' : 'Létrehozás'}</span>
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 btn-secondary"
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full p-6 border border-slate-700 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingPlayer ? 'Játékos Szerkesztése' : 'Új Játékos'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={editingPlayer ? handleUpdatePlayer : handleCreatePlayer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Név *
                  </label>
                  <input
                    type="text"
                    value={playerForm.name}
                    onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                    required
                    className="input-field"
                    placeholder="Játékos teljes neve"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Születési dátum
                  </label>
                  <input
                    type="date"
                    value={playerForm.birth_date}
                    onChange={(e) => setPlayerForm({ ...playerForm, birth_date: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Mezszám
                  </label>
                  <input
                    type="number"
                    value={playerForm.jersey_number}
                    onChange={(e) => setPlayerForm({ ...playerForm, jersey_number: e.target.value })}
                    className="input-field"
                    placeholder="pl. 10"
                    min="0"
                    max="99"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Poszt
                  </label>
                  <input
                    type="text"
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                    className="input-field"
                    placeholder="pl. Középpályás, Csatár"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Jegyzetek
                  </label>
                  <textarea
                    value={playerForm.notes}
                    onChange={(e) => setPlayerForm({ ...playerForm, notes: e.target.value })}
                    className="input-field resize-none"
                    rows="3"
                    placeholder="További információk a játékosról..."
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button type="submit" className="flex-1 btn-primary flex items-center justify-center space-x-2">
                  <Save className="w-5 h-5" />
                  <span>{editingPlayer ? 'Mentés' : 'Létrehozás'}</span>
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 btn-secondary"
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* Locations Modal */}
      {showLocationsModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edzés Helyszínek - {selectedTeam.name}</h3>
              <button
                onClick={() => setShowLocationsModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <TrainingLocations teamId={selectedTeam.id} />
          </div>
        </div>
      )}
    </div>
  )
}
