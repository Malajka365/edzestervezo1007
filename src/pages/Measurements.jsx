import { useState, useEffect } from 'react'
import { useTeams } from '../context/TeamContext'
import { usePlayers } from '../hooks/usePlayers'
import { useExercises } from '../hooks/useExercises'
import { canEditModule } from '../lib/permissions'
import useMeasurementsData, { calculate1RM } from './measurements/useMeasurementsData'
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
import Button from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import Spinner from '../components/ui/Spinner'
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
  // Players come from the shared, cached usePlayers query (was a local fetch).
  const { data: players = [] } = usePlayers(selectedTeam?.id)
  // Exercises come from the shared, cached useExercises query (was a local
  // fetch). The data-layer hook's mutations invalidate ['exercises'] to refresh
  // every screen.
  const { data: exercises = [] } = useExercises()
  // Data layer: measurements list + all create/delete ops live in the hook.
  const {
    measurements,
    loading,
    fetchMeasurements,
    createMeasurement,
    createTeamMeasurement,
    createExercise,
    deleteExercise,
  } = useMeasurementsData(selectedTeam, session)
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
      fetchMeasurements(filters, sortField, sortDirection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam])

  useEffect(() => {
    if (selectedTeam) {
      fetchMeasurements(filters, sortField, sortDirection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortField, sortDirection])

  const handleCreateExercise = async (e) => {
    e.preventDefault()
    const ok = await createExercise(exerciseForm, editingExercise)
    if (ok) {
      setShowExerciseModal(false)
      setEditingExercise(null)
      setExerciseForm({ name: '', category: 'strength', unit: 'kg', description: '' })
    }
  }

  const handleDeleteExercise = (exerciseId) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a gyakorlatot? Ez törli az összes hozzá tartozó mérést is!',
      action: async () => {
        await deleteExercise(exerciseId)
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
    const ok = await createMeasurement(measurementForm)
    if (ok) {
      setShowMeasurementModal(false)
      setMeasurementForm({
        player_id: '',
        exercise_id: '',
        value: '',
        reps: '1',
        measured_at: new Date().toISOString().split('T')[0],
        notes: '',
      })
    }
  }

  const handleCreateTeamMeasurement = async (e) => {
    e.preventDefault()
    const ok = await createTeamMeasurement(teamMeasurementForm)
    if (ok) {
      setShowTeamMeasurementModal(false)
      setTeamMeasurementForm({
        exercise_id: '',
        measured_at: new Date().toISOString().split('T')[0],
        playerData: {},
      })
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
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Mérések" description="Erőnléti mérések és tesztek" />
        <EmptyState
          icon={BarChart3}
          title="Nincs kiválasztott csapat"
          description="Válassz ki egy csapatot a folytatáshoz."
        />
      </div>
    )
  }

  const SORT_ICON = sortDirection === 'asc' ? ChevronUp : ChevronDown
  const sortIndicator = (field) =>
    sortField === field ? <SORT_ICON className="w-4 h-4" aria-hidden="true" /> : null
  const ariaSort = (field) =>
    sortField === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined
  const TH_SORTABLE =
    'px-4 py-3 text-left text-sm font-semibold text-fg cursor-pointer hover:text-accent'

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Mérések"
        description={`${selectedTeam.name} · ${measurements.length} mérés · ${players.length} játékos · ${exercises.length} gyakorlat`}
        actions={
          canEdit && (
            <>
              <Button icon={Dumbbell} onClick={() => setShowExerciseModal(true)}>
                Új gyakorlat
              </Button>
              <Button icon={Settings} onClick={() => setShowExerciseManagementModal(true)}>
                Gyakorlatok kezelése
              </Button>
              <Button
                icon={Users}
                disabled={players.length === 0}
                onClick={() => {
                  setSelectedPlayers(players.map((p) => p.id))
                  setShowPlayerSelectionModal(true)
                }}
              >
                Csapat felmérés
              </Button>
              <Button variant="primary" icon={Plus} onClick={() => setShowMeasurementModal(true)}>
                Új mérés
              </Button>
            </>
          )
        }
      />

      <div className="space-y-6">
        {/* Filters */}
        <Panel
          title="Szűrők"
          icon={Filter}
          actions={
            hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Szűrők törlése
              </Button>
            )
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Játékos" htmlFor="filter-player">
              <Select
                id="filter-player"
                value={filters.playerId}
                onChange={(e) => setFilters({ ...filters, playerId: e.target.value })}
              >
                <option value="">Összes játékos</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.jersey_number ? `#${player.jersey_number} ` : ''}
                    {player.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Gyakorlat" htmlFor="filter-exercise">
              <Select
                id="filter-exercise"
                value={filters.exerciseId}
                onChange={(e) => setFilters({ ...filters, exerciseId: e.target.value })}
              >
                <option value="">Összes gyakorlat</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Dátum-tól" htmlFor="filter-date-from">
              <Input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </Field>
            <Field label="Dátum-ig" htmlFor="filter-date-to">
              <Input
                id="filter-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </Field>
          </div>
        </Panel>

        {/* Export Button */}
        <div className="flex justify-end">
          <Button icon={Download} onClick={exportToCSV} disabled={measurements.length === 0}>
            CSV export
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <Panel>
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          </Panel>
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
          <Panel padded={false} className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th
                    onClick={() => handleSort('player.name')}
                    aria-sort={ariaSort('player.name')}
                    className={TH_SORTABLE}
                  >
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" aria-hidden="true" />
                      <span>Játékos</span>
                      {sortIndicator('player.name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('exercise.name')}
                    aria-sort={ariaSort('exercise.name')}
                    className={TH_SORTABLE}
                  >
                    <div className="flex items-center gap-1">
                      <Dumbbell className="w-4 h-4" aria-hidden="true" />
                      <span>Gyakorlat</span>
                      {sortIndicator('exercise.name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('value')}
                    aria-sort={ariaSort('value')}
                    className={TH_SORTABLE}
                  >
                    <div className="flex items-center gap-1">
                      <span>Érték</span>
                      {sortIndicator('value')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('one_rm')}
                    aria-sort={ariaSort('one_rm')}
                    className={TH_SORTABLE}
                  >
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" aria-hidden="true" />
                      <span>1RM</span>
                      {sortIndicator('one_rm')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-fg">Ismétlések</th>
                  <th
                    onClick={() => handleSort('measured_at')}
                    aria-sort={ariaSort('measured_at')}
                    className={TH_SORTABLE}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                      <span>Dátum</span>
                      {sortIndicator('measured_at')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-fg">Jegyzetek</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id} className="border-b border-line hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-fg">
                      {m.player?.jersey_number && (
                        <span className="text-accent font-semibold mr-2">#{m.player.jersey_number}</span>
                      )}
                      {m.player?.name}
                    </td>
                    <td className="px-4 py-3 text-fg">{m.exercise?.name}</td>
                    <td className="px-4 py-3 text-fg font-semibold">
                      {m.value} {m.exercise?.unit !== 'reps' ? m.exercise?.unit : ''}
                    </td>
                    <td className="px-4 py-3 text-accent font-semibold">
                      {m.one_rm && m.exercise?.unit !== 'reps' && m.exercise?.unit !== 'cm'
                        ? `${m.one_rm} ${m.exercise?.unit}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-fg">{m.reps || '-'}</td>
                    <td className="px-4 py-3 text-fg">
                      {new Date(m.measured_at).toLocaleDateString('hu-HU')}
                    </td>
                    <td className="px-4 py-3 text-muted text-sm max-w-xs truncate">{m.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
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
