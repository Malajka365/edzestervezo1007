import { useState } from 'react'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Grid,
  Zap,
  CalendarDays,
} from 'lucide-react'
import TrainingSessionModal from '../components/TrainingSessionModal'
import QuickAddTrainingModal from '../components/QuickAddTrainingModal'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { Select } from '../components/ui/Field'
import IconButton from '../components/ui/IconButton'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import SegmentedControl from '../components/ui/SegmentedControl'
import MonthView from './calendar/MonthView'
import WeekView from './calendar/WeekView'
import DayView from './calendar/DayView'
import SessionActions from './calendar/SessionActions'
import useCalendarData, { getWeekDays } from './calendar/useCalendarData'

export default function Calendar() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'calendar')
  const [view, setView] = useState('month') // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [actionSession, setActionSession] = useState(null)
  const [selectedDateForSession, setSelectedDateForSession] = useState(null)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [confirmState, setConfirmState] = useState(null)

  // Data layer (fetches, debounced auto-save, readers) lives in the hook.
  const {
    seasons,
    currentSeason,
    setCurrentSeason,
    planningData,
    trainingSessions,
    matches,
    loadTrainingSessions,
    updateLoadFactor,
    getLoadFactor,
    updateTacticsTechnique,
    getTacticsTechnique,
    deleteTrainingSession: deleteTrainingSessionById,
  } = useCalendarData(selectedTeam, currentDate)

  const daysOfWeek = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']
  const daysOfWeekShort = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']

  // Training day options with colors (t-* tokenek: erő / labdás / taktika / meccs / pihenő)
  const trainingDayOptions = {
    'Edzés': { color: 'bg-accent-soft', textColor: 'text-accent', shortLabel: 'E' },
    'Erő': { color: 'bg-t-strength', textColor: 'text-on-status', shortLabel: 'Er' },
    'Állóképesség': { color: 'bg-ok', textColor: 'text-on-status', shortLabel: 'Á' },
    'Gyorsaság': { color: 'bg-bad', textColor: 'text-on-status', shortLabel: 'Gy' },
    'Technika': { color: 'bg-warn-soft', textColor: 'text-fg', shortLabel: 'T' },
    'Taktika': { color: 'bg-t-tactic', textColor: 'text-on-status', shortLabel: 'Ta' },
    'Regeneráció': { color: 'bg-t-ball', textColor: 'text-on-status', shortLabel: 'R' },
    'Pihenő': { color: 'bg-surface-3', textColor: 'text-fg', shortLabel: 'P' },
    'Mérkőzés': { color: 'bg-t-match', textColor: 'text-on-status', shortLabel: 'M' },
    '-': { color: 'bg-surface-2', textColor: 'text-subtle', shortLabel: '-' },
  }

  const getWeekNumber = (date) => {
    if (!currentSeason) return null
    const seasonStart = new Date(currentSeason.start_date)
    const diff = Math.floor((date - seasonStart) / (7 * 24 * 60 * 60 * 1000))
    return diff >= 0 ? diff : null
  }

  const getDayData = (date) => {
    const weekIndex = getWeekNumber(date)
    if (weekIndex === null || !planningData[weekIndex]) return null

    const dayOfWeek = date.getDay()
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to Monday=0
    const dayKey = `day_${dayIndex}`

    return planningData[weekIndex][dayKey] || null
  }

  const getTrainingSessionsForDate = (date) => {
    // Format date as YYYY-MM-DD in local timezone
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    return trainingSessions.filter(session => session.date === dateString)
  }

  const getMatchesForDate = (date) => {
    // Format date as YYYY-MM-DD in local timezone
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    return matches.filter(match => match.date === dateString)
  }

  const openCreate = (date) => {
    setEditingSession(null)
    setSelectedDateForSession(date)
    setShowSessionModal(true)
  }

  const deleteTrainingSession = (id) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt az edzést?',
      action: async () => {
        await deleteTrainingSessionById(id)
      },
    })
  }

  // Month view helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDay.getDay()
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Convert to Monday = 0

    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction * 7))
    setCurrentDate(newDate)
  }

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + direction)
    setCurrentDate(newDate)
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const hasBallTraining = (date) => {
    const sessions = getTrainingSessionsForDate(date)
    return sessions.some(session => session.type === 'ball')
  }

  const VIEW_ITEMS = [
    { id: 'month', label: 'Hónap', icon: Grid },
    { id: 'week', label: 'Hét', icon: List },
    { id: 'day', label: 'Nap', icon: CalendarIcon },
  ]

  const navigate = (direction) => {
    if (view === 'month') navigateMonth(direction)
    else if (view === 'week') navigateWeek(direction)
    else navigateDay(direction)
  }

  if (!selectedTeam) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Naptár" description="Interaktív naptár nézet" />
        <EmptyState
          icon={CalendarDays}
          title="Nincs kiválasztott csapat"
          description="Válassz ki egy csapatot a folytatáshoz."
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Naptár"
        description="Interaktív naptár nézet"
        actions={
          <>
            {seasons.length > 0 && currentSeason && (
              <Select
                aria-label="Szezon"
                value={currentSeason?.id || ''}
                onChange={(e) => {
                  const season = seasons.find(s => s.id === e.target.value)
                  if (season) {
                    setCurrentSeason(season)
                    setCurrentDate(new Date(season.start_date))
                  }
                }}
                className="max-w-full sm:!w-auto"
              >
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({new Date(season.start_date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })} - {new Date(season.end_date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })})
                  </option>
                ))}
              </Select>
            )}
            <SegmentedControl label="Nézet" items={VIEW_ITEMS} value={view} onChange={setView} />
            {view === 'month' && canEdit && (
              <Button variant="primary" icon={Zap} onClick={() => setShowQuickAddModal(true)}>
                Gyors hozzáadás
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-6">
        {/* Calendar Navigation */}
        <Panel>
          <div className="mb-6 flex items-center justify-between gap-2">
            <IconButton icon={ChevronLeft} label="Előző" onClick={() => navigate(-1)} />

            <div className="min-w-0 text-center">
              <h2 className="text-xl font-bold text-fg sm:text-2xl">
                {view === 'month' && currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
                {view === 'week' && `${getWeekDays(currentDate)[0].toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })} - ${getWeekDays(currentDate)[6].toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}`}
                {view === 'day' && currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              {currentSeason && (
                <p className="mt-1 text-sm text-muted">
                  Hét {getWeekNumber(currentDate) !== null ? getWeekNumber(currentDate) + 1 : '-'} / {currentSeason.name}
                </p>
              )}
            </div>

            <IconButton icon={ChevronRight} label="Következő" onClick={() => navigate(1)} />
          </div>

          {/* Month View */}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              daysOfWeek={daysOfWeek}
              daysOfWeekShort={daysOfWeekShort}
              trainingDayOptions={trainingDayOptions}
              getDaysInMonth={getDaysInMonth}
              getDayData={getDayData}
              getTrainingSessionsForDate={getTrainingSessionsForDate}
              getMatchesForDate={getMatchesForDate}
              isToday={isToday}
              isCurrentMonth={isCurrentMonth}
              setCurrentDate={setCurrentDate}
              setView={setView}
              onCreate={canEdit ? openCreate : undefined}
              onSessionClick={setActionSession}
            />
          )}

          {/* Week View */}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              daysOfWeek={daysOfWeek}
              trainingDayOptions={trainingDayOptions}
              getWeekDays={getWeekDays}
              getDayData={getDayData}
              getTrainingSessionsForDate={getTrainingSessionsForDate}
              getMatchesForDate={getMatchesForDate}
              isToday={isToday}
              setCurrentDate={setCurrentDate}
              setView={setView}
              hasBallTraining={hasBallTraining}
              canEdit={canEdit}
              updateLoadFactor={updateLoadFactor}
              getLoadFactor={getLoadFactor}
              getTacticsTechnique={getTacticsTechnique}
              updateTacticsTechnique={updateTacticsTechnique}
              onCreate={canEdit ? openCreate : undefined}
              onSessionClick={setActionSession}
            />
          )}

          {/* Day View */}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              trainingDayOptions={trainingDayOptions}
              getDayData={getDayData}
              getTrainingSessionsForDate={getTrainingSessionsForDate}
              getMatchesForDate={getMatchesForDate}
              canEdit={canEdit}
              setSelectedDateForSession={setSelectedDateForSession}
              setEditingSession={setEditingSession}
              setShowSessionModal={setShowSessionModal}
              deleteTrainingSession={deleteTrainingSession}
            />
          )}
        </Panel>

        {/* Legend */}
        <Panel title="Jelmagyarázat">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(trainingDayOptions).map(([label, config]) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium ${config.color} ${config.textColor}`}>
                  {config.shortLabel}
                </div>
                <span className="text-sm text-muted">{label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <SessionActions
        session={actionSession}
        canEdit={canEdit}
        onClose={() => setActionSession(null)}
        onEdit={(session) => {
          setActionSession(null)
          setEditingSession(session)
          setShowSessionModal(true)
        }}
        onDelete={(session) => {
          setActionSession(null)
          deleteTrainingSession(session.id)
        }}
      />

      {/* Training Session Modal */}
      {showSessionModal && (
        <TrainingSessionModal
          date={selectedDateForSession}
          session={editingSession}
          selectedTeam={selectedTeam}
          onClose={() => {
            setShowSessionModal(false)
            setEditingSession(null)
            setSelectedDateForSession(null)
          }}
          onSave={() => {
            setShowSessionModal(false)
            setEditingSession(null)
            setSelectedDateForSession(null)
            loadTrainingSessions()
          }}
        />
      )}

      {/* Quick Add Training Modal */}
      {showQuickAddModal && (
        <QuickAddTrainingModal
          currentDate={currentDate}
          selectedTeam={selectedTeam}
          existingSessions={trainingSessions}
          onClose={() => setShowQuickAddModal(false)}
          onSave={() => {
            setShowQuickAddModal(false)
            loadTrainingSessions()
          }}
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
