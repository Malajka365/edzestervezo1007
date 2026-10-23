import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import IconButton from './IconButton'
import { useOverlay } from './useOverlay'

export default function Drawer({ open, onClose, title, side = 'right', children }) {
  const panelRef = useRef(null)
  const mouseDownOnBackdrop = useRef(false)
  const titleId = useId()

  useOverlay({ open, onClose, containerRef: panelRef })

  if (!open) return null

  // 'right': oldalpanel; 'bottom': mobil alsó lap (dinamikus magasság, safe-area padding).
  const panelClasses =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh] rounded-t-2xl border-t'
      : 'inset-y-0 right-0 w-[min(400px,100%)] border-l'
  const bodyClasses = side === 'bottom' ? 'pb-[max(1rem,env(safe-area-inset-bottom))]' : ''

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget) onClose?.()
        mouseDownOnBackdrop.current = false
      }}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute flex flex-col border-line bg-surface shadow-2xl focus:outline-none ${panelClasses}`}
      >
        <header className="flex items-center gap-2 border-b border-line px-4 py-3.5">
          <h2 id={titleId} className="min-w-0 flex-1 text-base font-semibold text-fg">
            {title}
          </h2>
          <IconButton
            icon={X}
            label="Bezárás"
            size="sm"
            onClick={onClose}
            data-overlay-close
          />
        </header>
        <div className={`min-h-0 flex-1 overflow-y-auto p-4 ${bodyClasses}`}>{children}</div>
      </aside>
    </div>,
    document.body
  )
}
