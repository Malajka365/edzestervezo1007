import Drawer from '../../components/ui/Drawer'
import { Field, Select } from '../../components/ui/Field'
import { WIDGET_CATALOG } from '../../lib/widgetCatalog'
import { usePlayers } from '../../hooks/usePlayers'
import { useExercises } from '../../hooks/useExercises'

const SIZE_PRESETS = [
  [1, 1, 'Kicsi'],
  [2, 1, 'Széles'],
  [1, 2, 'Magas'],
  [2, 2, 'Közepes'],
  [4, 1, 'Teljes sáv'],
  [4, 2, 'Nagy'],
]

// Egy widget beállításai: a választók azonnal érvényesek (a mentést a
// Kezdőlap késleltetve végzi). A 'players' / 'exercises' opciók élő adatból jönnek.
export default function WidgetSettings({ item, teamId, onClose, onChange }) {
  const def = item ? WIDGET_CATALOG[item.type] : null
  const { data: players = [] } = usePlayers(teamId)
  const { data: exercises = [] } = useExercises()

  const optionsFor = (field) => {
    if (field.options === 'players') return [['team', 'Csapatátlag'], ...players.map((p) => [p.id, p.name])]
    if (field.options === 'exercises') return [['', 'Válassz gyakorlatot'], ...exercises.map((e) => [e.id, e.name])]
    return field.options
  }

  return (
    <Drawer open={!!item} onClose={onClose} title={def?.name ?? ''}>
      {item && (
        <div className="space-y-4">
          {def.settings.map((field) => (
            <Field key={field.key} label={field.label} htmlFor={`widget-setting-${field.key}`}>
              <Select
                id={`widget-setting-${field.key}`}
                value={item.settings[field.key] ?? ''}
                onChange={(e) => onChange({ settings: { ...item.settings, [field.key]: e.target.value } })}
              >
                {optionsFor(field).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          ))}

          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-fg">Méret</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Méret">
              {SIZE_PRESETS.filter(([w, h]) => w >= def.minSize[0] && h >= def.minSize[1]).map(([w, h, label]) => {
                const selected = item.w === w && item.h === h
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ w, h })}
                    className={`rounded-full border px-3 py-1 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      selected ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-fg hover:bg-surface-2'
                    }`}
                  >
                    {label} {w}×{h}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted">Asztali nézetben a sarok húzásával is méretezhető.</p>
          </div>
          <p className="text-[12px] text-muted">A változás azonnal látszik és mentődik, csak neked.</p>
        </div>
      )}
    </Drawer>
  )
}
