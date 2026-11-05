import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/authContext'
import LoginPage from '../pages/auth/LoginPage'

function renderLogin(login = vi.fn().mockResolvedValue({ roles: ['EMPLOYEE'] })) {
  return {
    login,
    ...render(
      <AuthContext.Provider value={{ login }}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/employee" element={<div>Employee home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    ),
  }
}

describe('LoginPage', () => {
  it('submits credentials and redirects an employee', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockResolvedValue({ roles: ['EMPLOYEE'] })
    renderLogin(login)

    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'employee@example.com')
    await user.type(screen.getByDisplayValue(''), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(login).toHaveBeenCalledWith({
      email: 'employee@example.com',
      password: 'password123',
    })
    expect(await screen.findByText('Employee home')).toBeInTheDocument()
  })

  it('shows a useful authentication error', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockRejectedValue({
      response: { data: { detail: 'Invalid email or password.' } },
    })
    renderLogin(login)

    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'employee@example.com')
    await user.type(screen.getByDisplayValue(''), 'wrongpass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
  })
})
