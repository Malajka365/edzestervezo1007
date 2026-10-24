import { useCallback } from 'react'

const ROW_PX = 132
const MAX_W = 4
const MAX_H = 3

// A widget jobb alsó sarkának húzásával a méret a rács oszlopaira és soraira
// pattan, a widget minimum-méreténél nem lesz kisebb. `onResize(w, h)` minden
// változásnál, `onEnd()` a húzás végén hívódik.
export function useResizeHandle({ gridRef, item, minSize, onResize, onEnd }) {
  return useCallback(
    (event) => {
      const grid = gridRef.current
      if (!grid) return
      event.preventDefault()
      const style = getComputedStyle(grid)
      const cols = style.gridTemplateColumns.split(' ').filter(Boolean).length || MAX_W
      const gap = parseFloat(style.columnGap) || 14
      const colPx = (grid.clientWidth - gap * (cols - 1)) / cols
      const startX = event.clientX
      const startY = event.clientY
      const w0 = item.w
      const h0 = item.h
      let last = [w0, h0]

      const move = (e) => {
        const w = Math.max(minSize[0], Math.min(Math.min(cols, MAX_W), Math.round(w0 + (e.clientX - startX) / (colPx + gap))))
        const h = Math.max(minSize[1], Math.min(MAX_H, Math.round(h0 + (e.clientY - startY) / (ROW_PX + gap))))
        if (w !== last[0] || h !== last[1]) {
          last = [w, h]
          onResize(w, h)
        }
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        onEnd?.()
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [gridRef, item.w, item.h, minSize, onResize, onEnd]
  )
}
