import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

/**
 * useExerciseLibraryData — owns the DATA layer for the Exercise Library page.
 *
 * Tables: `training_exercises` (the global exercise LIBRARY) and
 * `user_exercise_favorites`. This is UNRELATED to the `exercises` table / the
 * `useExercises` React Query hook used by the Measurements page.
 *
 * Owns state: exercises, favorites, loading.
 *
 * The exercise rows now also carry the GIF-catalog fields (name_en, modality,
 * gif_path, ...) and a detailed muscle layer via the `exercise_muscles` join
 * table. The list query stays slim; the full row is fetched on demand with
 * fetchExerciseDetail, and the muscle layer is preloaded once as an index
 * (musclesByExercise / muscleSearchByExercise) instead of per-exercise.
 */
export default function useExerciseLibraryData() {
  const [exercises, setExercises] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)
  const [muscles, setMuscles] = useState([])
  const [equipmentTypes, setEquipmentTypes] = useState([])
  const [musclesByExercise, setMusclesByExercise] = useState({})
  const [muscleSearchByExercise, setMuscleSearchByExercise] = useState({})

  // Data fetch: loads training_exercises + the current user's favorites.
  const fetchExercises = async () => {
    setLoading(true)
    try {
      // Fetch exercises (slim: only the columns the list view needs)
      const { data, error } = await supabase
        .from('training_exercises')
        .select('id, slug, name, name_en, muscle_group, secondary_muscles, equipment, difficulty, modality, gif_path')
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

      // Izom-index: egy lekérdezés az egész könyvtárra.
      const { data: emData } = await supabase
        .from('exercise_muscles')
        .select('exercise_id, role, muscles(code, name_latin, name_hu, name_en, muscle_group)')
      const byEx = {}
      const searchByEx = {}
      for (const row of emData || []) {
        const m = row.muscles
        if (!m) continue
        ;(byEx[row.exercise_id] ||= []).push({ code: m.code, role: row.role, name_hu: m.name_hu, name_latin: m.name_latin, muscle_group: m.muscle_group })
        searchByEx[row.exercise_id] = ((searchByEx[row.exercise_id] || '') + ' ' + m.name_hu + ' ' + m.name_latin).toLowerCase()
      }
      setMusclesByExercise(byEx)
      setMuscleSearchByExercise(searchByEx)

      const [{ data: mus }, { data: eq }] = await Promise.all([
        supabase.from('muscles').select('code, name_hu, name_latin, name_en, muscle_group').order('muscle_group'),
        supabase.from('equipment_types').select('code, name_hu').order('name_hu'),
      ])
      setMuscles(mus || [])
      setEquipmentTypes(eq || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    } finally {
      setLoading(false)
    }
  }

  // A teljes sor a részletnézethez (a karcsú listából hiányzó mezők).
  const fetchExerciseDetail = async (id) => {
    if (!id) return null
    const { data, error } = await supabase
      .from('training_exercises').select('*').eq('id', id).single()
    if (error) { console.error('Error fetching exercise detail:', error); return null }
    return data
  }

  // A gyakorlat részletes izmainak mentése: teljes csere (törlés + beszúrás).
  const saveExerciseMuscles = async (exerciseId, rows) => {
    await supabase.from('exercise_muscles').delete().eq('exercise_id', exerciseId)
    if (rows && rows.length) {
      const payload = rows.map((r) => ({ exercise_id: exerciseId, muscle_code: r.muscle_code, role: r.role }))
      const { error } = await supabase.from('exercise_muscles').insert(payload)
      if (error) throw error
    }
  }

  // Create a new exercise. Takes the newExercise form as an arg. Returns the new
  // row's id on success (component resets form + closes modal), null otherwise.
  const createExercise = async (newExercise) => {
    if (!newExercise.name.trim()) {
      toast.error('A gyakorlat neve kötelező!')
      return null
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('training_exercises')
        .insert({
          name: newExercise.name,
          name_en: newExercise.name_en || null,
          muscle_group: newExercise.muscle_group,
          secondary_muscles: newExercise.secondary_muscles,
          difficulty: newExercise.difficulty,
          type: newExercise.type,
          modality: newExercise.modality || null,
          category: 'strength',
          equipment: newExercise.equipment,
          gif_path: newExercise.gif_path || null,
          description: newExercise.description,
          instructions: newExercise.instructions,
          tips: newExercise.tips,
          parameters: newExercise.parameters
        })
        .select('id').single()

      if (error) throw error

      fetchExercises()
      toast.success('Gyakorlat sikeresen létrehozva!')
      return data.id
    } catch (error) {
      console.error('Error creating exercise:', error)
      toast.error('Hiba történt a gyakorlat létrehozása során!')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Update an exercise. Takes the editingExercise form as an arg. Returns true on
  // success (component closes modal + clears editingExercise), false otherwise.
  const updateExercise = async (editingExercise) => {
    if (!editingExercise.name.trim()) {
      toast.error('A gyakorlat neve kötelező!')
      return false
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('training_exercises')
        .update({
          name: editingExercise.name,
          name_en: editingExercise.name_en || null,
          muscle_group: editingExercise.muscle_group,
          secondary_muscles: editingExercise.secondary_muscles,
          difficulty: editingExercise.difficulty,
          type: editingExercise.type,
          modality: editingExercise.modality || null,
          equipment: editingExercise.equipment,
          gif_path: editingExercise.gif_path || null,
          description: editingExercise.description,
          instructions: editingExercise.instructions,
          tips: editingExercise.tips
        })
        .eq('id', editingExercise.id)

      if (error) throw error

      fetchExercises()
      toast.success('Gyakorlat sikeresen frissítve!')
      return true
    } catch (error) {
      console.error('Error updating exercise:', error)
      toast.error('Hiba történt a frissítés során!')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Raw delete of a training_exercise (delete + refetch + toast). The component
  // wraps this in a ConfirmDialog (confirmState UI stays in the component).
  const deleteExercise = async (exerciseId) => {
    try {
      const { error } = await supabase
        .from('training_exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error

      fetchExercises()
      toast.success('Gyakorlat sikeresen törölve!')
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast.error('Hiba történt a törlés során!')
    }
  }

  // Toggle a favorite (unchanged snapshot-read logic).
  const toggleFavorite = async (exerciseId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const isFavorite = favorites.includes(exerciseId)

      if (isFavorite) {
        const { error } = await supabase
          .from('user_exercise_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)

        if (error) throw error
        setFavorites(favorites.filter(id => id !== exerciseId))
      } else {
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
      toast.error('Hiba történt a kedvenc jelölés során!')
    }
  }

  useEffect(() => {
    fetchExercises()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    // data state
    exercises,
    favorites,
    loading,
    muscles,
    equipmentTypes,
    musclesByExercise,
    muscleSearchByExercise,
    // operations
    fetchExercises,
    fetchExerciseDetail,
    saveExerciseMuscles,
    createExercise,
    updateExercise,
    deleteExercise,
    toggleFavorite,
  }
}
