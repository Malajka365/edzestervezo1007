import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Check, Copy, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from './ui/Button'
import IconButton from './ui/IconButton'
import Modal from './ui/Modal'
import { Field, Input, Select, Textarea } from './ui/Field'
import { getSessionType } from '../pages/calendar/sessionTypes'

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
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
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
      toast.error('Hiba történt a helyszín hozzáadása során!')
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
      toast.error('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={session ? 'Edzés szerkesztése' : 'Új edzés hozzáadása'}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Mégse</Button>
          <Button type="submit" form="training-session-form" variant="primary" loading={loading}>
            {loading ? 'Mentés...' : 'Mentés'}
          </Button>
        </>
      }
    >
      {/* Template Selector */}
      {!showTemplateSelector ? (
        <div className="mb-4">
          <Button
            icon={Upload}
            onClick={() => setShowTemplateSelector(true)}
            className="w-full"
          >
            Sablon betöltése
          </Button>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-line bg-surface-2/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Válassz sablont</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowTemplateSelector(false)}>
              Mégse
            </Button>
          </div>

          {templates.length === 0 ? (
            <p className="text-sm text-muted">Nincs elérhető sablon</p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {templates.map((template) => {
                const templateType = getSessionType(template.type)
                const TypeIcon = templateType.icon

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => loadTemplate(template)}
                    className="w-full rounded-lg bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-accent" aria-hidden="true" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-fg">{template.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <TypeIcon className="h-3 w-3" aria-hidden="true" />
                          {templateType.label}
                          {template.duration && ` • ${template.duration} perc`}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <form id="training-session-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Date and Times */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Dátum *" htmlFor="session-date">
            <Input
              id="session-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </Field>

          <Field label="Kezdés (opcionális)" htmlFor="session-start">
            <Input
              id="session-start"
              type="time"
              value={formData.start_time || ''}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              placeholder="--:--"
            />
          </Field>

          <Field label="Befejezés (opcionális)" htmlFor="session-end">
            <Input
              id="session-end"
              type="time"
              value={formData.end_time || ''}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              placeholder="--:--"
            />
          </Field>
        </div>

        {/* Type and Location */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Típus *" htmlFor="session-type">
            <Select
              id="session-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              <option value="gym">Konditerem</option>
              <option value="ball">Labdás edzés</option>
              <option value="tactic">Taktika & Technika</option>
              <option value="other">Egyéb</option>
            </Select>
          </Field>

          <Field label="Helyszín" htmlFor="session-location">
            {!showNewLocationInput ? (
              <Select
                id="session-location"
                value={formData.location}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewLocationInput(true)
                  } else {
                    setFormData({ ...formData, location: e.target.value })
                  }
                }}
              >
                <option value="">Válassz helyszínt...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}{loc.is_default ? ' (alapértelmezett)' : ''}
                  </option>
                ))}
                <option value="__new__">+ Új helyszín hozzáadása</option>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="session-location"
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="flex-1"
                  placeholder="Új helyszín neve..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddNewLocation()
                    }
                  }}
                />
                <IconButton
                  icon={Check}
                  label="Helyszín hozzáadása"
                  onClick={handleAddNewLocation}
                  className="flex-shrink-0 !bg-ok-soft !text-ok"
                />
                <IconButton
                  icon={X}
                  label="Mégse"
                  onClick={() => {
                    setShowNewLocationInput(false)
                    setNewLocationName('')
                  }}
                  className="flex-shrink-0"
                />
              </div>
            )}
          </Field>
        </div>

        {/* Notes */}
        <Field label="Megjegyzések" htmlFor="session-notes">
          <Textarea
            id="session-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows="3"
            placeholder="Jegyzetek az edzésről..."
          />
        </Field>

        {/* Template Info */}
        {formData.template_id && (
          <div className="rounded-lg border border-ok/30 bg-ok-soft p-3">
            <div className="flex items-center gap-2 text-sm text-ok">
              <Copy className="h-4 w-4" aria-hidden="true" />
              <span>Sablon betöltve</span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
