export default function Chip({
  selected = false,
  icon: Icon,
  onClick,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        selected ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-fg hover:bg-surface-2'
      } ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
      {children}
    </button>
  )
}
