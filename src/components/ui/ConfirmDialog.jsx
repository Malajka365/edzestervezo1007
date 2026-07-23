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

import { useEffect } from 'react'

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
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-300 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200'
                : 'btn btn-primary'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
