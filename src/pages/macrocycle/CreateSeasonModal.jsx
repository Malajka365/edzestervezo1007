import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'

export default function CreateSeasonModal({ newSeason, setNewSeason, onSubmit, onClose, loading }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Új szezon létrehozása"
      footer={
        <>
          <Button onClick={onClose}>Mégse</Button>
          <Button type="submit" form="create-season-form" variant="primary" disabled={loading}>
            {loading ? 'Létrehozás...' : 'Létrehozás'}
          </Button>
        </>
      }
    >
      <form id="create-season-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Szezon neve" htmlFor="create-season-name">
          <Input
            id="create-season-name"
            type="text"
            value={newSeason.name}
            onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
            placeholder="pl. 2024/2025 Szezon"
            required
          />
        </Field>

        <Field label="Kezdő dátum" htmlFor="create-season-start">
          <Input
            id="create-season-start"
            type="date"
            value={newSeason.start_date}
            onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
            required
          />
        </Field>

        <Field label="Befejező dátum" htmlFor="create-season-end">
          <Input
            id="create-season-end"
            type="date"
            value={newSeason.end_date}
            onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
            required
          />
        </Field>
      </form>
    </Modal>
  )
}
