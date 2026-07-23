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
} from 'lucide-react'
import TrainingSessionModal from '../components/TrainingSessionModal'
import QuickAddTrainingModal from '../components/QuickAddTrainingModal'
import TeamSelector from '../components/TeamSelector'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import MonthView from './calendar/MonthView'
import WeekView from './calendar/WeekView'
import DayView from './calendar/DayView'
import useCalendarData, { getWeekDays } from './calendar/useCalendarData'

export default function Calendar() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'calendar')
  const [view, setView] = useState('month') // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
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

  // Training day options with colors
  const trainingDayOptions = {
    'Edzés': { color: 'bg-blue-500', textColor: 'text-white', shortLabel: 'E' },
    'Erő': { color: 'bg-purple-500', textColor: 'text-white', shortLabel: 'Er' },
    'Állóképesség': { color: 'bg-green-500', textColor: 'text-white', shortLabel: 'Á' },
    'Gyorsaság': { color: 'bg-red-500', textColor: 'text-white', shortLabel: 'Gy' },
    'Technika': { color: 'bg-yellow-500', textColor: 'text-white', shortLabel: 'T' },
    'Taktika': { color: 'bg-orange-500', textColor: 'text-white', shortLabel: 'Ta' },
    'Regeneráció': { color: 'bg-cyan-500', textColor: 'text-white', shortLabel: 'R' },
    'Pihenő': { color: 'bg-slate-600', textColor: 'text-white', shortLabel: 'P' },
    'Mérkőzés': { color: 'bg-pink-600', textColor: 'text-white', shortLabel: 'M' },
    '-': { color: 'bg-slate-700', textColor: 'text-slate-400', shortLabel: '-' },
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

  if (!selectedTeam) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Edzésnaptár</h1>
              <p className="text-sm text-slate-400 hidden sm:block">Interaktív naptár nézet</p>
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
          {/* Bal oldal: Cím + Szezon + Gyors Hozzáadás */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Edzésnaptár</h1>
              <p className="text-sm text-slate-400 hidden sm:block">Interaktív naptár nézet</p>
            </div>

            {seasons.length > 0 && currentSeason && (
              <div className="flex items-center gap-3">
                <select
                  value={currentSeason?.id || ''}
                  onChange={(e) => {
                    const season = seasons.find(s => s.id === e.target.value)
                    if (season) {
                      setCurrentSeason(season)
                      setCurrentDate(new Date(season.start_date))
                    }
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

            {view === 'month' && canEdit && (
              <button
                onClick={() => setShowQuickAddModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl text-sm whitespace-nowrap"
                title="Gyors Hozzáadás"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline font-semibold">Gyors Hozzáadás</span>
              </button>
            )}
          </div>

          {/* Közép: Nézet váltó tab menü */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('month')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                view === 'month'
                  ? 'text-primary-400 border-primary-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
              <span>Hónap</span>
            </button>
            <button
              onClick={() => setView('week')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                view === 'week'
                  ? 'text-primary-400 border-primary-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
              <span>Hét</span>
            </button>
            <button
              onClick={() => setView('day')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                view === 'day'
                  ? 'text-primary-400 border-primary-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
              <span>Nap</span>
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

      {/* Calendar Navigation */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (view === 'month') navigateMonth(-1)
              else if (view === 'week') navigateWeek(-1)
              else navigateDay(-1)
            }}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-400" />
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">
              {view === 'month' && currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
              {view === 'week' && `${getWeekDays(currentDate)[0].toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })} - ${getWeekDays(currentDate)[6].toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}`}
              {view === 'day' && currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            {currentSeason && (
              <p className="text-sm text-slate-400 mt-1">
                Hét {getWeekNumber(currentDate) !== null ? getWeekNumber(currentDate) + 1 : '-'} / {currentSeason.name}
              </p>
            )}
          </div>

          <button
            onClick={() => {
              if (view === 'month') navigateMonth(1)
              else if (view === 'week') navigateWeek(1)
              else navigateDay(1)
            }}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Month View */}
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            daysOfWeek={daysOfWeek}
            trainingDayOptions={trainingDayOptions}
            getDaysInMonth={getDaysInMonth}
            getDayData={getDayData}
            getTrainingSessionsForDate={getTrainingSessionsForDate}
            getMatchesForDate={getMatchesForDate}
            isToday={isToday}
            isCurrentMonth={isCurrentMonth}
            setCurrentDate={setCurrentDate}
            setView={setView}
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
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Jelmagyarázat</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(trainingDayOptions).map(([label, config]) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${config.color} ${config.textColor} text-xs font-medium`}>
                {config.shortLabel}
              </div>
              <span className="text-sm text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

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

      </div>

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
