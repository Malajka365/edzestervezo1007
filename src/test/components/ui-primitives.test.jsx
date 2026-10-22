import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Chip from '@/components/ui/Chip'
import Tabs from '@/components/ui/Tabs'

describe('Button', () => {
  it('defaults to type="button"', () => {
    render(<Button>Mentés</Button>)
    expect(screen.getByRole('button', { name: 'Mentés' })).toHaveAttribute('type', 'button')
  })

  it('is disabled and shows a spinner while loading', () => {
    render(
      <Button loading icon={Plus}>
        Mentés
      </Button>
    )
    expect(screen.getByRole('button', { name: /Mentés/ })).toBeDisabled()
    expect(screen.getByRole('status', { name: 'Betöltés' })).toBeInTheDocument()
  })

  it('does not fire onClick while loading', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Mentés
      </Button>
    )
    await user.click(screen.getByRole('button', { name: /Mentés/ }))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('IconButton', () => {
  it('uses label as accessible name and title', () => {
    render(<IconButton icon={Plus} label="Hozzáadás" />)
    const btn = screen.getByRole('button', { name: 'Hozzáadás' })
    expect(btn).toHaveAttribute('title', 'Hozzáadás')
    expect(btn).toHaveAttribute('type', 'button')
  })
})

describe('Chip', () => {
  it('exposes aria-pressed according to selected', () => {
    const { rerender } = render(<Chip selected>Erő</Chip>)
    expect(screen.getByRole('button', { name: 'Erő' })).toHaveAttribute('aria-pressed', 'true')
    rerender(<Chip>Erő</Chip>)
    expect(screen.getByRole('button', { name: 'Erő' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Tabs', () => {
  const items = [
    { id: 'a', label: 'Első' },
    { id: 'b', label: 'Második' },
    { id: 'c', label: 'Harmadik' },
  ]

  function Harness({ onChange }) {
    const [value, setValue] = useState('a')
    return (
      <Tabs
        items={items}
        value={value}
        onChange={(id) => {
          onChange(id)
          setValue(id)
        }}
      />
    )
  }

  it('marks the active tab with aria-selected', () => {
    render(<Tabs items={items} value="b" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Második' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Első' })).toHaveAttribute('aria-selected', 'false')
  })

  it('moves selection with ArrowRight and calls onChange with the next id', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    screen.getByRole('tab', { name: 'Első' }).focus()
    await user.keyboard('{ArrowRight}')

    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.getByRole('tab', { name: 'Második' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Második' })).toHaveFocus()
  })

  it('wraps around with ArrowLeft on the first tab', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    screen.getByRole('tab', { name: 'Első' }).focus()
    await user.keyboard('{ArrowLeft}')

    expect(onChange).toHaveBeenCalledWith('c')
  })
})
