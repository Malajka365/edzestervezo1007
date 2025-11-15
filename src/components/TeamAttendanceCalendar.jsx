import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Users, X, Save, Trash2, Calendar, CalendarDays, CalendarRange, Plus } from 'lucide-react'

export default function TeamAttendanceCalendar({ teamId }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [attendance, setAttendance] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month', 'week', 'day'
  const [formData, setFormData] = useState({
    id: null,
    player_id: '',
    status: 'jelen',
    training_type: 'edzés',
    event_time: '',
    notes: '',
  })

  useEffect(() => {
    if (teamId) {
      fetchPlayers()
      fetchAttendance()
    }
  }, [currentDate, teamId])

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, jersey_number')
        .eq('team_id', teamId)
        .order('name', { ascending: true })

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('player_attendance')
        .select('*, players(name, jersey_number)')
        .eq('team_id', teamId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])

      if (error) throw error
      setAttendance(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days = []
    // Előző hónap napjai
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      days.push(null)
    }
    // Aktuális hónap napjai
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Hétfő = 1
    startOfWeek.setDate(diff)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push(date)
    }
    return days
  }

  const getAttendanceForDateStr = (dateStr) => {
    return attendance.filter(a => a.date === dateStr)
  }

  const getAttendanceForDate = (day) => {
    if (!day) return []
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return attendance.filter(a => a.date === dateStr)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'jelen': return 'bg-green-500'
      case 'hiányzik': return 'bg-red-500'
      case 'beteg': return 'bg-yellow-500'
      case 'sérült': return 'bg-orange-500'
      case 'egyéb': return 'bg-gray-500'
      default: return 'bg-slate-600'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'jelen': return 'Jelen'
      case 'hiányzik': return 'Hiányzik'
      case 'beteg': return 'Beteg'
      case 'sérült': return 'Sérült'
      case 'egyéb': return 'Egyéb'
      default: return status
    }
  }

  const monthNames = [
    'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
  ]

  const dayNames = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V']

  const getStatsForMonth = () => {
    const stats = {
      jelen: 0,
      hiányzik: 0,
      beteg: 0,
      sérült: 0,
      egyéb: 0
    }

    attendance.forEach(a => {
      if (stats[a.status] !== undefined) {
        stats[a.status]++
      }
    })

    return stats
  }

  const handleDayClick = (day) => {
    if (!day) return
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setFormData({
      id: null,
      player_id: '',
      status: 'jelen',
      training_type: 'edzés',
      event_time: '',
      notes: '',
    })
    setShowModal(true)
  }

  const handleAttendanceClick = (e, attendance) => {
    e.stopPropagation()
    setSelectedDate(attendance.date)
    setFormData({
      id: attendance.id,
      player_id: attendance.player_id,
      status: attendance.status,
      training_type: attendance.training_type || 'edzés',
      event_time: attendance.event_time || '',
      notes: attendance.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (!formData.player_id) {
      alert('❌ Válassz ki egy játékost!')
      return
    }
    
    try {
      const { id, ...dataToSave } = formData
      
      // Convert empty strings to null for optional fields
      const cleanedData = {
        ...dataToSave,
        event_time: dataToSave.event_time || null,
        notes: dataToSave.notes || null,
        training_type: dataToSave.training_type || null,
      }
      
      if (id) {
        // Update existing
        const { error } = await supabase
          .from('player_attendance')
          .update(cleanedData)
          .eq('id', id)
          
        if (error) throw error
        alert('✅ Jelenlét sikeresen frissítve!')
      } else {
        // Insert new
        const { error } = await supabase
          .from('player_attendance')
          .insert({
            ...cleanedData,
            team_id: teamId,
            date: selectedDate,
          })
          
        if (error) throw error
        alert('✅ Jelenlét sikeresen mentve!')
      }
      
      setShowModal(false)
      fetchAttendance()
    } catch (error) {
      console.error('Error saving attendance:', error)
      const errorMessage = error?.message || error?.error_description || 'Ismeretlen hiba'
      alert(`❌ Hiba történt a mentés során!\n\nRészletek: ${errorMessage}`)
    }
  }

  const handleDelete = async () => {
    if (!formData.id) return
    if (!confirm('Biztosan törölni szeretnéd ezt a bejegyzést?')) return
    
    try {
      const { error } = await supabase
        .from('player_attendance')
        .delete()
        .eq('id', formData.id)
        
      if (error) throw error
      
      setShowModal(false)
      fetchAttendance()
      alert('✅ Jelenlét törölve!')
    } catch (error) {
      console.error('Error deleting attendance:', error)
      const errorMessage = error?.message || error?.error_description || 'Ismeretlen hiba'
      alert(`❌ Hiba történt a törlés során!\n\nRészletek: ${errorMessage}`)
    }
  }

  const stats = getStatsForMonth()

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays()
      const start = weekDays[0]
      const end = weekDays[6]
      return `${start.getFullYear()}. ${monthNames[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`
    } else {
      return `${currentDate.getFullYear()}. ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}.`
    }
  }

  return (
    <div className="space-y-4">

      {/* Naptár */}
      <div className="card">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevious}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-white">
              {getHeaderTitle()}
            </h3>
            
            {/* View Mode Selector */}
            <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'day' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Napi nézet"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'week' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Heti nézet"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'month' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Havi nézet"
              >
                <CalendarRange className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <button
            onClick={handleNext}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Calendar Grid - Havi nézet */}
        {viewMode === 'month' && (
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {dayNames.map((day, index) => (
            <div key={index} className="text-center text-sm font-medium text-slate-400 py-2">
              {day}
            </div>
          ))}
          
          {/* Days */}
          {getDaysInMonth().map((day, idx) => {
            const dayAttendance = day ? getAttendanceForDate(day) : []
            const isToday = day === new Date().getDate() && 
                           currentDate.getMonth() === new Date().getMonth() &&
                           currentDate.getFullYear() === new Date().getFullYear()
            
            return (
              <div
                key={idx}
                className={`
                  min-h-[100px] rounded-lg p-2 transition-all relative
                  ${!day ? 'invisible' : 'bg-slate-700'}
                  ${isToday ? 'ring-2 ring-primary-500' : ''}
                `}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-white">{day}</div>
                      <button
                        onClick={() => handleDayClick(day)}
                        className="w-5 h-5 bg-primary-500 hover:bg-primary-600 rounded flex items-center justify-center text-white transition-colors"
                        title="Új jelenlét hozzáadása"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    {dayAttendance.length > 0 && (
                      <div className="space-y-1">
                        {dayAttendance.slice(0, 3).map((att, i) => (
                          <div
                            key={i}
                            onClick={(e) => handleAttendanceClick(e, att)}
                            className={`${getStatusColor(att.status)} rounded px-1.5 py-0.5 text-[10px] text-white font-medium truncate cursor-pointer hover:opacity-80 transition-opacity`}
                            title={`${att.players?.name || 'N/A'} - ${getStatusLabel(att.status)}${att.event_time ? ` (${att.event_time.slice(0, 5)})` : ''}${att.notes ? `: ${att.notes}` : ''}`}
                          >
                            {att.players?.name || 'N/A'}
                            {att.event_time && ` ${att.event_time.slice(0, 5)}`}
                          </div>
                        ))}
                        {dayAttendance.length > 3 && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            +{dayAttendance.length - 3} további
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
        )}

        {/* Heti nézet */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day, index) => (
              <div key={index} className="text-center text-sm font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
            
            {getWeekDays().map((date, idx) => {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              const dayAttendance = getAttendanceForDateStr(dateStr)
              const isToday = date.toDateString() === new Date().toDateString()
              
              return (
                <div
                  key={idx}
                  className={`
                    min-h-[250px] rounded-lg p-2 transition-all relative
                    bg-slate-700
                    ${isToday ? 'ring-2 ring-primary-500' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-white">{date.getDate()}</div>
                    <button
                      onClick={() => handleDayClick(date.getDate())}
                      className="w-5 h-5 bg-primary-500 hover:bg-primary-600 rounded flex items-center justify-center text-white transition-colors"
                      title="Új jelenlét hozzáadása"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {dayAttendance.length > 0 && (
                    <div className="space-y-1">
                      {dayAttendance.slice(0, 7).map((att, i) => (
                        <div
                          key={i}
                          onClick={(e) => handleAttendanceClick(e, att)}
                          className={`${getStatusColor(att.status)} rounded px-1.5 py-0.5 text-[10px] text-white font-medium truncate cursor-pointer hover:opacity-80 transition-opacity`}
                          title={`${att.players?.name || 'N/A'} - ${getStatusLabel(att.status)}${att.event_time ? ` (${att.event_time.slice(0, 5)})` : ''}${att.notes ? `: ${att.notes}` : ''}`}
                        >
                          {att.players?.name || 'N/A'}
                          {att.event_time && ` ${att.event_time.slice(0, 5)}`}
                        </div>
                      ))}
                      {dayAttendance.length > 7 && (
                        <div className="text-[10px] text-slate-400 font-medium">
                          +{dayAttendance.length - 7} további
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Napi nézet */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-6">
              <h4 className="text-lg font-bold text-white mb-4">
                {currentDate.getFullYear()}. {monthNames[currentDate.getMonth()]} {currentDate.getDate()}.
              </h4>
              
              {(() => {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                const dayAttendance = getAttendanceForDateStr(dateStr)
                
                return dayAttendance.length > 0 ? (
                  <div className="space-y-3">
                    {dayAttendance.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-slate-600 rounded-lg"
                      >
                        <div className={`w-10 h-10 ${getStatusColor(att.status)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                          {att.players?.jersey_number || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-white text-sm truncate">{att.players?.name || 'N/A'}</h5>
                          <div className="flex items-center gap-3 text-xs text-slate-300">
                            <span className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 ${getStatusColor(att.status)} rounded-full`}></span>
                              {getStatusLabel(att.status)}
                            </span>
                            {att.event_time && (
                              <span>🕐 {att.event_time.slice(0, 5)}</span>
                            )}
                            {att.training_type && (
                              <span>📋 {att.training_type}</span>
                            )}
                          </div>
                          {att.notes && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{att.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nincs jelenlét ezen a napon</p>
                    <button
                      onClick={() => {
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                        setSelectedDate(dateStr)
                        setShowModal(true)
                      }}
                      className="mt-4 btn btn-primary"
                    >
                      Jelenlét felvitele
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Napi részletek - ha van kijelölt nap */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      )}

      {/* Attendance Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                Jelenlét - {selectedDate}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Játékos *
                </label>
                <select
                  value={formData.player_id}
                  onChange={(e) => setFormData({...formData, player_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                >
                  <option value="">Válassz játékost...</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.jersey_number ? `(#${player.jersey_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Státusz *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                >
                  <option value="jelen">Jelen</option>
                  <option value="hiányzik">Hiányzik</option>
                  <option value="beteg">Beteg</option>
                  <option value="sérült">Sérült</option>
                  <option value="egyéb">Egyéb</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Edzés jellege
                </label>
                <select
                  value={formData.training_type}
                  onChange={(e) => setFormData({...formData, training_type: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="edzés">Edzés</option>
                  <option value="mérkőzés">Mérkőzés</option>
                  <option value="regeneráció">Regeneráció</option>
                  <option value="orvosi">Orvosi</option>
                  <option value="egyéb">Egyéb</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Időpont
                </label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({...formData, event_time: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="pl. 14:30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Megjegyzés
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  rows="3"
                  placeholder="Opcionális megjegyzés..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                {formData.id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Törlés
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {formData.id ? 'Frissítés' : 'Mentés'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
