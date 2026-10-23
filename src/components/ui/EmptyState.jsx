// src/components/ui/EmptyState.jsx
//
// Reusable empty-state block for list/grid views with no data yet.
// Panel-style block — centered icon, title, short description and an
// optional action button.
//
//   <EmptyState
//     icon={Users}
//     title="Még nincs játékos"
//     description="Adj hozzá játékosokat a csapatodhoz a kezdéshez."
//     actionLabel="Új játékos hozzáadása"
//     onAction={() => setShowAddModal(true)}
//   />

import Button from './Button'

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface px-6 py-12 text-center">
      {Icon && <Icon className="mx-auto mb-4 h-14 w-14 text-subtle" aria-hidden="true" />}
      {title && <h3 className="mb-2 text-lg font-semibold text-fg">{title}</h3>}
      {description && <p className="mx-auto mb-6 max-w-md text-sm text-muted">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
