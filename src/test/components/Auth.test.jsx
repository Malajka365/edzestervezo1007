import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mock the supabase client. Auth.jsx imports `{ supabase } from '../lib/supabase'`,
// which resolves to the same module as this aliased path, so the mock intercepts it.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { session: null }, error: null })),
      signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import Auth from '@/pages/Auth'

function renderAuth() {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  )
}

describe('Auth form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the min-10-chars password hint after switching to the Regisztráció tab', async () => {
    const user = userEvent.setup()
    renderAuth()

    // Not visible on the default (login) tab.
    expect(screen.queryByText(/Minimum 10 karakter/)).not.toBeInTheDocument()

    // The Regisztráció tab button (there are two matches: tab + footer link).
    const registerTab = screen.getAllByRole('button', { name: /Regisztráció/ })[0]
    await user.click(registerTab)

    expect(screen.getByText(/Minimum 10 karakter hosszú jelszó szükséges/)).toBeInTheDocument()
  })

  it('calls signInWithPassword with the typed email and password on login submit', async () => {
    const user = userEvent.setup()
    renderAuth()

    await user.type(screen.getByLabelText(/Email cím/), 'edzo@teamflow.hu')
    await user.type(screen.getByLabelText(/Jelszó/), 'titkos123')

    // Two buttons read "Bejelentkezés" (tab + submit); pick the submit one.
    const submitButton = screen
      .getAllByRole('button', { name: /Bejelentkezés/ })
      .find((btn) => btn.getAttribute('type') === 'submit')
    await user.click(submitButton)

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'edzo@teamflow.hu',
      password: 'titkos123',
    })
  })

  it('surfaces an error message to the user when login fails', async () => {
    const user = userEvent.setup()
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Hibás bejelentkezési adatok' },
    })

    renderAuth()

    await user.type(screen.getByLabelText(/Email cím/), 'edzo@teamflow.hu')
    await user.type(screen.getByLabelText(/Jelszó/), 'rosszjelszo')

    const submitButton = screen
      .getAllByRole('button', { name: /Bejelentkezés/ })
      .find((btn) => btn.getAttribute('type') === 'submit')
    await user.click(submitButton)

    // Auth.jsx renders the error into local `message` state (no toast).
    expect(await screen.findByText('Hibás bejelentkezési adatok')).toBeInTheDocument()
  })

  it('calls signUp when submitting from the Regisztráció tab', async () => {
    const user = userEvent.setup()
    renderAuth()

    const registerTab = screen.getAllByRole('button', { name: /Regisztráció/ })[0]
    await user.click(registerTab)

    await user.type(screen.getByLabelText(/Email cím/), 'uj@teamflow.hu')
    await user.type(screen.getByLabelText(/Jelszó/), 'titkos12345')

    const submitButton = screen
      .getAllByRole('button', { name: /Regisztráció/ })
      .find((btn) => btn.getAttribute('type') === 'submit')
    await user.click(submitButton)

    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1)
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(supabase.auth.signUp.mock.calls[0][0]).toMatchObject({
      email: 'uj@teamflow.hu',
      password: 'titkos12345',
    })
  })

  it('shows the Hungarian too-short error and does not call signUp when the register password is under 10 characters', async () => {
    const user = userEvent.setup()
    renderAuth()

    const registerTab = screen.getAllByRole('button', { name: /Regisztráció/ })[0]
    await user.click(registerTab)

    await user.type(screen.getByLabelText(/Email cím/), 'rovid@teamflow.hu')
    await user.type(screen.getByLabelText(/Jelszó/), 'rovid12')

    const submitButton = screen
      .getAllByRole('button', { name: /Regisztráció/ })
      .find((btn) => btn.getAttribute('type') === 'submit')
    await user.click(submitButton)

    expect(
      await screen.findByText('A jelszónak legalább 10 karakter hosszúnak kell lennie')
    ).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })
})
