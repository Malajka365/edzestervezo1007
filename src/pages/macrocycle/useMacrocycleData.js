import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// Pure helper: generate weeks between start and end date (Monday-aligned)
export const generateWeeks = (startDate, endDate) => {
  const weeks = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Find Monday of start week
  const startMonday = new Date(start)
  startMonday.setDate(start.getDate() - start.getDay() + 1)

  let weekNumber = 1
  let currentDate = new Date(startMonday)

  while (currentDate <= end) {
    const weekStart = new Date(currentDate)
    const weekEnd = new Date(currentDate)
    weekEnd.setDate(weekEnd.getDate() + 6)

    weeks.push({
      number: weekNumber,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      month: weekStart.toLocaleDateString('hu-HU', { month: 'long' }),
    })

    currentDate.setDate(currentDate.getDate() + 7)
    weekNumber++
  }

  return weeks
}

/**
 * useMacrocycleData — owns the DATA layer for the Macrocycle Planner.
 *
 * Owns state: seasons, currentSeason, templates, macrocycleData, loading.
 * Every operation is a pure, parameterized function that reads NO component
 * UI state (modals, editSeason, seasonToDelete, templateName, confirmState...).
 * Operations that need to trigger a modal close return a boolean success flag
 * so the component can close/reset UI on success only (preserving exact behavior).
 */
export default function useMacrocycleData(selectedTeam) {
  const [seasons, setSeasons] = useState([])
  const [currentSeason, setCurrentSeason] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)

  const [macrocycleData, setMacrocycleData] = useState({
    weeks: [],
    mesocycles: [],
    planning: {},
  })

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
        loadSeason(data[0])
      } else {
        // No seasons for this team - clear everything
        setCurrentSeason(null)
        setMacrocycleData({
          weeks: [],
          mesocycles: [],
          planning: {},
        })
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    }
  }

  const loadSeason = async (season) => {
    setCurrentSeason(season)

    // Generate weeks between start and end date
    const weeks = generateWeeks(season.start_date, season.end_date)

    // Try to load existing planning data
    try {
      const { data, error } = await supabase
        .from('macrocycle_planning')
        .select('*')
        .eq('season_id', season.id)
        .eq('team_id', selectedTeam.id)
        .single()

      if (data) {
        setMacrocycleData({
          weeks,
          mesocycles: data.mesocycles || [],
          planning: data.planning || {},
        })
      } else {
        // Initialize empty planning
        setMacrocycleData({
          weeks,
          mesocycles: [],
          planning: {},
        })
      }
    } catch (error) {
      console.error('Error loading planning:', error)
      setMacrocycleData({
        weeks,
        mesocycles: [],
        planning: {},
      })
    }
  }

  // Create a new season. Takes the new-season form data as a param.
  // Returns true on success (component closes modal + resets form), false otherwise.
  const createSeason = async (seasonData) => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('training_seasons')
        .insert([{
          team_id: selectedTeam.id,
          name: seasonData.name,
          start_date: seasonData.start_date,
          end_date: seasonData.end_date,
        }])
        .select()
        .single()

      if (error) throw error

      setSeasons([data, ...seasons])
      loadSeason(data)
      return true
    } catch (error) {
      console.error('Error creating season:', error)
      toast.error('Hiba történt a szezon létrehozásakor')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Update a season. Takes the edited season object as a param (was editSeason state).
  // Returns true on success (component closes modal), false otherwise.
  const updateSeason = async (seasonData) => {
    if (!seasonData.name || !seasonData.start_date || !seasonData.end_date) {
      toast.error('Kérlek töltsd ki az összes mezőt!')
      return false
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('training_seasons')
        .update({
          name: seasonData.name,
          start_date: seasonData.start_date,
          end_date: seasonData.end_date,
        })
        .eq('id', seasonData.id)
        .select()

      if (error) throw error

      // Update seasons list
      setSeasons(seasons.map(s => s.id === seasonData.id ? data[0] : s))

      // Reload if this is the current season
      if (currentSeason?.id === seasonData.id) {
        loadSeason(data[0])
      }
      return true
    } catch (error) {
      console.error('Error updating season:', error)
      toast.error('Hiba történt a szezon frissítése során!')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Delete a season. Takes the season id as a param (was seasonToDelete state).
  // Returns true on success (component closes modal + clears seasonToDelete), false otherwise.
  const deleteSeason = async (seasonId) => {
    if (!seasonId) return false

    setLoading(true)
    try {
      // First delete associated planning data
      await supabase
        .from('macrocycle_planning')
        .delete()
        .eq('season_id', seasonId)

      // Then delete the season
      const { error } = await supabase
        .from('training_seasons')
        .delete()
        .eq('id', seasonId)

      if (error) throw error

      // Update seasons list
      const updatedSeasons = seasons.filter(s => s.id !== seasonId)
      setSeasons(updatedSeasons)

      // Clear current season if it was deleted
      if (currentSeason?.id === seasonId) {
        setCurrentSeason(null)
        setMacrocycleData({
          weeks: [],
          mesocycles: [],
          planning: {},
        })

        // Load first available season if exists
        if (updatedSeasons.length > 0) {
          loadSeason(updatedSeasons[0])
        }
      }
      return true
    } catch (error) {
      console.error('Error deleting season:', error)
      toast.error('Hiba történt a szezon törlése során!')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Template Functions
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('macrocycle_templates')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist (404), just set empty array
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('macrocycle_templates table does not exist yet. Please run the migration.')
          setTemplates([])
          return
        }
        throw error
      }
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      setTemplates([])
    }
  }

  // Save current planning as a template. Takes the template name as a param (was templateName state).
  // Returns true when the component should close+reset the modal (success OR missing table),
  // false when it should stay open (validation error OR generic error).
  const saveTemplate = async (name) => {
    if (!name.trim() || !currentSeason) {
      toast.error('Kérlek adj meg egy sablon nevet!')
      return false
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('macrocycle_templates')
        .insert([
          {
            name: name,
            team_id: selectedTeam.id,
            planning: macrocycleData.planning,
            mesocycles: macrocycleData.mesocycles,
            week_count: macrocycleData.weeks.length,
          },
        ])

      if (error) {
        // If table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          toast.error('A sablonok tábla még nem létezik az adatbázisban.\n\nKérlek futtasd le a migration-t:\n\n1. Nyisd meg a Supabase Dashboard-ot\n2. Menj a SQL Editor-ba\n3. Másold be a migration fájl tartalmát:\nsupabase/migrations/20250110_create_macrocycle_templates.sql\n4. Futtasd le a query-t')
          return true
        }
        throw error
      }

      toast.success('Sablon sikeresen mentve!')
      fetchTemplates()
      return true
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error(`Hiba történt a sablon mentése során!\n\n${error.message || 'Ismeretlen hiba'}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Load a template into the current season.
  // Returns true on success (component closes modal), false otherwise.
  const loadTemplate = async (template) => {
    if (!currentSeason) {
      toast.error('Először válassz ki egy szezont!')
      return false
    }

    try {
      // Apply template planning to current season
      setMacrocycleData({
        ...macrocycleData,
        planning: template.planning || {},
        mesocycles: template.mesocycles || [],
      })

      // Save to database
      await savePlanning({
        ...macrocycleData.planning,
        ...template.planning,
      })

      toast.success('Sablon sikeresen betöltve!')
      return true
    } catch (error) {
      console.error('Error loading template:', error)
      toast.error('Hiba történt a sablon betöltése során!')
      return false
    }
  }

  // Delete a template by id. This is the raw data action; the component wraps it
  // in a ConfirmDialog (confirmState UI stays in the component).
  const deleteTemplate = async (templateId) => {
    try {
      const { error } = await supabase
        .from('macrocycle_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      toast.success('Sablon törölve!')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Hiba történt a sablon törlése során!')
    }
  }

  const savePlanning = async (planning) => {
    if (!currentSeason) return

    try {
      // First, try to get existing record
      const { data: existing } = await supabase
        .from('macrocycle_planning')
        .select('id')
        .eq('season_id', currentSeason.id)
        .eq('team_id', selectedTeam.id)
        .single()

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('macrocycle_planning')
          .update({
            mesocycles: macrocycleData.mesocycles,
            planning: planning,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('macrocycle_planning')
          .insert({
            season_id: currentSeason.id,
            team_id: selectedTeam.id,
            mesocycles: macrocycleData.mesocycles,
            planning: planning,
          })

        if (error) throw error
      }
    } catch (error) {
      console.error('Error saving planning:', error)
    }
  }

  useEffect(() => {
    if (selectedTeam) {
      // Reset state when team changes
      setCurrentSeason(null)
      setMacrocycleData({
        weeks: [],
        mesocycles: [],
        planning: {},
      })
      fetchSeasons()
    }
  }, [selectedTeam])

  useEffect(() => {
    if (selectedTeam) {
      fetchTemplates()
    }
  }, [selectedTeam])

  return {
    // data state
    seasons,
    currentSeason,
    setCurrentSeason,
    templates,
    macrocycleData,
    setMacrocycleData,
    loading,
    // operations
    fetchSeasons,
    loadSeason,
    createSeason,
    updateSeason,
    deleteSeason,
    fetchTemplates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    savePlanning,
  }
}
