import { Dumbbell, Edit2, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import Modal from '../../components/ui/Modal'
import StatusPill from '../../components/ui/StatusPill'

const CATEGORY_LABELS = {
  strength: 'Erő',
  cardio: 'Kardió',
  flexibility: 'Rugalmasság',
  player_params: 'Játékos paraméterek',
}

export default function ExerciseManagementModal({
  exercises,
  canEdit,
  openEditExercise,
  handleDeleteExercise,
  setShowExerciseManagementModal,
}) {
  const close = () => setShowExerciseManagementModal(false)

  return (
    <Modal
      open
      onClose={close}
      title="Gyakorlatok kezelése"
      size="xl"
      footer={<Button onClick={close}>Bezárás</Button>}
    >
      <p className="mb-4 text-sm text-muted">Szerkeszd vagy töröld a gyakorlatokat</p>

      {exercises.length === 0 ? (
        <div className="py-12 text-center">
          <Dumbbell className="mx-auto mb-4 h-14 w-14 text-subtle" aria-hidden="true" />
          <p className="text-muted">Még nincs gyakorlat létrehozva</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-accent"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-semibold text-fg">{exercise.name}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusPill>{CATEGORY_LABELS[exercise.category] ?? 'Egyéb'}</StatusPill>
                    <span className="rounded bg-accent-soft px-2 py-1 font-mono text-xs font-semibold text-accent">
                      {exercise.unit}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={Edit2}
                      label="Szerkesztés"
                      size="sm"
                      onClick={() => openEditExercise(exercise)}
                    />
                    <IconButton
                      icon={Trash2}
                      label="Törlés"
                      size="sm"
                      onClick={() => handleDeleteExercise(exercise.id)}
                    />
                  </div>
                )}
              </div>
              {exercise.description && (
                <p className="mt-2 text-sm text-muted">{exercise.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
