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
 * table (fetched on demand with fetchExerciseMuscles for the detail view).
 */
export default function useExerciseLibraryData() {
  const [exercises, setExercises] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)

  // Data fetch: loads training_exercises + the current user's favorites.
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
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    } finally {
      setLoading(false)
    }
  }

  // A kiválasztott gyakorlat részletes izmai (fő mozgató / segéd / stabilizáló),
  // latin névvel — az exercise_muscles + muscles táblákból. Csak a részletnézet hívja.
  const fetchExerciseMuscles = async (exerciseId) => {
    if (!exerciseId) return []
    try {
      const { data, error } = await supabase
        .from('exercise_muscles')
        .select('role, muscles(code, name_latin, name_hu, name_en, muscle_group)')
        .eq('exercise_id', exerciseId)
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching exercise muscles:', error)
      return []
    }
  }

  // Create a new exercise. Takes the newExercise form as an arg. Returns true on
  // success (component resets form + closes modal), false otherwise.
  const createExercise = async (newExercise) => {
    if (!newExercise.name.trim()) {
      toast.error('A gyakorlat neve kötelező!')
      return false
    }

    setLoading(true)
    try {
      const { error } = await supabase
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

      if (error) throw error

      fetchExercises()
      toast.success('Gyakorlat sikeresen létrehozva!')
      return true
    } catch (error) {
      console.error('Error creating exercise:', error)
      toast.error('Hiba történt a gyakorlat létrehozása során!')
      return false
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
    // operations
    fetchExercises,
    fetchExerciseMuscles,
    createExercise,
    updateExercise,
    deleteExercise,
    toggleFavorite,
  }
}
