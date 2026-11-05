import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/authContext'
import ProtectedRoute from '../routes/ProtectedRoute'

function renderProtected(authValue, initialEntry = '/employee') {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
            <Route path="/employee" element={<div>Employee workspace</div>} />
          </Route>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route path="/forbidden" element={<div>Forbidden screen</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    renderProtected({ isLoading: false, isAuthenticated: false, user: null })
    expect(screen.getByText('Login screen')).toBeInTheDocument()
  })

  it('blocks authenticated users with the wrong role', () => {
    renderProtected({
      isLoading: false,
      isAuthenticated: true,
      user: { roles: ['ADMIN'] },
    })
    expect(screen.getByText('Forbidden screen')).toBeInTheDocument()
  })

  it('renders the protected page for an allowed role', () => {
    renderProtected({
      isLoading: false,
      isAuthenticated: true,
      user: { roles: ['EMPLOYEE'] },
    })
    expect(screen.getByText('Employee workspace')).toBeInTheDocument()
  })
})
