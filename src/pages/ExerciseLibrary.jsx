import { useState, useEffect } from 'react'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import {
  Search,
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
  Info,
  Edit,
  Trash2,
} from 'lucide-react'
import TeamSelector from '../components/TeamSelector'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import CreateExerciseModal from './exercise-library/CreateExerciseModal'
import EditExerciseModal from './exercise-library/EditExerciseModal'
import useExerciseLibraryData from './exercise-library/useExerciseLibraryData'
import {
  MUSCLE_GROUPS,
  MODALITIES,
  normalizeMuscleGroup,
  MODALITY_LABELS,
  ROLE_LABELS,
  ROLE_ORDER,
} from '../lib/exerciseTaxonomy'
import { exerciseGifUrl } from '../lib/exerciseMedia'

// A 12 izomcsoporthoz ikon (csak már importált lucide ikonokat használunk).
const GROUP_ICONS = {
  all: Activity, mell: Heart, hat: Target, vall: Zap,
  bicepsz: Dumbbell, tricepsz: Dumbbell, alkar: Dumbbell,
  quad: Users, combhajlito: Users, farizom: Users, vadli: Users,
  core: Activity, csipo: Users,
}

export default function ExerciseLibrary() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'exercises')
  const {
    exercises,
    favorites,
    loading,
    fetchExerciseMuscles,
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
  const [selectedModality, setSelectedModality] = useState('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [selectedExerciseMuscles, setSelectedExerciseMuscles] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [newExercise, setNewExercise] = useState({
    name: '',
    name_en: '',
    muscle_group: 'mell',
    secondary_muscles: [],
    difficulty: 'beginner',
    type: 'gym',
    modality: 'erosites',
    gif_path: '',
    equipment: [],
    description: '',
    instructions: [],
    tips: [],
    parameters: { sets: 3, reps: '10-12', rest: '60s' }
  })

  const muscleGroups = [
    { id: 'all', name: 'Összes', icon: Activity, color: 'bg-slate-600' },
    ...MUSCLE_GROUPS.map(g => ({ ...g, icon: GROUP_ICONS[g.id] || Activity })),
  ]

  const difficultyLevels = [
    { id: 'all', name: 'Összes', color: 'text-slate-400' },
    { id: 'beginner', name: 'Kezdő', color: 'text-green-400' },
    { id: 'intermediate', name: 'Haladó', color: 'text-yellow-400' },
    { id: 'advanced', name: 'Profi', color: 'text-red-400' },
  ]

  useEffect(() => {
    filterExercises()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, favorites, searchTerm, selectedMuscleGroup, selectedDifficulty, selectedType, selectedModality, showFavoritesOnly])

  // A kiválasztott gyakorlat részletes izmainak betöltése.
  useEffect(() => {
    let active = true
    if (selectedExercise?.id) {
      fetchExerciseMuscles(selectedExercise.id).then(rows => {
        if (active) setSelectedExerciseMuscles(rows)
      })
    } else {
      setSelectedExerciseMuscles([])
    }
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise])

  const filterExercises = () => {
    let filtered = exercises

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(ex =>
        ex.name?.toLowerCase().includes(q) ||
        ex.name_en?.toLowerCase().includes(q) ||
        ex.description?.toLowerCase().includes(q)
      )
    }

    if (selectedMuscleGroup !== 'all') {
      filtered = filtered.filter(ex => normalizeMuscleGroup(ex.muscle_group) === selectedMuscleGroup)
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty)
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(ex => ex.type === selectedType)
    }

    if (selectedModality !== 'all') {
      // A régi, modality nélküli gyakorlatokat erősítésnek tekintjük.
      filtered = filtered.filter(ex => (ex.modality || 'erosites') === selectedModality)
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(ex => favorites.includes(ex.id))
    }

    setFilteredExercises(filtered)
  }

  const createExercise = async () => {
    const ok = await createExerciseOp(newExercise)
    if (ok) {
      setNewExercise({
        name: '',
        name_en: '',
        muscle_group: 'mell',
        secondary_muscles: [],
        difficulty: 'beginner',
        type: 'gym',
        modality: 'erosites',
        gif_path: '',
        equipment: [],
        description: '',
        instructions: [],
        tips: [],
        parameters: { sets: 3, reps: '10-12', rest: '60s' }
      })
      setShowCreateModal(false)
    }
  }

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
      const group = normalizeMuscleGroup(ex.muscle_group) || 'other'
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
    return muscleGroups.find(g => g.id === groupId)
      || { id: groupId, name: 'Egyéb', icon: Activity, color: 'bg-slate-600' }
  }

  // A részletes izmok szerep szerint csoportosítva (fő mozgató / segéd / stabilizáló).
  const musclesByRole = ROLE_ORDER
    .map(role => ({ role, items: selectedExerciseMuscles.filter(x => x.role === role) }))
    .filter(g => g.items.length > 0)

  const groupedExercises = groupExercisesByMuscleGroup()
  const detailGifUrl = selectedExercise ? exerciseGifUrl(selectedExercise.gif_path) : null

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-4 gap-4 flex-wrap lg:flex-nowrap">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Gyakorlat Könyvtár</h1>
              <p className="text-sm text-slate-400 hidden sm:block">
                {filteredExercises.length} gyakorlat
              </p>
            </div>
          </div>

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

          <div className="flex-shrink-0 w-full sm:w-auto order-3 lg:order-none">
            <TeamSelector />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Filters */}
      <div className="card space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Keresés gyakorlatok között (magyar vagy angol név)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Muscle Groups (12) */}
          <div className="flex flex-wrap gap-2">
            {muscleGroups.map(group => {
              const Icon = group.icon
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedMuscleGroup(group.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
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
        </div>

        <div className="flex flex-wrap gap-3">
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

          {/* Modality — erősítés / kalisztenika / funkcionális-HIIT / nyújtás */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedModality('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedModality === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Összes
            </button>
            {MODALITIES.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModality(m.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedModality === m.id ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {/* Favorites */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              showFavoritesOnly ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
          const isExpanded = expandedGroups[groupId] !== false

          return (
            <div key={groupId} className="card">
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

              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-0">
                  {groupExercises.map(exercise => {
                    const thumbUrl = exerciseGifUrl(exercise.gif_path)
                    return (
                    <div
                      key={exercise.id}
                      className="bg-slate-700/50 rounded-lg overflow-hidden hover:bg-slate-700 transition-all cursor-pointer border border-slate-600 hover:border-primary-500"
                      onClick={() => setSelectedExercise(exercise)}
                    >
                      {/* GIF thumbnail */}
                      {thumbUrl && (
                        <div className="w-full aspect-video bg-slate-900 overflow-hidden">
                          <img
                            src={thumbUrl}
                            alt={exercise.name}
                            loading="lazy"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{exercise.name}</h4>
                            {exercise.name_en && (
                              <p className="text-xs text-slate-400 mb-1">{exercise.name_en}</p>
                            )}
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

                        {exercise.description && (
                          <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                            {exercise.description}
                          </p>
                        )}

                        {exercise.equipment && exercise.equipment.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {exercise.equipment.map((eq, idx) => (
                              <span key={idx} className="px-2 py-1 bg-slate-600 text-xs text-slate-300 rounded">
                                {eq}
                              </span>
                            ))}
                          </div>
                        )}

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
                    </div>
                    )
                  })}
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
            <div className="flex items-start justify-between p-6 border-b border-slate-700">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedExercise.name}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedExercise.name_en && (
                    <span className="text-sm text-slate-400">{selectedExercise.name_en}</span>
                  )}
                  <span className={`text-sm font-medium ${getDifficultyColor(selectedExercise.difficulty)}`}>
                    {difficultyLevels.find(d => d.id === selectedExercise.difficulty)?.name}
                  </span>
                  {selectedExercise.muscle_group && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-sm text-slate-400">
                        {getMuscleGroupInfo(normalizeMuscleGroup(selectedExercise.muscle_group)).name}
                      </span>
                    </>
                  )}
                  {selectedExercise.modality && MODALITY_LABELS[selectedExercise.modality] && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-sm text-slate-400">
                        {MODALITY_LABELS[selectedExercise.modality]}
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

            <div className="p-6 space-y-6">
              {/* GIF */}
              {detailGifUrl && (
                <div className="w-full rounded-lg overflow-hidden bg-slate-900">
                  <img src={detailGifUrl} alt={selectedExercise.name} className="w-full max-h-[420px] object-contain" />
                </div>
              )}

              {selectedExercise.description && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Leírás</h3>
                  <p className="text-slate-300">{selectedExercise.description}</p>
                </div>
              )}

              {/* Konkrét izmok (latin, szerep szerint) */}
              {musclesByRole.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Résztvevő izmok</h3>
                  <div className="space-y-3">
                    {musclesByRole.map(({ role, items }) => (
                      <div key={role}>
                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                          {ROLE_LABELS[role]}
                        </p>
                        <div className="space-y-1">
                          {items.map((it, idx) => (
                            <div key={idx} className="flex items-baseline gap-2">
                              <span className="text-slate-200">{it.muscles?.name_hu}</span>
                              <span className="text-slate-500 text-sm italic">{it.muscles?.name_latin}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Szükséges eszközök</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.equipment.map((eq, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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

              {selectedExercise.secondary_muscles && selectedExercise.secondary_muscles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Másodlagos izomcsoportok</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.secondary_muscles.map((muscle, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg capitalize">
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                {canEdit && (
                  <button
                    onClick={() => {
                      const ex = selectedExercise
                      setSelectedExercise(null)
                      startEditExercise(ex)
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
                      const id = selectedExercise.id
                      setSelectedExercise(null)
                      deleteExercise(id)
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
