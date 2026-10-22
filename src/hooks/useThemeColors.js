import { useEffect, useState } from 'react'

export const TOKEN_NAMES = [
  'bg', 'surface', 'surface-2', 'surface-3', 'line', 'line-strong',
  'fg', 'muted', 'subtle',
  'accent', 'accent-hover', 'accent-fg', 'accent-soft',
  'ok', 'ok-soft', 'warn', 'warn-soft', 'bad', 'bad-soft', 'on-status',
  't-strength', 't-ball', 't-tactic', 't-match', 't-rest',
]

function readColors() {
  const style = getComputedStyle(document.documentElement)
  const colors = {}
  for (const name of TOKEN_NAMES) {
    const channels = style.getPropertyValue(`--${name}`).trim()
    if (channels) colors[name] = `rgb(${channels})`
  }
  return colors
}

/**
 * A témaszínek 'rgb(R G B)' stringként (pl. Recharts-hoz, ahol nem használható
 * Tailwind osztály). A `data-theme` attribútum változásakor újraolvassa az értékeket.
 */
export function useThemeColors() {
  const [colors, setColors] = useState(readColors)

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readColors()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return colors
}
