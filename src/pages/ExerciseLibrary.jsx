import { useState, useEffect } from 'react'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import {
  Search,
  Filter,
  Star,
  Plus,
  Dumbbell,
  Heart,
  Zap,
  Target,
  Activity,
  Users,
  X,
  ChevronDown,
  ChevronRight,
  Play,
  Info,
  Edit,
  Trash2,
} from 'lucide-react'
import TeamSelector from '../components/TeamSelector'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import CreateExerciseModal from './exercise-library/CreateExerciseModal'
import EditExerciseModal from './exercise-library/EditExerciseModal'
import useExerciseLibraryData from './exercise-library/useExerciseLibraryData'

export default function ExerciseLibrary() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'exercises')
  // Data layer: exercises + favorites list + all fetch/create/update/delete/
  // favorite ops live in the hook. UI state (filters, forms, modals, confirm)
  // stays here.
  const {
    exercises,
    favorites,
    loading,
    createExercise: createExerciseOp,
    updateExercise: updateExerciseOp,
    deleteExercise: deleteExerciseOp,
    toggleFavorite,
  } = useExerciseLibraryData()
  const [filteredExercises, setFilteredExercises] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [newExercise, setNewExercise] = useState({
    name: '',
    muscle_group: 'chest',
    secondary_muscles: [],
    difficulty: 'beginner',
    type: 'gym',
    equipment: [],
    description: '',
    instructions: [],
    tips: [],
    parameters: { sets: 3, reps: '10-12', rest: '60s' }
  })

  const muscleGroups = [
    { id: 'all', name: 'Összes', icon: Activity, color: 'bg-slate-600' },
    { id: 'chest', name: 'Mellkas', icon: Heart, color: 'bg-red-600' },
    { id: 'back', name: 'Hát', icon: Target, color: 'bg-blue-600' },
    { id: 'shoulders', name: 'Váll', icon: Zap, color: 'bg-yellow-600' },
    { id: 'arms', name: 'Kar', icon: Dumbbell, color: 'bg-purple-600' },
    { id: 'legs', name: 'Láb', icon: Users, color: 'bg-green-600' },
    { id: 'core', name: 'Törzs', icon: Activity, color: 'bg-orange-600' },
  ]

  const difficultyLevels = [
    { id: 'all', name: 'Összes', color: 'text-slate-400' },
    { id: 'beginner', name: 'Kezdő', color: 'text-green-400' },
    { id: 'intermediate', name: 'Haladó', color: 'text-yellow-400' },
    { id: 'advanced', name: 'Profi', color: 'text-red-400' },
  ]

  useEffect(() => {
    filterExercises()
  }, [exercises, favorites, searchTerm, selectedMuscleGroup, selectedDifficulty, selectedType, showFavoritesOnly])

  const filterExercises = () => {
    let filtered = exercises

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Muscle group filter
    if (selectedMuscleGroup !== 'all') {
      filtered = filtered.filter(ex => ex.muscle_group === selectedMuscleGroup)
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty)
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(ex => ex.type === selectedType)
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(ex => favorites.includes(ex.id))
    }

    setFilteredExercises(filtered)
  }

  // Thin wrapper: calls the hook op with the form, then resets form + closes the
  // modal on success only (success-flag pattern).
  const createExercise = async () => {
    const ok = await createExerciseOp(newExercise)
    if (ok) {
      // Reset form
      setNewExercise({
        name: '',
        muscle_group: 'chest',
        secondary_muscles: [],
        difficulty: 'beginner',
        type: 'gym',
        equipment: [],
        description: '',
        instructions: [],
        tips: [],
        parameters: { sets: 3, reps: '10-12', rest: '60s' }
      })
      setShowCreateModal(false)
    }
  }

  // Thin wrapper: opens the ConfirmDialog; the hook op does the actual delete.
  const deleteExercise = (exerciseId) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a gyakorlatot?',
      action: async () => {
        await deleteExerciseOp(exerciseId)
      },
    })
  }

  const startEditExercise = (exercise) => {
    setEditingExercise({
      ...exercise,
      equipment: exercise.equipment || [],
      instructions: exercise.instructions || [],
      tips: exercise.tips || [],
      secondary_muscles: exercise.secondary_muscles || []
    })
    setShowEditModal(true)
  }

  // Thin wrapper: calls the hook op with editingExercise, then closes the modal +
  // clears editingExercise on success only (success-flag pattern).
  const updateExercise = async () => {
    const ok = await updateExerciseOp(editingExercise)
    if (ok) {
      setShowEditModal(false)
      setEditingExercise(null)
    }
  }

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const groupExercisesByMuscleGroup = () => {
    const grouped = {}
    filteredExercises.forEach(ex => {
      const group = ex.muscle_group || 'other'
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(ex)
    })
    return grouped
  }

  const getDifficultyColor = (difficulty) => {
    const level = difficultyLevels.find(d => d.id === difficulty)
    return level?.color || 'text-slate-400'
  }

  const getMuscleGroupInfo = (groupId) => {
    return muscleGroups.find(g => g.id === groupId) || muscleGroups[0]
  }

  const groupedExercises = groupExercisesByMuscleGroup()

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header - Dashboard stílusban */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-4 gap-4 flex-wrap lg:flex-nowrap">
          {/* Bal oldal: Cím */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Gyakorlat Könyvtár</h1>
              <p className="text-sm text-slate-400 hidden sm:block">
                {filteredExercises.length} gyakorlat
              </p>
            </div>
          </div>

          {/* Középső gombok */}
          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
                title="Új gyakorlat"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Új gyakorlat</span>
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
      <div className="card space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Keresés gyakorlatok között..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Muscle Groups */}
          <div className="flex flex-wrap gap-2">
            {muscleGroups.map(group => {
              const Icon = group.icon
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedMuscleGroup(group.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedMuscleGroup === group.id
                      ? `${group.color} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {group.name}
                </button>
              )
            })}
          </div>

          {/* Difficulty */}
          <div className="flex gap-2">
            {difficultyLevels.map(level => (
              <button
                key={level.id}
                onClick={() => setSelectedDifficulty(level.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDifficulty === level.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {level.name}
              </button>
            ))}
          </div>

          {/* Type */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedType === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Összes
            </button>
            <button
              onClick={() => setSelectedType('gym')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedType === 'gym'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Edzőterem
            </button>
            <button
              onClick={() => setSelectedType('both')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedType === 'both'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Mindkettő
            </button>
          </div>

          {/* Favorites */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              showFavoritesOnly
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Kedvencek
          </button>
        </div>
      </div>

      {/* Exercise List - Grouped by Muscle Group */}
      <div className="space-y-4">
        {Object.entries(groupedExercises).map(([groupId, groupExercises]) => {
          const groupInfo = getMuscleGroupInfo(groupId)
          const Icon = groupInfo.icon
          const isExpanded = expandedGroups[groupId] !== false // Default expanded

          return (
            <div key={groupId} className="card">
              {/* Group Header */}
              <button
                onClick={() => toggleGroupExpand(groupId)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${groupInfo.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">{groupInfo.name}</h3>
                    <p className="text-sm text-slate-400">{groupExercises.length} gyakorlat</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Exercise Cards */}
              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-0">
                  {groupExercises.map(exercise => (
                    <div
                      key={exercise.id}
                      className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-all cursor-pointer border border-slate-600 hover:border-primary-500"
                      onClick={() => setSelectedExercise(exercise)}
                    >
                      {/* Exercise Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-1">{exercise.name}</h4>
                          <p className={`text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                            {difficultyLevels.find(d => d.id === exercise.difficulty)?.name || 'N/A'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(exercise.id)
                          }}
                          className="p-1 hover:bg-slate-600 rounded transition-colors"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              favorites.includes(exercise.id)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-400'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                        {exercise.description}
                      </p>

                      {/* Equipment Tags */}
                      {exercise.equipment && exercise.equipment.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {exercise.equipment.map((eq, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-slate-600 text-xs text-slate-300 rounded"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {canEdit && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditExercise(exercise)
                            }}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Szerkesztés
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteExercise(exercise.id)
                            }}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Törlés
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-700">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedExercise.name}</h2>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${getDifficultyColor(selectedExercise.difficulty)}`}>
                    {difficultyLevels.find(d => d.id === selectedExercise.difficulty)?.name}
                  </span>
                  {selectedExercise.muscle_group && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-sm text-slate-400">
                        {getMuscleGroupInfo(selectedExercise.muscle_group).name}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedExercise.description && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Leírás</h3>
                  <p className="text-slate-300">{selectedExercise.description}</p>
                </div>
              )}

              {/* Equipment */}
              {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Szükséges eszközök</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.equipment.map((eq, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Végrehajtás</h3>
                  <ol className="space-y-2">
                    {selectedExercise.instructions.map((instruction, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        <span className="text-slate-300">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tips */}
              {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-yellow-400" />
                    Tippek
                  </h3>
                  <ul className="space-y-2">
                    {selectedExercise.tips.map((tip, idx) => (
                      <li key={idx} className="flex gap-2 text-slate-300">
                        <span className="text-yellow-400">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Secondary Muscles */}
              {selectedExercise.secondary_muscles && selectedExercise.secondary_muscles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Másodlagos izmok</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.secondary_muscles.map((muscle, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg capitalize"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                {canEdit && (
                  <button
                    onClick={() => {
                      setSelectedExercise(null)
                      startEditExercise(selectedExercise)
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Szerkesztés
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      setSelectedExercise(null)
                      deleteExercise(selectedExercise.id)
                    }}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Törlés
                  </button>
                )}
                <button
                  onClick={() => toggleFavorite(selectedExercise.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    favorites.includes(selectedExercise.id)
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  <Star className={`w-5 h-5 ${favorites.includes(selectedExercise.id) ? 'fill-current' : ''}`} />
                  {favorites.includes(selectedExercise.id) ? 'Kedvenc' : 'Kedvencekhez'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredExercises.length === 0 && (
        <div className="card text-center py-12">
          <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Nincs találat</h3>
          <p className="text-slate-400 mb-6">Próbálj meg más szűrőket használni</p>
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedMuscleGroup('all')
              setSelectedDifficulty('all')
              setSelectedType('all')
              setShowFavoritesOnly(false)
            }}
            className="btn btn-secondary"
          >
            Szűrők törlése
          </button>
        </div>
      )}

      {/* Create Exercise Modal */}
      {showCreateModal && (
        <CreateExerciseModal
          setShowCreateModal={setShowCreateModal}
          newExercise={newExercise}
          setNewExercise={setNewExercise}
          createExercise={createExercise}
          loading={loading}
        />
      )}

      {/* Edit Exercise Modal */}
      {showEditModal && editingExercise && (
        <EditExerciseModal
          setShowEditModal={setShowEditModal}
          editingExercise={editingExercise}
          setEditingExercise={setEditingExercise}
          updateExercise={updateExercise}
          loading={loading}
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
    </div>
  )
}
