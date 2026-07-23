import { supabase } from './supabase'

// Single source of truth for attendance status definitions (value, label, dot color).
export const ATTENDANCE_STATUSES = [
  { value: 'jelen', label: 'Jelen', color: 'bg-green-500' },
  { value: 'hiányzik', label: 'Hiányzik', color: 'bg-red-500' },
  { value: 'beteg', label: 'Beteg', color: 'bg-yellow-500' },
  { value: 'sérült', label: 'Sérült', color: 'bg-orange-500' },
  { value: 'egyéb', label: 'Egyéb', color: 'bg-gray-500' },
]

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
  return found ? found.color : 'bg-slate-600'
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
