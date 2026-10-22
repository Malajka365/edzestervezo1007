// Közös overlay-viselkedés a Modal és a Drawer számára:
//  - a legfelső nyitott overlay reagál csak az Escape-re (modul szintű stack),
//  - fókusz az overlay-be kerül nyitáskor, bezáráskor visszakerül az előzőre,
//  - Tab fókuszcsapda,
//  - body görgetés zárolása.
import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// A stack a megnyitási sorrendet követi. A sorrendet a render közben kiosztott
// sorszám adja: a szülő renderel előbb, mint a gyereke, így egy Modalba ágyazott
// ConfirmDialog akkor is feljebb kerül, ha egyszerre nyílnak (a gyerek effektje
// előbb fut, mint a szülőé).
const stack = []
let sequence = 0

let scrollLocks = 0
let previousOverflow = ''

function lockScroll() {
  if (scrollLocks === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLocks += 1
}

function unlockScroll() {
  scrollLocks -= 1
  if (scrollLocks === 0) document.body.style.overflow = previousOverflow
}

export function useOverlay({ open, onClose, containerRef }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const seqRef = useRef(null)
  if (!open) seqRef.current = null
  else if (seqRef.current === null) seqRef.current = ++sequence

  useEffect(() => {
    if (!open) return undefined

    const entry = { seq: seqRef.current }
    stack.push(entry)
    stack.sort((a, b) => a.seq - b.seq)
    lockScroll()

    const previouslyFocused = document.activeElement
    const container = containerRef.current
    const isTop = () => stack[stack.length - 1] === entry

    // Egyszerre nyíló overlay-eknél a felső (gyerek) már fókuszált: nem lopjuk el.
    if (container && isTop()) {
      const focusables = Array.from(container.querySelectorAll(FOCUSABLE))
      const target =
        container.querySelector('[data-autofocus]') ??
        focusables.find((el) => !el.hasAttribute('data-overlay-close')) ??
        focusables[0] ??
        container
      target.focus()
    }

    const handleKeyDown = (e) => {
      if (!isTop()) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current?.()
        return
      }

      if (e.key === 'Tab' && container) {
        const focusables = Array.from(container.querySelectorAll(FOCUSABLE))
        if (focusables.length === 0) {
          e.preventDefault()
          container.focus()
          return
        }
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement

        if (!container.contains(active)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && (active === first || active === container)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const index = stack.indexOf(entry)
      if (index !== -1) stack.splice(index, 1)
      unlockScroll()
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [open, containerRef])
}
