import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Grid,
  Plus,
  Edit,
  Trash2,
  Zap,
  Home,
  Plane,
} from 'lucide-react'
import TrainingSessionModal from '../components/TrainingSessionModal'
import QuickAddTrainingModal from '../components/QuickAddTrainingModal'

export default function Calendar() {
  const { selectedTeam } = useTeams()
  const [view, setView] = useState('month') // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [seasons, setSeasons] = useState([])
  const [currentSeason, setCurrentSeason] = useState(null)
  const [planningData, setPlanningData] = useState({})
  const [trainingSessions, setTrainingSessions] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [selectedDateForSession, setSelectedDateForSession] = useState(null)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)

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
    }
  }, [currentSeason, selectedTeam])

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

  const deleteTrainingSession = async (id) => {
    if (!confirm('Biztosan törölni szeretnéd ezt az edzést?')) return

    try {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadTrainingSessions()
    } catch (error) {
      console.error('Error deleting training session:', error)
      alert('Hiba történt a törlés során!')
    }
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

  const getWeekDays = (date) => {
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

  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Válassz ki egy csapatot a folytatáshoz</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Edzésnaptár</h1>
          <p className="text-slate-400 mt-1">
            {selectedTeam.name} - Interaktív naptár nézet
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setView('month')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              view === 'month'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Hónap</span>
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              view === 'week'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Hét</span>
          </button>
          <button
            onClick={() => setView('day')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              view === 'day'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Nap</span>
          </button>
        </div>
      </div>

      {/* Season Selector */}
      {seasons.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Szezon
              </label>
              <select
                value={currentSeason?.id || ''}
                onChange={(e) => {
                  const season = seasons.find(s => s.id === e.target.value)
                  if (season) {
                    setCurrentSeason(season)
                    setCurrentDate(new Date(season.start_date))
                  }
                }}
                className="input-field w-full"
              >
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({new Date(season.start_date).toLocaleDateString('hu-HU')} - {new Date(season.end_date).toLocaleDateString('hu-HU')})
                  </option>
                ))}
              </select>
            </div>
            
            {view === 'month' && (
              <div className="flex items-end">
                <button
                  onClick={() => setShowQuickAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">Gyors Hozzáadás</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth(currentDate).map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dayData = getDayData(date)
                const dayConfig = dayData ? trainingDayOptions[dayData] : null
                const daySessions = getTrainingSessionsForDate(date)
                const dayMatches = getMatchesForDate(date)

                return (
                  <div
                    key={date.toISOString()}
                    className={`aspect-square border rounded-lg p-2 transition-all cursor-pointer ${
                      isToday(date)
                        ? 'border-primary-500 bg-primary-500/10'
                        : isCurrentMonth(date)
                        ? 'border-slate-600 hover:border-slate-500 bg-slate-800'
                        : 'border-slate-700 bg-slate-900/50 opacity-50'
                    }`}
                    onClick={() => {
                      setCurrentDate(date)
                      setView('day')
                    }}
                  >
                    <div className="flex flex-col h-full">
                      <div className={`text-sm font-medium mb-1 ${
                        isToday(date) ? 'text-primary-400' : 'text-slate-300'
                      }`}>
                        {date.getDate()}
                      </div>
                      
                      {/* Macrocycle planning indicator */}
                      {dayConfig && dayConfig.shortLabel !== '-' && (
                        <div className={`text-[10px] px-1 rounded ${dayConfig.color} ${dayConfig.textColor} mb-1`}>
                          {dayConfig.shortLabel}
                        </div>
                      )}
                      
                      {/* Training sessions */}
                      {daySessions.length > 0 && (
                        <div className="space-y-1 mb-1">
                          {daySessions.map((session, idx) => {
                            const isGym = session.type === 'gym'
                            const isBall = session.type === 'ball'
                            const bgColor = isGym ? 'bg-purple-600' : isBall ? 'bg-teal-600' : 'bg-blue-600'
                            const icon = isGym ? '🏋️' : isBall ? '⚽' : '📝'
                            
                            return (
                              <div key={idx} className={`text-[10px] px-1 py-0.5 rounded ${bgColor} text-white flex items-center gap-1`}>
                                <span className="flex-shrink-0">{icon}</span>
                                {session.start_time && (
                                  <span className="flex-shrink-0">{session.start_time.substring(0, 5)}</span>
                                )}
                                {session.location && (
                                  <span className="truncate text-[9px] opacity-90">
                                    {session.location}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Matches */}
                      {dayMatches.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {dayMatches.map((match, idx) => {
                            const isHome = match.home_away === 'home'
                            const LocationIcon = isHome ? Home : Plane
                            
                            return (
                              <div key={idx} className="text-[10px] px-1 py-1 rounded bg-pink-600 text-white flex items-center gap-1">
                                <LocationIcon className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate flex-1">
                                  {match.opponent}
                                </span>
                                {match.time && (
                                  <span className="text-[9px] opacity-80 flex-shrink-0">
                                    {match.time.substring(0, 5)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {view === 'week' && (
          <div className="space-y-2">
            {getWeekDays(currentDate).map((date, index) => {
              const dayData = getDayData(date)
              const dayConfig = dayData ? trainingDayOptions[dayData] : null

              return (
                <div
                  key={date.toISOString()}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${
                    isToday(date)
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-600 hover:border-slate-500 bg-slate-800'
                  }`}
                  onClick={() => {
                    setCurrentDate(date)
                    setView('day')
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {daysOfWeek[index]}
                      </div>
                      <div className="text-sm text-slate-400">
                        {date.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    {dayConfig && (
                      <div className={`px-4 py-2 rounded-lg ${dayConfig.color} ${dayConfig.textColor} font-medium`}>
                        {dayData}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Day View */}
        {view === 'day' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {currentDate.toLocaleDateString('hu-HU', { weekday: 'long' })}
              </div>
              <div className="text-lg text-slate-400">
                {currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {(() => {
              const dayData = getDayData(currentDate)
              const dayConfig = dayData ? trainingDayOptions[dayData] : null
              const daySessions = getTrainingSessionsForDate(currentDate)
              const dayMatches = getMatchesForDate(currentDate)

              return (
                <div className="space-y-4">
                  {/* Macrocycle Planning */}
                  {dayConfig && (
                    <div className="card bg-slate-800">
                      <h3 className="text-lg font-semibold text-white mb-4">📅 Makrociklus Tervezés</h3>
                      <div className={`p-6 rounded-lg ${dayConfig.color} ${dayConfig.textColor} text-center`}>
                        <div className="text-2xl font-bold mb-2">{dayData}</div>
                        <div className="text-sm opacity-90">
                          {dayConfig.shortLabel !== '-' ? 'Tervezett aktivitás típusa' : 'Nincs tervezett aktivitás'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Training Sessions */}
                  <div className="card bg-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">🏋️ Edzések ({daySessions.length})</h3>
                      <button
                        onClick={() => {
                          setSelectedDateForSession(currentDate)
                          setEditingSession(null)
                          setShowSessionModal(true)
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Edzés hozzáadása</span>
                      </button>
                    </div>
                    
                    {daySessions.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <p>Nincs edzés erre a napra</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {daySessions.map(session => (
                          <div key={session.id} className="bg-teal-600/20 border border-teal-600/50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-white">{session.type === 'gym' ? '🏋️ Konditerem' : session.type === 'ball' ? '⚽ Labdás' : session.type === 'tactic' ? '🎯 Taktika' : '📝 Egyéb'}</div>
                                {session.start_time && (
                                  <div className="text-sm text-slate-400 mt-1">
                                    {session.start_time} {session.end_time && `- ${session.end_time}`}
                                  </div>
                                )}
                                {session.location && (
                                  <div className="text-sm text-slate-400 mt-1">📍 {session.location}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingSession(session)
                                    setShowSessionModal(true)
                                  }}
                                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                  title="Szerkesztés"
                                >
                                  <Edit className="w-4 h-4 text-slate-400" />
                                </button>
                                <button
                                  onClick={() => deleteTrainingSession(session.id)}
                                  className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                                  title="Törlés"
                                >
                                  <Trash2 className="w-4 h-4 text-slate-400" />
                                </button>
                              </div>
                            </div>
                            {session.notes && (
                              <p className="text-sm text-slate-300 mt-2">{session.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Matches */}
                  {dayMatches.length > 0 && (
                    <div className="card bg-slate-800">
                      <h3 className="text-lg font-semibold text-white mb-4">🏆 Mérkőzések ({dayMatches.length})</h3>
                      <div className="space-y-3">
                        {dayMatches.map(match => (
                          <div key={match.id} className="bg-pink-600/20 border border-pink-600/50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="text-xl font-bold text-white mb-1">
                                  {match.home_away === 'home' ? '🏠' : '✈️'} vs {match.opponent}
                                </div>
                                {match.time && (
                                  <div className="text-sm text-slate-400">
                                    ⏰ {match.time}
                                  </div>
                                )}
                                {match.location && (
                                  <div className="text-sm text-slate-400 mt-1">
                                    📍 {match.location}
                                  </div>
                                )}
                              </div>
                              {match.our_score !== null && match.opponent_score !== null && (
                                <div className="text-2xl font-bold text-white">
                                  {match.our_score} : {match.opponent_score}
                                </div>
                              )}
                            </div>
                            {match.notes && (
                              <p className="text-sm text-slate-300 mt-2">{match.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No activities */}
                  {!dayConfig && daySessions.length === 0 && dayMatches.length === 0 && (
                    <div className="card bg-slate-800 text-center py-12">
                      <CalendarIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Nincs program erre a napra</h3>
                      <p className="text-slate-400">
                        Adj hozzá edzést vagy mérkőzést a naptárhoz!
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
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
    </div>
  )
}
