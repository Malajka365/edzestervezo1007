import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Megnyitás
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Teszt ablak">
        <button type="button">Első</button>
        <button type="button">Utolsó</button>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('renders an accessible dialog into document.body', () => {
    render(
      <Modal open onClose={() => {}} title="Teszt ablak">
        tartalom
      </Modal>
    )
    const dialog = screen.getByRole('dialog', { name: 'Teszt ablak' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.parentElement.parentElement).toBe(document.body)
  })

  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Teszt ablak">
        tartalom
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('(a) calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Teszt ablak">
        tartalom
      </Modal>
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on backdrop click by default', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Teszt ablak">
        tartalom
      </Modal>
    )
    await user.click(screen.getByText('tartalom'))
    await user.click(screen.getByRole('dialog').parentElement)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on backdrop click (not dialog click) with closeOnBackdrop', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Teszt ablak" closeOnBackdrop>
        tartalom
      </Modal>
    )
    await user.click(screen.getByText('tartalom'))
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole('dialog').parentElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the dialog and (b) returns it to the trigger after close', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Megnyitás' })

    await user.click(trigger)
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('(c) Escape closes only the top-most overlay', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onCancel = vi.fn()
    render(
      <Modal open onClose={onClose} title="Külső ablak">
        <ConfirmDialog open message="Biztos?" onConfirm={() => {}} onCancel={onCancel} />
      </Modal>
    )

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('hands Escape back to the lower overlay once the top one closes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    function Stack() {
      const [confirm, setConfirm] = useState(true)
      return (
        <Modal open onClose={onClose} title="Külső ablak">
          <ConfirmDialog
            open={confirm}
            message="Biztos?"
            onConfirm={() => {}}
            onCancel={() => setConfirm(false)}
          />
        </Modal>
      )
    }
    render(<Stack />)

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('(d) Tab from the last focusable element wraps to the first', async () => {
    const user = userEvent.setup()
    render(
      <Modal
        open
        onClose={() => {}}
        title="Teszt ablak"
        footer={<button type="button">Lábléc</button>}
      >
        <button type="button">Első</button>
        <button type="button">Utolsó</button>
      </Modal>
    )
    const buttons = screen.getAllByRole('button')
    const first = buttons[0]
    const last = buttons[buttons.length - 1]

    last.focus()
    await user.tab()
    expect(first).toHaveFocus()

    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('locks body scroll while open and restores it after', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="Teszt ablak">
        x
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Modal open={false} onClose={() => {}} title="Teszt ablak">
        x
      </Modal>
    )
    expect(document.body.style.overflow).toBe('')
  })
})
