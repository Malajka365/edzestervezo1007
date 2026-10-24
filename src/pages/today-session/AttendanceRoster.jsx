import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckSquare } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import AvailabilityPill from '../../components/availability/AvailabilityPill'
import { ATTENDANCE_STATUSES } from '../../lib/attendance'
import { availabilityOf } from '../../lib/availability'

// Jelenlét-felvétel: alapból mindenki "jelen" (sérült: "sérült"), soronként
// egy kattintással állítható, egy mentés az egészre.
export default function AttendanceRoster({ roster, byPlayer, canEdit, canRecord, onSave }) {
  const [rows, setRows] = useState(roster.rows)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => setRows(roster.rows), [roster])

  const editable = canEdit && canRecord
  const setRow = (playerId, patch) => setRows((rs) => rs.map((r) => (r.player.id === playerId ? { ...r, ...patch } : r)))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(rows)
      setSavedAt(new Date())
      toast.success('Jelenlét mentve')
    } catch (error) {
      console.error('Jelenlét mentése sikertelen:', error)
      toast.error('Nem sikerült menteni a jelenlétet')
    } finally {
      setSaving(false)
    }
  }

  const statusLabel = (value) => ATTENDANCE_STATUSES.find((s) => s.value === value)?.label ?? value

  return (
    <Panel
      title="Jelenlét"
      icon={CheckSquare}
      actions={
        editable ? (
          <Button size="sm" variant="primary" loading={saving} onClick={handleSave}>
            Jelenlét mentése
          </Button>
        ) : null
      }
    >
      {!canRecord && <p className="mb-2 text-sm text-muted">Az edzés napján rögzíthető.</p>}
      {(roster.recorded || savedAt) && (
        <p className="mb-2 text-[12px] text-muted">
          {savedAt ? `Mentve · ${savedAt.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}` : 'Már rögzítve, szerkeszthető.'}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">A csapatnak még nincs játékosa.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.player.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="w-7 font-mono text-[12px] text-muted">{r.player.jersey_number ?? '–'}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{r.player.name}</span>
              <AvailabilityPill status={availabilityOf(byPlayer, r.player.id).status} />
              {editable ? (
                <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                  <div role="group" aria-label={`${r.player.name} jelenléte`} className="inline-flex flex-wrap gap-0.5 rounded-[10px] border border-line bg-surface-2 p-[3px]">
                    {ATTENDANCE_STATUSES.map((s) => {
                      const selected = r.status === s.value
                      return (
                        <button
                          key={s.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setRow(r.player.id, { status: s.value })}
                          className={`rounded-[7px] px-2 py-1 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            selected ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
                          }`}
                        >
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                  <Input
                    aria-label={`${r.player.name} megjegyzés`}
                    placeholder="Megjegyzés"
                    value={r.notes}
                    onChange={(e) => setRow(r.player.id, { notes: e.target.value })}
                    className="!w-40"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted">{statusLabel(r.status)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
