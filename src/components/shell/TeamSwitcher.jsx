import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, Users } from 'lucide-react'
import { useTeams } from '../../context/TeamContext'
import CreateTeamModal from '../team/CreateTeamModal'
import Skeleton from '../ui/Skeleton'
import { usePopover } from './usePopover'

export default function TeamSwitcher({ compact = false }) {
  const { teams, selectedTeam, setSelectedTeam, loading } = useTeams()
  const { open, close, toggle, ref } = usePopover()
  const [creating, setCreating] = useState(false)

  if (loading) {
    return <Skeleton className={`h-9 rounded-[9px] ${compact ? 'w-32' : 'w-full'}`} />
  }

  const label = selectedTeam?.name ?? 'Nincs csapat'

  return (
    <div ref={ref} className={`relative ${compact ? 'min-w-0' : 'w-full'}`}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-[9px] border border-line bg-surface-2 text-left text-fg transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
        }`}
      >
        <Users className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
        <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-subtle" aria-hidden="true" />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full z-40 mt-1 rounded-[10px] border border-line bg-surface p-1 shadow-xl ${
            compact ? 'w-64' : 'w-full'
          }`}
        >
          <ul className="max-h-64 overflow-y-auto">
            {teams.map((team) => {
              const selected = team.id === selectedTeam?.id
              return (
                <li key={team.id}>
                  <button
                    type="button"
                    aria-current={selected || undefined}
                    onClick={() => {
                      setSelectedTeam(team)
                      close()
                    }}
                    className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                    {selected && (
                      <Check className="h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          {teams.length > 0 && <div className="my-1 border-t border-line" role="separator" />}
          <button
            type="button"
            onClick={() => {
              close()
              setCreating(true)
            }}
            className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-sm font-semibold text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
            Új csapat létrehozása
          </button>
        </div>
      )}

      <CreateTeamModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
