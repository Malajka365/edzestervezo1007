import { X } from 'lucide-react'
import { Select } from '../../components/ui/Field'

export default function ChipMultiSelect({ id, options, value, onChange, placeholder }) {
  const selected = value || []
  const add = (code) => { if (code && !selected.includes(code)) onChange([...selected, code]) }
  const remove = (code) => onChange(selected.filter((c) => c !== code))
  const labelOf = (code) => options.find((o) => o.value === code)?.label || code

  return (
    <div>
      <Select id={id} value="" onChange={(e) => add(e.target.value)}>
        <option value="">{placeholder || 'Válassz...'}</option>
        {options.filter((o) => !selected.includes(o.value)).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((code) => (
            <span key={code} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg">
              {labelOf(code)}
              <button
                type="button"
                onClick={() => remove(code)}
                aria-label={`${labelOf(code)} eltávolítása`}
                className="rounded-full text-muted transition-colors hover:text-bad focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
