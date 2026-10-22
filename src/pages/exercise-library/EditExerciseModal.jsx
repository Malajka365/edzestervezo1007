import { X, Plus } from 'lucide-react'
import { MUSCLE_GROUPS, MODALITIES } from '../../lib/exerciseTaxonomy'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import MediaUpload from './MediaUpload'
import ChipMultiSelect from './ChipMultiSelect'
import MusclePicker from './MusclePicker'

export default function EditExerciseModal({
  setShowEditModal,
  editingExercise,
  setEditingExercise,
  updateExercise,
  loading,
  equipmentTypes,
  muscles,
  detailMuscles,
  setDetailMuscles,
}) {
  const close = () => {
    setShowEditModal(false)
    setEditingExercise(null)
  }

  return (
    <Modal
      open
      onClose={close}
      title="Gyakorlat szerkesztése"
      size="lg"
      footer={
        <>
          <Button onClick={close}>Mégse</Button>
          <Button
            variant="primary"
            onClick={updateExercise}
            disabled={loading || !editingExercise.name.trim()}
          >
            {loading ? 'Mentés...' : 'Mentés'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Name (HU) */}
        <Field label="Gyakorlat neve (magyar) *" htmlFor="ex-name">
          <Input
            id="ex-name"
            type="text"
            value={editingExercise.name}
            onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
          />
        </Field>

        {/* Name (EN) */}
        <Field label="Angol név" htmlFor="ex-name-en">
          <Input
            id="ex-name-en"
            type="text"
            value={editingExercise.name_en || ''}
            onChange={(e) => setEditingExercise({ ...editingExercise, name_en: e.target.value })}
            placeholder="pl. Bench Press"
          />
        </Field>

        {/* Muscle Group & Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Izomcsoport" htmlFor="ex-muscle-group">
            <Select
              id="ex-muscle-group"
              value={editingExercise.muscle_group}
              onChange={(e) => setEditingExercise({ ...editingExercise, muscle_group: e.target.value })}
            >
              {MUSCLE_GROUPS.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Nehézség" htmlFor="ex-difficulty">
            <Select
              id="ex-difficulty"
              value={editingExercise.difficulty}
              onChange={(e) => setEditingExercise({ ...editingExercise, difficulty: e.target.value })}
            >
              <option value="beginner">Kezdő</option>
              <option value="intermediate">Haladó</option>
              <option value="advanced">Profi</option>
            </Select>
          </Field>
        </div>

        {/* Modality & Type */}
        <Field label="Modalitás" htmlFor="ex-modality">
          <Select
            id="ex-modality"
            value={editingExercise.modality || 'erosites'}
            onChange={(e) => setEditingExercise({ ...editingExercise, modality: e.target.value })}
          >
            {MODALITIES.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </Field>

        {/* GIF / media */}
        <MediaUpload
          value={editingExercise.gif_path}
          onChange={(path) => setEditingExercise({ ...editingExercise, gif_path: path })}
          slugBase={editingExercise.name_en || editingExercise.name}
        />

        {/* Description */}
        <Field label="Leírás" htmlFor="ex-description">
          <Textarea
            id="ex-description"
            value={editingExercise.description}
            onChange={(e) => setEditingExercise({ ...editingExercise, description: e.target.value })}
            rows="3"
          />
        </Field>

        {/* Equipment */}
        <Field label="Szükséges eszközök" htmlFor="ex-equipment">
          <ChipMultiSelect
            id="ex-equipment"
            options={(equipmentTypes || []).map((e) => ({ value: e.code, label: e.name_hu }))}
            value={editingExercise.equipment}
            onChange={(v) => setEditingExercise({ ...editingExercise, equipment: v })}
            placeholder="Eszköz hozzáadása..."
          />
        </Field>

        {/* Instructions */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">Végrehajtás (lépések)</p>
          <div className="space-y-2">
            {editingExercise.instructions.map((instruction, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-accent text-accent-fg rounded-full flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </span>
                <Input
                  type="text"
                  value={instruction}
                  onChange={(e) => {
                    const newInstructions = [...editingExercise.instructions]
                    newInstructions[idx] = e.target.value
                    setEditingExercise({ ...editingExercise, instructions: newInstructions })
                  }}
                  aria-label={`${idx + 1}. lépés`}
                  placeholder={`${idx + 1}. lépés`}
                />
                <IconButton
                  icon={X}
                  label={`${idx + 1}. lépés törlése`}
                  onClick={() => {
                    const newInstructions = editingExercise.instructions.filter((_, i) => i !== idx)
                    setEditingExercise({ ...editingExercise, instructions: newInstructions })
                  }}
                  className="flex-shrink-0"
                />
              </div>
            ))}
            <Button
              icon={Plus}
              className="w-full"
              onClick={() => {
                setEditingExercise({
                  ...editingExercise,
                  instructions: [...editingExercise.instructions, '']
                })
              }}
            >
              Lépés hozzáadása
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">Tippek</p>
          <div className="space-y-2">
            {editingExercise.tips.map((tip, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 text-center text-warn" aria-hidden="true">•</span>
                <Input
                  type="text"
                  value={tip}
                  onChange={(e) => {
                    const newTips = [...editingExercise.tips]
                    newTips[idx] = e.target.value
                    setEditingExercise({ ...editingExercise, tips: newTips })
                  }}
                  aria-label={`${idx + 1}. tipp`}
                  placeholder="Tipp..."
                />
                <IconButton
                  icon={X}
                  label={`${idx + 1}. tipp törlése`}
                  onClick={() => {
                    const newTips = editingExercise.tips.filter((_, i) => i !== idx)
                    setEditingExercise({ ...editingExercise, tips: newTips })
                  }}
                  className="flex-shrink-0"
                />
              </div>
            ))}
            <Button
              icon={Plus}
              className="w-full"
              onClick={() => {
                setEditingExercise({
                  ...editingExercise,
                  tips: [...editingExercise.tips, '']
                })
              }}
            >
              Tipp hozzáadása
            </Button>
          </div>
        </div>

        {/* Secondary Muscles */}
        <Field label="Másodlagos izomcsoportok" htmlFor="ex-secondary-muscles">
          <ChipMultiSelect
            id="ex-secondary-muscles"
            options={MUSCLE_GROUPS.map((g) => ({ value: g.id, label: g.name }))}
            value={editingExercise.secondary_muscles}
            onChange={(v) => setEditingExercise({ ...editingExercise, secondary_muscles: v })}
            placeholder="Csoport hozzáadása..."
          />
        </Field>

        {/* Detail Muscles */}
        <MusclePicker muscles={muscles || []} value={detailMuscles} onChange={setDetailMuscles} />
      </div>
    </Modal>
  )
}
