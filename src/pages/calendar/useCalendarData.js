import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// Pure helper: format a Date as YYYY-MM-DD in local timezone.
export const getDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Pure helper: return the 7 days (Mon..Sun) of the week containing `date`.
export const getWeekDays = (date) => {
  const days = []
  const dayOfWeek = date.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Get Monday
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    days.push(day)
  }

  return days
}

/**
 * useCalendarData — owns the DATA layer for the Edzésnaptár (Calendar).
 *
 * Owns state: seasons, currentSeason, planningData, trainingSessions, matches,
 * weekLoadFactors, weekTacticsTechnique, saveTimeouts, loading.
 *
 * Reads NO component UI state (view, currentDate is a prop param, modals,
 * confirmState, editingSession...). The debounced auto-save (updateLoadFactor /
 * updateTacticsTechnique) manages saveTimeouts entirely inside the hook.
 *
 * Needs `currentDate` (a prop) to know which week/month to load. It is NOT
 * owned here — the component owns it (navigation is UI state).
 */
export default function useCalendarData(selectedTeam, currentDate) {
  const [seasons, setSeasons] = useState([])
  const [currentSeason, setCurrentSeason] = useState(null)
  const [planningData, setPlanningData] = useState({})
  const [trainingSessions, setTrainingSessions] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)

  // Load factors state for week view
  const [weekLoadFactors, setWeekLoadFactors] = useState({})
  const [saveTimeouts, setSaveTimeouts] = useState({})

  // Tactics & Technique state for week view
  const [weekTacticsTechnique, setWeekTacticsTechnique] = useState({})

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from('training_seasons')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('start_date', { ascending: false })

      if (error) throw error
      setSeasons(data || [])

      if (data && data.length > 0) {
        // Find season that includes current date
        const activeSeason = data.find(season => {
          const start = new Date(season.start_date)
          const end = new Date(season.end_date)
          return currentDate >= start && currentDate <= end
        })
        setCurrentSeason(activeSeason || data[0])
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    }
  }

  const loadPlanningData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('macrocycle_planning')
        .select('*')
        .eq('season_id', currentSeason.id)
        .eq('team_id', selectedTeam.id)
        .single()

      if (data) {
        setPlanningData(data.planning || {})
      } else {
        setPlanningData({})
      }
    } catch (error) {
      console.error('Error loading planning:', error)
      setPlanningData({})
    } finally {
      setLoading(false)
    }
  }

  const loadTrainingSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .gte('date', currentSeason.start_date)
        .lte('date', currentSeason.end_date)
        .order('date', { ascending: true })

      if (error) throw error
      setTrainingSessions(data || [])
    } catch (error) {
      console.error('Error loading training sessions:', error)
      setTrainingSessions([])
    }
  }

  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .gte('date', currentSeason.start_date)
        .lte('date', currentSeason.end_date)
        .order('date', { ascending: true })

      if (error) throw error
      setMatches(data || [])
    } catch (error) {
      console.error('Error loading matches:', error)
      setMatches([])
    }
  }

  const loadWeekLoadFactors = async () => {
    if (!currentSeason || !selectedTeam) return

    try {
      // Get the current week's date range
      const weekDays = getWeekDays(currentDate)
      const startDate = getDateKey(weekDays[0])
      const endDate = getDateKey(weekDays[6])

      const { data, error } = await supabase
        .from('training_load_factors')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      // Convert array to object keyed by date
      const factorsMap = {}
      if (data) {
        data.forEach(item => {
          factorsMap[item.date] = {
            circulation: item.circulation_load,
            mechanical: item.mechanical_load,
            energy: item.energy_system || '',
            duration: item.duration || '',
            ratio: item.work_rest_ratio || '',
            type: item.training_type || ''
          }
        })
      }

      setWeekLoadFactors(factorsMap)
    } catch (error) {
      console.error('Error loading load factors:', error)
      setWeekLoadFactors({})
    }
  }

  const saveLoadFactorToDatabase = async (date, factorType, value) => {
    if (!selectedTeam) return

    const dateKey = getDateKey(date)

    try {
      // Prepare the data object
      const updateData = {
        team_id: selectedTeam.id,
        date: dateKey
      }

      // Map factor types to database columns
      switch (factorType) {
        case 'circulation':
          updateData.circulation_load = value
          break
        case 'mechanical':
          updateData.mechanical_load = value
          break
        case 'energy':
          updateData.energy_system = value
          break
        case 'duration':
          updateData.duration = value
          break
        case 'ratio':
          updateData.work_rest_ratio = value
          break
        case 'type':
          updateData.training_type = value
          break
      }

      // Use upsert to insert or update
      const { error } = await supabase
        .from('training_load_factors')
        .upsert(updateData, {
          onConflict: 'team_id,date'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving load factor:', error)
      toast.error('Hiba történt a mentés során!')
    }
  }

  const updateLoadFactor = (date, factorType, value, immediate = false) => {
    const dateKey = getDateKey(date)
    const timeoutKey = `${dateKey}-${factorType}`

    // Update local state immediately for responsive UI
    setWeekLoadFactors(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [factorType]: value
      }
    }))

    // Clear existing timeout for this field
    if (saveTimeouts[timeoutKey]) {
      clearTimeout(saveTimeouts[timeoutKey])
    }

    // For star ratings and dropdowns, save immediately
    // For text inputs, debounce by 1 second
    const delay = immediate ? 0 : 1000

    const timeoutId = setTimeout(() => {
      saveLoadFactorToDatabase(date, factorType, value)

      // Clean up timeout reference
      setSaveTimeouts(prev => {
        const newTimeouts = { ...prev }
        delete newTimeouts[timeoutKey]
        return newTimeouts
      })
    }, delay)

    setSaveTimeouts(prev => ({
      ...prev,
      [timeoutKey]: timeoutId
    }))
  }

  const getLoadFactor = (date, factorType) => {
    const dateKey = getDateKey(date)
    return weekLoadFactors[dateKey]?.[factorType] || ''
  }

  // Tactics & Technique functions
  const loadWeekTacticsTechnique = async () => {
    if (!currentSeason || !selectedTeam) return

    try {
      const weekDays = getWeekDays(currentDate)
      const startDate = getDateKey(weekDays[0])
      const endDate = getDateKey(weekDays[6])

      const { data, error } = await supabase
        .from('tactics_technique')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      const tacticsMap = {}
      if (data) {
        data.forEach(item => {
          tacticsMap[item.date] = {
            tactical_support: item.tactical_support || '',
            tactical_defense: item.tactical_defense || '',
            technical_support: item.technical_support || '',
            technical_defense: item.technical_defense || '',
            video_url: item.video_url || '',
            practice_support_common: item.practice_support_common || '',
            practice_support_wide: item.practice_support_wide || '',
            practice_support_inside: item.practice_support_inside || '',
            practice_support_main_direction: item.practice_support_main_direction || '',
            practice_defense_common: item.practice_defense_common || '',
            practice_defense_wide: item.practice_defense_wide || '',
            practice_defense_inside: item.practice_defense_inside || '',
            practice_defense_main_direction: item.practice_defense_main_direction || '',
            practice_game: item.practice_game || ''
          }
        })
      }

      setWeekTacticsTechnique(tacticsMap)
    } catch (error) {
      console.error('Error loading tactics technique:', error)
      setWeekTacticsTechnique({})
    }
  }

  const saveTacticsTechniqueToDatabase = async (date, fieldName, value) => {
    if (!selectedTeam) return

    const dateKey = getDateKey(date)

    try {
      const updateData = {
        team_id: selectedTeam.id,
        date: dateKey,
        [fieldName]: value
      }

      const { error } = await supabase
        .from('tactics_technique')
        .upsert(updateData, {
          onConflict: 'team_id,date'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving tactics technique:', error)
      toast.error('Hiba történt a mentés során!')
    }
  }

  const updateTacticsTechnique = (date, fieldName, value) => {
    const dateKey = getDateKey(date)
    const timeoutKey = `tactics-${dateKey}-${fieldName}`

    setWeekTacticsTechnique(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [fieldName]: value
      }
    }))

    if (saveTimeouts[timeoutKey]) {
      clearTimeout(saveTimeouts[timeoutKey])
    }

    // Dropdown mezők (video_url, practice_game) azonnal mentődnek
    const isDropdown = fieldName === 'video_url' || fieldName === 'practice_game'
    const delay = isDropdown ? 0 : 1000

    const timeoutId = setTimeout(() => {
      saveTacticsTechniqueToDatabase(date, fieldName, value)

      setSaveTimeouts(prev => {
        const newTimeouts = { ...prev }
        delete newTimeouts[timeoutKey]
        return newTimeouts
      })
    }, delay)

    setSaveTimeouts(prev => ({
      ...prev,
      [timeoutKey]: timeoutId
    }))
  }

  const getTacticsTechnique = (date, fieldName) => {
    const dateKey = getDateKey(date)
    return weekTacticsTechnique[dateKey]?.[fieldName] || ''
  }

  // Raw delete of a training session (delete + reload). The component wraps this
  // in a ConfirmDialog (confirmState UI stays in the component).
  const deleteTrainingSession = async (id) => {
    try {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadTrainingSessions()
    } catch (error) {
      console.error('Error deleting training session:', error)
      toast.error('Hiba történt a törlés során!')
    }
  }

  useEffect(() => {
    if (selectedTeam) {
      fetchSeasons()
    }
  }, [selectedTeam])

  useEffect(() => {
    if (currentSeason && selectedTeam) {
      loadPlanningData()
      loadTrainingSessions()
      loadMatches()
      loadWeekLoadFactors()
      loadWeekTacticsTechnique()
    }
  }, [currentSeason, selectedTeam, currentDate])

  return {
    // data state
    seasons,
    currentSeason,
    setCurrentSeason,
    planningData,
    trainingSessions,
    matches,
    weekLoadFactors,
    weekTacticsTechnique,
    loading,
    // fetch / refetch ops
    fetchSeasons,
    loadPlanningData,
    loadTrainingSessions,
    loadMatches,
    loadWeekLoadFactors,
    loadWeekTacticsTechnique,
    // debounced writes + readers
    updateLoadFactor,
    getLoadFactor,
    updateTacticsTechnique,
    getTacticsTechnique,
    // delete (raw; component wraps in confirm)
    deleteTrainingSession,
  }
}
