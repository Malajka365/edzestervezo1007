// Oldalfejléc. Nem sticky: a görgetést az app shell kezeli.
export default function PageHeader({ eyebrow, title, description, actions, tabs }) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-wide text-fg">
            {title}
          </h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </header>
  )
}
