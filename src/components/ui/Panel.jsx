export default function Panel({
  title,
  icon: Icon,
  actions,
  padded = true,
  className = '',
  children,
}) {
  const hasHeader = title || Icon || actions

  return (
    <section
      className={`min-w-0 rounded-[14px] border border-line bg-surface ${padded ? 'p-4' : ''} ${className}`}
    >
      {hasHeader && (
        <header
          className={`flex items-center gap-2 ${padded ? 'mb-3' : 'border-b border-line px-4 py-3'}`}
        >
          {Icon && <Icon className="w-4 h-4 text-muted" aria-hidden="true" />}
          {title && <h3 className="text-[13px] font-semibold tracking-wide text-fg">{title}</h3>}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
