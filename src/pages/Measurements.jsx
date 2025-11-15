import { useState, useEffect } from 'react'
import { useTeams } from '../context/TeamContext'
import { supabase } from '../lib/supabase'
import {
  BarChart3,
  Plus,
  Filter,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Dumbbell,
  X,
  Save,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  Settings,
} from 'lucide-react'
import TeamSelector from '../components/TeamSelector'

export default function Measurements({ session }) {
  const { selectedTeam } = useTeams()
  const [measurements, setMeasurements] = useState([])
  const [players, setPlayers] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)
  
  const [filters, setFilters] = useState({
    playerId: '',
    exerciseId: '',
    dateFrom: '',
    dateTo: '',
  })

  const [sortField, setSortField] = useState('measured_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [showMeasurementModal, setShowMeasurementModal] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [showExerciseManagementModal, setShowExerciseManagementModal] = useState(false)
  const [showPlayerSelectionModal, setShowPlayerSelectionModal] = useState(false)
  const [showTeamMeasurementModal, setShowTeamMeasurementModal] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [editingExercise, setEditingExercise] = useState(null)
  
  const [measurementForm, setMeasurementForm] = useState({
    player_id: '',
    exercise_id: '',
    value: '',
    reps: '1',
    measured_at: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [teamMeasurementForm, setTeamMeasurementForm] = useState({
    exercise_id: '',
    measured_at: new Date().toISOString().split('T')[0],
    playerData: {}, // { playerId: { value, reps, notes } }
  })

  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    category: 'strength',
    unit: 'kg',
    description: '',
  })

  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers()
      fetchExercises()
      fetchMeasurements()
    }
  }, [selectedTeam])

  useEffect(() => {
    if (selectedTeam) {
      fetchMeasurements()
    }
  }, [filters, sortField, sortDirection])

  const fetchPlayers = async () => {
    if (!selectedTeam) return
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('name')
      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('created_by', session.user.id)
        .order('name')
      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }

  const fetchMeasurements = async () => {
    if (!selectedTeam) return
    try {
      setLoading(true)
      let query = supabase
        .from('measurements')
        .select(`
          *,
          player:players(id, name, jersey_number),
          exercise:exercises(id, name, unit)
        `)
        .eq('team_id', selectedTeam.id)

      if (filters.playerId) query = query.eq('player_id', filters.playerId)
      if (filters.exerciseId) query = query.eq('exercise_id', filters.exerciseId)
      if (filters.dateFrom) query = query.gte('measured_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('measured_at', filters.dateTo)

      query = query.order(sortField, { ascending: sortDirection === 'asc' })

      const { data, error } = await query
      if (error) throw error
      setMeasurements(data || [])
    } catch (error) {
      console.error('Error fetching measurements:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculate1RM = (weight, reps) => {
    if (!weight || reps <= 0) return null
    if (reps === 1) return weight
    return (weight * (1 + reps / 30)).toFixed(2)
  }

  const handleCreateExercise = async (e) => {
    e.preventDefault()
    try {
      if (editingExercise) {
        // Update existing exercise
        const { data, error } = await supabase
          .from('exercises')
          .update({ ...exerciseForm })
          .eq('id', editingExercise.id)
          .select()
          .single()
        if (error) throw error
        setExercises(exercises.map(ex => ex.id === editingExercise.id ? data : ex))
        alert('Gyakorlat sikeresen frissítve!')
      } else {
        // Create new exercise
        const { data, error } = await supabase
          .from('exercises')
          .insert([{ ...exerciseForm, created_by: session.user.id }])
          .select()
          .single()
        if (error) throw error
        setExercises([...exercises, data])
        alert('Gyakorlat sikeresen létrehozva!')
      }
      setShowExerciseModal(false)
      setEditingExercise(null)
      setExerciseForm({ name: '', category: 'strength', unit: 'kg', description: '' })
    } catch (error) {
      console.error('Error saving exercise:', error)
      alert('Hiba történt')
    }
  }

  const handleDeleteExercise = async (exerciseId) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a gyakorlatot? Ez törli az összes hozzá tartozó mérést is!')) return
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId)
      if (error) throw error
      setExercises(exercises.filter(ex => ex.id !== exerciseId))
      alert('Gyakorlat sikeresen törölve!')
    } catch (error) {
      console.error('Error deleting exercise:', error)
      alert('Hiba történt a törlés során')
    }
  }

  const openEditExercise = (exercise) => {
    setEditingExercise(exercise)
    setExerciseForm({
      name: exercise.name,
      category: exercise.category,
      unit: exercise.unit,
      description: exercise.description || '',
    })
    setShowExerciseModal(true)
  }

  const handleCreateMeasurement = async (e) => {
    e.preventDefault()
    if (!selectedTeam) return
    try {
      const oneRM = calculate1RM(
        parseFloat(measurementForm.value),
        parseInt(measurementForm.reps)
      )
      const { data, error } = await supabase
        .from('measurements')
        .insert([{
          ...measurementForm,
          team_id: selectedTeam.id,
          one_rm: oneRM,
          created_by: session.user.id,
        }])
        .select(`*, player:players(id, name, jersey_number), exercise:exercises(id, name, unit)`)
        .single()
      if (error) throw error
      setMeasurements([data, ...measurements])
      setShowMeasurementModal(false)
      setMeasurementForm({
        player_id: '',
        exercise_id: '',
        value: '',
        reps: '1',
        measured_at: new Date().toISOString().split('T')[0],
        notes: '',
      })
      alert('Mérés sikeresen rögzítve!')
    } catch (error) {
      console.error('Error creating measurement:', error)
      alert('Hiba történt')
    }
  }

  const handleCreateTeamMeasurement = async (e) => {
    e.preventDefault()
    if (!selectedTeam) return

    try {
      const measurementsToInsert = []
      
      // Prepare measurements for all players with data
      Object.entries(teamMeasurementForm.playerData).forEach(([playerId, data]) => {
        if (data.value && parseFloat(data.value) > 0) {
          const oneRM = calculate1RM(parseFloat(data.value), parseInt(data.reps || 1))
          measurementsToInsert.push({
            team_id: selectedTeam.id,
            player_id: playerId,
            exercise_id: teamMeasurementForm.exercise_id,
            value: parseFloat(data.value),
            reps: parseInt(data.reps || 1),
            one_rm: oneRM,
            measured_at: teamMeasurementForm.measured_at,
            notes: data.notes || '',
            created_by: session.user.id,
          })
        }
      })

      if (measurementsToInsert.length === 0) {
        alert('Add meg legalább egy játékos mérési adatát!')
        return
      }

      const { data, error } = await supabase
        .from('measurements')
        .insert(measurementsToInsert)
        .select(`*, player:players(id, name, jersey_number), exercise:exercises(id, name, unit)`)

      if (error) throw error

      setMeasurements([...data, ...measurements])
      setShowTeamMeasurementModal(false)
      setTeamMeasurementForm({
        exercise_id: '',
        measured_at: new Date().toISOString().split('T')[0],
        playerData: {},
      })
      alert(`${measurementsToInsert.length} mérés sikeresen rögzítve!`)
    } catch (error) {
      console.error('Error creating team measurements:', error)
      alert('Hiba történt a mérések rögzítésekor')
    }
  }

  const updatePlayerData = (playerId, field, value) => {
    setTeamMeasurementForm(prev => ({
      ...prev,
      playerData: {
        ...prev.playerData,
        [playerId]: {
          ...prev.playerData[playerId],
          [field]: value,
        }
      }
    }))
  }

  const togglePlayerSelection = (playerId) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const toggleAllPlayers = () => {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayers([])
    } else {
      setSelectedPlayers(players.map(p => p.id))
    }
  }

  const proceedToTeamMeasurement = () => {
    if (selectedPlayers.length === 0) {
      alert('Válassz ki legalább egy játékost!')
      return
    }
    setShowPlayerSelectionModal(false)
    setShowTeamMeasurementModal(true)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const exportToCSV = () => {
    if (measurements.length === 0) return alert('Nincs exportálható adat')
    const headers = ['Játékos', 'Gyakorlat', 'Érték', '1RM', 'Ismétlések', 'Dátum', 'Jegyzetek']
    const rows = measurements.map((m) => [
      m.player?.name || '',
      m.exercise?.name || '',
      `${m.value} ${m.exercise?.unit || ''}`,
      m.one_rm ? `${m.one_rm} ${m.exercise?.unit || ''}` : '-',
      m.reps || '-',
      new Date(m.measured_at).toLocaleDateString('hu-HU'),
      m.notes || '',
    ])
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `meresek_${selectedTeam?.name}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const clearFilters = () => {
    setFilters({ playerId: '', exerciseId: '', dateFrom: '', dateTo: '' })
  }

  const hasActiveFilters = filters.playerId || filters.exerciseId || filters.dateFrom || filters.dateTo

  if (!selectedTeam) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Mérési Modul (1RM & Tesztek)</h1>
              <p className="text-sm text-slate-400 hidden sm:block">Erőnléti mérések és tesztek</p>
            </div>
            <div className="flex-shrink-0">
              <TeamSelector />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Válassz ki egy csapatot a folytatáshoz</p>
        </div>
      </div>
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
              <h1 className="text-xl font-bold text-white">Mérési Modul (1RM & Tesztek)</h1>
              <p className="text-sm text-slate-400 hidden sm:block">
                {measurements.length} mérés • {players.length} játékos • {exercises.length} gyakorlat
              </p>
            </div>
          </div>

          {/* Középső gombok */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => setShowExerciseModal(true)} 
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              title="Új Gyakorlat"
            >
              <Dumbbell className="w-4 h-4" />
              <span className="hidden sm:inline">Új Gyakorlat</span>
            </button>
            <button 
              onClick={() => setShowExerciseManagementModal(true)} 
              className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
              title="Gyakorlatok kezelése"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Gyakorlatok kezelése</span>
            </button>
            <button 
              onClick={() => {
                setSelectedPlayers(players.map(p => p.id))
                setShowPlayerSelectionModal(true)
              }} 
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
              disabled={players.length === 0}
              title="Csapat Felmérés"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Csapat Felmérés</span>
            </button>
            <button 
              onClick={() => setShowMeasurementModal(true)} 
              className="flex items-center space-x-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              title="Új Mérés"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Új Mérés</span>
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

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-bold text-white">Szűrők</h3>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-primary-400 hover:text-primary-300">
              Szűrők törlése
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Játékos</label>
            <select value={filters.playerId} onChange={(e) => setFilters({ ...filters, playerId: e.target.value })} className="input-field">
              <option value="">Összes játékos</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.jersey_number ? `#${player.jersey_number} ` : ''}{player.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gyakorlat</label>
            <select value={filters.exerciseId} onChange={(e) => setFilters({ ...filters, exerciseId: e.target.value })} className="input-field">
              <option value="">Összes gyakorlat</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Dátum-tól</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Dátum-ig</label>
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="input-field" />
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button onClick={exportToCSV} disabled={measurements.length === 0} className="btn-secondary flex items-center space-x-2 disabled:opacity-50">
          <Download className="w-5 h-5" />
          <span>CSV Export</span>
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <BarChart3 className="w-8 h-8 text-primary-500 animate-pulse" />
          </div>
        ) : measurements.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">{hasActiveFilters ? 'Nincs találat' : 'Még nincs mérés'}</p>
            <button onClick={() => setShowMeasurementModal(true)} className="mt-4 text-primary-400 hover:text-primary-300 text-sm font-medium">
              Rögzíts egyet most
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th onClick={() => handleSort('player.name')} className="px-4 py-3 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Játékos</span>
                    {sortField === 'player.name' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('exercise.name')} className="px-4 py-3 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <Dumbbell className="w-4 h-4" />
                    <span>Gyakorlat</span>
                    {sortField === 'exercise.name' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('value')} className="px-4 py-3 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Érték</span>
                    {sortField === 'value' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('one_rm')} className="px-4 py-3 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>1RM</span>
                    {sortField === 'one_rm' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Ismétlések</th>
                <th onClick={() => handleSort('measured_at')} className="px-4 py-3 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Dátum</span>
                    {sortField === 'measured_at' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Jegyzetek</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 text-white">
                    {m.player?.jersey_number && <span className="text-primary-400 font-semibold mr-2">#{m.player.jersey_number}</span>}
                    {m.player?.name}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{m.exercise?.name}</td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {m.value} {m.exercise?.unit !== 'reps' ? m.exercise?.unit : ''}
                  </td>
                  <td className="px-4 py-3 text-primary-400 font-semibold">
                    {m.one_rm && m.exercise?.unit !== 'reps' && m.exercise?.unit !== 'cm' ? `${m.one_rm} ${m.exercise?.unit}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{m.reps || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{new Date(m.measured_at).toLocaleDateString('hu-HU')}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm max-w-xs truncate">{m.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      </div>

      {/* Exercise Modal */}
      {showExerciseModal && (
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
      )}

      {/* Measurement Modal */}
      {showMeasurementModal && (
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
      )}

      {/* Player Selection Modal */}
      {showPlayerSelectionModal && (
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
      )}

      {/* Team Measurement Modal */}
      {showTeamMeasurementModal && (
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
      )}

      {/* Exercise Management Modal */}
      {showExerciseManagementModal && (
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
      )}
    </div>
  )
}
