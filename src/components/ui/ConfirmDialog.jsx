// src/components/ui/ConfirmDialog.jsx
//
// Reusable confirmation modal that replaces browser-native confirm() calls.
//
// Idiom: local state per page/component, no context or portal needed.
//
//   const [confirmState, setConfirmState] = useState(null) // null | { message, action }
//
//   const handleDelete = (id) => {
//     setConfirmState({
//       message: 'Biztosan törölni szeretnéd ezt a bejegyzést?',
//       action: async () => {
//         // ...the code that used to run after `if (!confirm(...)) return`...
//       },
//     })
//   }
//
//   <ConfirmDialog
//     open={!!confirmState}
//     title="Törlés megerősítése"
//     message={confirmState?.message}
//     onConfirm={async () => {
//       await confirmState.action()
//       setConfirmState(null)
//     }}
//     onCancel={() => setConfirmState(null)}
//   />

import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({
  open,
  title = 'Megerősítés szükséges',
  message,
  confirmLabel = 'Törlés',
  cancelLabel = 'Mégse',
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted whitespace-pre-line">{message}</p>
    </Modal>
  )
}
