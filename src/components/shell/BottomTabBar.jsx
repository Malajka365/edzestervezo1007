import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { getMobileTabs } from '../../lib/navigation'
import { useNavGroups } from './useNavGroups'

// A sáv magassága; az AppShell main-je ugyanennyi alsó paddingot kap (BOTTOM_BAR_PADDING).
export const BOTTOM_BAR_PADDING = 'pb-[calc(4rem+env(safe-area-inset-bottom))]'

const itemClasses =
  'flex h-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent'

// Mobil alsó sáv (lg alatt): a jogosultság szerint látható tabok + mindig a "Több" gomb.
export default function BottomTabBar({ moreOpen, onOpenMore }) {
  const tabs = getMobileTabs(useNavGroups())

  return (
    <nav
      aria-label="Alsó menü"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <div key={tab.id} className="min-w-0 flex-1">
            <NavLink
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `${itemClasses} ${isActive ? 'text-accent' : 'text-muted hover:text-fg'}`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate">{tab.label}</span>
            </NavLink>
          </div>
        )
      })}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpenMore}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={`${itemClasses} w-full ${moreOpen ? 'text-accent' : 'text-muted hover:text-fg'}`}
        >
          <Menu className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span>Több</span>
        </button>
      </div>
    </nav>
  )
}
