import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

export default function DeleteSeasonModal({ seasonToDelete, onConfirm, onClose, loading }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Szezon törlése"
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Mégse</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Törlés...' : 'Törlés'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg">
        Biztosan törölni szeretnéd a <strong>{seasonToDelete.name}</strong> szezont?
        <br /><br />
        <span className="text-bad">Ez a művelet nem visszavonható, és az összes kapcsolódó tervezési adat is törlődni fog!</span>
      </p>
    </Modal>
  )
}
