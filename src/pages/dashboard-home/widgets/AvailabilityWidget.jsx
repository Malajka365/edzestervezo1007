// Widget: "Ki bevethető?" — elérhetőségi összesítő és lista.
// Beállítás: show ('issues' csak korlátozott/sérült | 'all' mindenki).
import { ShieldCheck } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { usePlayers } from '../../../hooks/usePlayers'
import { useAvailability } from '../../../hooks/useAvailability'
import { AVAILABILITY, availabilityOf } from '../../../lib/availability'
import AvailabilityPill from '../../../components/availability/AvailabilityPill'
import LoadingSpinner from '../../../components/LoadingSpinner'

const TONE_TEXT = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }
const ORDER = { injured: 0, limited: 1, available: 2 }

export default function AvailabilityWidget({ settings = {} }) {
  const { selectedTeam } = useTeams()
  const { data: players = [], isLoading } = usePlayers(selectedTeam?.id)
  const { byPlayer, loading, error } = useAvailability(selectedTeam?.id)

  const rows = players.map((p) => ({ player: p, status: availabilityOf(byPlayer, p.id).status }))
  const counts = { available: 0, limited: 0, injured: 0 }
  rows.forEach((r) => (counts[r.status] += 1))
  const listed = rows
    .filter((r) => settings.show === 'all' || r.status !== 'available')
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.player.name.localeCompare(b.player.name))

  return (
    <WidgetCard icon={ShieldCheck} title="Ki bevethető?">
      {isLoading || loading ? (
        <LoadingSpinner size="xs" />
      ) : error ? (
        <p className="text-sm text-bad">Az elérhetőség nem tölthető be. Frissítsd az oldalt.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(AVAILABILITY).map(([status, meta]) => (
              <div key={status} className="rounded-[9px] bg-surface-2 px-2 py-1.5">
                <p data-count={status} className={`font-display text-[24px] font-bold leading-none ${TONE_TEXT[meta.tone]}`}>
                  {counts[status]}
                </p>
                <p className="truncate text-[11px] text-muted">{meta.label}</p>
              </div>
            ))}
          </div>
          {listed.length === 0 ? (
            <p className="text-sm text-muted">Mindenki bevethető.</p>
          ) : (
            <ul className="divide-y divide-line">
              {listed.map(({ player, status }) => (
                <li key={player.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="w-6 font-mono text-[11px] text-muted">{player.jersey_number ?? ''}</span>
                  <span className="min-w-0 flex-1 truncate text-fg">{player.name}</span>
                  <AvailabilityPill status={status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </WidgetCard>
  )
}
