import { MUSCLE_GROUP_LABELS, ROLE_LABELS, ROLE_ORDER } from '../../lib/exerciseTaxonomy'

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
      <label className="block text-sm font-medium text-white mb-2">Részletes izmok (opcionális)</label>
      <select
        value=""
        onChange={(e) => add(e.target.value)}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">Izom hozzáadása...</option>
        {muscles.filter((m) => !chosen.has(m.code)).map((m) => (
          <option key={m.code} value={m.code}>
            {MUSCLE_GROUP_LABELS[m.muscle_group] || m.muscle_group} – {m.name_hu} ({m.name_latin})
          </option>
        ))}
      </select>
      {rows.length > 0 && (
        <div className="space-y-2 mt-2">
          {rows.map((r) => (
            <div key={r.muscle_code} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-slate-200 truncate">{nameOf(r.muscle_code)}</span>
              <select
                value={r.role}
                onChange={(e) => setRole(r.muscle_code, e.target.value)}
                className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
              >
                {ROLE_ORDER.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(r.muscle_code)}
                aria-label={`${nameOf(r.muscle_code)} eltávolítása`}
                className="text-slate-400 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
