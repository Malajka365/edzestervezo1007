import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import SegmentedControl from '../ui/SegmentedControl'
import { Field, Input, Textarea } from '../ui/Field'
import { AVAILABILITY, todayIso } from '../../lib/availability'
import { useAvailability } from '../../hooks/useAvailability'

const STATUS_ITEMS = Object.entries(AVAILABILITY).map(([id, { label }]) => ({ id, label }))

// Új állapot rögzítése (új naplósor), vagy — `entry` megadásával — egy meglévő
// bejegyzés javítása.
export default function AvailabilityEditor({ open, onClose, player, teamId, entry }) {
  const { setStatus, updateEntry } = useAvailability(teamId)
  const [form, setForm] = useState(() => initial(entry))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(initial(entry))
  }, [open, entry])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const values = {
        status: form.status,
        started_on: form.started_on || todayIso(),
        expected_return: form.status === 'available' ? null : form.expected_return || null,
        note: form.note.trim() || null,
      }
      if (entry) await updateEntry(entry.id, values)
      else await setStatus({ playerId: player.id, ...values })
      toast.success('Elérhetőség mentve')
      onClose()
    } catch (error) {
      console.error('Elérhetőség mentése sikertelen:', error)
      toast.error('Nem sikerült menteni az elérhetőséget')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${player?.name ?? ''} – ${entry ? 'bejegyzés javítása' : 'elérhetőség'}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Mégse
          </Button>
          <Button variant="primary" type="submit" form="availability-form" loading={saving}>
            Mentés
          </Button>
        </>
      }
    >
      <form id="availability-form" onSubmit={handleSubmit} className="space-y-4">
        <SegmentedControl
          label="Állapot"
          items={STATUS_ITEMS}
          value={form.status}
          onChange={(status) => setForm((f) => ({ ...f, status }))}
          className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
        />
        <Field label="Kezdete" htmlFor="availability-start">
          <Input id="availability-start" type="date" value={form.started_on} onChange={set('started_on')} />
        </Field>
        {form.status !== 'available' && (
          <Field label="Várható visszatérés" htmlFor="availability-return" hint="Nem kötelező">
            <Input id="availability-return" type="date" value={form.expected_return} onChange={set('expected_return')} />
          </Field>
        )}
        <Field label="Megjegyzés" htmlFor="availability-note">
          <Textarea id="availability-note" rows={2} value={form.note} onChange={set('note')} />
        </Field>
      </form>
    </Modal>
  )
}

function initial(entry) {
  return {
    status: entry?.status ?? 'available',
    started_on: entry?.started_on ?? todayIso(),
    expected_return: entry?.expected_return ?? '',
    note: entry?.note ?? '',
  }
}
