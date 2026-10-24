import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Settings2, X, ChevronUp, ChevronDown, MoveDiagonal2, Clock } from 'lucide-react'
import IconButton from '../../components/ui/IconButton'
import { WIDGET_CATALOG } from '../../lib/widgetCatalog'
import { WidgetFrameContext } from './widgetFrameContext'
import { useResizeHandle } from './useResizeHandle'

// Tailwind csak literális osztályneveket lát, ezért térképpel adjuk a méreteket.
// Telefonon egy oszlop; tableten legfeljebb 2 széles; asztalon a tárolt méret.
const COL_SPAN = {
  1: 'sm:col-span-1 lg:col-span-1',
  2: 'sm:col-span-2 lg:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
  4: 'sm:col-span-2 lg:col-span-4',
}
const ROW_SPAN = { 1: 'sm:row-span-1', 2: 'sm:row-span-2', 3: 'sm:row-span-3' }

export default function WidgetFrame({
  item,
  component: Widget,
  editing,
  isFirst,
  isLast,
  gridRef,
  onOpenSettings,
  onRemove,
  onMove,
  onResize,
  onResizeEnd,
  onSettingsChange,
}) {
  const def = WIDGET_CATALOG[item.type]
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editing,
  })
  const startResize = useResizeHandle({
    gridRef,
    item,
    minSize: def.minSize,
    onResize: (w, h) => onResize(item.id, w, h),
    onEnd: onResizeEnd,
  })

  const style = { transform: CSS.Translate.toString(transform), transition }

  return (
    <section
      ref={setNodeRef}
      style={style}
      aria-label={def.name}
      className={`relative flex min-h-[150px] min-w-0 flex-col overflow-hidden rounded-[14px] border bg-surface sm:min-h-0 ${
        COL_SPAN[item.w] ?? COL_SPAN[1]
      } ${ROW_SPAN[item.h] ?? ROW_SPAN[1]} ${
        editing ? 'border-dashed border-accent/60' : 'border-line'
      } ${isDragging ? 'z-10 opacity-80 shadow-lg' : ''}`}
    >
      <header className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
        {editing && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`${def.name} áthelyezése`}
            title="Húzd az áthelyezéshez"
            className="inline-flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-[7px] text-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <def.icon className="h-4 w-4 flex-none text-muted" aria-hidden="true" />
        <h2 className="truncate text-[12px] font-bold uppercase tracking-wide text-fg">{def.name}</h2>
        {editing && (
          <span className="rounded-[5px] bg-accent-soft px-1.5 font-mono text-[10px] text-accent">
            {item.w}×{item.h}
          </span>
        )}
        <span className="ml-auto flex flex-none items-center">
          {editing && (
            <>
              <IconButton size="sm" icon={ChevronUp} label={`${def.name} feljebb`} disabled={isFirst} onClick={() => onMove(item.id, -1)} />
              <IconButton size="sm" icon={ChevronDown} label={`${def.name} lejjebb`} disabled={isLast} onClick={() => onMove(item.id, 1)} />
            </>
          )}
          {def.settings.length > 0 && (
            <IconButton size="sm" icon={Settings2} label={`${def.name} beállítása`} onClick={() => onOpenSettings(item.id)} />
          )}
          {editing && <IconButton size="sm" icon={X} label={`${def.name} eltávolítása`} onClick={() => onRemove(item.id)} />}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <WidgetFrameContext.Provider value={true}>
          {Widget ? (
            <Widget
              settings={item.settings}
              size={{ w: item.w, h: item.h }}
              onSettingsChange={(patch) => onSettingsChange(item.id, patch)}
            />
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Hamarosan
            </p>
          )}
        </WidgetFrameContext.Provider>
      </div>

      {editing && (
        <span
          role="presentation"
          onPointerDown={startResize}
          title="Húzd a méretezéshez"
          className="absolute bottom-0.5 right-0.5 hidden h-5 w-5 cursor-nwse-resize touch-none place-items-center text-accent lg:grid"
        >
          <MoveDiagonal2 className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </section>
  )
}
