import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, Save, Clock, ClipboardList, StickyNote } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmDialog from './ui/ConfirmDialog'
import Button from './ui/Button'
import IconButton from './ui/IconButton'
import Modal from './ui/Modal'
import Panel from './ui/Panel'
import { Field, Input, Select, Textarea } from './ui/Field'
import LoadingSpinner from './LoadingSpinner'
import {
  ATTENDANCE_STATUSES,
  TRAINING_TYPES,
  getStatusColor,
  getStatusLabel,
  saveAttendance,
  deleteAttendance,
} from '../lib/attendance'

const ATTENDANCE_FORM_ID = 'attendance-form'

export default function AttendanceCalendar({ player, teamId, canEdit = true }) {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formData, setFormData] = useState({
    date: '',
    status: 'jelen',
    training_type: 'edzés',
    event_time: '',
    notes: '',
  })

  useEffect(() => {
    fetchAttendance()
  }, [player.id, dateFrom, dateTo])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('player_attendance')
        .select('*')
        .eq('player_id', player.id)
        .eq('team_id', teamId)

      if (dateFrom) {
        query = query.gte('date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('date', dateTo)
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('event_time', { ascending: false })

      if (error) throw error
      setAttendance(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    } finally {
      setLoading(false)
    }
  }

  const handleNewClick = () => {
    setSelectedAttendance(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      status: 'jelen',
      training_type: 'edzés',
      event_time: '',
      notes: '',
    })
    setShowModal(true)
  }

  const handleEditClick = (att) => {
    setSelectedAttendance(att)
    setFormData({
      date: att.date,
      status: att.status,
      training_type: att.training_type || 'edzés',
      event_time: att.event_time || '',
      notes: att.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    try {
      const result = await saveAttendance({
        id: selectedAttendance?.id,
        data: selectedAttendance
          ? formData
          : { player_id: player.id, team_id: teamId, ...formData },
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
    if (!selectedAttendance) return
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a bejegyzést?',
      action: async () => {
        try {
          await deleteAttendance(selectedAttendance.id)

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <Panel>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-fg">Jelenlét történet</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Kezdő dátum"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="!w-auto"
            />
            <span className="text-sm text-muted" aria-hidden="true">-</span>
            <Input
              type="date"
              aria-label="Záró dátum"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="!w-auto"
            />
            {(dateFrom || dateTo) && (
              <IconButton
                icon={X}
                label="Szűrés törlése"
                size="sm"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
              />
            )}
          </div>
          {canEdit && (
            <Button variant="primary" icon={Plus} onClick={handleNewClick}>
              Új jelenlét
            </Button>
          )}
        </div>
      </div>

      {/* Attendance List */}
      <div className="space-y-2">
        {loading ? (
          <LoadingSpinner size="inline" />
        ) : attendance.length === 0 ? (
          <div className="py-12 text-center text-muted">
            <p>Még nincs jelenlét rögzítve</p>
          </div>
        ) : (
          attendance.map((att) => (
            <div
              key={att.id}
              className="rounded-[10px] bg-surface-2 p-3 transition-colors hover:bg-surface-3"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {/* Státusz és Dátum */}
                <div className="flex min-w-0 items-center gap-2 sm:min-w-[200px]">
                  <span
                    className={`h-3 w-3 flex-shrink-0 rounded-full ${getStatusColor(att.status)}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-bold text-fg">{formatDate(att.date)}</span>
                </div>

                {/* Információk */}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg">
                  {att.event_time && (
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                      {att.event_time.slice(0, 5)}
                    </span>
                  )}
                  {att.training_type && (
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <ClipboardList className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                      {att.training_type}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      className={`h-2 w-2 rounded-full ${getStatusColor(att.status)}`}
                      aria-hidden="true"
                    />
                    {getStatusLabel(att.status)}
                  </span>
                  {att.notes && (
                    <span
                      className="flex min-w-0 max-w-md items-center gap-1.5 text-muted"
                      title={att.notes}
                    >
                      <StickyNote className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{att.notes}</span>
                    </span>
                  )}
                </div>

                {/* Szerkesztés gomb */}
                {canEdit && (
                  <IconButton
                    icon={Pencil}
                    label="Szerkesztés"
                    size="sm"
                    onClick={() => handleEditClick(att)}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Attendance Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={selectedAttendance ? 'Jelenlét szerkesztése' : 'Új jelenlét'}
        size="sm"
        footer={
          <>
            {selectedAttendance && (
              <Button variant="danger" icon={Trash2} onClick={handleDelete}>
                Törlés
              </Button>
            )}
            <Button type="submit" form={ATTENDANCE_FORM_ID} variant="primary" icon={Save}>
              {selectedAttendance ? 'Frissítés' : 'Mentés'}
            </Button>
          </>
        }
      >
        <form id={ATTENDANCE_FORM_ID} onSubmit={handleSave} className="space-y-4">
          <Field label="Dátum *" htmlFor="att-date">
            <Input
              id="att-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </Field>

          <Field label="Státusz *" htmlFor="att-status">
            <Select
              id="att-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Edzés jellege" htmlFor="att-type">
            <Select
              id="att-type"
              value={formData.training_type}
              onChange={(e) => setFormData({ ...formData, training_type: e.target.value })}
            >
              {TRAINING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Időpont" htmlFor="att-time">
            <Input
              id="att-time"
              type="time"
              value={formData.event_time}
              onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
              placeholder="pl. 14:30"
            />
          </Field>

          <Field label="Megjegyzés" htmlFor="att-notes">
            <Textarea
              id="att-notes"
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
    </Panel>
  )
}
