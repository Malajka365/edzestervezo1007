import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayers } from '../hooks/usePlayers'
import { ChevronLeft, ChevronRight, Users, Save, Trash2, Calendar, CalendarDays, CalendarRange, Plus, Clock, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmDialog from './ui/ConfirmDialog'
import Button from './ui/Button'
import IconButton from './ui/IconButton'
import Modal from './ui/Modal'
import Panel from './ui/Panel'
import SegmentedControl from './ui/SegmentedControl'
import Spinner from './ui/Spinner'
import { Field, Input, Select, Textarea } from './ui/Field'
import {
  ATTENDANCE_STATUSES,
  TRAINING_TYPES,
  getStatusColor,
  getStatusChipClass,
  getStatusLabel,
  saveAttendance,
  deleteAttendance,
} from '../lib/attendance'

const TEAM_ATTENDANCE_FORM_ID = 'team-attendance-form'

const VIEW_ITEMS = [
  { id: 'day', label: 'Nap', icon: Calendar },
  { id: 'week', label: 'Hét', icon: CalendarDays },
  { id: 'month', label: 'Hónap', icon: CalendarRange },
]

export default function TeamAttendanceCalendar({ teamId, canEdit = true }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [attendance, setAttendance] = useState([])
  // Players come from the shared, cached usePlayers query (was a local fetch).
  // Keyed by teamId, so this shares the same cache entry as the parent screens.
  const { data: players = [] } = usePlayers(teamId)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
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
      fetchAttendance()
    }
  }, [currentDate, teamId])

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
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
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
    if (!day || !canEdit) return
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
    if (!canEdit) return
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
      toast.error('Válassz ki egy játékost!')
      return
    }
    
    try {
      const { id, ...dataToSave } = formData

      const result = await saveAttendance({
        id,
        data: id
          ? dataToSave
          : { ...dataToSave, team_id: teamId, date: selectedDate },
      })

      toast.success(
        result === 'updated'
          ? 'Jelenlét sikeresen frissítve!'
          : 'Jelenlét sikeresen mentve!'
      )

      setShowModal(false)
      fetchAttendance()
    } catch (error) {
      console.error('Error saving attendance:', error)
      const errorMessage = error?.message || error?.error_description || 'Ismeretlen hiba'
      toast.error(`Hiba történt a mentés során!\n\nRészletek: ${errorMessage}`)
    }
  }

  const handleDelete = () => {
    if (!formData.id) return
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a bejegyzést?',
      action: async () => {
        try {
          await deleteAttendance(formData.id)

          setShowModal(false)
          fetchAttendance()
          toast.success('Jelenlét törölve!')
        } catch (error) {
          console.error('Error deleting attendance:', error)
          const errorMessage = error?.message || error?.error_description || 'Ismeretlen hiba'
          toast.error(`Hiba történt a törlés során!\n\nRészletek: ${errorMessage}`)
        }
      },
    })
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

  const formatTime = (time) => (time ? time.slice(0, 5) : '')

  const attendanceTitle = (att) =>
    `${att.players?.name || 'N/A'} - ${getStatusLabel(att.status)}${att.event_time ? ` (${formatTime(att.event_time)})` : ''}${att.notes ? `: ${att.notes}` : ''}`

  // Egy játékos jelenléte a hónap/hét cellában (kattintásra szerkeszthető)
  const renderAttendanceChip = (att, i) => (
    <button
      type="button"
      key={i}
      onClick={(e) => handleAttendanceClick(e, att)}
      className={`${getStatusChipClass(att.status)} block w-full cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      title={attendanceTitle(att)}
    >
      {att.players?.name || 'N/A'}
      {att.event_time && ` ${formatTime(att.event_time)}`}
    </button>
  )

  const renderAddButton = (onClick) =>
    canEdit && (
      <button
        type="button"
        onClick={onClick}
        className="flex h-6 w-6 items-center justify-center rounded bg-accent text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        title="Új jelenlét hozzáadása"
        aria-label="Új jelenlét hozzáadása"
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
      </button>
    )

  return (
    <div className="space-y-4">
      {/* Naptár */}
      <Panel>
        {/* Calendar Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label="Előző" onClick={handlePrevious} />
            <h3 className="min-w-0 px-1 text-lg font-bold text-fg sm:text-xl">{getHeaderTitle()}</h3>
            <IconButton icon={ChevronRight} label="Következő" onClick={handleNext} />
          </div>

          {/* View Mode Selector */}
          <SegmentedControl label="Nézet" items={VIEW_ITEMS} value={viewMode} onChange={setViewMode} />
        </div>

        {/* Calendar Grid - Havi nézet */}
        {viewMode === 'month' && (
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-7 gap-2">
              {/* Day Headers */}
              {dayNames.map((day, index) => (
                <div key={index} className="py-2 text-center text-sm font-medium text-muted">
                  {day}
                </div>
              ))}

              {/* Days */}
              {getDaysInMonth().map((day, idx) => {
                const dayAttendance = day ? getAttendanceForDate(day) : []
                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear()

                return (
                  <div
                    key={idx}
                    className={`relative min-h-[100px] rounded-[10px] p-2 transition-all ${
                      !day ? 'invisible' : 'bg-surface-2'
                    } ${isToday ? 'ring-2 ring-accent' : ''}`}
                  >
                    {day && (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-bold text-fg">{day}</div>
                          {renderAddButton(() => handleDayClick(day))}
                        </div>
                        {dayAttendance.length > 0 && (
                          <div className="space-y-1">
                            {dayAttendance.slice(0, 3).map(renderAttendanceChip)}
                            {dayAttendance.length > 3 && (
                              <div className="text-[10px] font-medium text-muted">
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
          </div>
        )}

        {/* Heti nézet */}
        {viewMode === 'week' && (
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-7 gap-2">
              {dayNames.map((day, index) => (
                <div key={index} className="py-2 text-center text-sm font-medium text-muted">
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
                    className={`relative min-h-[250px] rounded-[10px] bg-surface-2 p-2 transition-all ${
                      isToday ? 'ring-2 ring-accent' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-bold text-fg">{date.getDate()}</div>
                      {renderAddButton(() => handleDayClick(date.getDate()))}
                    </div>
                    {dayAttendance.length > 0 && (
                      <div className="space-y-1">
                        {dayAttendance.slice(0, 7).map(renderAttendanceChip)}
                        {dayAttendance.length > 7 && (
                          <div className="text-[10px] font-medium text-muted">
                            +{dayAttendance.length - 7} további
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Napi nézet */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            <div className="rounded-[10px] bg-surface-2 p-4 sm:p-6">
              <h4 className="mb-4 text-lg font-bold text-fg">
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
                        className="flex items-center gap-3 rounded-[10px] bg-surface-3 p-3"
                      >
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${getStatusChipClass(att.status)}`}
                        >
                          {att.players?.jersey_number || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="truncate text-sm font-bold text-fg">{att.players?.name || 'N/A'}</h5>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg">
                            <span className="flex items-center gap-1">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${getStatusColor(att.status)}`}
                                aria-hidden="true"
                              />
                              {getStatusLabel(att.status)}
                            </span>
                            {att.event_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted" aria-hidden="true" />
                                {formatTime(att.event_time)}
                              </span>
                            )}
                            {att.training_type && (
                              <span className="flex items-center gap-1">
                                <ClipboardList className="h-3 w-3 text-muted" aria-hidden="true" />
                                {att.training_type}
                              </span>
                            )}
                          </div>
                          {att.notes && (
                            <p className="mt-1 line-clamp-1 text-xs text-muted">{att.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted">
                    <Users className="mx-auto mb-2 h-12 w-12 opacity-50" aria-hidden="true" />
                    <p>Nincs jelenlét ezen a napon</p>
                    {canEdit && (
                      <Button
                        variant="primary"
                        className="mt-4"
                        onClick={() => {
                          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                          setSelectedDate(dateStr)
                          setShowModal(true)
                        }}
                      >
                        Jelenlét felvitele
                      </Button>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </Panel>

      {loading && (
        <div className="py-8 text-center">
          <Spinner />
        </div>
      )}

      {/* Attendance Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`Jelenlét - ${selectedDate}`}
        size="sm"
        footer={
          canEdit && (
            <>
              {formData.id && (
                <Button variant="danger" icon={Trash2} onClick={handleDelete}>
                  Törlés
                </Button>
              )}
              <Button type="submit" form={TEAM_ATTENDANCE_FORM_ID} variant="primary" icon={Save}>
                {formData.id ? 'Frissítés' : 'Mentés'}
              </Button>
            </>
          )
        }
      >
        <form id={TEAM_ATTENDANCE_FORM_ID} onSubmit={handleSave} className="space-y-4">
          <Field label="Játékos *" htmlFor="team-att-player">
            <Select
              id="team-att-player"
              value={formData.player_id}
              onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
              required
            >
              <option value="">Válassz játékost...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.jersey_number ? `(#${player.jersey_number})` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Státusz *" htmlFor="team-att-status">
            <Select
              id="team-att-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Edzés jellege" htmlFor="team-att-type">
            <Select
              id="team-att-type"
              value={formData.training_type}
              onChange={(e) => setFormData({ ...formData, training_type: e.target.value })}
            >
              {TRAINING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Időpont" htmlFor="team-att-time">
            <Input
              id="team-att-time"
              type="time"
              value={formData.event_time}
              onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
              placeholder="pl. 14:30"
            />
          </Field>

          <Field label="Megjegyzés" htmlFor="team-att-notes">
            <Textarea
              id="team-att-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              placeholder="Opcionális megjegyzés..."
            />
          </Field>
        </form>
      </Modal>

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
