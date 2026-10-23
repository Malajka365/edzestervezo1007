import { X } from 'lucide-react'
import { MUSCLE_GROUP_LABELS, ROLE_LABELS, ROLE_ORDER } from '../../lib/exerciseTaxonomy'
import { Field, Select } from '../../components/ui/Field'
import IconButton from '../../components/ui/IconButton'

export default function MusclePicker({ muscles, value, onChange }) {
  const rows = value || []
  const chosen = new Set(rows.map((r) => r.muscle_code))
  const add = (code) => { if (code && !chosen.has(code)) onChange([...rows, { muscle_code: code, role: 'secondary' }]) }
  const setRole = (code, role) => onChange(rows.map((r) => (r.muscle_code === code ? { ...r, role } : r)))
  const remove = (code) => onChange(rows.filter((r) => r.muscle_code !== code))
  const nameOf = (code) => {
    const m = muscles.find((x) => x.code === code)
    return m ? `${m.name_hu} (${m.name_latin})` : code
  }

  return (
    <div>
      <Field label="Részletes izmok (opcionális)" htmlFor="ex-detail-muscles">
        <Select id="ex-detail-muscles" value="" onChange={(e) => add(e.target.value)}>
          <option value="">Izom hozzáadása...</option>
          {muscles.filter((m) => !chosen.has(m.code)).map((m) => (
            <option key={m.code} value={m.code}>
              {MUSCLE_GROUP_LABELS[m.muscle_group] || m.muscle_group} – {m.name_hu} ({m.name_latin})
            </option>
          ))}
        </Select>
      </Field>
      {rows.length > 0 && (
        <div className="space-y-2 mt-2">
          {rows.map((r) => (
            <div key={r.muscle_code} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-fg truncate">{nameOf(r.muscle_code)}</span>
              <Select
                value={r.role}
                onChange={(e) => setRole(r.muscle_code, e.target.value)}
                aria-label={`${nameOf(r.muscle_code)} szerepe`}
                className="!w-auto !px-2 !py-1"
              >
                {ROLE_ORDER.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </Select>
              <IconButton
                icon={X}
                size="sm"
                label={`${nameOf(r.muscle_code)} eltávolítása`}
                onClick={() => remove(r.muscle_code)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
