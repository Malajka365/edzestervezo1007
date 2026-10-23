// Egyszerű popover-állapot: kívülre kattintásra és Escape-re bezár.
import { useCallback, useEffect, useRef, useState } from 'react'

export function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((value) => !value), [])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.isComposing) return
      // Az Escape-et a popover kapja meg először (capture fázis): a mögötte lévő overlay
      // (pl. a "Több" lap) nem záródik vele, mert megállítjuk és defaultPrevented lesz.
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open])

  return { open, close, toggle, ref }
}
