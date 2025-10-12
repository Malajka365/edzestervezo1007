import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Check, Dumbbell, Circle } from 'lucide-react'

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
      alert('Hiba történt a mentés során!')
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              Gyors Edzés Hozzáadás
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-6 p-4 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-slate-300">Konditerem</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center">
              <Circle className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-slate-300">Labdás edzés</span>
          </div>
        </div>

        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks Grid */}
        <div className="space-y-3 mb-6">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map(({ date, isCurrentMonth }) => {
                const dateString = formatDate(date)
                const selected = selectedDays[dateString] || { gym: false, ball: false }
                const hasSelection = selected.gym || selected.ball

                return (
                  <div
                    key={dateString}
                    className={`border rounded-lg p-2 transition-all ${
                      !isCurrentMonth
                        ? 'opacity-40 border-slate-700 bg-slate-800/30'
                        : isToday(date)
                        ? 'border-primary-500 bg-primary-500/10'
                        : hasSelection
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-600 bg-slate-700/50'
                    }`}
                  >
                    <div className="text-center mb-1">
                      <div className={`text-sm font-semibold ${
                        !isCurrentMonth
                          ? 'text-slate-600'
                          : isToday(date) 
                          ? 'text-primary-400' 
                          : 'text-white'
                      }`}>
                        {date.getDate()}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Gym checkbox */}
                      <button
                        onClick={() => toggleDay(date, 'gym')}
                        disabled={!isCurrentMonth}
                        className={`w-full p-1.5 rounded flex items-center justify-center gap-1 transition-colors ${
                          selected.gym
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-600 text-slate-400 hover:bg-slate-500'
                        } ${!isCurrentMonth ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Dumbbell className="w-3 h-3" />
                        {selected.gym && <Check className="w-3 h-3" />}
                      </button>

                      {/* Ball checkbox */}
                      <button
                        onClick={() => toggleDay(date, 'ball')}
                        disabled={!isCurrentMonth}
                        className={`w-full p-1.5 rounded flex items-center justify-center gap-1 transition-colors ${
                          selected.ball
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-600 text-slate-400 hover:bg-slate-500'
                        } ${!isCurrentMonth ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Circle className="w-3 h-3" />
                        {selected.ball && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Summary */}
        {(getChangesCount().toCreate > 0 || getChangesCount().toDelete > 0) && (
          <div className="mb-6 space-y-2">
            {getChangesCount().toCreate > 0 && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">
                    {getChangesCount().toCreate} új edzés létrehozása
                  </span>
                </div>
              </div>
            )}
            {getChangesCount().toDelete > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <X className="w-5 h-5" />
                  <span className="font-semibold">
                    {getChangesCount().toDelete} edzés törlése
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Mégse
          </button>
          <button
            onClick={handleSave}
            disabled={loading || (getChangesCount().toCreate === 0 && getChangesCount().toDelete === 0)}
            className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Mentés...' : 'Változtatások Mentése'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-400">
            💡 <strong>Tipp:</strong> Az edzéseket később szerkesztheted a naptárban (időpont, helyszín, részletek).
          </p>
        </div>
      </div>
    </div>
  )
}
