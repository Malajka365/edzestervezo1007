import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import {
  Plus,
  Search,
  LayoutGrid,
  ClipboardList,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react'
import GymTemplateEditor from '../components/GymTemplateEditor'
import BallTemplateEditor from '../components/BallTemplateEditor'
import TacticTemplateEditor from '../components/TacticTemplateEditor'
import Button from '../components/ui/Button'
import Chip from '../components/ui/Chip'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import IconButton from '../components/ui/IconButton'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import Skeleton from '../components/ui/Skeleton'
import { SESSION_TYPES } from './calendar/sessionTypes'
import toast from 'react-hot-toast'

// Sablontípusok: a színek a közös edzéstípus tokenekből (t-*) jönnek.
const TEMPLATE_TYPES = [
  { value: 'all', label: 'Összes', icon: LayoutGrid, color: 'bg-surface-3 text-fg' },
  { value: 'gym', label: 'Konditerem', icon: SESSION_TYPES.gym.icon, color: SESSION_TYPES.gym.solid },
  { value: 'ball', label: 'Labdás', icon: SESSION_TYPES.ball.icon, color: SESSION_TYPES.ball.solid },
  { value: 'tactic', label: 'Taktika & Technika', icon: SESSION_TYPES.tactic.icon, color: SESSION_TYPES.tactic.solid },
  { value: 'other', label: 'Egyéb', icon: SESSION_TYPES.other.icon, color: SESSION_TYPES.other.solid },
]

export default function TrainingTemplates() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'templates')
  const [templates, setTemplates] = useState([])
  const [filteredTemplates, setFilteredTemplates] = useState([])
  const [selectedType, setSelectedType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmState, setConfirmState] = useState(null)

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
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
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

  const deleteTemplate = (id) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a sablont?',
      action: async () => {
        try {
          const { error } = await supabase
            .from('training_templates')
            .delete()
            .eq('id', id)

          if (error) throw error
          fetchTemplates()
        } catch (error) {
          console.error('Error deleting template:', error)
          toast.error('Hiba történt a törlés során!')
        }
      },
    })
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
      toast.error('Hiba történt a másolás során!')
    }
  }

  const getTypeConfig = (type) => {
    return TEMPLATE_TYPES.find(t => t.value === type) || TEMPLATE_TYPES[0]
  }

  const openNewTemplate = () => {
    setEditingTemplate(null)
    setShowModal(true)
  }

  if (!selectedTeam) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Edzéssablonok" description="Újrafelhasználható edzésprogramok" />
        <EmptyState
          icon={ClipboardList}
          title="Nincs kiválasztott csapat"
          description="Válassz ki egy csapatot a folytatáshoz."
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Edzéssablonok"
        description={`${filteredTemplates.length} / ${templates.length} sablon - Újrafelhasználható edzésprogramok`}
        actions={
          canEdit && (
            <Button variant="primary" icon={Plus} onClick={openNewTemplate}>
              Új sablon
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {/* Filters */}
        <Panel>
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input
                  type="text"
                  aria-label="Keresés sablonok között"
                  placeholder="Keresés sablonok között..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_TYPES.map((type) => (
                <Chip
                  key={type.value}
                  icon={type.icon}
                  selected={selectedType === type.value}
                  onClick={() => setSelectedType(type.value)}
                >
                  {type.label}
                </Chip>
              ))}
            </div>
          </div>
        </Panel>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nincs még sablon"
            description="Hozz létre az első újrafelhasználható edzésprogramot!"
            actionLabel={canEdit ? 'Első sablon létrehozása' : undefined}
            onAction={canEdit ? openNewTemplate : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => {
              const typeConfig = getTypeConfig(template.type)
              const Icon = typeConfig.icon

              return (
                <Panel key={template.id} className="transition-all hover:border-accent">
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${typeConfig.color}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon={Pencil}
                          label="Szerkesztés"
                          onClick={() => {
                            setEditingTemplate(template)
                            setShowModal(true)
                          }}
                        />
                        <IconButton
                          icon={Copy}
                          label="Duplikálás"
                          onClick={() => duplicateTemplate(template)}
                        />
                        <IconButton
                          icon={Trash2}
                          label="Törlés"
                          onClick={() => deleteTemplate(template.id)}
                          className="hover:!bg-bad-soft hover:!text-bad"
                        />
                      </div>
                    )}
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-fg">
                    {template.name}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-muted">
                    {template.duration && (
                      <span>{template.duration} perc</span>
                    )}
                    <span className="text-subtle">•</span>
                    <span>{typeConfig.label}</span>
                  </div>

                  {template.category && (
                    <div className="mt-3">
                      <span className="inline-block rounded-full bg-surface-2 px-3 py-1 text-xs text-fg">
                        {template.category}
                      </span>
                    </div>
                  )}
                </Panel>
              )
            })}
          </div>
        )}
      </div>

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
      toast.error('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={template ? 'Sablon szerkesztése' : 'Új sablon létrehozása'}
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Mégse</Button>
          <Button type="submit" form="template-form" variant="primary" loading={loading}>
            {loading ? 'Mentés...' : 'Mentés'}
          </Button>
        </>
      }
    >
      <form id="template-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Sablon neve *" htmlFor="template-name">
          <Input
            id="template-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="pl. Erő 1. fázis"
            required
          />
        </Field>

        <Field label="Típus *" htmlFor="template-type">
          <Select
            id="template-type"
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

        <Field label="Kategória" htmlFor="template-category">
          <Input
            id="template-category"
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="pl. Felső test, Támadás, stb."
          />
        </Field>

        <Field label="Időtartam (perc)" htmlFor="template-duration">
          <Input
            id="template-duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            min="1"
          />
        </Field>

        {/* Type-specific editors */}
        <div className="border-t border-line pt-6">
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
            <Field label="Részletek" htmlFor="template-notes">
              <Textarea
                id="template-notes"
                value={formData.template_data.notes || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  template_data: { ...formData.template_data, notes: e.target.value }
                })}
                rows="5"
                placeholder="Edzés részletei, feladatok, megjegyzések..."
              />
            </Field>
          )}
        </div>
      </form>
    </Modal>
  )
}
