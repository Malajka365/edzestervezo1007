// items: { id, label, icon? }[]; `label` a csoport hozzáférhető neve.
export default function SegmentedControl({ items, value, onChange, label, className = '' }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex gap-0.5 rounded-[10px] border border-line bg-surface-2 p-[3px] ${className}`}
    >
      {items.map(({ id, label: itemLabel, icon: Icon }) => {
        const selected = id === value
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              selected ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            {itemLabel}
          </button>
        )
      })}
    </div>
  )
}
