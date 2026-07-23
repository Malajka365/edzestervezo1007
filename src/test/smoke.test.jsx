import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '@/components/LoadingSpinner'

describe('test infrastructure smoke test', () => {
  it('renders LoadingSpinner and finds the loading text in the document', () => {
    render(<LoadingSpinner size="xs" />)

    expect(screen.getByText('Betöltés...')).toBeInTheDocument()
  })
})
