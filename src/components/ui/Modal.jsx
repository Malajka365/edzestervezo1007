import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import IconButton from './IconButton'
import { useOverlay } from './useOverlay'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ open, onClose, title, size = 'md', footer, children }) {
  const dialogRef = useRef(null)
  const mouseDownOnBackdrop = useRef(false)
  const titleId = useId()

  useOverlay({ open, onClose, containerRef: dialogRef })

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget) onClose?.()
        mouseDownOnBackdrop.current = false
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full flex-col rounded-[14px] border border-line bg-surface shadow-2xl focus:outline-none ${
          SIZES[size] ?? SIZES.md
        }`}
      >
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
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
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}
