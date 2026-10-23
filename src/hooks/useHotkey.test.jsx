import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useHotkey } from './useHotkey'

function Harness({ combo, handler }) {
  useHotkey(combo, handler)
  return null
}

describe('useHotkey', () => {
  it('calls the handler for the matching combo', () => {
    const handler = vi.fn()
    render(<Harness combo="mod+k" handler={handler} />)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true }))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores keydown events without a key (e.g. browser autofill)', () => {
    const handler = vi.fn()
    render(<Harness combo="mod+k" handler={handler} />)

    // jsdom reports listener exceptions as window 'error' events instead of throwing.
    const onError = vi.fn((e) => e.preventDefault())
    window.addEventListener('error', onError)

    const event = new Event('keydown', { bubbles: true })
    document.dispatchEvent(event)
    window.removeEventListener('error', onError)

    expect(event.key).toBeUndefined()
    expect(onError).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })
})
