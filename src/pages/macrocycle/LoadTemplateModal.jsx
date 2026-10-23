import { Trash2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'

export default function LoadTemplateModal({ templates, onLoad, onDelete, onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Sablon betöltése"
      size="lg"
      footer={<Button onClick={onClose}>Bezárás</Button>}
    >
      <p className="mb-4 text-sm text-fg">
        Válassz egy sablont a jelenlegi szezonra való alkalmazáshoz.
      </p>

      {templates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted">Még nincs mentett sablon.</p>
          <p className="text-muted text-sm mt-2">Hozz létre egy tervezést és mentsd el sablonként!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between gap-3 rounded-[9px] border border-line bg-surface-2 p-4"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-fg">{template.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {template.week_count} hét • {new Date(template.created_at).toLocaleDateString('hu-HU')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => onLoad(template)}>
                  Betöltés
                </Button>
                <IconButton
                  icon={Trash2}
                  label="Sablon törlése"
                  onClick={() => onDelete(template.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
