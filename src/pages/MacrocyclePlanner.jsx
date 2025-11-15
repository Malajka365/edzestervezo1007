import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import {
  Calendar,
  Plus,
  Save,
  Trash2,
  Download,
  ChevronDown,
  X,
  FileDown,
  Upload,
  Copy,
  Edit,
} from 'lucide-react'
import TeamSelector from '../components/TeamSelector'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function MacrocyclePlanner() {
  const { selectedTeam } = useTeams()
  const [seasons, setSeasons] = useState([])
  const [currentSeason, setCurrentSeason] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [seasonToDelete, setSeasonToDelete] = useState(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false)
  const [templates, setTemplates] = useState([])
  const [templateName, setTemplateName] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const tableRef = useRef(null)
  
  const [newSeason, setNewSeason] = useState({
    name: '',
    start_date: '',
    end_date: '',
  })
  
  const [editSeason, setEditSeason] = useState({
    id: null,
    name: '',
    start_date: '',
    end_date: '',
  })

  const [macrocycleData, setMacrocycleData] = useState({
    weeks: [],
    mesocycles: [],
    planning: {},
  })

  const [activeDropdown, setActiveDropdown] = useState(null)
  const [activeCycleEdit, setActiveCycleEdit] = useState(null)
  const [cycleInput, setCycleInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Training categories and options
  const trainingCategories = {
    opt_max_power: {
      name: 'Max Power',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-cyan-700',
      order: 1,
    },
    opt_power: {
      name: 'Power',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-cyan-500',
      order: 2,
    },
    opt_max_strength: {
      name: 'Max Strength',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-cyan-600',
      order: 3,
    },
    opt_hypertrophy: {
      name: 'Hypertrophy',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-cyan-300',
      order: 4,
    },
    opt_strength_endurance: {
      name: 'Strength Endurance',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-cyan-400',
      order: 5,
    },
    opt_stabilization: {
      name: 'Stabilization',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-cyan-500',
      order: 6,
    },
    correction: {
      name: 'Korrekció',
      type: 'dropdown',
      options: ['Igen', 'Nem', 'Részleges'],
      colors: {
        'Igen': 'bg-green-500',
        'Nem': 'bg-red-500',
        'Részleges': 'bg-yellow-500',
      }
    },
    endurance: {
      name: 'Állóképesség',
      type: 'dropdown',
      options: ['Aerob', 'Anaerob', 'HIIT', 'Tempo', 'Regeneráció', '-'],
      colors: {
        'Aerob': 'bg-blue-400',
        'Anaerob': 'bg-blue-600',
        'HIIT': 'bg-red-500',
        'Tempo': 'bg-orange-500',
        'Regeneráció': 'bg-green-400',
        '-': 'bg-slate-600',
      }
    },
    saq: {
      name: 'SAQ',
      type: 'dropdown',
      options: ['Speed', 'Agility', 'Quickness', 'Combo', '-'],
      colors: {
        'Speed': 'bg-purple-500',
        'Agility': 'bg-purple-400',
        'Quickness': 'bg-purple-600',
        'Combo': 'bg-purple-700',
        '-': 'bg-slate-600',
      }
    },
    contact: {
      name: 'Kontakt',
      type: 'dropdown',
      options: ['Alacsony', 'Közepes', 'Magas', 'Mérkőzés', '-'],
      colors: {
        'Alacsony': 'bg-green-500',
        'Közepes': 'bg-yellow-500',
        'Magas': 'bg-orange-500',
        'Mérkőzés': 'bg-red-600',
        '-': 'bg-slate-600',
      }
    },
    plyometrics: {
      name: 'Plyometria',
      type: 'dropdown',
      options: ['Alacsony', 'Közepes', 'Magas', 'Reaktív', '-'],
      colors: {
        'Alacsony': 'bg-indigo-400',
        'Közepes': 'bg-indigo-500',
        'Magas': 'bg-indigo-600',
        'Reaktív': 'bg-indigo-700',
        '-': 'bg-slate-600',
      }
    },
  }

  // Daily breakdown categories (for weekly schedule)
  const dailyCategories = {
    match: {
      name: 'M',
      fullName: 'Match',
      color: 'bg-yellow-400',
    },
    home: {
      name: 'H',
      fullName: 'Home',
      color: 'bg-green-500',
    },
    away: {
      name: 'A',
      fullName: 'Away',
      color: 'bg-green-600',
    },
    start: {
      name: 'S',
      fullName: 'Start',
      color: 'bg-cyan-400',
    },
    end: {
      name: 'E',
      fullName: 'End',
      color: 'bg-yellow-500',
    },
    pause: {
      name: 'P',
      fullName: 'Pause',
      color: 'bg-orange-500',
    },
    test: {
      name: 'T',
      fullName: 'Test',
      color: 'bg-cyan-500',
    },
  }

  const daysOfWeek = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

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

  const openEditModal = (season) => {
    setEditSeason({
      id: season.id,
      name: season.name,
      start_date: season.start_date,
      end_date: season.end_date,
    })
    setShowEditModal(true)
  }

  const updateSeason = async () => {
    if (!editSeason.name || !editSeason.start_date || !editSeason.end_date) {
      alert('Kérlek töltsd ki az összes mezőt!')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('training_seasons')
        .update({
          name: editSeason.name,
          start_date: editSeason.start_date,
          end_date: editSeason.end_date,
        })
        .eq('id', editSeason.id)
        .select()

      if (error) throw error

      // Update seasons list
      setSeasons(seasons.map(s => s.id === editSeason.id ? data[0] : s))
      setShowEditModal(false)
      
      // Reload if this is the current season
      if (currentSeason?.id === editSeason.id) {
        loadSeason(data[0])
      }
    } catch (error) {
      console.error('Error updating season:', error)
      alert('Hiba történt a szezon frissítése során!')
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (season) => {
    setSeasonToDelete(season)
    setShowDeleteModal(true)
  }

  const deleteSeason = async () => {
    if (!seasonToDelete) return

    setLoading(true)
    try {
      // First delete associated planning data
      await supabase
        .from('macrocycle_planning')
        .delete()
        .eq('season_id', seasonToDelete.id)

      // Then delete the season
      const { error } = await supabase
        .from('training_seasons')
        .delete()
        .eq('id', seasonToDelete.id)

      if (error) throw error

      // Update seasons list
      const updatedSeasons = seasons.filter(s => s.id !== seasonToDelete.id)
      setSeasons(updatedSeasons)
      setShowDeleteModal(false)
      setSeasonToDelete(null)
      
      // Clear current season if it was deleted
      if (currentSeason?.id === seasonToDelete.id) {
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
    } catch (error) {
      console.error('Error deleting season:', error)
      alert('Hiba történt a szezon törlése során!')
    } finally {
      setLoading(false)
    }
  }

  // PDF Export
  const exportToPDF = async () => {
    if (!tableRef.current || !currentSeason) return

    setExporting(true)
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#1e293b',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 297 // A4 landscape width
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Add title
      pdf.setFontSize(16)
      pdf.text(`${selectedTeam.name} - ${currentSeason.name}`, 10, 10)
      
      // Add table image
      pdf.addImage(imgData, 'PNG', 0, 15, imgWidth, imgHeight)

      // Save PDF
      pdf.save(`${currentSeason.name}_makrociklus.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Hiba történt a PDF exportálás során!')
    } finally {
      setExporting(false)
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

  const saveTemplate = async () => {
    if (!templateName.trim() || !currentSeason) {
      alert('Kérlek adj meg egy sablon nevet!')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('macrocycle_templates')
        .insert([
          {
            name: templateName,
            team_id: selectedTeam.id,
            planning: macrocycleData.planning,
            mesocycles: macrocycleData.mesocycles,
            week_count: macrocycleData.weeks.length,
          },
        ])

      if (error) {
        // If table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          alert('A sablonok tábla még nem létezik az adatbázisban.\n\nKérlek futtasd le a migration-t:\n\n1. Nyisd meg a Supabase Dashboard-ot\n2. Menj a SQL Editor-ba\n3. Másold be a migration fájl tartalmát:\nsupabase/migrations/20250110_create_macrocycle_templates.sql\n4. Futtasd le a query-t')
          setShowTemplateModal(false)
          setTemplateName('')
          setLoading(false)
          return
        }
        throw error
      }

      setShowTemplateModal(false)
      setTemplateName('')
      alert('Sablon sikeresen mentve!')
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      alert(`Hiba történt a sablon mentése során!\n\n${error.message || 'Ismeretlen hiba'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplate = async (template) => {
    if (!currentSeason) {
      alert('Először válassz ki egy szezont!')
      return
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

      setShowLoadTemplateModal(false)
      alert('Sablon sikeresen betöltve!')
    } catch (error) {
      console.error('Error loading template:', error)
      alert('Hiba történt a sablon betöltése során!')
    }
  }

  const deleteTemplate = async (templateId) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a sablont?')) return

    try {
      const { error } = await supabase
        .from('macrocycle_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      alert('Sablon törölve!')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Hiba történt a sablon törlése során!')
    }
  }

  useEffect(() => {
    if (selectedTeam) {
      fetchTemplates()
    }
  }, [selectedTeam])

  const generateWeeks = (startDate, endDate) => {
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

  const handleCreateSeason = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('training_seasons')
        .insert([{
          team_id: selectedTeam.id,
          name: newSeason.name,
          start_date: newSeason.start_date,
          end_date: newSeason.end_date,
        }])
        .select()
        .single()

      if (error) throw error

      setSeasons([data, ...seasons])
      loadSeason(data)
      setShowCreateModal(false)
      setNewSeason({ name: '', start_date: '', end_date: '' })
    } catch (error) {
      console.error('Error creating season:', error)
      alert('Hiba történt a szezon létrehozásakor')
    } finally {
      setLoading(false)
    }
  }

  const handleCellClick = (weekIndex, category, categoryData) => {
    if (categoryData.type === 'toggle') {
      // Toggle on/off
      handleToggle(weekIndex, category)
    } else {
      // Open dropdown
      setActiveDropdown({ weekIndex, category })
    }
  }

  // Helper function: Calculate exact date from week and day index
  const getDateFromWeekAndDay = (weekIdx, dayIdx) => {
    if (!macrocycleData.weeks[weekIdx]) return null
    
    const week = macrocycleData.weeks[weekIdx]
    const startDate = new Date(week.startDate)
    startDate.setDate(startDate.getDate() + dayIdx)
    return startDate.toISOString().split('T')[0] // YYYY-MM-DD
  }

  // Sync match with macrocycle planning
  const syncMatchWithMacrocycle = async (weekIdx, dayIdx, dailyKeys) => {
    console.log('🔄 syncMatchWithMacrocycle called:', { weekIdx, dayIdx, dailyKeys, currentSeason: currentSeason?.id, selectedTeam: selectedTeam?.id })
    
    if (!currentSeason || !selectedTeam) {
      console.warn('⚠️ Missing currentSeason or selectedTeam')
      return
    }
    
    const matchDate = getDateFromWeekAndDay(weekIdx, dayIdx)
    console.log('📅 Calculated date:', matchDate)
    
    if (!matchDate) {
      console.warn('⚠️ No match date calculated')
      return
    }
    
    // Check if home or away is selected
    const hasHome = dailyKeys.includes('home')
    const hasAway = dailyKeys.includes('away')
    console.log('🏠 Home/Away check:', { hasHome, hasAway })
    
    if (!hasHome && !hasAway) {
      // Delete match if no home/away selected
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('season_id', currentSeason.id)
          .eq('macrocycle_week_index', weekIdx)
          .eq('macrocycle_day_index', dayIdx)
      } catch (error) {
        console.error('Error deleting match:', error)
      }
      return
    }
    
    const homeAway = hasHome ? 'home' : 'away'
    
    try {
      // Check if match already exists at this position
      const { data: existing, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('season_id', currentSeason.id)
        .eq('macrocycle_week_index', weekIdx)
        .eq('macrocycle_day_index', dayIdx)
        .maybeSingle()
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }
      
      if (existing) {
        // Update existing match
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            date: matchDate,
            home_away: homeAway,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        if (updateError) throw updateError
      } else {
        // Create new match
        const { data: newMatch, error: insertError } = await supabase
          .from('matches')
          .insert({
            team_id: selectedTeam.id,
            season_id: currentSeason.id,
            date: matchDate,
            home_away: homeAway,
            created_from_macrocycle: true,
            macrocycle_week_index: weekIdx,
            macrocycle_day_index: dayIdx,
            opponent: null, // To be filled in Matches page
            time: '18:00', // Default time
            type: 'league' // Default type (column name is 'type', not 'match_type')
          })
          .select()
        
        if (insertError) {
          console.error('Error inserting match:', insertError)
          throw insertError
        }
        
        console.log('✅ Match created successfully:', newMatch)
      }
    } catch (error) {
      console.error('Error syncing match with macrocycle:', error)
      // Don't show error to user - silent fail for better UX
    }
  }

  const handleDailyClick = async (weekIndex, dayIndex, dailyKey) => {
    const newPlanning = { ...macrocycleData.planning }
    if (!newPlanning[weekIndex]) {
      newPlanning[weekIndex] = {}
    }
    if (!newPlanning[weekIndex].daily) {
      newPlanning[weekIndex].daily = {}
    }
    if (!newPlanning[weekIndex].daily[dayIndex]) {
      newPlanning[weekIndex].daily[dayIndex] = []
    }

    // Toggle: if exists, remove it; if not, add it
    const dailyArray = newPlanning[weekIndex].daily[dayIndex]
    const index = dailyArray.indexOf(dailyKey)
    
    if (index > -1) {
      dailyArray.splice(index, 1)
    } else {
      dailyArray.push(dailyKey)
    }

    setMacrocycleData({ ...macrocycleData, planning: newPlanning })
    await savePlanning(newPlanning)
    
    // Sync match with macrocycle (if home or away selected)
    await syncMatchWithMacrocycle(weekIndex, dayIndex, dailyArray)
    
    // Close dropdown after selection
    setActiveDropdown(null)
  }

  const handleToggle = async (weekIndex, category) => {
    const newPlanning = { ...macrocycleData.planning }
    if (!newPlanning[weekIndex]) {
      newPlanning[weekIndex] = {}
    }
    
    // Toggle: if exists, remove it; if not, add it
    newPlanning[weekIndex][category] = !newPlanning[weekIndex][category]

    setMacrocycleData({ ...macrocycleData, planning: newPlanning })

    // Auto-save
    await savePlanning(newPlanning)
  }

  const handleCycleClick = (weekIndex) => {
    const currentCycle = macrocycleData.planning[weekIndex]?.cycle || ''
    setCycleInput(currentCycle)
    setActiveCycleEdit(weekIndex)
  }

  const handleCycleSave = async (weekIndex) => {
    const newPlanning = { ...macrocycleData.planning }
    if (!newPlanning[weekIndex]) {
      newPlanning[weekIndex] = {}
    }
    newPlanning[weekIndex].cycle = cycleInput

    setMacrocycleData({ ...macrocycleData, planning: newPlanning })
    setActiveCycleEdit(null)
    setCycleInput('')

    // Auto-save
    await savePlanning(newPlanning)
  }

  const handleOptionSelect = async (weekIndex, category, option) => {
    const newPlanning = { ...macrocycleData.planning }
    if (!newPlanning[weekIndex]) {
      newPlanning[weekIndex] = {}
    }
    newPlanning[weekIndex][category] = option

    setMacrocycleData({ ...macrocycleData, planning: newPlanning })
    setActiveDropdown(null)

    // Auto-save
    await savePlanning(newPlanning)
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

  const handleManualSave = async () => {
    if (!currentSeason) {
      setSaveMessage('Nincs kiválasztott szezon!')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    setIsSaving(true)
    setSaveMessage('')

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
            planning: macrocycleData.planning,
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
            planning: macrocycleData.planning,
          })

        if (error) throw error
      }

      setSaveMessage('✅ Sikeresen mentve!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Error saving planning:', error)
      setSaveMessage('❌ Hiba történt a mentés során!')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const getCellColor = (weekIndex, category) => {
    const value = macrocycleData.planning[weekIndex]?.[category]
    const categoryData = trainingCategories[category]
    
    if (categoryData.type === 'toggle') {
      // Toggle type: return color if true, grey if false
      return value ? categoryData.color : 'bg-slate-700'
    } else {
      // Dropdown type: return color based on value
      if (!value) return 'bg-slate-700'
      return categoryData?.colors[value] || 'bg-slate-600'
    }
  }

  const getCellValue = (weekIndex, category) => {
    const value = macrocycleData.planning[weekIndex]?.[category]
    const categoryData = trainingCategories[category]
    
    if (categoryData.type === 'toggle') {
      // Don't show text for toggle, just color
      return ''
    } else {
      return value || ''
    }
  }

  if (!selectedTeam) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Makrociklus Tervező</h1>
              <p className="text-sm text-slate-400 hidden sm:block">Éves edzésterv és periodizáció</p>
            </div>
            <div className="flex-shrink-0">
              <TeamSelector />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Válassz ki egy csapatot a folytatáshoz</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header - Dashboard stílusban */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-4 gap-4 flex-wrap lg:flex-nowrap">
          {/* Bal oldal: Cím + Aktív Szezon */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Makrociklus Tervező</h1>
              <p className="text-sm text-slate-400 hidden sm:block">Éves edzésterv és periodizáció</p>
            </div>
            
            {seasons.length > 0 && currentSeason && (
              <div className="flex items-center gap-3">
                <select
                  value={currentSeason?.id || ''}
                  onChange={(e) => {
                    const season = seasons.find(s => s.id === e.target.value)
                    if (season) loadSeason(season)
                  }}
                  className="input-field text-sm"
                >
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({new Date(season.start_date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })} - {new Date(season.end_date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Középső gombok */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              title="Új Szezon"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Új Szezon</span>
            </button>
            
            {currentSeason && (
              <>
                <button
                  onClick={() => openEditModal(currentSeason)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  title="Szerkesztés"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Szerkesztés</span>
                </button>
                <button
                  onClick={() => openDeleteModal(currentSeason)}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  title="Törlés"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Törlés</span>
                </button>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  title="Sablon"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Sablon</span>
                </button>
                <button
                  onClick={() => setShowLoadTemplateModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                  title="Betöltés"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Betöltés</span>
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={exporting}
                  className="flex items-center space-x-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                  title="PDF"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">{exporting ? 'Exportálás...' : 'PDF'}</span>
                </button>
                <button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                  title="Mentés"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">{isSaving ? 'Mentés...' : 'Mentés'}</span>
                </button>
                {saveMessage && (
                  <span className={`text-sm font-medium whitespace-nowrap ${
                    saveMessage.includes('✅') ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {saveMessage}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Jobb oldal: TeamSelector */}
          <div className="flex-shrink-0 w-full sm:w-auto order-3 lg:order-none">
            <TeamSelector />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Macrocycle Table */}
      {currentSeason && macrocycleData.weeks.length > 0 && (
        <div className="card" ref={tableRef}>
          <div className="flex overflow-visible">
            {/* Vertical Section Labels */}
            <div className="flex flex-col border-r-2 border-slate-600 bg-slate-900 sticky left-0 z-10 w-16">
              {/* Empty space for header rows */}
              <div className="h-[40px] border-b border-slate-600"></div>
              <div className="h-[40px] border-b border-slate-600"></div>
              <div className="h-[40px] border-b-2 border-slate-600"></div>
              
              {/* OPT Section Label */}
              <div className="relative border-b-2 border-primary-500" style={{ height: `${Object.entries(trainingCategories).filter(([k, c]) => c.category === 'OPT').length * 28}px` }}>
                <div className="absolute inset-0 flex items-center justify-center px-1">
                  <span className="text-primary-400 font-bold text-lg tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    OPT
                  </span>
                </div>
              </div>
              
              {/* Egyéb Section Label */}
              <div className="relative border-b-2 border-primary-500" style={{ height: `${Object.entries(trainingCategories).filter(([k, c]) => c.type === 'dropdown').length * 28}px` }}>
                <div className="absolute inset-0 flex items-center justify-center px-1">
                  <span className="text-primary-400 font-bold text-sm tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    EGYÉB
                  </span>
                </div>
              </div>
              
              {/* Napi Bontás Section Label */}
              <div className="relative" style={{ height: `${7 * 28}px` }}>
                <div className="absolute inset-0 flex items-center justify-center px-1">
                  <span className="text-primary-400 font-bold text-xs tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    NAPI BONTÁS
                  </span>
                </div>
              </div>
            </div>
            
            {/* Main Table Content */}
            <div className="flex-1">
            {(() => {
              // Calculate dynamic column width based on total weeks
              const totalWeeks = macrocycleData.weeks.length
              // Subtract: sidebar (200px) + left labels (64px) + label column (96px) + margins (120px)
              const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 480 : 1000
              const columnWidth = Math.floor(availableWidth / totalWeeks)
              const finalColumnWidth = Math.max(18, Math.min(columnWidth, 38)) // Min 18px, Max 38px
              
              return (<>
            {/* Month Row */}
            <div className="flex border-b border-slate-600">
              <div className="w-24 px-2 py-2 bg-slate-800 font-semibold text-white text-xs border-r border-slate-600">
                Hónap
              </div>
              {(() => {
                const monthGroups = []
                let currentMonth = null
                let weekCount = 0
                
                macrocycleData.weeks.forEach((week, idx) => {
                  if (week.month !== currentMonth) {
                    if (currentMonth !== null) {
                      monthGroups.push({ month: currentMonth, count: weekCount })
                    }
                    currentMonth = week.month
                    weekCount = 1
                  } else {
                    weekCount++
                  }
                  
                  if (idx === macrocycleData.weeks.length - 1) {
                    monthGroups.push({ month: currentMonth, count: weekCount })
                  }
                })
                
                return monthGroups.map((group, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${group.count * finalColumnWidth}px` }}
                    className="px-1 py-2 text-center text-[10px] text-slate-300 border-r border-slate-600 font-medium"
                  >
                    {group.month}
                  </div>
                ))
              })()}
            </div>

            {/* Date Monday Row */}
            <div className="flex border-b border-slate-600">
              <div className="w-24 px-2 py-2 bg-slate-800 font-semibold text-white text-xs border-r border-slate-600">
                Dátum
              </div>
              {macrocycleData.weeks.map((week, idx) => {
                const mondayDate = new Date(week.startDate).toLocaleDateString('hu-HU', { 
                  day: '2-digit' 
                })
                return (
                  <div
                    key={idx}
                    style={{ width: `${finalColumnWidth}px` }}
                    className="px-1 py-2 text-center text-[10px] text-slate-300 border-r border-slate-600"
                  >
                    {mondayDate}
                  </div>
                )
              })}
            </div>

            {/* Cycle Row */}
            <div className="flex border-b-2 border-slate-600">
              <div className="w-24 px-2 py-2 bg-slate-800 font-semibold text-white text-xs border-r border-slate-600">
                Ciklus
              </div>
              {macrocycleData.weeks.map((week, idx) => {
                const isEditing = activeCycleEdit === idx
                const cycleValue = macrocycleData.planning[idx]?.cycle || ''
                
                return (
                  <div
                    key={idx}
                    style={{ width: `${finalColumnWidth}px` }}
                    className="relative border-r border-slate-600"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={cycleInput}
                        onChange={(e) => setCycleInput(e.target.value)}
                        onBlur={() => handleCycleSave(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCycleSave(idx)
                          if (e.key === 'Escape') setActiveCycleEdit(null)
                        }}
                        autoFocus
                        className="w-full h-full px-0.5 py-1.5 text-center text-[10px] bg-slate-700 text-white border-none focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="C1"
                      />
                    ) : (
                      <button
                        onClick={() => handleCycleClick(idx)}
                        className="w-full h-full px-0.5 py-1.5 text-center text-[10px] text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        {cycleValue || '-'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Training Categories */}
            <div>

              {/* OPT Rows */}
              {Object.entries(trainingCategories)
                .filter(([key, cat]) => cat.category === 'OPT')
                .map(([categoryKey, category], idx, arr) => (
                  <div key={categoryKey} className={`flex ${idx === arr.length - 1 ? 'border-b-2 border-primary-500' : 'border-b border-slate-600'}`}>
                    <div className="w-24 px-2 py-1.5 bg-slate-800 font-medium text-white text-[10px] border-r border-slate-600 flex items-center pl-3">
                      {category.name}
                    </div>
                    {macrocycleData.weeks.map((week, weekIdx) => {
                      const cellColor = getCellColor(weekIdx, categoryKey)

                      return (
                        <div key={weekIdx} style={{ width: `${finalColumnWidth}px` }} className="relative border-r border-slate-600">
                          <button
                            onClick={() => handleCellClick(weekIdx, categoryKey, category)}
                            className={`w-full h-full px-1 py-1.5 text-[10px] font-medium text-white hover:opacity-80 transition-opacity border-0 ${cellColor}`}
                          >
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ))}

              {/* Other Categories */}

              {Object.entries(trainingCategories)
                .filter(([key, cat]) => cat.type === 'dropdown')
                .map(([categoryKey, category], idx, arr) => (
                <div key={categoryKey} className={`flex ${idx === arr.length - 1 ? 'border-b-2 border-primary-500' : 'border-b border-slate-600'}`}>
                  <div className="w-24 px-2 py-1.5 bg-slate-800 font-medium text-white text-[10px] border-r border-slate-600 flex items-center">
                    {category.name}
                  </div>
                  {macrocycleData.weeks.map((week, weekIdx) => {
                    const isActive = activeDropdown?.weekIndex === weekIdx && activeDropdown?.category === categoryKey
                    const cellColor = getCellColor(weekIdx, categoryKey)
                    const cellValue = getCellValue(weekIdx, categoryKey)

                    return (
                      <div key={weekIdx} style={{ width: `${finalColumnWidth}px` }} className={`relative border-r border-slate-600 ${isActive ? 'z-[101]' : ''}`}>
                        <button
                          data-week={weekIdx}
                          data-category={categoryKey}
                          onClick={() => handleCellClick(weekIdx, categoryKey, category)}
                          className={`w-full h-full px-1 py-1.5 text-[10px] font-medium text-white hover:opacity-80 transition-opacity border-0 ${cellColor}`}
                        >
                          {cellValue && (
                            <span className="block truncate" title={cellValue}>
                              {cellValue.substring(0, 1)}
                            </span>
                          )}
                        </button>

                        {isActive && category.type === 'dropdown' && (
                          <div className="absolute bottom-full left-0 z-[100] mb-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl">
                            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                              {category.options.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => handleOptionSelect(weekIdx, categoryKey, option)}
                                  className={`w-full px-3 py-2 text-left text-sm text-white rounded hover:bg-slate-700 transition-colors ${
                                    cellValue === option ? 'bg-slate-700' : ''
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Daily Breakdown Table */}
              <div>

                {/* Days of Week Rows */}
                {daysOfWeek.map((day, dayIdx) => (
                  <div key={day} className="flex border-b border-slate-600">
                    <div className="w-24 px-2 py-1.5 bg-slate-800 font-medium text-white text-[10px] border-r border-slate-600 flex items-center">
                      {day}
                    </div>
                    {macrocycleData.weeks.map((week, weekIdx) => {
                      const isActive = activeDropdown?.weekIndex === weekIdx && activeDropdown?.category === `daily_${dayIdx}`
                      const dailyData = macrocycleData.planning[weekIdx]?.daily?.[dayIdx] || []
                      
                      // Get background color based on selected options
                      const getCellBgColor = () => {
                        if (dailyData.length === 0) return 'bg-slate-700'
                        if (dailyData.length === 1) return dailyCategories[dailyData[0]].color
                        // Multiple options - use gradient or first color
                        return dailyCategories[dailyData[0]].color
                      }

                      return (
                        <div key={weekIdx} style={{ width: `${finalColumnWidth}px` }} className={`relative border-r border-slate-600 ${isActive ? 'z-[101]' : ''}`}>
                          <button
                            onClick={() => setActiveDropdown({ weekIndex: weekIdx, category: `daily_${dayIdx}` })}
                            className={`w-full h-full px-1 py-1.5 text-[10px] font-bold text-white hover:opacity-80 transition-opacity border-0 ${getCellBgColor()}`}
                          >
                            {dailyData.length > 0 && (
                              <span className="block truncate" title={dailyData.map(k => dailyCategories[k].fullName).join(', ')}>
                                {dailyData.map(k => dailyCategories[k].name).join('')}
                              </span>
                            )}
                          </button>

                          {isActive && (
                            <div className="absolute bottom-full left-0 z-[100] mb-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl">
                              <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                                {/* Clear/Empty option - Always visible */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    const newData = JSON.parse(JSON.stringify(macrocycleData))
                                    if (!newData.planning[weekIdx]) {
                                      newData.planning[weekIdx] = {}
                                    }
                                    if (!newData.planning[weekIdx].daily) {
                                      newData.planning[weekIdx].daily = {}
                                    }
                                    newData.planning[weekIdx].daily[dayIdx] = []
                                    setMacrocycleData(newData)
                                    
                                    // Sync match deletion
                                    await syncMatchWithMacrocycle(weekIdx, dayIdx, [])
                                    
                                    setActiveDropdown(null)
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-slate-700 transition-colors flex items-center gap-2 border-b border-slate-600 mb-1 ${
                                    dailyData.length === 0 ? 'text-slate-400 bg-slate-700' : 'text-red-400'
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-xs">
                                    ✕
                                  </span>
                                  Üres
                                </button>
                                {Object.entries(dailyCategories).map(([key, cat]) => (
                                  <button
                                    key={key}
                                    onClick={() => handleDailyClick(weekIdx, dayIdx, key)}
                                    className={`w-full px-3 py-2 text-left text-sm text-white rounded hover:bg-slate-700 transition-colors flex items-center gap-2 ${
                                      dailyData.includes(key) ? 'bg-slate-700' : ''
                                    }`}
                                  >
                                    <span className={`w-5 h-5 rounded ${cat.color} flex items-center justify-center text-xs font-bold`}>
                                      {cat.name}
                                    </span>
                                    {cat.fullName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
              </>
              )
            })()}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {currentSeason && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Jelmagyarázat</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* OPT Group */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">OPT Modell</h4>
              <div className="space-y-1">
                {Object.entries(trainingCategories)
                  .filter(([key, cat]) => cat.category === 'OPT')
                  .map(([key, category]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded ${category.color}`}></div>
                      <span className="text-xs text-slate-400">{category.name}</span>
                    </div>
                  ))}
                <p className="text-[10px] text-slate-500 mt-2 italic">Kattints a cellára be/kikapcsoláshoz</p>
              </div>
            </div>

            {/* Other categories */}
            {Object.entries(trainingCategories)
              .filter(([key, cat]) => cat.type === 'dropdown')
              .map(([key, category]) => (
                <div key={key}>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">{category.name}</h4>
                  <div className="space-y-1">
                    {category.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded ${category.colors[option] || 'bg-slate-600'}`}></div>
                        <span className="text-xs text-slate-400">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {/* Daily Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Napi Bontás</h4>
              <div className="space-y-1">
                {Object.entries(dailyCategories).map(([key, cat]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${cat.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                      {cat.name}
                    </div>
                    <span className="text-xs text-slate-400">{cat.fullName}</span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-500 mt-2 italic">Kattints a cellára kiválasztáshoz (több is választható)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Season Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Új Szezon Létrehozása</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Szezon Neve
                </label>
                <input
                  type="text"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  className="input-field"
                  placeholder="pl. 2024/2025 Szezon"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kezdő Dátum
                </label>
                <input
                  type="date"
                  value={newSeason.start_date}
                  onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Befejező Dátum
                </label>
                <input
                  type="date"
                  value={newSeason.end_date}
                  onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Létrehozás...' : 'Létrehozás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Season Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Szezon Szerkesztése</h2>
            <form onSubmit={(e) => { e.preventDefault(); updateSeason(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Szezon Neve
                </label>
                <input
                  type="text"
                  value={editSeason.name}
                  onChange={(e) => setEditSeason({ ...editSeason, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="pl. 2024/2025 Őszi Szezon"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kezdő Dátum
                </label>
                <input
                  type="date"
                  value={editSeason.start_date}
                  onChange={(e) => setEditSeason({ ...editSeason, start_date: e.target.value })}
                  className="input-field w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Befejező Dátum
                </label>
                <input
                  type="date"
                  value={editSeason.end_date}
                  onChange={(e) => setEditSeason({ ...editSeason, end_date: e.target.value })}
                  className="input-field w-full"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Frissítés...' : 'Frissítés'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Season Modal */}
      {showDeleteModal && seasonToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Szezon Törlése</h2>
            <p className="text-slate-300 mb-6">
              Biztosan törölni szeretnéd a <strong className="text-white">{seasonToDelete.name}</strong> szezont?
              <br /><br />
              <span className="text-red-400">Ez a művelet nem visszavonható, és az összes kapcsolódó tervezési adat is törlődni fog!</span>
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSeasonToDelete(null)
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={deleteSeason}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Törlés...' : 'Törlés'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Sablon Mentése</h2>
            <p className="text-slate-300 mb-4">
              Mentsd el a jelenlegi tervezést sablonként, hogy később más szezonokra is alkalmazhasd.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sablon Neve
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="input-field w-full"
                placeholder="pl. Őszi Felkészülés Sablon"
                autoFocus
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false)
                  setTemplateName('')
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={saveTemplate}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Mentés...' : 'Mentés'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Template Modal */}
      {showLoadTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Sablon Betöltése</h2>
            <p className="text-slate-300 mb-4">
              Válassz egy sablont a jelenlegi szezonra való alkalmazáshoz.
            </p>

            {templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Még nincs mentett sablon.</p>
                <p className="text-slate-500 text-sm mt-2">Hozz létre egy tervezést és mentsd el sablonként!</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-600 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{template.name}</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        {template.week_count} hét • {new Date(template.created_at).toLocaleDateString('hu-HU')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadTemplate(template)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                      >
                        Betöltés
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="Sablon törlése"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowLoadTemplateModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
