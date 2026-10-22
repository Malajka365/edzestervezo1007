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
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return { open, close, toggle, ref }
}
