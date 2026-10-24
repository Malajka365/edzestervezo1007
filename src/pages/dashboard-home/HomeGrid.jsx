import { useRef } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import WidgetFrame from './WidgetFrame'

// A Kezdőlap rácsa: 1 oszlop telefonon, 2 tableten, 4 asztalon. A sorrend a
// tárolt tömb sorrendje; asztalon a "sűrű" kitöltés pakolja be a réseket.
export default function HomeGrid({ items, components, editing, onChange, onItemSettings, onOpenSettings, onResizeEnd }) {
  const gridRef = useRef(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const update = (id, patch) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    onChange(arrayMove(items, from, to))
  }

  const move = (id, delta) => {
    const from = items.findIndex((i) => i.id === id)
    const to = from + delta
    if (to < 0 || to >= items.length) return
    onChange(arrayMove(items, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:auto-rows-[132px] lg:grid-cols-4 lg:grid-flow-row-dense"
        >
          {items.map((item, index) => (
            <WidgetFrame
              key={item.id}
              item={item}
              component={components[item.type]}
              editing={editing}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              gridRef={gridRef}
              onOpenSettings={onOpenSettings}
              onRemove={(id) => onChange(items.filter((i) => i.id !== id))}
              onMove={move}
              onResize={(id, w, h) => update(id, { w, h })}
              onResizeEnd={onResizeEnd}
              onSettingsChange={(id, patch) => {
                if (onItemSettings) return onItemSettings(id, patch)
                const current = items.find((i) => i.id === id)
                update(id, { settings: { ...current.settings, ...patch } })
              }}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
