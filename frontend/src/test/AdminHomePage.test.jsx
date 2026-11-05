import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContext'
import AdminHomePage from '../pages/admin/AdminHomePage'
import * as adminService from '../services/adminService'

vi.mock('../services/adminService')

const user = { full_name: 'HR Administrator', email: 'admin@example.com' }

function renderAdmin() {
  return render(
    <AuthContext.Provider value={{ user, logout: vi.fn() }}>
      <MemoryRouter>
        <AdminHomePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AdminHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminService.listDocuments.mockResolvedValue([{
      id: 'document-1',
      original_filename: 'Leave Policy.pdf',
      file_size_bytes: 2048,
      status: 'PENDING',
      created_at: '2026-01-01T10:00:00Z',
    }])
    adminService.listAdminEscalations.mockResolvedValue([])
    adminService.listAuditLogs.mockResolvedValue([])
    adminService.approveDocument.mockResolvedValue({})
    adminService.uploadDocument.mockResolvedValue({})
  })

  it('shows document management and approves pending documents', async () => {
    const userActions = userEvent.setup()
    renderAdmin()

    await userActions.click(await screen.findByText('Knowledge base'))
    expect(await screen.findByText('Leave Policy.pdf')).toBeInTheDocument()
    await userActions.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(adminService.approveDocument).toHaveBeenCalledWith('document-1'))
  })
})
