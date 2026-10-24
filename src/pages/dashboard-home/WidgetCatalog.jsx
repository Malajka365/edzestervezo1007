import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import Drawer from '../../components/ui/Drawer'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { WIDGET_CATALOG, WIDGET_CATEGORIES } from '../../lib/widgetCatalog'
import { isModuleVisible } from '../../lib/permissions'
import { normalize } from '../../lib/commands'

// Widget-katalógus kategóriákkal, ékezet-független kereséssel. Csak a
// jogosultsággal látható widgetek jelennek meg; a később érkezők letiltva.
export default function WidgetCatalog({ open, onClose, items, permissions, onAdd }) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = normalize(query)
    const present = new Set(items.map((i) => i.type))
    const visible = Object.values(WIDGET_CATALOG).filter(
      (w) =>
        (w.comingSoon || isModuleVisible(permissions, w.module_key)) &&
        (!q || normalize(`${w.name} ${w.description} ${w.category}`).includes(q))
    )
    return WIDGET_CATEGORIES.map((category) => ({
      category,
      widgets: visible
        .filter((w) => w.category === category)
        .map((w) => ({ ...w, onPage: present.has(w.type) && !w.allowMultiple })),
    })).filter((g) => g.widgets.length)
  }, [query, items, permissions])

  return (
    <Drawer open={open} onClose={onClose} title="Widget hozzáadása">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            aria-label="Keresés a widgetek között"
            placeholder="Keresés a widgetek között"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {groups.length === 0 && <p className="text-sm text-muted">Nincs találat.</p>}
        {groups.map(({ category, widgets }) => (
          <section key={category} className="space-y-2">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{category}</h3>
            <ul className="space-y-2">
              {widgets.map((w) => (
                <li key={w.type} className="grid grid-cols-[32px_1fr_auto] items-start gap-3 rounded-[12px] border border-line p-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent-soft text-accent">
                    <w.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold text-fg">
                      {w.name}
                      {w.comingSoon && (
                        <span className="rounded-[5px] bg-warn-soft px-1.5 font-mono text-[10px] text-warn">4. szakasz</span>
                      )}
                    </p>
                    <p className="text-[12.5px] text-muted">{w.description}</p>
                    {w.allowMultiple && <p className="text-[11px] text-subtle">Többször is felvehető</p>}
                  </div>
                  <Button
                    size="sm"
                    variant={w.comingSoon || w.onPage ? 'secondary' : 'primary'}
                    disabled={w.comingSoon || w.onPage}
                    onClick={() => onAdd(w.type)}
                  >
                    {w.comingSoon ? 'Hamarosan' : w.onPage ? 'Fent van' : 'Hozzáad'}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Drawer>
  )
}
