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

  const sideClasses = side === 'left' ? 'left-0 border-r' : 'right-0 border-l'

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
        className={`absolute inset-y-0 flex w-[min(400px,100%)] flex-col border-line bg-surface shadow-2xl focus:outline-none ${sideClasses}`}
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
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>,
    document.body
  )
}
