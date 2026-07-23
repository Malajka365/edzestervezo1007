import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        open
        title="Törlés megerősítése"
        message="Biztosan törlöd?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )

    expect(screen.getByText('Törlés megerősítése')).toBeInTheDocument()
    expect(screen.getByText('Biztosan törlöd?')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Törlés megerősítése"
        message="Biztosan törlöd?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Törlés megerősítése')).not.toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        message="Biztosan törlöd?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Törlés' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        message="Biztosan törlöd?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Mégse' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog open message="Biztosan törlöd?" onConfirm={() => {}} onCancel={onCancel} />
    )

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders a red confirm button and respects a custom confirmLabel when danger=true', () => {
    render(
      <ConfirmDialog
        open
        danger
        confirmLabel="Végleges törlés"
        message="Biztosan törlöd?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )

    const confirmButton = screen.getByRole('button', { name: 'Végleges törlés' })
    expect(confirmButton).toBeInTheDocument()
    expect(confirmButton).toHaveClass('bg-red-600')
  })

  it('does not apply the danger styling when danger=false', () => {
    render(
      <ConfirmDialog
        open
        danger={false}
        confirmLabel="Rendben"
        message="Folytatod?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )

    const confirmButton = screen.getByRole('button', { name: 'Rendben' })
    expect(confirmButton).not.toHaveClass('bg-red-600')
    expect(confirmButton).toHaveClass('btn-primary')
  })
})
