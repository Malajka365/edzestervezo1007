import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'

export default function SaveTemplateModal({ templateName, setTemplateName, onSubmit, onClose, loading }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Sablon mentése"
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Mégse</Button>
          <Button variant="primary" onClick={onSubmit} disabled={loading}>
            {loading ? 'Mentés...' : 'Mentés'}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-fg">
        Mentsd el a jelenlegi tervezést sablonként, hogy később más szezonokra is alkalmazhasd.
      </p>

      <Field label="Sablon neve" htmlFor="save-template-name">
        <Input
          id="save-template-name"
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="pl. Őszi Felkészülés Sablon"
          autoFocus
        />
      </Field>
    </Modal>
  )
}
