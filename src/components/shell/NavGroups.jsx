import { useId } from 'react'
import { NavLink } from 'react-router-dom'

// A csoportosított menüpontok listája: az oldalsáv és a mobil "Több" lap közös eleme.
// A useId előtag azért kell, mert egyszerre több példány is lehet a DOM-ban.
export default function NavGroups({ groups, onNavigate }) {
  const uid = useId()

  return groups.map((group) => {
    const headingId = `${uid}-nav-group-${group.id}`
    return (
      <div key={group.id} className="mb-4">
        <p
          id={headingId}
          className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-subtle"
        >
          {group.label}
        </p>
        <ul aria-labelledby={headingId} className="space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:bg-surface-2 hover:text-fg'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
    )
  })
}
