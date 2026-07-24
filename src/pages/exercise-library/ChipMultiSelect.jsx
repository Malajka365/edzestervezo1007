export default function ChipMultiSelect({ options, value, onChange, placeholder }) {
  const selected = value || []
  const add = (code) => { if (code && !selected.includes(code)) onChange([...selected, code]) }
  const remove = (code) => onChange(selected.filter((c) => c !== code))
  const labelOf = (code) => options.find((o) => o.value === code)?.label || code

  return (
    <div>
      <select
        value=""
        onChange={(e) => add(e.target.value)}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">{placeholder || 'Válassz...'}</option>
        {options.filter((o) => !selected.includes(o.value)).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((code) => (
            <span key={code} className="px-2 py-1 bg-slate-600 text-xs text-slate-200 rounded flex items-center gap-1">
              {labelOf(code)}
              <button type="button" onClick={() => remove(code)} className="hover:text-red-400">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
