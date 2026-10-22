import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import { buildMacrocycleMatchInsert } from '../lib/matches'
import useMacrocycleData from './macrocycle/useMacrocycleData'
import {
  Calendar,
  Plus,
  Save,
  Trash2,
  Download,
  ChevronDown,
  FileDown,
  Upload,
  Copy,
  Edit,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { usePopover } from '../components/shell/usePopover'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import { Select } from '../components/ui/Field'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'
import CreateSeasonModal from './macrocycle/CreateSeasonModal'
import EditSeasonModal from './macrocycle/EditSeasonModal'
import DeleteSeasonModal from './macrocycle/DeleteSeasonModal'
import SaveTemplateModal from './macrocycle/SaveTemplateModal'
import LoadTemplateModal from './macrocycle/LoadTemplateModal'

const MENU_ITEM =
  'flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

// "Továbbiak" túlcsordulás-menü: szezon szerkesztése/törlése és sablonok.
function MoreMenu({ onEdit, onDelete, onSaveTemplate, onLoadTemplate }) {
  const { open, close, toggle, ref } = usePopover()
  const run = (action) => () => {
    close()
    action()
  }

  return (
    <div ref={ref} className="relative">
      <IconButton
        icon={MoreHorizontal}
        label="Továbbiak"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-56 rounded-[10px] border border-line bg-surface p-1 shadow-xl"
        >
          <button type="button" role="menuitem" onClick={run(onEdit)} className={`${MENU_ITEM} text-fg`}>
            <Edit className="h-4 w-4 text-muted" aria-hidden="true" />
            Szezon szerkesztése
          </button>
          <button type="button" role="menuitem" onClick={run(onSaveTemplate)} className={`${MENU_ITEM} text-fg`}>
            <Copy className="h-4 w-4 text-muted" aria-hidden="true" />
            Sablon mentése
          </button>
          <button type="button" role="menuitem" onClick={run(onLoadTemplate)} className={`${MENU_ITEM} text-fg`}>
            <Upload className="h-4 w-4 text-muted" aria-hidden="true" />
            Sablon betöltése
          </button>
          <button type="button" role="menuitem" onClick={run(onDelete)} className={`${MENU_ITEM} text-bad`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Szezon törlése
          </button>
        </div>
      )}
    </div>
  )
}

export default function MacrocyclePlanner() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'macrocycle')

  // Data layer: owns seasons, currentSeason, templates, macrocycleData, loading + all data operations
  const {
    seasons,
    currentSeason,
    templates,
    macrocycleData,
    setMacrocycleData,
    loading,
    loadSeason,
    createSeason,
    updateSeason,
    deleteSeason,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    savePlanning,
  } = useMacrocycleData(selectedTeam)

  // UI state (modals, forms, grid interaction) — stays in the component
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [seasonToDelete, setSeasonToDelete] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
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

  const [activeDropdown, setActiveDropdown] = useState(null)
  const [activeCycleEdit, setActiveCycleEdit] = useState(null)
  const [cycleInput, setCycleInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  // null | { status: 'ok' | 'bad', text: string }
  const [saveResult, setSaveResult] = useState(null)
  const showSaveResult = (status, text) => {
    setSaveResult({ status, text })
    setTimeout(() => setSaveResult(null), 3000)
  }

  // Training categories and options
  const trainingCategories = {
    opt_max_power: {
      name: 'Max. teljesítmény',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-accent',
      order: 1,
    },
    opt_power: {
      name: 'Robbanékony erő',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-accent/70',
      order: 2,
    },
    opt_max_strength: {
      name: 'Maximális erő',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-accent/85',
      order: 3,
    },
    opt_hypertrophy: {
      name: 'Hipertrófia',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-accent/25',
      order: 4,
    },
    opt_strength_endurance: {
      name: 'Erő-állóképesség',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-accent/40',
      order: 5,
    },
    opt_stabilization: {
      name: 'Stabilizáció',
      category: 'OPT',
      type: 'toggle',
      color: 'bg-accent/55',
      order: 6,
    },
    correction: {
      name: 'Korrekció',
      type: 'dropdown',
      options: ['Igen', 'Nem', 'Részleges'],
      colors: {
        'Igen': 'bg-ok-soft text-ok',
        'Nem': 'bg-bad-soft text-bad',
        'Részleges': 'bg-warn-soft text-warn',
      }
    },
    endurance: {
      name: 'Állóképesség',
      type: 'dropdown',
      options: ['Aerob', 'Anaerob', 'HIIT', 'Tempo', 'Regeneráció', '-'],
      colors: {
        'Aerob': 'bg-accent/35',
        'Anaerob': 'bg-accent text-accent-fg',
        'HIIT': 'bg-bad-soft text-bad',
        'Tempo': 'bg-warn-soft text-warn',
        'Regeneráció': 'bg-ok-soft text-ok',
        '-': 'bg-surface-3 text-muted',
      }
    },
    saq: {
      name: 'SAQ',
      type: 'dropdown',
      options: ['Speed', 'Agility', 'Quickness', 'Combo', '-'],
      colors: {
        'Speed': 'bg-accent/20',
        'Agility': 'bg-accent/35',
        'Quickness': 'bg-accent/50',
        'Combo': 'bg-accent text-accent-fg',
        '-': 'bg-surface-3 text-muted',
      }
    },
    contact: {
      name: 'Kontakt',
      type: 'dropdown',
      options: ['Alacsony', 'Közepes', 'Magas', 'Mérkőzés', '-'],
      colors: {
        'Alacsony': 'bg-ok-soft text-ok',
        'Közepes': 'bg-warn-soft text-warn',
        'Magas': 'bg-bad-soft text-bad',
        'Mérkőzés': 'bg-t-match text-on-status',
        '-': 'bg-surface-3 text-muted',
      }
    },
    plyometrics: {
      name: 'Plyometria',
      type: 'dropdown',
      options: ['Alacsony', 'Közepes', 'Magas', 'Reaktív', '-'],
      colors: {
        'Alacsony': 'bg-accent/20',
        'Közepes': 'bg-accent/35',
        'Magas': 'bg-accent/50',
        'Reaktív': 'bg-accent text-accent-fg',
        '-': 'bg-surface-3 text-muted',
      }
    },
  }

  // Daily breakdown categories (for weekly schedule)
  const dailyCategories = {
    match: {
      name: 'M',
      fullName: 'Mérkőzés',
      color: 'bg-t-match text-on-status',
    },
    home: {
      name: 'H',
      fullName: 'Hazai',
      color: 'bg-t-match/25',
    },
    away: {
      name: 'I',
      fullName: 'Idegen',
      color: 'bg-t-match/45',
    },
    start: {
      name: 'K',
      fullName: 'Kezdés',
      color: 'bg-accent/25',
    },
    end: {
      name: 'V',
      fullName: 'Vége',
      color: 'bg-accent/50',
    },
    pause: {
      name: 'P',
      fullName: 'Pihenő',
      color: 'bg-t-rest text-on-status',
    },
    test: {
      name: 'T',
      fullName: 'Teszt',
      color: 'bg-accent text-accent-fg',
    },
  }

  const daysOfWeek = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

  const openEditModal = (season) => {
    setEditSeason({
      id: season.id,
      name: season.name,
      start_date: season.start_date,
      end_date: season.end_date,
    })
    setShowEditModal(true)
  }

  // Wire the edit modal: pass UI state into the hook, close modal on success only
  const handleUpdateSeason = async () => {
    const ok = await updateSeason(editSeason)
    if (ok) setShowEditModal(false)
  }

  const openDeleteModal = (season) => {
    setSeasonToDelete(season)
    setShowDeleteModal(true)
  }

  // Wire the delete modal: pass the id into the hook, close + reset on success only
  const handleDeleteSeason = async () => {
    if (!seasonToDelete) return
    const ok = await deleteSeason(seasonToDelete.id)
    if (ok) {
      setShowDeleteModal(false)
      setSeasonToDelete(null)
    }
  }

  // PDF Export
  const exportToPDF = async () => {
    if (!tableRef.current || !currentSeason) return

    setExporting(true)
    try {
      const { captureForPdf } = await import('../lib/pdfCapture')
      const { default: jsPDF } = await import('jspdf')
      const canvas = await captureForPdf(tableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
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
      toast.error('Hiba történt a PDF exportálás során!')
    } finally {
      setExporting(false)
    }
  }

  // Template Functions
  // Wire the save-template modal: pass the name into the hook, close + reset on success
  const handleSaveTemplate = async () => {
    const ok = await saveTemplate(templateName)
    if (ok) {
      setShowTemplateModal(false)
      setTemplateName('')
    }
  }

  // Wire the load-template modal: apply template via the hook, close on success
  const handleLoadTemplate = async (template) => {
    const ok = await loadTemplate(template)
    if (ok) setShowLoadTemplateModal(false)
  }

  // Wrap the raw hook delete in a ConfirmDialog (confirmState UI stays here)
  const handleDeleteTemplate = (templateId) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a sablont?',
      action: async () => {
        await deleteTemplate(templateId)
      },
    })
  }

  // Wire the create-season modal: pass the form data into the hook, close + reset on success
  const handleCreateSeason = async (e) => {
    e.preventDefault()
    const ok = await createSeason(newSeason)
    if (ok) {
      setShowCreateModal(false)
      setNewSeason({ name: '', start_date: '', end_date: '' })
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
    console.log('syncMatchWithMacrocycle called:', { weekIdx, dayIdx, dailyKeys, currentSeason: currentSeason?.id, selectedTeam: selectedTeam?.id })
    
    if (!currentSeason || !selectedTeam) {
      console.warn('Missing currentSeason or selectedTeam')
      return
    }
    
    const matchDate = getDateFromWeekAndDay(weekIdx, dayIdx)
    console.log('Calculated date:', matchDate)
    
    if (!matchDate) {
      console.warn('No match date calculated')
      return
    }
    
    // Check if home or away is selected
    const hasHome = dailyKeys.includes('home')
    const hasAway = dailyKeys.includes('away')
    console.log('Home/Away check:', { hasHome, hasAway })
    
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
          .insert(buildMacrocycleMatchInsert({
            teamId: selectedTeam.id,
            seasonId: currentSeason.id,
            date: matchDate,
            homeAway,
            weekIndex: weekIdx,
            dayIndex: dayIdx,
          }))
          .select()
        
        if (insertError) {
          console.error('Error inserting match:', insertError)
          throw insertError
        }
        
        console.log('Match created successfully:', newMatch)
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

  const handleManualSave = async () => {
    if (!currentSeason) {
      showSaveResult('bad', 'Nincs kiválasztott szezon')
      return
    }

    setIsSaving(true)
    setSaveResult(null)

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

      showSaveResult('ok', 'Mentve')
    } catch (error) {
      console.error('Error saving planning:', error)
      showSaveResult('bad', 'Mentés sikertelen')
    } finally {
      setIsSaving(false)
    }
  }

  const getCellColor = (weekIndex, category) => {
    const value = macrocycleData.planning[weekIndex]?.[category]
    const categoryData = trainingCategories[category]
    
    if (categoryData.type === 'toggle') {
      // Toggle type: return color if true, grey if false
      return value ? categoryData.color : 'bg-surface-2'
    } else {
      // Dropdown type: return color based on value
      if (!value) return 'bg-surface-2'
      return categoryData?.colors[value] || 'bg-surface-3'
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

  const pageDescription = selectedTeam
    ? `${selectedTeam.name} · Éves edzésterv és periodizáció`
    : 'Éves edzésterv és periodizáció'

  if (!selectedTeam) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Szezonterv" description={pageDescription} />
        <EmptyState
          icon={Calendar}
          title="Nincs kiválasztott csapat"
          description="Válassz ki egy csapatot a folytatáshoz."
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Szezonterv"
        description={pageDescription}
        actions={
          <>
            {seasons.length > 0 && currentSeason && (
              <Select
                aria-label="Szezon"
                value={currentSeason?.id || ''}
                onChange={(e) => {
                  const season = seasons.find(s => s.id === e.target.value)
                  if (season) loadSeason(season)
                }}
                className="!w-auto max-w-[16rem]"
              >
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({new Date(season.start_date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })} - {new Date(season.end_date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })})
                  </option>
                ))}
              </Select>
            )}

            {canEdit && (
              <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
                Új szezon
              </Button>
            )}

            {currentSeason && (
              <>
                <Button icon={FileDown} onClick={exportToPDF} disabled={exporting}>
                  {exporting ? 'Exportálás...' : 'PDF'}
                </Button>
                {canEdit && (
                  <Button
                    variant="primary"
                    icon={Save}
                    onClick={handleManualSave}
                    loading={isSaving}
                  >
                    {isSaving ? 'Mentés...' : 'Mentés'}
                  </Button>
                )}
                {saveResult && (
                  <span role="status">
                    <StatusPill status={saveResult.status}>{saveResult.text}</StatusPill>
                  </span>
                )}
                {canEdit && (
                  <MoreMenu
                    onEdit={() => openEditModal(currentSeason)}
                    onDelete={() => openDeleteModal(currentSeason)}
                    onSaveTemplate={() => setShowTemplateModal(true)}
                    onLoadTemplate={() => setShowLoadTemplateModal(true)}
                  />
                )}
              </>
            )}
          </>
        }
      />

      <div className="space-y-6">

        {/* Macrocycle Table */}
      {currentSeason && macrocycleData.weeks.length > 0 && (
        <div className="overflow-x-auto rounded-[14px]">
        <div className="min-w-max rounded-[14px] border border-line bg-surface p-3 text-fg" ref={tableRef}>
          <div className="flex overflow-visible">
            {/* Vertical Section Labels */}
            <div className="flex flex-col border-r-2 border-line bg-bg sticky left-0 z-10 w-16">
              {/* Empty space for header rows */}
              <div className="h-[40px] border-b border-line"></div>
              <div className="h-[40px] border-b border-line"></div>
              <div className="h-[40px] border-b-2 border-line"></div>
              
              {/* OPT Section Label */}
              <div className="relative border-b-2 border-accent" style={{ height: `${Object.entries(trainingCategories).filter(([k, c]) => c.category === 'OPT').length * 28}px` }}>
                <div className="absolute inset-0 flex items-center justify-center px-1">
                  <span className="text-accent font-bold text-lg tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    OPT
                  </span>
                </div>
              </div>
              
              {/* Egyéb Section Label */}
              <div className="relative border-b-2 border-accent" style={{ height: `${Object.entries(trainingCategories).filter(([k, c]) => c.type === 'dropdown').length * 28}px` }}>
                <div className="absolute inset-0 flex items-center justify-center px-1">
                  <span className="text-accent font-bold text-sm tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    EGYÉB
                  </span>
                </div>
              </div>
              
              {/* Napi Bontás Section Label */}
              <div className="relative" style={{ height: `${7 * 28}px` }}>
                <div className="absolute inset-0 flex items-center justify-center px-1">
                  <span className="text-accent font-bold text-xs tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
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
            <div className="flex border-b border-line">
              <div className="w-24 px-2 py-2 bg-surface font-semibold text-fg text-xs border-r border-line">
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
                    className="px-1 py-2 text-center text-[10px] text-fg border-r border-line font-medium"
                  >
                    {group.month}
                  </div>
                ))
              })()}
            </div>

            {/* Date Monday Row */}
            <div className="flex border-b border-line">
              <div className="w-24 px-2 py-2 bg-surface font-semibold text-fg text-xs border-r border-line">
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
                    className="px-1 py-2 text-center text-[10px] text-fg border-r border-line"
                  >
                    {mondayDate}
                  </div>
                )
              })}
            </div>

            {/* Cycle Row */}
            <div className="flex border-b-2 border-line">
              <div className="w-24 px-2 py-2 bg-surface font-semibold text-fg text-xs border-r border-line">
                Ciklus
              </div>
              {macrocycleData.weeks.map((week, idx) => {
                const isEditing = activeCycleEdit === idx
                const cycleValue = macrocycleData.planning[idx]?.cycle || ''
                
                return (
                  <div
                    key={idx}
                    style={{ width: `${finalColumnWidth}px` }}
                    className="relative border-r border-line"
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
                        className="w-full h-full px-0.5 py-1.5 text-center text-[10px] bg-surface-2 text-fg border-none focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="C1"
                      />
                    ) : (
                      <button
                        onClick={() => canEdit && handleCycleClick(idx)}
                        disabled={!canEdit}
                        className={`w-full h-full px-0.5 py-1.5 text-center text-[10px] text-fg transition-colors ${canEdit ? 'hover:bg-surface-2' : 'cursor-default'}`}
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
                  <div key={categoryKey} className={`flex ${idx === arr.length - 1 ? 'border-b-2 border-accent' : 'border-b border-line'}`}>
                    <div className="w-24 px-2 py-1.5 bg-surface font-medium text-fg text-[10px] border-r border-line flex items-center pl-3">
                      {category.name}
                    </div>
                    {macrocycleData.weeks.map((week, weekIdx) => {
                      const cellColor = getCellColor(weekIdx, categoryKey)

                      return (
                        <div key={weekIdx} style={{ width: `${finalColumnWidth}px` }} className="relative border-r border-line">
                          <button
                            onClick={() => canEdit && handleCellClick(weekIdx, categoryKey, category)}
                            disabled={!canEdit}
                            className={`w-full h-full px-1 py-1.5 text-[10px] font-medium transition-opacity border-0 ${cellColor} ${canEdit ? 'hover:opacity-80' : 'cursor-default'}`}
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
                <div key={categoryKey} className={`flex ${idx === arr.length - 1 ? 'border-b-2 border-accent' : 'border-b border-line'}`}>
                  <div className="w-24 px-2 py-1.5 bg-surface font-medium text-fg text-[10px] border-r border-line flex items-center">
                    {category.name}
                  </div>
                  {macrocycleData.weeks.map((week, weekIdx) => {
                    const isActive = activeDropdown?.weekIndex === weekIdx && activeDropdown?.category === categoryKey
                    const cellColor = getCellColor(weekIdx, categoryKey)
                    const cellValue = getCellValue(weekIdx, categoryKey)

                    return (
                      <div key={weekIdx} style={{ width: `${finalColumnWidth}px` }} className={`relative border-r border-line ${isActive ? 'z-[101]' : ''}`}>
                        <button
                          data-week={weekIdx}
                          data-category={categoryKey}
                          onClick={() => canEdit && handleCellClick(weekIdx, categoryKey, category)}
                          disabled={!canEdit}
                          className={`w-full h-full px-1 py-1.5 text-[10px] font-medium transition-opacity border-0 ${cellColor} ${canEdit ? 'hover:opacity-80' : 'cursor-default'}`}
                        >
                          {cellValue && (
                            <span className="block truncate" title={cellValue}>
                              {cellValue.substring(0, 1)}
                            </span>
                          )}
                        </button>

                        {isActive && category.type === 'dropdown' && canEdit && (
                          <div className={`absolute bottom-full ${weekIdx >= macrocycleData.weeks.length - 6 ? 'right-0' : 'left-0'} z-[100] mb-1 w-48 bg-surface border border-line rounded-lg shadow-2xl`}>
                            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                              {category.options.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => handleOptionSelect(weekIdx, categoryKey, option)}
                                  className={`w-full px-3 py-2 text-left text-sm text-fg rounded hover:bg-surface-2 transition-colors ${
                                    cellValue === option ? 'bg-surface-2' : ''
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
                  <div key={day} className="flex border-b border-line">
                    <div className="w-24 px-2 py-1.5 bg-surface font-medium text-fg text-[10px] border-r border-line flex items-center">
                      {day}
                    </div>
                    {macrocycleData.weeks.map((week, weekIdx) => {
                      const isActive = activeDropdown?.weekIndex === weekIdx && activeDropdown?.category === `daily_${dayIdx}`
                      const dailyData = macrocycleData.planning[weekIdx]?.daily?.[dayIdx] || []
                      
                      // Get background color based on selected options
                      const getCellBgColor = () => {
                        if (dailyData.length === 0) return 'bg-surface-2'
                        if (dailyData.length === 1) return dailyCategories[dailyData[0]].color
                        // Multiple options - use gradient or first color
                        return dailyCategories[dailyData[0]].color
                      }

                      return (
                        <div key={weekIdx} style={{ width: `${finalColumnWidth}px` }} className={`relative border-r border-line ${isActive ? 'z-[101]' : ''}`}>
                          <button
                            onClick={() => canEdit && setActiveDropdown({ weekIndex: weekIdx, category: `daily_${dayIdx}` })}
                            disabled={!canEdit}
                            className={`w-full h-full px-1 py-1.5 text-[10px] font-bold transition-opacity border-0 ${getCellBgColor()} ${canEdit ? 'hover:opacity-80' : 'cursor-default'}`}
                          >
                            {dailyData.length > 0 && (
                              <span className="block truncate" title={dailyData.map(k => dailyCategories[k].fullName).join(', ')}>
                                {dailyData.map(k => dailyCategories[k].name).join('')}
                              </span>
                            )}
                          </button>

                          {isActive && canEdit && (
                            <div className={`absolute bottom-full ${weekIdx >= macrocycleData.weeks.length - 6 ? 'right-0' : 'left-0'} z-[100] mb-1 w-40 bg-surface border border-line rounded-lg shadow-2xl`}>
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
                                  className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-surface-2 transition-colors flex items-center gap-2 border-b border-line mb-1 ${
                                    dailyData.length === 0 ? 'text-muted bg-surface-2' : 'text-bad'
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded bg-surface-2 flex items-center justify-center">
                                    <X className="w-3 h-3" aria-hidden="true" />
                                  </span>
                                  Üres
                                </button>
                                {Object.entries(dailyCategories).map(([key, cat]) => (
                                  <button
                                    key={key}
                                    onClick={() => handleDailyClick(weekIdx, dayIdx, key)}
                                    className={`w-full px-3 py-2 text-left text-sm text-fg rounded hover:bg-surface-2 transition-colors flex items-center gap-2 ${
                                      dailyData.includes(key) ? 'bg-surface-2' : ''
                                    }`}
                                  >
                                    <span className={`w-5 h-5 rounded border border-line ${cat.color} flex items-center justify-center text-xs font-bold`}>
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
        </div>
      )}

      {/* Legend */}
      {currentSeason && (
        <Panel title="Jelmagyarázat">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* OPT Group */}
            <div>
              <h4 className="text-sm font-medium text-fg mb-2">OPT Modell</h4>
              <div className="space-y-1">
                {Object.entries(trainingCategories)
                  .filter(([key, cat]) => cat.category === 'OPT')
                  .map(([key, category]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded border border-line ${category.color}`}></div>
                      <span className="text-xs text-muted">{category.name}</span>
                    </div>
                  ))}
                <p className="text-[10px] text-muted mt-2 italic">Kattints a cellára be/kikapcsoláshoz</p>
              </div>
            </div>

            {/* Other categories */}
            {Object.entries(trainingCategories)
              .filter(([key, cat]) => cat.type === 'dropdown')
              .map(([key, category]) => (
                <div key={key}>
                  <h4 className="text-sm font-medium text-fg mb-2">{category.name}</h4>
                  <div className="space-y-1">
                    {category.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded border border-line ${category.colors[option] || 'bg-surface-3'}`}></div>
                        <span className="text-xs text-muted">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {/* Daily Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-fg mb-2">Napi bontás</h4>
              <div className="space-y-1">
                {Object.entries(dailyCategories).map(([key, cat]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded border border-line ${cat.color} flex items-center justify-center text-[10px] font-bold`}>
                      {cat.name}
                    </div>
                    <span className="text-xs text-muted">{cat.fullName}</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted mt-2 italic">Kattints a cellára kiválasztáshoz (több is választható)</p>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Create Season Modal */}
      {showCreateModal && (
        <CreateSeasonModal
          newSeason={newSeason}
          setNewSeason={setNewSeason}
          onSubmit={handleCreateSeason}
          onClose={() => setShowCreateModal(false)}
          loading={loading}
        />
      )}

      {/* Edit Season Modal */}
      {showEditModal && (
        <EditSeasonModal
          editSeason={editSeason}
          setEditSeason={setEditSeason}
          onSubmit={handleUpdateSeason}
          onClose={() => setShowEditModal(false)}
          loading={loading}
        />
      )}

      {/* Delete Season Modal */}
      {showDeleteModal && seasonToDelete && (
        <DeleteSeasonModal
          seasonToDelete={seasonToDelete}
          onConfirm={handleDeleteSeason}
          onClose={() => {
            setShowDeleteModal(false)
            setSeasonToDelete(null)
          }}
          loading={loading}
        />
      )}

      {/* Save Template Modal */}
      {showTemplateModal && (
        <SaveTemplateModal
          templateName={templateName}
          setTemplateName={setTemplateName}
          onSubmit={handleSaveTemplate}
          onClose={() => {
            setShowTemplateModal(false)
            setTemplateName('')
          }}
          loading={loading}
        />
      )}

      {/* Load Template Modal */}
      {showLoadTemplateModal && (
        <LoadTemplateModal
          templates={templates}
          onLoad={handleLoadTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setShowLoadTemplateModal(false)}
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
