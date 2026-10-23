import { useState, useEffect, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
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
  ChevronDown,
  ChevronRight,
  Info,
  Pencil,
  Trash2,
} from 'lucide-react'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Chip from '../components/ui/Chip'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import StatusPill from '../components/ui/StatusPill'
import { Input } from '../components/ui/Field'
import CreateExerciseModal from './exercise-library/CreateExerciseModal'
import EditExerciseModal from './exercise-library/EditExerciseModal'
import useExerciseLibraryData from './exercise-library/useExerciseLibraryData'
import { filterExercises } from './exercise-library/filterExercises'
import {
  MUSCLE_GROUPS,
  MODALITIES,
  normalizeMuscleGroup,
  MODALITY_LABELS,
  ROLE_LABELS,
  ROLE_ORDER,
} from '../lib/exerciseTaxonomy'
import { exerciseGifUrl, exerciseThumbUrl } from '../lib/exerciseMedia'

// A 12 izomcsoporthoz ikon (csak már importált lucide ikonokat használunk).
const GROUP_ICONS = {
  all: Activity, mell: Heart, hat: Target, vall: Zap,
  bicepsz: Dumbbell, tricepsz: Dumbbell, alkar: Dumbbell,
  quad: Users, combhajlito: Users, farizom: Users, vadli: Users,
  core: Activity, csipo: Users,
}

// Kitöltött csillag a kedvenc jelöléshez (az IconButton/Button ikon-komponenst vár).
function FilledStar({ className = '', ...props }) {
  return <Star className={`${className} fill-current`} {...props} />
}

// A nehézségi szint állapot-színe (kezdő / haladó / profi).
const DIFFICULTY_STATUS = { beginner: 'ok', intermediate: 'warn', advanced: 'bad' }
const DIFFICULTY_NAMES = { beginner: 'Kezdő', intermediate: 'Haladó', advanced: 'Profi' }

function DifficultyPill({ difficulty }) {
  return (
    <StatusPill status={DIFFICULTY_STATUS[difficulty] || 'neutral'}>
      {DIFFICULTY_NAMES[difficulty] || 'N/A'}
    </StatusPill>
  )
}

// A részletes izmok szerepének színe.
const ROLE_STYLES = {
  primary: { bar: 'bg-bad', label: 'text-bad' },
  secondary: { bar: 'bg-warn', label: 'text-warn' },
  stabilizer: { bar: 'bg-accent', label: 'text-accent' },
}

export default function ExerciseLibrary() {
  const { currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'exercises')
  const {
    exercises,
    favorites,
    loading,
    muscles,
    equipmentTypes,
    musclesByExercise,
    muscleSearchByExercise,
    fetchExercises,
    fetchExerciseDetail,
    saveExerciseMuscles,
    createExercise: createExerciseOp,
    updateExercise: updateExerciseOp,
    deleteExercise: deleteExerciseOp,
    toggleFavorite,
  } = useExerciseLibraryData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('mell') // volt 'all'
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedModality, setSelectedModality] = useState('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(60)
  const [detailMuscles, setDetailMuscles] = useState([]) // a modal részletes izmai
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

  const muscleGroups = MUSCLE_GROUPS.map((g) => ({ ...g, icon: GROUP_ICONS[g.id] || Activity }))

  const difficultyLevels = [
    { id: 'all', name: 'Összes' },
    { id: 'beginner', name: 'Kezdő' },
    { id: 'intermediate', name: 'Haladó' },
    { id: 'advanced', name: 'Profi' },
  ]

  const filtered = useMemo(() => filterExercises(exercises, {
    searchTerm, muscleGroup: selectedMuscleGroup, difficulty: selectedDifficulty,
    modality: selectedModality, favoritesOnly: showFavoritesOnly, favorites, muscleSearchByExercise,
  }), [exercises, searchTerm, selectedMuscleGroup, selectedDifficulty, selectedModality, showFavoritesOnly, favorites, muscleSearchByExercise])

  const visible = filtered.slice(0, visibleCount)

  useEffect(() => { setVisibleCount(60) }, [searchTerm, selectedMuscleGroup, selectedDifficulty, selectedModality, showFavoritesOnly])

  // Gyors A → B kattintásnál A késve beérkező válasza felülírhatná a már megnyitott
  // B részletnézetet, ezért csak a legutobbi kérés eredményét engedjük be.
  const detailRequestRef = useRef(0)

  const openDetail = async (ex) => {
    const requestId = ++detailRequestRef.current
    const full = await fetchExerciseDetail(ex.id)
    if (requestId !== detailRequestRef.current) return
    setSelectedExercise(full || ex)
    setSelectedExerciseMuscles(musclesByExercise[ex.id] || [])
  }

  const createExercise = async () => {
    const id = await createExerciseOp(newExercise)
    if (id) {
      try {
        await saveExerciseMuscles(id, detailMuscles)
      } catch (error) {
        console.error('Error saving exercise muscles:', error)
        toast.error('A gyakorlat mentve, de a részletes izmok mentése nem sikerült.')
      } finally {
        fetchExercises()
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
        setDetailMuscles([])
        setShowCreateModal(false)
      }
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
    setDetailMuscles((musclesByExercise[exercise.id] || []).map((m) => ({ muscle_code: m.code, role: m.role })))
    setShowEditModal(true)
  }

  const updateExercise = async () => {
    const ok = await updateExerciseOp(editingExercise)
    if (ok) {
      try {
        await saveExerciseMuscles(editingExercise.id, detailMuscles)
      } catch (error) {
        console.error('Error saving exercise muscles:', error)
        toast.error('A gyakorlat mentve, de a részletes izmok mentése nem sikerült.')
      } finally {
        fetchExercises()
        setShowEditModal(false)
        setEditingExercise(null)
        setDetailMuscles([])
      }
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
    visible.forEach(ex => {
      const group = normalizeMuscleGroup(ex.muscle_group) || 'other'
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(ex)
    })
    return grouped
  }

  const getMuscleGroupInfo = (groupId) => {
    return muscleGroups.find(g => g.id === groupId)
      || { id: groupId, name: 'Egyéb', icon: Activity }
  }

  // A részletes izmok szerep szerint csoportosítva (fő mozgató / segéd / stabilizáló).
  const musclesByRole = ROLE_ORDER
    .map(role => ({ role, items: selectedExerciseMuscles.filter(x => x.role === role) }))
    .filter(g => g.items.length > 0)

  const groupedExercises = groupExercisesByMuscleGroup()
  const detailIsFavorite = !!selectedExercise && favorites.includes(selectedExercise.id)
  const detailGifUrl = selectedExercise ? exerciseGifUrl(selectedExercise.gif_path) : null

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Gyakorlattár"
        description={`${filtered.length} gyakorlat${filtered.length > visible.length ? ` (látszik: ${visible.length})` : ''}`}
        actions={
          canEdit && (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => { setDetailMuscles([]); setShowCreateModal(true) }}
            >
              Új gyakorlat
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {/* Filters */}
        <Panel className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
            <Input
              type="text"
              aria-label="Keresés gyakorlatok között"
              placeholder="Keresés gyakorlatok között (magyar vagy angol név)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Muscle Groups (12) */}
          <div className="flex flex-wrap gap-2">
            {muscleGroups.map(group => (
              <Chip
                key={group.id}
                icon={group.icon}
                selected={selectedMuscleGroup === group.id}
                onClick={() => setSelectedMuscleGroup(group.id)}
              >
                {group.name}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {/* Difficulty */}
            <div className="flex flex-wrap gap-2">
              {difficultyLevels.map(level => (
                <Chip
                  key={level.id}
                  selected={selectedDifficulty === level.id}
                  onClick={() => setSelectedDifficulty(level.id)}
                >
                  {level.name}
                </Chip>
              ))}
            </div>

            {/* Modality — erősítés / kalisztenika / funkcionális-HIIT / nyújtás */}
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={selectedModality === 'all'}
                onClick={() => setSelectedModality('all')}
              >
                Összes
              </Chip>
              {MODALITIES.map(m => (
                <Chip
                  key={m.id}
                  selected={selectedModality === m.id}
                  onClick={() => setSelectedModality(m.id)}
                >
                  {m.name}
                </Chip>
              ))}
            </div>

            {/* Favorites */}
            <Chip
              icon={Star}
              selected={showFavoritesOnly}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              Kedvencek
            </Chip>
          </div>
        </Panel>

        {/* Exercise List - Grouped by Muscle Group */}
        {loading && exercises.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedExercises).map(([groupId, groupExercises]) => {
              const groupInfo = getMuscleGroupInfo(groupId)
              const Icon = groupInfo.icon
              const isExpanded = expandedGroups[groupId] !== false

              return (
                <Panel key={groupId} padded={false}>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand(groupId)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between p-4 rounded-[14px] text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-surface-2 text-fg">
                        <Icon className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-fg">{groupInfo.name}</h3>
                        <p className="text-sm text-muted">{groupExercises.length} gyakorlat</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted" aria-hidden="true" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-0">
                      {groupExercises.map(exercise => {
                        const gifUrl = exerciseGifUrl(exercise.gif_path)
                        const thumbUrl = exerciseThumbUrl(exercise.gif_path)
                        const isFavorite = favorites.includes(exercise.id)
                        return (
                          <div
                            key={exercise.id}
                            className="bg-surface-2 rounded-[10px] overflow-hidden transition-colors cursor-pointer border border-line hover:border-accent"
                            onClick={() => openDetail(exercise)}
                          >
                            {/* Kártya-kép: kis statikus thumbnail (gyors); ha nincs thumb,
                                a nagy GIF-re esik vissza. */}
                            {gifUrl && (
                              <div className="w-full aspect-video bg-bg overflow-hidden">
                                <img
                                  src={thumbUrl || gifUrl}
                                  alt={exercise.name}
                                  loading="lazy"
                                  onError={(e) => { if (gifUrl && e.currentTarget.src !== gifUrl) e.currentTarget.src = gifUrl }}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}

                            <div className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-fg mb-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openDetail(exercise)
                                      }}
                                      className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                                    >
                                      {exercise.name}
                                    </button>
                                  </h4>
                                  {exercise.name_en && (
                                    <p className="text-xs text-muted mb-1.5">{exercise.name_en}</p>
                                  )}
                                  <DifficultyPill difficulty={exercise.difficulty} />
                                </div>
                                <IconButton
                                  icon={isFavorite ? FilledStar : Star}
                                  label={isFavorite ? 'Eltávolítás a kedvencek közül' : 'Hozzáadás a kedvencekhez'}
                                  aria-pressed={isFavorite}
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(exercise.id)
                                  }}
                                  className={isFavorite ? '!text-warn' : ''}
                                />
                              </div>

                              {exercise.description && (
                                <p className="text-sm text-fg mb-3 line-clamp-2">
                                  {exercise.description}
                                </p>
                              )}

                              {exercise.equipment && exercise.equipment.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {exercise.equipment.map((eq, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-surface-3 text-xs text-fg rounded">
                                      {eq}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {canEdit && (
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    icon={Pencil}
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startEditExercise(exercise)
                                    }}
                                  >
                                    Szerkesztés
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    icon={Trash2}
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteExercise(exercise.id)
                                    }}
                                  >
                                    Törlés
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Panel>
              )
            })}
          </div>
        )}

        {filtered.length > visible.length && (
          <div className="flex justify-center">
            <Button onClick={() => setVisibleCount((c) => c + 60)}>
              Továbbiak ({filtered.length - visible.length})
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={Dumbbell}
            title="Nincs találat"
            description="Próbálj meg más szűrőket használni"
            actionLabel="Szűrők törlése"
            onAction={() => {
              setSearchTerm('')
              setSelectedMuscleGroup('mell')
              setSelectedDifficulty('all')
              setSelectedModality('all')
              setShowFavoritesOnly(false)
            }}
          />
        )}
      </div>

      {/* Exercise Detail Modal — csak olvasható, nincs benne űrlapadat, ezért a háttérre kattintás zárja */}
      <Modal
        open={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        title={selectedExercise?.name}
        size="lg"
        closeOnBackdrop
        footer={
          selectedExercise && (
            <>
              {canEdit && (
                <Button
                  icon={Pencil}
                  onClick={() => {
                    const ex = selectedExercise
                    setSelectedExercise(null)
                    startEditExercise(ex)
                  }}
                >
                  Szerkesztés
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => {
                    const id = selectedExercise.id
                    setSelectedExercise(null)
                    deleteExercise(id)
                  }}
                >
                  Törlés
                </Button>
              )}
              <Button
                icon={detailIsFavorite ? FilledStar : Star}
                aria-pressed={detailIsFavorite}
                onClick={() => toggleFavorite(selectedExercise.id)}
              >
                {detailIsFavorite ? 'Kedvenc' : 'Kedvencekhez'}
              </Button>
            </>
          )
        }
      >
        {selectedExercise && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              {selectedExercise.name_en && (
                <span className="text-sm text-muted">{selectedExercise.name_en}</span>
              )}
              <DifficultyPill difficulty={selectedExercise.difficulty} />
              {selectedExercise.muscle_group && (
                <>
                  <span className="text-subtle" aria-hidden="true">•</span>
                  <span className="text-sm text-muted">
                    {getMuscleGroupInfo(normalizeMuscleGroup(selectedExercise.muscle_group)).name}
                  </span>
                </>
              )}
              {selectedExercise.modality && MODALITY_LABELS[selectedExercise.modality] && (
                <>
                  <span className="text-subtle" aria-hidden="true">•</span>
                  <span className="text-sm text-muted">
                    {MODALITY_LABELS[selectedExercise.modality]}
                  </span>
                </>
              )}
            </div>

            {/* GIF */}
            {detailGifUrl && (
              <div className="w-full rounded-lg overflow-hidden bg-bg">
                <img src={detailGifUrl} alt={selectedExercise.name} className="w-full max-h-[420px] object-contain" />
              </div>
            )}

            {selectedExercise.description && (
              <div>
                <h3 className="text-base font-semibold text-fg mb-2">Leírás</h3>
                <p className="text-fg">{selectedExercise.description}</p>
              </div>
            )}

            {/* Konkrét izmok (latin, szerep szerint) — szerepenként külön
                kártyában, hogy jól elváljanak egymástól. */}
            {musclesByRole.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-fg mb-3">Résztvevő izmok</h3>
                <div className="space-y-2.5">
                  {musclesByRole.map(({ role, items }) => {
                    const roleStyle = ROLE_STYLES[role] || { bar: 'bg-subtle', label: 'text-muted' }
                    return (
                      <div key={role} className="flex gap-3 rounded-lg bg-surface-2 p-3">
                        <span className={`w-1 rounded-full flex-shrink-0 ${roleStyle.bar}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${roleStyle.label}`}>
                            {ROLE_LABELS[role]}
                          </p>
                          <ul className="space-y-1.5">
                            {items.map((it, idx) => (
                              <li key={idx} className="flex flex-wrap items-baseline gap-x-2">
                                <span className="text-fg">{it.name_hu}</span>
                                <span className="text-muted text-sm italic">{it.name_latin}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-fg mb-2">Szükséges eszközök</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedExercise.equipment.map((eq, idx) => (
                    <span key={idx} className="px-3 py-1 bg-surface-2 text-fg rounded-full text-sm">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-fg mb-3">Végrehajtás</h3>
                <ol className="space-y-2">
                  {selectedExercise.instructions.map((instruction, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-accent text-accent-fg rounded-full flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-fg">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {selectedExercise.tips && selectedExercise.tips.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-warn" aria-hidden="true" />
                  Tippek
                </h3>
                <ul className="space-y-2">
                  {selectedExercise.tips.map((tip, idx) => (
                    <li key={idx} className="flex gap-2 text-fg">
                      <span className="text-warn" aria-hidden="true">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedExercise.secondary_muscles && selectedExercise.secondary_muscles.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-fg mb-2">Másodlagos izomcsoportok</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedExercise.secondary_muscles.map((muscle, idx) => (
                    <span key={idx} className="px-3 py-1 bg-surface-2 text-fg rounded-full text-sm capitalize">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Exercise Modal */}
      {showCreateModal && (
        <CreateExerciseModal
          setShowCreateModal={setShowCreateModal}
          newExercise={newExercise}
          setNewExercise={setNewExercise}
          createExercise={createExercise}
          loading={loading}
          equipmentTypes={equipmentTypes}
          muscles={muscles}
          detailMuscles={detailMuscles}
          setDetailMuscles={setDetailMuscles}
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
          equipmentTypes={equipmentTypes}
          muscles={muscles}
          detailMuscles={detailMuscles}
          setDetailMuscles={setDetailMuscles}
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
