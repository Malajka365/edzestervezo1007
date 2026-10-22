import { supabase } from './supabase'

// Single source of truth for attendance status definitions (value, label, dot color,
// chip color = háttér + olvasható szöveg). Mind design-token osztály.
export const ATTENDANCE_STATUSES = [
  { value: 'jelen', label: 'Jelen', color: 'bg-ok', chip: 'bg-ok text-on-status' },
  { value: 'hiányzik', label: 'Hiányzik', color: 'bg-bad', chip: 'bg-bad text-on-status' },
  { value: 'beteg', label: 'Beteg', color: 'bg-warn', chip: 'bg-warn text-on-status' },
  { value: 'sérült', label: 'Sérült', color: 'bg-accent', chip: 'bg-accent text-accent-fg' },
  { value: 'egyéb', label: 'Egyéb', color: 'bg-muted', chip: 'bg-muted text-bg' },
]

const FALLBACK_STATUS_COLOR = 'bg-surface-3'
const FALLBACK_STATUS_CHIP = 'bg-surface-3 text-fg'

// Training type options shown in the attendance modal.
export const TRAINING_TYPES = [
  { value: 'edzés', label: 'Edzés' },
  { value: 'mérkőzés', label: 'Mérkőzés' },
  { value: 'regeneráció', label: 'Regeneráció' },
  { value: 'orvosi', label: 'Orvosi' },
  { value: 'egyéb', label: 'Egyéb' },
]

export const getStatusColor = (status) => {
  const found = ATTENDANCE_STATUSES.find((s) => s.value === status)
  return found ? found.color : FALLBACK_STATUS_COLOR
}

// Kitöltött címke (naptár cella, avatar): háttér + hozzá illő szövegszín.
export const getStatusChipClass = (status) => {
  const found = ATTENDANCE_STATUSES.find((s) => s.value === status)
  return found ? found.chip : FALLBACK_STATUS_CHIP
}

export const getStatusLabel = (status) => {
  const found = ATTENDANCE_STATUSES.find((s) => s.value === status)
  return found ? found.label : status
}

// Convert empty strings to null for optional fields before persisting.
export const cleanAttendanceData = (data) => ({
  ...data,
  event_time: data.event_time || null,
  notes: data.notes || null,
  training_type: data.training_type || null,
})

// Insert (when id is falsy) or update an attendance record in `player_attendance`.
// `data` is the full record to save; optional fields are cleaned automatically.
// Returns 'updated' or 'inserted'. Throws on Supabase error.
export const saveAttendance = async ({ id, data }) => {
  const cleanedData = cleanAttendanceData(data)

  if (id) {
    const { error } = await supabase
      .from('player_attendance')
      .update(cleanedData)
      .eq('id', id)

    if (error) throw error
    return 'updated'
  }

  const { error } = await supabase
    .from('player_attendance')
    .insert(cleanedData)

  if (error) throw error
  return 'inserted'
}

// Delete an attendance record by id. Throws on Supabase error.
export const deleteAttendance = async (id) => {
  const { error } = await supabase
    .from('player_attendance')
    .delete()
    .eq('id', id)

  if (error) throw error
}
