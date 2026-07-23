import { useState, useEffect } from 'react'
import { useTeams } from '../context/TeamContext'
import { supabase } from '../lib/supabase'
import { canEditModule } from '../lib/permissions'
import {
  BarChart3,
  Plus,
  Filter,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Dumbbell,
  ChevronUp,
  ChevronDown,
  Settings,
} from 'lucide-react'
import TeamSelector from '../components/TeamSelector'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import ExerciseModal from './measurements/ExerciseModal'
import MeasurementModal from './measurements/MeasurementModal'
import PlayerSelectionModal from './measurements/PlayerSelectionModal'
import TeamMeasurementModal from './measurements/TeamMeasurementModal'
import ExerciseManagementModal from './measurements/ExerciseManagementModal'
import toast from 'react-hot-toast'

export default function Measurements({ session }) {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'measurement')
  const [measurements, setMeasurements] = useState([])
  const [players, setPlayers] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  
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
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
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
        toast.success('Gyakorlat sikeresen frissítve!')
      } else {
        // Create new exercise
        const { data, error } = await supabase
          .from('exercises')
          .insert([{ ...exerciseForm, created_by: session.user.id }])
          .select()
          .single()
        if (error) throw error
        setExercises([...exercises, data])
        toast.success('Gyakorlat sikeresen létrehozva!')
      }
      setShowExerciseModal(false)
      setEditingExercise(null)
      setExerciseForm({ name: '', category: 'strength', unit: 'kg', description: '' })
    } catch (error) {
      console.error('Error saving exercise:', error)
      toast.error('Hiba történt')
    }
  }

  const handleDeleteExercise = (exerciseId) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a gyakorlatot? Ez törli az összes hozzá tartozó mérést is!',
      action: async () => {
        try {
          const { error } = await supabase
            .from('exercises')
            .delete()
            .eq('id', exerciseId)
          if (error) throw error
          setExercises(exercises.filter(ex => ex.id !== exerciseId))
          toast.success('Gyakorlat sikeresen törölve!')
        } catch (error) {
          console.error('Error deleting exercise:', error)
          toast.error('Hiba történt a törlés során')
        }
      },
    })
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
      toast.success('Mérés sikeresen rögzítve!')
    } catch (error) {
      console.error('Error creating measurement:', error)
      toast.error('Hiba történt')
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
        toast.error('Add meg legalább egy játékos mérési adatát!')
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
      toast.success(`${measurementsToInsert.length} mérés sikeresen rögzítve!`)
    } catch (error) {
      console.error('Error creating team measurements:', error)
      toast.error('Hiba történt a mérések rögzítésekor')
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
      toast.error('Válassz ki legalább egy játékost!')
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
    if (measurements.length === 0) return toast.error('Nincs exportálható adat')
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
          {canEdit && (
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
          )}

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
          <EmptyState
            icon={BarChart3}
            title={hasActiveFilters ? 'Nincs találat' : 'Még nincs mérés'}
            description={
              hasActiveFilters
                ? 'Próbálj meg más szűrőket használni.'
                : 'Rögzíts egy mérést, hogy nyomon követhesd a játékosok fejlődését.'
            }
            actionLabel={hasActiveFilters || !canEdit ? undefined : 'Mérés rögzítése'}
            onAction={hasActiveFilters || !canEdit ? undefined : () => setShowMeasurementModal(true)}
          />
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
        <ExerciseModal
          editingExercise={editingExercise}
          exerciseForm={exerciseForm}
          setExerciseForm={setExerciseForm}
          setShowExerciseModal={setShowExerciseModal}
          setEditingExercise={setEditingExercise}
          handleCreateExercise={handleCreateExercise}
        />
      )}

      {/* Measurement Modal */}
      {showMeasurementModal && (
        <MeasurementModal
          players={players}
          exercises={exercises}
          measurementForm={measurementForm}
          setMeasurementForm={setMeasurementForm}
          setShowMeasurementModal={setShowMeasurementModal}
          handleCreateMeasurement={handleCreateMeasurement}
          calculate1RM={calculate1RM}
        />
      )}

      {/* Player Selection Modal */}
      {showPlayerSelectionModal && (
        <PlayerSelectionModal
          players={players}
          selectedPlayers={selectedPlayers}
          toggleAllPlayers={toggleAllPlayers}
          togglePlayerSelection={togglePlayerSelection}
          proceedToTeamMeasurement={proceedToTeamMeasurement}
          setShowPlayerSelectionModal={setShowPlayerSelectionModal}
        />
      )}

      {/* Team Measurement Modal */}
      {showTeamMeasurementModal && (
        <TeamMeasurementModal
          players={players}
          exercises={exercises}
          selectedPlayers={selectedPlayers}
          teamMeasurementForm={teamMeasurementForm}
          setTeamMeasurementForm={setTeamMeasurementForm}
          setShowTeamMeasurementModal={setShowTeamMeasurementModal}
          handleCreateTeamMeasurement={handleCreateTeamMeasurement}
          updatePlayerData={updatePlayerData}
          calculate1RM={calculate1RM}
        />
      )}

      {/* Exercise Management Modal */}
      {showExerciseManagementModal && (
        <ExerciseManagementModal
          exercises={exercises}
          canEdit={canEdit}
          openEditExercise={openEditExercise}
          handleDeleteExercise={handleDeleteExercise}
          setShowExerciseManagementModal={setShowExerciseManagementModal}
        />
      )}

      <ConfirmDialog
        open={!!confirmState}
        title="Törlés megerősítése"
        message={confirmState?.message}
        onConfirm={async () => {
          await confirmState.action()
          setConfirmState(null)
        }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}
