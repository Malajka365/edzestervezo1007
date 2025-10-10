import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import {
  Plus,
  Calendar,
  MapPin,
  Trophy,
  Home as HomeIcon,
  Plane,
  Edit,
  Trash2,
  X,
  Clock,
} from 'lucide-react'

export default function Matches() {
  const { selectedTeam } = useTeams()
  const [matches, setMatches] = useState([])
  const [filteredMatches, setFilteredMatches] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('all') // all, upcoming, past
  const [showModal, setShowModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedTeam) {
      fetchMatches()
    }
  }, [selectedTeam])

  useEffect(() => {
    filterMatches()
  }, [matches, selectedFilter])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('date', { ascending: true })

      if (error) throw error
      setMatches(data || [])
    } catch (error) {
      console.error('Error fetching matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMatches = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let filtered = matches

    if (selectedFilter === 'upcoming') {
      filtered = filtered.filter(m => new Date(m.date) >= today)
    } else if (selectedFilter === 'past') {
      filtered = filtered.filter(m => new Date(m.date) < today)
    }

    setFilteredMatches(filtered)
  }

  const deleteMatch = async (id) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a mérkőzést?')) return

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchMatches()
    } catch (error) {
      console.error('Error deleting match:', error)
      alert('Hiba történt a törlés során!')
    }
  }

  const getMatchTypeLabel = (type) => {
    const labels = {
      friendly: 'Felkészülési',
      league: 'Bajnoki',
      cup: 'Kupa',
      tournament: 'Torna',
    }
    return labels[type] || type
  }

  const getMatchTypeColor = (type) => {
    const colors = {
      friendly: 'bg-blue-600',
      league: 'bg-green-600',
      cup: 'bg-yellow-600',
      tournament: 'bg-purple-600',
    }
    return colors[type] || 'bg-slate-600'
  }

  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Válassz ki egy csapatot a folytatáshoz</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mérkőzések</h1>
          <p className="text-slate-400 mt-1">
            {selectedTeam.name} - Mérkőzések ütemezése és eredmények
          </p>
        </div>

        <button
          onClick={() => {
            setEditingMatch(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Új mérkőzés</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Összes
          </button>
          <button
            onClick={() => setSelectedFilter('upcoming')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedFilter === 'upcoming'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Közelgő
          </button>
          <button
            onClick={() => setSelectedFilter('past')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedFilter === 'past'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Lejátszott
          </button>
        </div>
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="card text-center py-12">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Nincs még mérkőzés
          </h3>
          <p className="text-slate-400 mb-4">
            Add hozzá az első mérkőzést a naptárhoz!
          </p>
          <button
            onClick={() => {
              setEditingMatch(null)
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Első mérkőzés hozzáadása</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const isPast = new Date(match.date) < new Date()
            const hasResult = match.our_score !== null && match.opponent_score !== null

            return (
              <div
                key={match.id}
                className="card hover:border-primary-500 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Date and Time */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(match.date).toLocaleDateString('hu-HU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                          })}
                        </span>
                      </div>
                      {match.time && (
                        <>
                          <span className="text-slate-600">•</span>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span>{match.time}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        {match.home_away === 'home' ? (
                          <HomeIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <Plane className="w-5 h-5 text-blue-500" />
                        )}
                        <span className={`text-lg font-semibold ${match.home_away === 'home' ? 'text-white' : 'text-slate-300'}`}>
                          {selectedTeam.name}
                        </span>
                      </div>

                      <span className="text-2xl font-bold text-slate-500">vs</span>

                      <span className={`text-lg font-semibold ${match.home_away === 'away' ? 'text-white' : 'text-slate-300'}`}>
                        {match.opponent}
                      </span>
                    </div>

                    {/* Result */}
                    {hasResult && (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-slate-400">Eredmény:</span>
                        <div className="flex items-center gap-2 text-2xl font-bold">
                          <span className={match.our_score > match.opponent_score ? 'text-green-500' : match.our_score < match.opponent_score ? 'text-red-500' : 'text-yellow-500'}>
                            {match.our_score}
                          </span>
                          <span className="text-slate-600">:</span>
                          <span className={match.opponent_score > match.our_score ? 'text-green-500' : match.opponent_score < match.our_score ? 'text-red-500' : 'text-yellow-500'}>
                            {match.opponent_score}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Location and Type */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {match.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span>{match.location}</span>
                        </div>
                      )}
                      {match.match_type && (
                        <span className={`inline-block px-3 py-1 ${getMatchTypeColor(match.match_type)} text-white text-xs rounded-full`}>
                          {getMatchTypeLabel(match.match_type)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingMatch(match)
                        setShowModal(true)
                      }}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Szerkesztés"
                    >
                      <Edit className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => deleteMatch(match.id)}
                      className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                      title="Törlés"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Notes */}
                {match.notes && (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-slate-300">{match.notes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <MatchModal
          match={editingMatch}
          selectedTeam={selectedTeam}
          onClose={() => {
            setShowModal(false)
            setEditingMatch(null)
          }}
          onSave={() => {
            setShowModal(false)
            setEditingMatch(null)
            fetchMatches()
          }}
        />
      )}
    </div>
  )
}

// Match Modal Component
function MatchModal({ match, selectedTeam, onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: match?.date || new Date().toISOString().split('T')[0],
    time: match?.time || '',
    location: match?.location || '',
    opponent: match?.opponent || '',
    match_type: match?.match_type || 'league',
    home_away: match?.home_away || 'home',
    our_score: match?.our_score ?? '',
    opponent_score: match?.opponent_score ?? '',
    notes: match?.notes || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        our_score: formData.our_score === '' ? null : parseInt(formData.our_score),
        opponent_score: formData.opponent_score === '' ? null : parseInt(formData.opponent_score),
      }

      if (match) {
        // Update
        const { error } = await supabase
          .from('matches')
          .update(dataToSave)
          .eq('id', match.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('matches')
          .insert([{
            ...dataToSave,
            team_id: selectedTeam.id,
          }])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving match:', error)
      alert('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {match ? 'Mérkőzés szerkesztése' : 'Új mérkőzés'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Dátum *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Időpont
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ellenfél *
            </label>
            <input
              type="text"
              value={formData.opponent}
              onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
              className="input-field w-full"
              placeholder="pl. Veszprém KC"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Helyszín
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-field w-full"
              placeholder="pl. Városi Sportcsarnok"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Típus
              </label>
              <select
                value={formData.match_type}
                onChange={(e) => setFormData({ ...formData, match_type: e.target.value })}
                className="input-field w-full"
              >
                <option value="league">Bajnoki</option>
                <option value="cup">Kupa</option>
                <option value="friendly">Felkészülési</option>
                <option value="tournament">Torna</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Hazai/Idegen
              </label>
              <select
                value={formData.home_away}
                onChange={(e) => setFormData({ ...formData, home_away: e.target.value })}
                className="input-field w-full"
              >
                <option value="home">Hazai</option>
                <option value="away">Idegen</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Eredmény (opcionális)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={formData.our_score}
                onChange={(e) => setFormData({ ...formData, our_score: e.target.value })}
                className="input-field w-full"
                placeholder="Saját gólok"
                min="0"
              />
              <input
                type="number"
                value={formData.opponent_score}
                onChange={(e) => setFormData({ ...formData, opponent_score: e.target.value })}
                className="input-field w-full"
                placeholder="Ellenfél gólok"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Megjegyzések
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field w-full"
              rows="3"
              placeholder="Megjegyzések a mérkőzésről..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Mentés...' : 'Mentés'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
