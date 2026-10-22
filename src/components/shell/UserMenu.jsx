import { Link } from 'react-router-dom'
import { ChevronUp, LogOut, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTeams } from '../../context/TeamContext'
import { ROLES } from '../../lib/permissions'
import { PROFILE_ITEM } from '../../lib/navigation'
import { THEME_MODES, THEME_SWITCH_ENABLED } from '../../lib/theme'
import { useTheme } from '../../hooks/useTheme'
import SegmentedControl from '../ui/SegmentedControl'
import { usePopover } from './usePopover'

const THEME_LABELS = { system: 'Rendszer', light: 'Világos', dark: 'Sötét' }
const THEME_ITEMS = THEME_MODES.map((id) => ({ id, label: THEME_LABELS[id] }))

// Külön komponens, hogy a useTheme csak akkor fusson, ha a kapcsoló látszik.
function ThemeSwitch() {
  const { mode, setMode } = useTheme()
  return (
    <div className="px-2 pb-2 pt-1">
      <p className="mb-1.5 text-xs font-semibold text-muted">Téma</p>
      <SegmentedControl items={THEME_ITEMS} value={mode} onChange={setMode} label="Téma" />
    </div>
  )
}

export default function UserMenu({ session, onNavigate }) {
  const { currentUserRole } = useTeams()
  const { open, close, toggle, ref } = usePopover()
  const roleLabel = ROLES.find((role) => role.key === currentUserRole)?.name ?? 'Csapattag'

  const handleSignOut = async () => {
    close()
    await supabase.auth.signOut()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[9px] p-1.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-3 text-muted">
          <User className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-fg">{session.user.email}</span>
          <span className="block truncate text-xs text-muted">{roleLabel}</span>
        </span>
        <ChevronUp className="h-4 w-4 flex-shrink-0 text-subtle" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute inset-x-0 bottom-full z-40 mb-1 rounded-[10px] border border-line bg-surface p-1 shadow-xl">
          <Link
            to={PROFILE_ITEM.path}
            onClick={() => {
              close()
              onNavigate?.()
            }}
            className="flex items-center gap-2 rounded-[7px] px-2.5 py-2 text-sm text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <User className="h-4 w-4 text-muted" aria-hidden="true" />
            {PROFILE_ITEM.label}
          </Link>
          {THEME_SWITCH_ENABLED && <ThemeSwitch />}
          <div className="my-1 border-t border-line" role="separator" />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <LogOut className="h-4 w-4 text-muted" aria-hidden="true" />
            Kijelentkezés
          </button>
        </div>
      )}
    </div>
  )
}
