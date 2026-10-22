import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MapPin, Plus, Edit2, Trash2, Check, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmDialog from './ui/ConfirmDialog'
import Button from './ui/Button'
import IconButton from './ui/IconButton'
import Modal from './ui/Modal'
import EmptyState from './ui/EmptyState'
import { Field, Input, Textarea } from './ui/Field'
import LoadingSpinner from './LoadingSpinner'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'

const LOCATION_FORM_ID = 'location-form'

export default function TrainingLocations({ teamId }) {
  const { currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'players')
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    notes: '',
    is_default: false,
  })

  useEffect(() => {
    if (teamId) {
      fetchLocations()
    }
  }, [teamId])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('training_locations')
        .select('*')
        .eq('team_id', teamId)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingLocation) {
        // Update
        const { error } = await supabase
          .from('training_locations')
          .update(formData)
          .eq('id', editingLocation.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('training_locations')
          .insert([{ ...formData, team_id: teamId }])

        if (error) throw error
      }

      setShowModal(false)
      setEditingLocation(null)
      setFormData({ name: '', address: '', notes: '', is_default: false })
      fetchLocations()
    } catch (error) {
      console.error('Error saving location:', error)
      toast.error('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a helyszínt?',
      action: async () => {
        try {
          const { error } = await supabase
            .from('training_locations')
            .delete()
            .eq('id', id)

          if (error) throw error
          fetchLocations()
        } catch (error) {
          console.error('Error deleting location:', error)
          toast.error('Hiba történt a törlés során!')
        }
      },
    })
  }

  const handleEdit = (location) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      address: location.address || '',
      notes: location.notes || '',
      is_default: location.is_default || false,
    })
    setShowModal(true)
  }

  const handleSetDefault = async (id) => {
    try {
      // First, remove default from all locations
      await supabase
        .from('training_locations')
        .update({ is_default: false })
        .eq('team_id', teamId)

      // Then set the selected one as default
      const { error } = await supabase
        .from('training_locations')
        .update({ is_default: true })
        .eq('id', id)

      if (error) throw error
      fetchLocations()
    } catch (error) {
      console.error('Error setting default location:', error)
      toast.error('Hiba történt!')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingLocation(null)
  }

  const openCreate = () => {
    setEditingLocation(null)
    setFormData({ name: '', address: '', notes: '', is_default: false })
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-fg">Edzés helyszínek</h3>
          <span className="text-sm text-muted">({locations.length})</span>
        </div>
        {canEdit && (
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Új helyszín
          </Button>
        )}
      </div>

      {/* Locations List */}
      {loading && locations.length === 0 ? (
        <LoadingSpinner size="inline" />
      ) : locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Még nincs helyszín hozzáadva"
          description={canEdit ? 'Kattints az "Új helyszín" gombra!' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`rounded-[10px] border p-4 transition-colors ${
                location.is_default
                  ? 'border-accent/50 bg-accent-soft'
                  : 'border-line bg-surface'
              }`}
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <MapPin
                    className={`h-4 w-4 flex-shrink-0 ${location.is_default ? 'text-accent' : 'text-muted'}`}
                    aria-hidden="true"
                  />
                  <h4 className="font-semibold text-fg">{location.name}</h4>
                  {location.is_default && (
                    <Star
                      className="h-4 w-4 fill-current text-warn"
                      aria-label="Alapértelmezett helyszín"
                    />
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    {!location.is_default && (
                      <IconButton
                        icon={Star}
                        label="Alapértelmezettnek jelöl"
                        size="sm"
                        onClick={() => handleSetDefault(location.id)}
                      />
                    )}
                    <IconButton
                      icon={Edit2}
                      label="Helyszín szerkesztése"
                      size="sm"
                      onClick={() => handleEdit(location)}
                    />
                    <IconButton
                      icon={Trash2}
                      label="Helyszín törlése"
                      size="sm"
                      className="text-bad hover:bg-bad-soft hover:text-bad"
                      onClick={() => handleDelete(location.id)}
                    />
                  </div>
                )}
              </div>

              {location.address && <p className="mb-1 text-sm text-muted">{location.address}</p>}

              {location.notes && <p className="mt-2 text-xs text-muted">{location.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingLocation ? 'Helyszín szerkesztése' : 'Új helyszín'}
        size="sm"
        footer={
          <>
            <Button onClick={closeModal}>Mégse</Button>
            <Button
              type="submit"
              form={LOCATION_FORM_ID}
              variant="primary"
              icon={Check}
              loading={loading}
            >
              Mentés
            </Button>
          </>
        }
      >
        <form id={LOCATION_FORM_ID} onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Név *" htmlFor="location-name">
            <Input
              id="location-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="pl. Sportcsarnok"
              required
            />
          </Field>

          <Field label="Cím" htmlFor="location-address">
            <Input
              id="location-address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="pl. Budapest, Fő utca 1."
            />
          </Field>

          <Field label="Megjegyzések" htmlFor="location-notes">
            <Textarea
              id="location-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="További információk..."
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="h-4 w-4 rounded border-line-strong bg-surface-2 text-accent focus:ring-accent"
            />
            <label htmlFor="is_default" className="text-sm text-fg">
              Alapértelmezett helyszín
            </label>
          </div>
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
