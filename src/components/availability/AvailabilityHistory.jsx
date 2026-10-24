import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Trash2, History } from 'lucide-react'
import Panel from '../ui/Panel'
import IconButton from '../ui/IconButton'
import ConfirmDialog from '../ui/ConfirmDialog'
import AvailabilityPill from './AvailabilityPill'
import AvailabilityEditor from './AvailabilityEditor'
import { useAvailability } from '../../hooks/useAvailability'
import { formatHungarianDate as formatDate } from '../../lib/format'

// Egy játékos elérhetőségi naplója, legújabb elöl. Szerkesztési joggal a
// bejegyzések javíthatók és törölhetők (elírás esetére).
export default function AvailabilityHistory({ playerId, player, teamId, canEdit, actions }) {
  const { entries, deleteEntry } = useAvailability(teamId)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const rows = entries
    .filter((e) => e.player_id === playerId)
    .sort((a, b) => (b.started_on + (b.created_at || '')).localeCompare(a.started_on + (a.created_at || '')))

  return (
    <Panel title="Elérhetőség" icon={History} actions={actions}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Még nincs bejegyzés: a játékos bevethetőként szerepel.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="w-24 font-mono text-[12px] text-muted">{formatDate(e.started_on)}</span>
              <AvailabilityPill status={e.status} />
              {e.expected_return && <span className="text-muted">visszatérés: {formatDate(e.expected_return)}</span>}
              {e.note && <span className="min-w-0 flex-1 truncate text-fg">{e.note}</span>}
              {canEdit && (
                <span className="ml-auto flex gap-1">
                  <IconButton icon={Pencil} label={`${formatDate(e.started_on)} bejegyzés szerkesztése`} onClick={() => setEditing(e)} />
                  <IconButton icon={Trash2} label={`${formatDate(e.started_on)} bejegyzés törlése`} onClick={() => setDeleting(e)} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <AvailabilityEditor
        open={!!editing}
        onClose={() => setEditing(null)}
        player={player ?? { id: playerId }}
        teamId={teamId}
        entry={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Bejegyzés törlése"
        message="Biztosan törlöd ezt az elérhetőségi bejegyzést? Csak elírás javítására használd."
        onConfirm={async () => {
          try {
            await deleteEntry(deleting.id)
            toast.success('Bejegyzés törölve')
          } catch (error) {
            console.error(error)
            toast.error('Nem sikerült törölni')
          }
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </Panel>
  )
}
