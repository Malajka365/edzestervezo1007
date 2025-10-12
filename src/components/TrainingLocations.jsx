import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MapPin, Plus, Edit2, Trash2, X, Check, Star } from 'lucide-react'

export default function TrainingLocations({ teamId }) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
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
      alert('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a helyszínt?')) return

    try {
      const { error } = await supabase
        .from('training_locations')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchLocations()
    } catch (error) {
      console.error('Error deleting location:', error)
      alert('Hiba történt a törlés során!')
    }
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
      alert('Hiba történt!')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Edzés Helyszínek</h3>
          <span className="text-sm text-slate-400">({locations.length})</span>
        </div>
        <button
          onClick={() => {
            setEditingLocation(null)
            setFormData({ name: '', address: '', notes: '', is_default: false })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Új Helyszín</span>
        </button>
      </div>

      {/* Locations List */}
      {loading && locations.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p>Betöltés...</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Még nincs helyszín hozzáadva</p>
          <p className="text-sm mt-1">Kattints az "Új Helyszín" gombra!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`p-4 rounded-lg border transition-all ${
                location.is_default
                  ? 'bg-primary-500/10 border-primary-500/50'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <MapPin className={`w-4 h-4 flex-shrink-0 ${location.is_default ? 'text-primary-400' : 'text-slate-400'}`} />
                  <h4 className="font-semibold text-white">{location.name}</h4>
                  {location.is_default && (
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!location.is_default && (
                    <button
                      onClick={() => handleSetDefault(location.id)}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                      title="Alapértelmezettnek jelöl"
                    >
                      <Star className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(location)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              
              {location.address && (
                <p className="text-sm text-slate-400 mb-1">{location.address}</p>
              )}
              
              {location.notes && (
                <p className="text-xs text-slate-500 mt-2">{location.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingLocation ? 'Helyszín Szerkesztése' : 'Új Helyszín'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingLocation(null)
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Név *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="pl. Sportcsarnok"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cím
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field w-full"
                  placeholder="pl. Budapest, Fő utca 1."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Megjegyzések
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field w-full"
                  rows="3"
                  placeholder="További információk..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_default" className="text-sm text-slate-300">
                  Alapértelmezett helyszín
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingLocation(null)
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mentés...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Mentés</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
