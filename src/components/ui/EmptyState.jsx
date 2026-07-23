// src/components/ui/EmptyState.jsx
//
// Reusable empty-state block for list/grid views with no data yet.
// Matches the app's `.card` aesthetic — centered icon, title, short
// description and an optional action button.
//
//   <EmptyState
//     icon={Users}
//     title="Még nincs játékos"
//     description="Adj hozzá játékosokat a csapatodhoz a kezdéshez."
//     actionLabel="Új játékos hozzáadása"
//     onAction={() => setShowAddModal(true)}
//   />

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="card text-center py-12">
      {Icon && <Icon className="w-16 h-16 text-slate-600 mx-auto mb-4" />}
      {title && <h3 className="text-xl font-bold text-white mb-2">{title}</h3>}
      {description && <p className="text-slate-400 mb-6">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
