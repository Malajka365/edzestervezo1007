import { useEffect, useRef } from 'react'

const isMac = () =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '')

// Billentyűkombináció figyelése, pl. useHotkey('mod+k', handler).
// A `mod` Macen a Meta, egyébként a Ctrl. Beviteli mezőkben is működik
// (paletta konvenció), de contenteditable elemből érkező eseményt figyelmen kívül hagy.
export function useHotkey(combo, handler) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const parts = combo.toLowerCase().split('+')
    const key = parts[parts.length - 1]
    const modifiers = new Set(parts.slice(0, -1))
    const mac = isMac()

    const onKeyDown = (e) => {
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return
      // A böngésző autofill keydown eseményeinek nincs `key` mezője.
      if (typeof e.key !== 'string' || e.key.toLowerCase() !== key) return

      const wantsMod = modifiers.has('mod')
      const hasMod = mac ? e.metaKey : e.ctrlKey
      if (wantsMod !== hasMod) return
      if (modifiers.has('shift') !== e.shiftKey) return
      if (modifiers.has('alt') !== e.altKey) return

      e.preventDefault()
      handlerRef.current(e)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [combo])
}
