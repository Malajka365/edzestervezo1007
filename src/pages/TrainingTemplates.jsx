import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import {
  Plus,
  Search,
  Dumbbell,
  Circle,
  Target,
  Trophy,
  Edit,
  Trash2,
  Copy,
  X,
} from 'lucide-react'
import GymTemplateEditor from '../components/GymTemplateEditor'
import BallTemplateEditor from '../components/BallTemplateEditor'
import TacticTemplateEditor from '../components/TacticTemplateEditor'

export default function TrainingTemplates() {
  const { selectedTeam } = useTeams()
  const [templates, setTemplates] = useState([])
  const [filteredTemplates, setFilteredTemplates] = useState([])
  const [selectedType, setSelectedType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [loading, setLoading] = useState(false)

  const templateTypes = [
    { value: 'all', label: 'Összes', icon: Trophy, color: 'bg-slate-600' },
    { value: 'gym', label: 'Konditerem', icon: Dumbbell, color: 'bg-purple-600' },
    { value: 'ball', label: 'Labdás', icon: Circle, color: 'bg-blue-600' },
    { value: 'tactic', label: 'Taktika & Technika', icon: Target, color: 'bg-green-600' },
    { value: 'other', label: 'Egyéb', icon: Trophy, color: 'bg-orange-600' },
  ]

  useEffect(() => {
    if (selectedTeam) {
      fetchTemplates()
    }
  }, [selectedTeam])

  useEffect(() => {
    filterTemplates()
  }, [templates, selectedType, searchQuery])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('training_templates')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType)
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredTemplates(filtered)
  }

  const deleteTemplate = async (id) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a sablont?')) return

    try {
      const { error } = await supabase
        .from('training_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Hiba történt a törlés során!')
    }
  }

  const duplicateTemplate = async (template) => {
    try {
      const { error } = await supabase
        .from('training_templates')
        .insert([{
          team_id: selectedTeam.id,
          name: `${template.name} (másolat)`,
          type: template.type,
          category: template.category,
          duration: template.duration,
          template_data: template.template_data,
        }])

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
      alert('Hiba történt a másolás során!')
    }
  }

  const getTypeConfig = (type) => {
    return templateTypes.find(t => t.value === type) || templateTypes[0]
  }

  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Válassz ki egy csapatot a folytatáshoz</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Edzéssablonok</h1>
          <p className="text-slate-400 mt-1">
            {selectedTeam.name} - Újrafelhasználható edzésprogramok
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTemplate(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Új sablon</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Keresés sablonok között..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {templateTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    selectedType === type.value
                      ? `${type.color} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="card text-center py-12">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Nincs még sablon
          </h3>
          <p className="text-slate-400 mb-4">
            Hozz létre az első újrafelhasználható edzésprogramot!
          </p>
          <button
            onClick={() => {
              setEditingTemplate(null)
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Első sablon létrehozása</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const typeConfig = getTypeConfig(template.type)
            const Icon = typeConfig.icon

            return (
              <div
                key={template.id}
                className="card hover:border-primary-500 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${typeConfig.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTemplate(template)
                        setShowModal(true)
                      }}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Szerkesztés"
                    >
                      <Edit className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => duplicateTemplate(template)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Duplikálás"
                    >
                      <Copy className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                      title="Törlés"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">
                  {template.name}
                </h3>

                <div className="flex items-center gap-4 text-sm text-slate-400">
                  {template.duration && (
                    <span>{template.duration} perc</span>
                  )}
                  <span className="text-slate-600">•</span>
                  <span>{typeConfig.label}</span>
                </div>

                {template.category && (
                  <div className="mt-3">
                    <span className="inline-block px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded-full">
                      {template.category}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <TemplateModal
          template={editingTemplate}
          selectedTeam={selectedTeam}
          onClose={() => {
            setShowModal(false)
            setEditingTemplate(null)
          }}
          onSave={() => {
            setShowModal(false)
            setEditingTemplate(null)
            fetchTemplates()
          }}
        />
      )}
    </div>
  )
}

// Template Modal Component
function TemplateModal({ template, selectedTeam, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'gym',
    category: template?.category || '',
    duration: template?.duration || 60,
    template_data: template?.template_data || {},
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (template) {
        // Update
        const { error } = await supabase
          .from('training_templates')
          .update(formData)
          .eq('id', template.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('training_templates')
          .insert([{
            ...formData,
            team_id: selectedTeam.id,
          }])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {template ? 'Sablon szerkesztése' : 'Új sablon létrehozása'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sablon neve *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field w-full"
              placeholder="pl. Erő 1. fázis"
              required
            />
          </div>

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
              Kategória
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-field w-full"
              placeholder="pl. Felső test, Támadás, stb."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Időtartam (perc)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="input-field w-full"
              min="1"
            />
          </div>

          {/* Type-specific editors */}
          <div className="border-t border-slate-600 pt-6">
            {formData.type === 'gym' && (
              <GymTemplateEditor
                templateData={formData.template_data}
                onChange={(data) => setFormData({ ...formData, template_data: data })}
              />
            )}

            {formData.type === 'ball' && (
              <BallTemplateEditor
                templateData={formData.template_data}
                onChange={(data) => setFormData({ ...formData, template_data: data })}
              />
            )}

            {formData.type === 'tactic' && (
              <TacticTemplateEditor
                templateData={formData.template_data}
                onChange={(data) => setFormData({ ...formData, template_data: data })}
              />
            )}

            {formData.type === 'other' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Részletek
                </label>
                <textarea
                  value={formData.template_data.notes || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    template_data: { ...formData.template_data, notes: e.target.value } 
                  })}
                  className="input-field w-full"
                  rows="5"
                  placeholder="Edzés részletei, feladatok, megjegyzések..."
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6">
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
