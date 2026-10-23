import Drawer from '../ui/Drawer'
import NavGroups from './NavGroups'
import UserMenu from './UserMenu'
import { useNavGroups } from './useNavGroups'

// A "Több" lap: a teljes csoportosított menü, alatta a felhasználói blokk.
// Menüpont választásakor a lap bezárul.
export default function MoreSheet({ open, onClose, session }) {
  const groups = useNavGroups()

  return (
    <Drawer open={open} onClose={onClose} title="Menü" side="bottom">
      <nav aria-label="Teljes menü">
        <NavGroups groups={groups} onNavigate={onClose} />
      </nav>
      <div className="border-t border-line pt-3">
        <UserMenu session={session} onNavigate={onClose} />
      </div>
    </Drawer>
  )
}
