import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'

export default function EditSeasonModal({ editSeason, setEditSeason, onSubmit, onClose, loading }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Szezon szerkesztése"
      footer={
        <>
          <Button onClick={onClose}>Mégse</Button>
          <Button type="submit" form="edit-season-form" variant="primary" disabled={loading}>
            {loading ? 'Frissítés...' : 'Frissítés'}
          </Button>
        </>
      }
    >
      <form
        id="edit-season-form"
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="space-y-4"
      >
        <Field label="Szezon neve" htmlFor="edit-season-name">
          <Input
            id="edit-season-name"
            type="text"
            value={editSeason.name}
            onChange={(e) => setEditSeason({ ...editSeason, name: e.target.value })}
            placeholder="pl. 2024/2025 Őszi Szezon"
            required
          />
        </Field>

        <Field label="Kezdő dátum" htmlFor="edit-season-start">
          <Input
            id="edit-season-start"
            type="date"
            value={editSeason.start_date}
            onChange={(e) => setEditSeason({ ...editSeason, start_date: e.target.value })}
            required
          />
        </Field>

        <Field label="Befejező dátum" htmlFor="edit-season-end">
          <Input
            id="edit-season-end"
            type="date"
            value={editSeason.end_date}
            onChange={(e) => setEditSeason({ ...editSeason, end_date: e.target.value })}
            required
          />
        </Field>
      </form>
    </Modal>
  )
}
