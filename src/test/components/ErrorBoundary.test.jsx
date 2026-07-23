import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '@/components/ErrorBoundary'

// Helper child that throws on demand during render.
function Boom({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('kaboom')
  }
  return <div>Minden rendben</div>
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy

  beforeEach(() => {
    // React logs caught render errors to console.error; silence that expected noise.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders its children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Gyerek tartalom</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Gyerek tartalom')).toBeInTheDocument()
    expect(screen.queryByText(/Hoppá/)).not.toBeInTheDocument()
  })

  it('shows the Hungarian fallback and does not propagate when a child throws', () => {
    // If the crash propagated, this render() call itself would throw.
    expect(() =>
      render(
        <ErrorBoundary>
          <Boom shouldThrow />
        </ErrorBoundary>
      )
    ).not.toThrow()

    expect(screen.getByText(/Hoppá, valami hiba történt/)).toBeInTheDocument()
    expect(screen.queryByText('Minden rendben')).not.toBeInTheDocument()
  })

  it('renders a working reload button in the fallback', async () => {
    const reloadMock = vi.fn()
    const originalLocation = window.location
    // jsdom marks location.reload non-configurable; redefine location itself.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    })

    try {
      const { default: userEvent } = await import('@testing-library/user-event')
      const user = userEvent.setup()

      render(
        <ErrorBoundary>
          <Boom shouldThrow />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /Oldal újratöltése/ })
      expect(reloadButton).toBeInTheDocument()

      await user.click(reloadButton)
      expect(reloadMock).toHaveBeenCalledTimes(1)
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
  })

  it('clears the error state when resetKey changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/route-a">
        <Boom shouldThrow />
      </ErrorBoundary>
    )

    // In the error state the fallback is shown.
    expect(screen.getByText(/Hoppá, valami hiba történt/)).toBeInTheDocument()

    // Changing resetKey with a non-throwing child restores the children.
    rerender(
      <ErrorBoundary resetKey="/route-b">
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Minden rendben')).toBeInTheDocument()
    expect(screen.queryByText(/Hoppá/)).not.toBeInTheDocument()
  })
})
