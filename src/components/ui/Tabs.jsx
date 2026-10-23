import { useRef } from 'react'

// items: { id, label, icon? }[]. Automatikus aktiválás: a nyilak azonnal váltanak.
export default function Tabs({ items, value, onChange, className = '' }) {
  const refs = useRef([])

  const handleKeyDown = (e, index) => {
    const last = items.length - 1
    let next
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    else return

    e.preventDefault()
    onChange(items[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      className={`flex gap-0.5 overflow-x-auto border-b border-line ${className}`}
    >
      {items.map(({ id, label, icon: Icon }, index) => {
        const selected = id === value
        return (
          <button
            key={id}
            ref={(el) => (refs.current[index] = el)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
              selected
                ? 'border-accent text-fg'
                : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            {label}
          </button>
        )
      })}
    </div>
  )
}
