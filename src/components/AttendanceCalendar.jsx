import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit, Trash2, X, Save } from 'lucide-react'

export default function AttendanceCalendar({ player, teamId }) {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState(null)
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
      // Convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        event_time: formData.event_time || null,
        notes: formData.notes || null,
        training_type: formData.training_type || null,
      }
      
      if (selectedAttendance) {
        // Update
        const { error } = await supabase
          .from('player_attendance')
          .update(cleanedData)
          .eq('id', selectedAttendance.id)
          
        if (error) throw error
        alert('✅ Jelenlét sikeresen frissítve!')
      } else {
        // Insert
        const { error } = await supabase
          .from('player_attendance')
          .insert({
            player_id: player.id,
            team_id: teamId,
            ...cleanedData,
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
    if (!selectedAttendance) return
    if (!confirm('Biztosan törölni szeretnéd ezt a bejegyzést?')) return
    
    try {
      const { error } = await supabase
        .from('player_attendance')
        .delete()
        .eq('id', selectedAttendance.id)
        
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Jelenlét történet</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              placeholder="Tól"
            />
            <span className="text-slate-400 text-sm">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              placeholder="Ig"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                title="Szűrés törlése"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={handleNewClick}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Új jelenlét
          </button>
        </div>
      </div>

      {/* Attendance List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-slate-400 mt-4">Betöltés...</p>
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>Még nincs jelenlét rögzítve</p>
          </div>
        ) : (
          attendance.map((att) => (
            <div
              key={att.id}
              className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-colors"
            >
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
                {/* Státusz és Dátum */}
                <div className="flex items-center gap-2 min-w-[200px]">
                  <div className={`w-3 h-3 ${getStatusColor(att.status)} rounded-full flex-shrink-0`}></div>
                  <span className="font-bold text-white text-sm">{formatDate(att.date)}</span>
                </div>

                {/* Információk */}
                <div className="flex items-center gap-4 text-sm text-slate-300 flex-wrap">
                  {att.event_time && (
                    <span className="whitespace-nowrap">🕐 {att.event_time.slice(0, 5)}</span>
                  )}
                  {att.training_type && (
                    <span className="whitespace-nowrap">📋 {att.training_type}</span>
                  )}
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className={`w-2 h-2 ${getStatusColor(att.status)} rounded-full`}></span>
                    {getStatusLabel(att.status)}
                  </span>
                  {att.notes && (
                    <span className="text-slate-400 truncate max-w-md" title={att.notes}>📝 {att.notes}</span>
                  )}
                </div>

                {/* Szerkesztés gomb */}
                <div className="flex items-center">
                  <button
                    onClick={() => handleEditClick(att)}
                    className="p-2 hover:bg-slate-500 rounded-lg transition-colors"
                    title="Szerkesztés"
                  >
                    <Edit className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Attendance Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {selectedAttendance ? 'Jelenlét szerkesztése' : 'Új jelenlét'}
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
                  Dátum *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                />
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
                {selectedAttendance && (
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
                  {selectedAttendance ? 'Frissítés' : 'Mentés'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
