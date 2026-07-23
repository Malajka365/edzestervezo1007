import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// Pure helper: Epley 1RM estimate. Exported so both this hook's write ops and
// the component (modal display) share one definition (generateWeeks precedent).
export const calculate1RM = (weight, reps) => {
  if (!weight || reps <= 0) return null
  if (reps === 1) return weight
  return (weight * (1 + reps / 30)).toFixed(2)
}

/**
 * useMeasurementsData — owns the DATA layer for the Measurements (1RM & tests) page.
 *
 * Owns state: measurements, loading.
 * Reads NO component UI state (filters, sortField, sortDirection, forms, modals,
 * selectedPlayers, editingExercise, confirmState). Query parameters and form data
 * are passed in as explicit arguments to the operations.
 *
 * Write ops that trigger a modal close return a boolean success flag so the
 * component closes/resets UI on success only (same pattern as useMacrocycleData).
 *
 * The exercise mutations (createExercise, deleteExercise) invalidate the shared
 * ['exercises'] React Query cache on success — preserved exactly.
 *
 * `selectedTeam` and `session` are props (not UI state) — passed in.
 */
export default function useMeasurementsData(selectedTeam, session) {
  const queryClient = useQueryClient()
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(false)

  // Data fetch. Filters + sort are passed in as args (component owns them as UI
  // state); the hook reads no component state.
  const fetchMeasurements = async (filters = {}, sortField = 'measured_at', sortDirection = 'desc') => {
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

  // Create/update an exercise. Takes the exercise form + editingExercise as args.
  // Invalidates ['exercises'] on success (both branches). Returns true on success
  // (component closes modal + resets form), false otherwise.
  const createExercise = async (exerciseForm, editingExercise) => {
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
        queryClient.invalidateQueries({ queryKey: ['exercises'] })
        toast.success('Gyakorlat sikeresen frissítve!')
      } else {
        // Create new exercise
        const { data, error } = await supabase
          .from('exercises')
          .insert([{ ...exerciseForm, created_by: session.user.id }])
          .select()
          .single()
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['exercises'] })
        toast.success('Gyakorlat sikeresen létrehozva!')
      }
      return true
    } catch (error) {
      console.error('Error saving exercise:', error)
      toast.error('Hiba történt')
      return false
    }
  }

  // Raw delete of an exercise (delete + invalidate ['exercises'] + toast). The
  // component wraps this in a ConfirmDialog (confirmState UI stays in component).
  const deleteExercise = async (exerciseId) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('Gyakorlat sikeresen törölve!')
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast.error('Hiba történt a törlés során')
    }
  }

  // Create a single measurement. Takes the measurement form as an arg.
  // Returns true on success (component closes modal + resets form), false otherwise.
  const createMeasurement = async (measurementForm) => {
    if (!selectedTeam) return false
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
      toast.success('Mérés sikeresen rögzítve!')
      return true
    } catch (error) {
      console.error('Error creating measurement:', error)
      toast.error('Hiba történt')
      return false
    }
  }

  // Create measurements for a whole team. Takes the team-measurement form as an
  // arg (its playerData drives which players are inserted). Returns true on
  // success (component closes modal + resets form), false otherwise (validation
  // failure keeps the modal open, matching original behavior).
  const createTeamMeasurement = async (teamMeasurementForm) => {
    if (!selectedTeam) return false

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
        return false
      }

      const { data, error } = await supabase
        .from('measurements')
        .insert(measurementsToInsert)
        .select(`*, player:players(id, name, jersey_number), exercise:exercises(id, name, unit)`)

      if (error) throw error

      setMeasurements([...data, ...measurements])
      toast.success(`${measurementsToInsert.length} mérés sikeresen rögzítve!`)
      return true
    } catch (error) {
      console.error('Error creating team measurements:', error)
      toast.error('Hiba történt a mérések rögzítésekor')
      return false
    }
  }

  // NOTE: the load effects stay in the component. Both the team-change fetch and
  // the filters/sort-change fetch pass the component's current filters + sort into
  // fetchMeasurements, so the hook never reads UI state. Placing the team-change
  // effect here would either drop active filters or double-fetch — so it stays put.

  return {
    // data state
    measurements,
    loading,
    // operations
    fetchMeasurements,
    createMeasurement,
    createTeamMeasurement,
    createExercise,
    deleteExercise,
  }
}
