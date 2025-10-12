import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Copy, Upload } from 'lucide-react'

export default function TrainingSessionModal({ 
  date, 
  session, 
  selectedTeam, 
  onClose, 
  onSave 
}) {
  const [templates, setTemplates] = useState([])
  const [locations, setLocations] = useState([])
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showNewLocationInput, setShowNewLocationInput] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  
  // Helper function to format date in local timezone
  const formatDateLocal = (date) => {
    if (!date) return new Date().toISOString().split('T')[0]
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const [formData, setFormData] = useState({
    date: session?.date || formatDateLocal(date),
    start_time: session?.start_time || '',
    end_time: session?.end_time || '',
    location: session?.location || '',
    type: session?.type || 'gym',
    template_id: session?.template_id || null,
    session_data: session?.session_data || {},
    notes: session?.notes || '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTemplates()
    fetchLocations()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('training_templates')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('name', { ascending: true })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('training_locations')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error
      setLocations(data || [])
      
      // Set default location if no location is set
      if (!formData.location && data && data.length > 0) {
        const defaultLocation = data.find(loc => loc.is_default)
        if (defaultLocation) {
          setFormData({ ...formData, location: defaultLocation.name })
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const handleAddNewLocation = async () => {
    if (!newLocationName.trim()) return

    try {
      const { data, error } = await supabase
        .from('training_locations')
        .insert([{
          team_id: selectedTeam.id,
          name: newLocationName.trim(),
        }])
        .select()

      if (error) throw error
      
      setFormData({ ...formData, location: newLocationName.trim() })
      setNewLocationName('')
      setShowNewLocationInput(false)
      fetchLocations()
    } catch (error) {
      console.error('Error adding location:', error)
      alert('Hiba történt a helyszín hozzáadása során!')
    }
  }

  const loadTemplate = (template) => {
    setFormData({
      ...formData,
      type: template.type,
      template_id: template.id,
      session_data: template.template_data,
    })
    setShowTemplateSelector(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Prepare data with null for empty time fields
      const dataToSave = {
        ...formData,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
      }

      if (session) {
        // Update
        const { error } = await supabase
          .from('training_sessions')
          .update(dataToSave)
          .eq('id', session.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('training_sessions')
          .insert([{
            ...dataToSave,
            team_id: selectedTeam.id,
          }])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving training session:', error)
      alert('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {session ? 'Edzés szerkesztése' : 'Új edzés hozzáadása'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Template Selector */}
        {!showTemplateSelector ? (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowTemplateSelector(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600/20 border border-primary-600/50 hover:bg-primary-600/30 text-primary-400 rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Sablon betöltése</span>
            </button>
          </div>
        ) : (
          <div className="mb-6 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Válassz sablont</h3>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="text-sm text-slate-400 hover:text-white"
              >
                Mégse
              </button>
            </div>
            
            {templates.length === 0 ? (
              <p className="text-sm text-slate-400">Nincs elérhető sablon</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => loadTemplate(template)}
                    className="w-full text-left px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-primary-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{template.name}</div>
                        <div className="text-xs text-slate-400">
                          {template.type === 'gym' ? '🏋️ Konditerem' : 
                           template.type === 'ball' ? '⚽ Labdás' : 
                           template.type === 'tactic' ? '🎯 Taktika' : '📝 Egyéb'}
                          {template.duration && ` • ${template.duration} perc`}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date and Times */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Dátum *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Kezdés (opcionális)
              </label>
              <input
                type="time"
                value={formData.start_time || ''}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="input-field w-full"
                placeholder="--:--"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Befejezés (opcionális)
              </label>
              <input
                type="time"
                value={formData.end_time || ''}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="input-field w-full"
                placeholder="--:--"
              />
            </div>
          </div>

          {/* Type and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Típus *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input-field w-full"
                required
              >
                <option value="gym">Konditerem</option>
                <option value="ball">Labdás edzés</option>
                <option value="tactic">Taktika & Technika</option>
                <option value="other">Egyéb</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Helyszín
              </label>
              {!showNewLocationInput ? (
                <div className="flex gap-2">
                  <select
                    value={formData.location}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowNewLocationInput(true)
                      } else {
                        setFormData({ ...formData, location: e.target.value })
                      }
                    }}
                    className="input-field flex-1"
                  >
                    <option value="">Válassz helyszínt...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name} {loc.is_default ? '⭐' : ''}
                      </option>
                    ))}
                    <option value="__new__">+ Új helyszín hozzáadása</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Új helyszín neve..."
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddNewLocation()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewLocation}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewLocationInput(false)
                      setNewLocationName('')
                    }}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Megjegyzések
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field w-full"
              rows="3"
              placeholder="Jegyzetek az edzésről..."
            />
          </div>

          {/* Template Info */}
          {formData.template_id && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Copy className="w-4 h-4" />
                <span>Sablon betöltve</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Mentés...' : 'Mentés'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
