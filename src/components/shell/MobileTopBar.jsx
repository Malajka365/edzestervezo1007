import { Search } from 'lucide-react'
import IconButton from '../ui/IconButton'
import TeamSwitcher from './TeamSwitcher'

// Mobil fejléc (lg alatt): csapatváltó és keresés.
export default function MobileTopBar({ onOpenPalette = () => {} }) {
  return (
    <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2 lg:hidden">
      <div className="min-w-0 flex-1">
        <TeamSwitcher compact />
      </div>
      <IconButton icon={Search} label="Keresés" onClick={onOpenPalette} />
    </header>
  )
}
