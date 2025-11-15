import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
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

export default function ExerciseLibrary() {
  const { selectedTeam } = useTeams()
  const [exercises, setExercises] = useState([])
  const [filteredExercises, setFilteredExercises] = useState([])
  const [favorites, setFavorites] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [loading, setLoading] = useState(false)
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
    fetchExercises()
  }, [])

  useEffect(() => {
    filterExercises()
  }, [exercises, favorites, searchTerm, selectedMuscleGroup, selectedDifficulty, selectedType, showFavoritesOnly])

  const fetchExercises = async () => {
    setLoading(true)
    try {
      // Fetch exercises
      const { data, error } = await supabase
        .from('training_exercises')
        .select('*')
        .order('muscle_group', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      
      // Fetch user's favorites
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: favData } = await supabase
          .from('user_exercise_favorites')
          .select('exercise_id')
          .eq('user_id', user.id)
        
        setFavorites(favData?.map(f => f.exercise_id) || [])
      }
      
      setExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const createExercise = async () => {
    if (!newExercise.name.trim()) {
      alert('A gyakorlat neve kötelező!')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('training_exercises')
        .insert({
          name: newExercise.name,
          muscle_group: newExercise.muscle_group,
          secondary_muscles: newExercise.secondary_muscles,
          difficulty: newExercise.difficulty,
          type: newExercise.type,
          category: 'strength',
          equipment: newExercise.equipment,
          description: newExercise.description,
          instructions: newExercise.instructions,
          tips: newExercise.tips,
          parameters: newExercise.parameters
        })

      if (error) throw error

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
      fetchExercises()
      alert('✅ Gyakorlat sikeresen létrehozva!')
    } catch (error) {
      console.error('Error creating exercise:', error)
      alert('❌ Hiba történt a gyakorlat létrehozása során!')
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (exerciseId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const isFavorite = favorites.includes(exerciseId)

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_exercise_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)

        if (error) throw error
        setFavorites(favorites.filter(id => id !== exerciseId))
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_exercise_favorites')
          .insert({
            user_id: user.id,
            exercise_id: exerciseId
          })

        if (error) throw error
        setFavorites([...favorites, exerciseId])
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Hiba történt a kedvenc jelölés során!')
    }
  }

  const deleteExercise = async (exerciseId) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a gyakorlatot?')) return

    try {
      const { error } = await supabase
        .from('training_exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error
      
      fetchExercises()
      alert('✅ Gyakorlat sikeresen törölve!')
    } catch (error) {
      console.error('Error deleting exercise:', error)
      alert('❌ Hiba történt a törlés során!')
    }
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
    if (!editingExercise.name.trim()) {
      alert('A gyakorlat neve kötelező!')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('training_exercises')
        .update({
          name: editingExercise.name,
          muscle_group: editingExercise.muscle_group,
          secondary_muscles: editingExercise.secondary_muscles,
          difficulty: editingExercise.difficulty,
          type: editingExercise.type,
          equipment: editingExercise.equipment,
          description: editingExercise.description,
          instructions: editingExercise.instructions,
          tips: editingExercise.tips
        })
        .eq('id', editingExercise.id)

      if (error) throw error

      setShowEditModal(false)
      setEditingExercise(null)
      fetchExercises()
      alert('✅ Gyakorlat sikeresen frissítve!')
    } catch (error) {
      console.error('Error updating exercise:', error)
      alert('❌ Hiba történt a frissítés során!')
    } finally {
      setLoading(false)
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white">Új gyakorlat létrehozása</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Gyakorlat neve *
                </label>
                <input
                  type="text"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="pl. Bench Press"
                />
              </div>

              {/* Muscle Group & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Izomcsoport
                  </label>
                  <select
                    value={newExercise.muscle_group}
                    onChange={(e) => setNewExercise({ ...newExercise, muscle_group: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="chest">Mellkas</option>
                    <option value="back">Hát</option>
                    <option value="shoulders">Váll</option>
                    <option value="arms">Kar</option>
                    <option value="legs">Láb</option>
                    <option value="core">Törzs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Nehézség
                  </label>
                  <select
                    value={newExercise.difficulty}
                    onChange={(e) => setNewExercise({ ...newExercise, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="beginner">Kezdő</option>
                    <option value="intermediate">Haladó</option>
                    <option value="advanced">Profi</option>
                  </select>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Típus
                </label>
                <select
                  value={newExercise.type}
                  onChange={(e) => setNewExercise({ ...newExercise, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="gym">Edzőterem</option>
                  <option value="both">Mindkettő</option>
                  <option value="ball">Labdás</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Leírás
                </label>
                <textarea
                  value={newExercise.description}
                  onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  placeholder="Rövid leírás a gyakorlatról..."
                />
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Szükséges eszközök
                </label>
                <input
                  type="text"
                  placeholder="pl. barbell, dumbbells (vesszővel elválasztva)"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onBlur={(e) => {
                    const equipment = e.target.value.split(',').map(eq => eq.trim()).filter(eq => eq)
                    setNewExercise({ ...newExercise, equipment })
                  }}
                />
                {newExercise.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newExercise.equipment.map((eq, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-600 text-xs text-slate-300 rounded flex items-center gap-1"
                      >
                        {eq}
                        <button
                          onClick={() => {
                            const newEquipment = newExercise.equipment.filter((_, i) => i !== idx)
                            setNewExercise({ ...newExercise, equipment: newEquipment })
                          }}
                          className="hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Végrehajtás (lépések)
                </label>
                <div className="space-y-2">
                  {newExercise.instructions.map((instruction, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium mt-2">
                        {idx + 1}
                      </span>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={instruction}
                          onChange={(e) => {
                            const newInstructions = [...newExercise.instructions]
                            newInstructions[idx] = e.target.value
                            setNewExercise({ ...newExercise, instructions: newInstructions })
                          }}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={`${idx + 1}. lépés`}
                        />
                        <button
                          onClick={() => {
                            const newInstructions = newExercise.instructions.filter((_, i) => i !== idx)
                            setNewExercise({ ...newExercise, instructions: newInstructions })
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setNewExercise({
                        ...newExercise,
                        instructions: [...newExercise.instructions, '']
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Lépés hozzáadása
                  </button>
                </div>
              </div>

              {/* Tips */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tippek
                </label>
                <div className="space-y-2">
                  {newExercise.tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-yellow-400 mt-2">•</span>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={tip}
                          onChange={(e) => {
                            const newTips = [...newExercise.tips]
                            newTips[idx] = e.target.value
                            setNewExercise({ ...newExercise, tips: newTips })
                          }}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Tipp..."
                        />
                        <button
                          onClick={() => {
                            const newTips = newExercise.tips.filter((_, i) => i !== idx)
                            setNewExercise({ ...newExercise, tips: newTips })
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setNewExercise({
                        ...newExercise,
                        tips: [...newExercise.tips, '']
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tipp hozzáadása
                  </button>
                </div>
              </div>

              {/* Secondary Muscles */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Másodlagos izmok
                </label>
                <input
                  type="text"
                  placeholder="pl. triceps, shoulders (vesszővel elválasztva)"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onBlur={(e) => {
                    const muscles = e.target.value.split(',').map(m => m.trim()).filter(m => m)
                    setNewExercise({ ...newExercise, secondary_muscles: muscles })
                  }}
                />
                {newExercise.secondary_muscles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newExercise.secondary_muscles.map((muscle, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-600 text-xs text-slate-300 rounded flex items-center gap-1 capitalize"
                      >
                        {muscle}
                        <button
                          onClick={() => {
                            const newMuscles = newExercise.secondary_muscles.filter((_, i) => i !== idx)
                            setNewExercise({ ...newExercise, secondary_muscles: newMuscles })
                          }}
                          className="hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={createExercise}
                  disabled={loading || !newExercise.name.trim()}
                  className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Létrehozás...' : 'Létrehozás'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {showEditModal && editingExercise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white">Gyakorlat szerkesztése</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingExercise(null)
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Content - Same as Create Modal but with editingExercise */}
            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Gyakorlat neve *
                </label>
                <input
                  type="text"
                  value={editingExercise.name}
                  onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Muscle Group & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Izomcsoport</label>
                  <select
                    value={editingExercise.muscle_group}
                    onChange={(e) => setEditingExercise({ ...editingExercise, muscle_group: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="chest">Mellkas</option>
                    <option value="back">Hát</option>
                    <option value="shoulders">Váll</option>
                    <option value="arms">Kar</option>
                    <option value="legs">Láb</option>
                    <option value="core">Törzs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Nehézség</label>
                  <select
                    value={editingExercise.difficulty}
                    onChange={(e) => setEditingExercise({ ...editingExercise, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="beginner">Kezdő</option>
                    <option value="intermediate">Haladó</option>
                    <option value="advanced">Profi</option>
                  </select>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Típus</label>
                <select
                  value={editingExercise.type}
                  onChange={(e) => setEditingExercise({ ...editingExercise, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="gym">Edzőterem</option>
                  <option value="both">Mindkettő</option>
                  <option value="ball">Labdás</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Leírás</label>
                <textarea
                  value={editingExercise.description}
                  onChange={(e) => setEditingExercise({ ...editingExercise, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="3"
                />
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Szükséges eszközök</label>
                <input
                  type="text"
                  placeholder="pl. barbell, dumbbells (vesszővel elválasztva)"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onBlur={(e) => {
                    const equipment = e.target.value.split(',').map(eq => eq.trim()).filter(eq => eq)
                    setEditingExercise({ ...editingExercise, equipment })
                  }}
                />
                {editingExercise.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingExercise.equipment.map((eq, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-600 text-xs text-slate-300 rounded flex items-center gap-1"
                      >
                        {eq}
                        <button
                          onClick={() => {
                            const newEquipment = editingExercise.equipment.filter((_, i) => i !== idx)
                            setEditingExercise({ ...editingExercise, equipment: newEquipment })
                          }}
                          className="hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Végrehajtás (lépések)</label>
                <div className="space-y-2">
                  {editingExercise.instructions.map((instruction, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium mt-2">
                        {idx + 1}
                      </span>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={instruction}
                          onChange={(e) => {
                            const newInstructions = [...editingExercise.instructions]
                            newInstructions[idx] = e.target.value
                            setEditingExercise({ ...editingExercise, instructions: newInstructions })
                          }}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={`${idx + 1}. lépés`}
                        />
                        <button
                          onClick={() => {
                            const newInstructions = editingExercise.instructions.filter((_, i) => i !== idx)
                            setEditingExercise({ ...editingExercise, instructions: newInstructions })
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingExercise({
                        ...editingExercise,
                        instructions: [...editingExercise.instructions, '']
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Lépés hozzáadása
                  </button>
                </div>
              </div>

              {/* Tips */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tippek</label>
                <div className="space-y-2">
                  {editingExercise.tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-yellow-400 mt-2">•</span>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={tip}
                          onChange={(e) => {
                            const newTips = [...editingExercise.tips]
                            newTips[idx] = e.target.value
                            setEditingExercise({ ...editingExercise, tips: newTips })
                          }}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Tipp..."
                        />
                        <button
                          onClick={() => {
                            const newTips = editingExercise.tips.filter((_, i) => i !== idx)
                            setEditingExercise({ ...editingExercise, tips: newTips })
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingExercise({
                        ...editingExercise,
                        tips: [...editingExercise.tips, '']
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tipp hozzáadása
                  </button>
                </div>
              </div>

              {/* Secondary Muscles */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Másodlagos izmok</label>
                <input
                  type="text"
                  placeholder="pl. triceps, shoulders (vesszővel elválasztva)"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onBlur={(e) => {
                    const muscles = e.target.value.split(',').map(m => m.trim()).filter(m => m)
                    setEditingExercise({ ...editingExercise, secondary_muscles: muscles })
                  }}
                />
                {editingExercise.secondary_muscles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingExercise.secondary_muscles.map((muscle, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-600 text-xs text-slate-300 rounded flex items-center gap-1 capitalize"
                      >
                        {muscle}
                        <button
                          onClick={() => {
                            const newMuscles = editingExercise.secondary_muscles.filter((_, i) => i !== idx)
                            setEditingExercise({ ...editingExercise, secondary_muscles: newMuscles })
                          }}
                          className="hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingExercise(null)
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={updateExercise}
                  disabled={loading || !editingExercise.name.trim()}
                  className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}
