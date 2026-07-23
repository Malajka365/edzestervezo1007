import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmptyState from '@/components/ui/EmptyState'

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState
        title="Még nincs játékos"
        description="Adj hozzá játékosokat a csapatodhoz a kezdéshez."
      />
    )

    expect(screen.getByText('Még nincs játékos')).toBeInTheDocument()
    expect(
      screen.getByText('Adj hozzá játékosokat a csapatodhoz a kezdéshez.')
    ).toBeInTheDocument()
  })

  it('renders the action button and calls onAction when both actionLabel and onAction are given', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()

    render(
      <EmptyState
        title="Még nincs játékos"
        actionLabel="Új játékos hozzáadása"
        onAction={onAction}
      />
    )

    const button = screen.getByRole('button', { name: 'Új játékos hozzáadása' })
    expect(button).toBeInTheDocument()

    await user.click(button)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('renders no button when actionLabel is missing', () => {
    render(<EmptyState title="Még nincs játékos" onAction={() => {}} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders no button when onAction is missing', () => {
    render(<EmptyState title="Még nincs játékos" actionLabel="Új játékos hozzáadása" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
