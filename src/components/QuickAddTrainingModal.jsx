import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Check, Dumbbell, Volleyball, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { SESSION_TYPES } from '../pages/calendar/sessionTypes'

const WEEKDAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']
const WEEKDAYS_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']

export default function QuickAddTrainingModal({ 
  currentDate, 
  selectedTeam,
  existingSessions,
  onClose, 
  onSave 
}) {
  const [selectedDays, setSelectedDays] = useState({})
  const [existingSessionsMap, setExistingSessionsMap] = useState({})
  const [sessionsToDelete, setSessionsToDelete] = useState([])
  const [loading, setLoading] = useState(false)

  // Get all days in the current month organized by weeks (Monday-Sunday)
  const getWeeksInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const weeks = []
    let currentWeek = []
    
    // Find the Monday before or on the first day of the month
    let startDate = new Date(firstDay)
    const dayOfWeek = startDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startDate.setDate(startDate.getDate() - daysToMonday)
    
    // Iterate through all days until we pass the last day of the month
    let currentDay = new Date(startDate)
    while (currentDay <= lastDay || currentWeek.length > 0) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      
      const isCurrentMonth = currentDay.getMonth() === month
      currentWeek.push({
        date: new Date(currentDay),
        isCurrentMonth
      })
      
      currentDay.setDate(currentDay.getDate() + 1)
      
      // Stop if we've filled a week and passed the last day
      if (currentDay > lastDay && currentWeek.length === 7) {
        weeks.push(currentWeek)
        break
      }
    }
    
    return weeks
  }

  const weeks = getWeeksInMonth()

  // Load existing sessions on mount
  useEffect(() => {
    if (existingSessions && existingSessions.length > 0) {
      const sessionsMap = {}
      const initialSelected = {}

      existingSessions.forEach(session => {
        if (!sessionsMap[session.date]) {
          sessionsMap[session.date] = { gym: [], ball: [] }
        }
        if (session.type === 'gym') {
          sessionsMap[session.date].gym.push(session)
        } else if (session.type === 'ball') {
          sessionsMap[session.date].ball.push(session)
        }

        // Initialize selected state based on existing sessions
        if (!initialSelected[session.date]) {
          initialSelected[session.date] = { gym: false, ball: false }
        }
        if (session.type === 'gym') {
          initialSelected[session.date].gym = true
        } else if (session.type === 'ball') {
          initialSelected[session.date].ball = true
        }
      })

      setExistingSessionsMap(sessionsMap)
      setSelectedDays(initialSelected)
    }
  }, [existingSessions])

  const toggleDay = (date, type) => {
    const dateString = formatDate(date)
    const current = selectedDays[dateString] || { gym: false, ball: false }
    const wasSelected = current[type]
    
    // If turning off and there are existing sessions, mark them for deletion
    if (wasSelected && existingSessionsMap[dateString]?.[type]?.length > 0) {
      const sessionsToRemove = existingSessionsMap[dateString][type]
      setSessionsToDelete([...sessionsToDelete, ...sessionsToRemove.map(s => s.id)])
    } else if (!wasSelected && existingSessionsMap[dateString]?.[type]?.length > 0) {
      // If turning back on, remove from delete list
      const sessionIds = existingSessionsMap[dateString][type].map(s => s.id)
      setSessionsToDelete(sessionsToDelete.filter(id => !sessionIds.includes(id)))
    }
    
    setSelectedDays({
      ...selectedDays,
      [dateString]: {
        ...current,
        [type]: !current[type]
      }
    })
  }

  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Delete sessions that were unchecked
      if (sessionsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('training_sessions')
          .delete()
          .in('id', sessionsToDelete)

        if (deleteError) throw deleteError
      }

      // Create new sessions
      const sessionsToCreate = []

      Object.entries(selectedDays).forEach(([dateString, types]) => {
        // Only create if selected and doesn't exist
        if (types.gym && !existingSessionsMap[dateString]?.gym?.length) {
          sessionsToCreate.push({
            team_id: selectedTeam.id,
            date: dateString,
            type: 'gym',
            start_time: null,
            end_time: null,
            location: '',
            session_data: {},
            notes: '',
          })
        }
        if (types.ball && !existingSessionsMap[dateString]?.ball?.length) {
          sessionsToCreate.push({
            team_id: selectedTeam.id,
            date: dateString,
            type: 'ball',
            start_time: null,
            end_time: null,
            location: '',
            session_data: {},
            notes: '',
          })
        }
      })

      if (sessionsToCreate.length > 0) {
        const { error } = await supabase
          .from('training_sessions')
          .insert(sessionsToCreate)

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving training sessions:', error)
      toast.error('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  const getDayName = (date) => {
    const days = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo']
    return days[date.getDay()]
  }

  const isToday = (date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const getSelectedCount = () => {
    let count = 0
    Object.values(selectedDays).forEach(types => {
      if (types.gym) count++
      if (types.ball) count++
    })
    return count
  }

  const getChangesCount = () => {
    let toCreate = 0
    let toDelete = sessionsToDelete.length

    Object.entries(selectedDays).forEach(([dateString, types]) => {
      if (types.gym && !existingSessionsMap[dateString]?.gym?.length) toCreate++
      if (types.ball && !existingSessionsMap[dateString]?.ball?.length) toCreate++
    })

    return { toCreate, toDelete }
  }
  const changes = getChangesCount()
  const gymType = SESSION_TYPES.gym
  const ballType = SESSION_TYPES.ball

  return (
    <Modal
      open
      onClose={onClose}
      title="Gyors edzés hozzáadás"
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Mégse</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={loading}
            disabled={changes.toCreate === 0 && changes.toDelete === 0}
          >
            {loading ? 'Mentés...' : 'Változtatások mentése'}
          </Button>
        </>
      }
    >
      <p className="-mt-1 mb-4 text-sm text-muted">
        {currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
      </p>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-surface-2/50 p-4">
        <div className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded ${gymType.solid}`}>
            <Dumbbell className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-sm text-fg">Konditerem</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded ${ballType.solid}`}>
            <Volleyball className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-sm text-fg">Labdás edzés</span>
        </div>
      </div>

      {/* Week Headers */}
      <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAYS.map((day, index) => (
          <div key={day} className="py-1 text-center text-xs font-medium text-muted">
            <span className="sm:hidden">{WEEKDAYS_SHORT[index]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Weeks Grid */}
      <div className="mb-6 space-y-2 sm:space-y-3">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2">
            {week.map(({ date, isCurrentMonth }) => {
              const dateString = formatDate(date)
              const selected = selectedDays[dateString] || { gym: false, ball: false }
              const hasSelection = selected.gym || selected.ball

              return (
                <div
                  key={dateString}
                  className={`rounded-lg border p-1 transition-all sm:p-2 ${
                    !isCurrentMonth
                      ? 'border-line bg-surface/30 opacity-40'
                      : isToday(date)
                      ? 'border-accent bg-accent-soft'
                      : hasSelection
                      ? 'border-ok bg-ok-soft'
                      : 'border-line bg-surface-2/50'
                  }`}
                >
                  <div className="mb-1 text-center">
                    <div className={`text-sm font-semibold ${
                      !isCurrentMonth
                        ? 'text-subtle'
                        : isToday(date)
                        ? 'text-accent'
                        : 'text-fg'
                    }`}>
                      {date.getDate()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* Gym checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleDay(date, 'gym')}
                      disabled={!isCurrentMonth}
                      aria-pressed={selected.gym}
                      aria-label={`${dateString} ${gymType.label}`}
                      className={`flex w-full items-center justify-center gap-1 rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        selected.gym
                          ? gymType.solid
                          : 'bg-surface-3 text-muted hover:bg-line'
                      } ${!isCurrentMonth ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <Dumbbell className="h-3 w-3" aria-hidden="true" />
                      {selected.gym && <Check className="h-3 w-3" aria-hidden="true" />}
                    </button>

                    {/* Ball checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleDay(date, 'ball')}
                      disabled={!isCurrentMonth}
                      aria-pressed={selected.ball}
                      aria-label={`${dateString} ${ballType.label}`}
                      className={`flex w-full items-center justify-center gap-1 rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        selected.ball
                          ? ballType.solid
                          : 'bg-surface-3 text-muted hover:bg-line'
                      } ${!isCurrentMonth ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <Volleyball className="h-3 w-3" aria-hidden="true" />
                      {selected.ball && <Check className="h-3 w-3" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Summary */}
      {(changes.toCreate > 0 || changes.toDelete > 0) && (
        <div className="mb-6 space-y-2">
          {changes.toCreate > 0 && (
            <div className="rounded-lg border border-ok/30 bg-ok-soft p-4">
              <div className="flex items-center gap-2 text-ok">
                <Check className="h-5 w-5" aria-hidden="true" />
                <span className="font-semibold">
                  {changes.toCreate} új edzés létrehozása
                </span>
              </div>
            </div>
          )}
          {changes.toDelete > 0 && (
            <div className="rounded-lg border border-bad/30 bg-bad-soft p-4">
              <div className="flex items-center gap-2 text-bad">
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="font-semibold">
                  {changes.toDelete} edzés törlése
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft p-3">
        <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm text-accent">
          <strong>Tipp:</strong> Az edzéseket később szerkesztheted a naptárban (időpont, helyszín, részletek).
        </p>
      </div>
    </Modal>
  )
}
