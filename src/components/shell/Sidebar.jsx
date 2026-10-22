import { NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useTeams } from '../../context/TeamContext'
import { filterNav, getNavForRole } from '../../lib/navigation'
import TeamSwitcher from './TeamSwitcher'
import UserMenu from './UserMenu'

// `className` állítja a külső elrendezést (szélesség, desktopon fix oszlop).
// `onNavigate` a mobil Drawer bezárására szolgál.
export default function Sidebar({ session, onOpenPalette = () => {}, onNavigate, className = '' }) {
  const { currentUserRole, currentUserPermissions, permissionsLoading } = useTeams()
  const groups = filterNav(getNavForRole(currentUserRole), currentUserPermissions, permissionsLoading)

  return (
    <aside className={`flex flex-shrink-0 flex-col border-r border-line bg-surface ${className}`}>
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent font-display text-base font-bold text-accent-fg">
          TF
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-none text-fg">TeamFlow</p>
          <p className="mt-0.5 text-xs text-muted">Edzés menedzsment</p>
        </div>
      </div>

      <div className="px-3 pb-2">
        <TeamSwitcher />
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex w-full items-center gap-2 rounded-[9px] border border-line bg-surface-2 px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 truncate">Keresés, parancsok</span>
          <kbd className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-subtle">
            Ctrl K
          </kbd>
        </button>
      </div>

      <nav aria-label="Főmenü" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.id} className="mb-4">
            <p
              id={`nav-group-${group.id}`}
              className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-subtle"
            >
              {group.label}
            </p>
            <ul aria-labelledby={`nav-group-${group.id}`} className="space-y-0.5">
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
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <UserMenu session={session} onNavigate={onNavigate} />
      </div>
    </aside>
  )
}
