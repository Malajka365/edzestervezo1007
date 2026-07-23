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
 * Reads NO component UI state (searchTerm, selectedMuscleGroup,
 * selectedDifficulty, selectedType, showFavoritesOnly, forms, modals,
 * editingExercise, newExercise, confirmState). Form data is passed in as an
 * explicit argument to the write ops.
 *
 * Auth: the ORIGINAL page had no `session` prop (rendered as `<ExerciseLibrary />`)
 * and resolved the current user via `supabase.auth.getUser()` inside
 * fetchExercises and toggleFavorite. Preserved exactly — the hook keeps those
 * getUser() calls rather than taking a session param, so there is zero behavior
 * change and no new coupling.
 *
 * Write ops that trigger a modal close (createExercise, updateExercise) return a
 * boolean success flag so the component closes/resets UI on success only (same
 * pattern the reviewer validated in useMacrocycleData / useMeasurementsData).
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

  // Create a new exercise. Takes the newExercise form as an arg. Returns true on
  // success (component resets form + closes modal), false otherwise. Validation
  // failure keeps the modal open and toggles no loading state (matches original).
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

  // Toggle a favorite. Preserves the original SNAPSHOT-read logic exactly: it
  // reads the current `favorites` snapshot to decide insert-vs-delete, then
  // writes the derived array back (non-functional setState). The original used
  // this same snapshot form; each favorites change re-renders the component,
  // re-runs the hook, and rebinds this closure over fresh `favorites` — so the
  // behavior is identical to the pre-extraction component.
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
      toast.error('Hiba történt a kedvenc jelölés során!')
    }
  }

  // Load on mount (was the component's fetchExercises() effect). Safe to own here:
  // fetchExercises takes no args and reads no component UI state.
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
    createExercise,
    updateExercise,
    deleteExercise,
    toggleFavorite,
  }
}
