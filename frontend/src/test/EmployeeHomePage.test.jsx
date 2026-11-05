import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContext'
import EmployeeHomePage from '../pages/employee/EmployeeHomePage'
import * as conversationService from '../services/conversationService'
import * as escalationService from '../services/escalationService'

vi.mock('../services/conversationService')
vi.mock('../services/escalationService')

const user = { full_name: 'Employee User', email: 'employee@example.com' }
const conversation = {
  id: 'conversation-1',
  title: 'Leave policy',
  updated_at: '2026-01-01T10:00:00Z',
  messages: [],
}

function renderWorkspace() {
  return render(
    <AuthContext.Provider value={{ user, logout: vi.fn() }}>
      <MemoryRouter>
        <EmployeeHomePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('EmployeeHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    conversationService.listConversations.mockResolvedValue([conversation])
    conversationService.getConversation.mockResolvedValue(conversation)
    conversationService.askQuestion.mockResolvedValue({
      ...conversation,
      messages: [
        { id: 'user-message', role: 'USER', content: 'What is the leave policy?', citations: [] },
        {
          id: 'assistant-message',
          role: 'ASSISTANT',
          content: 'Employees receive annual leave according to the policy.',
          citations: [{
            chunk_id: 'chunk-1',
            document_name: 'Leave Policy.pdf',
            page_number: 2,
            excerpt: 'Annual leave is available to eligible employees.',
          }],
        },
      ],
    })
    escalationService.listEscalations.mockResolvedValue([])
  })

  it('loads conversations and renders grounded citations after asking a question', async () => {
    const userActions = userEvent.setup()
    renderWorkspace()

    expect(await screen.findAllByText('Leave policy')).not.toHaveLength(0)
    const input = screen.getByPlaceholderText('Ask a policy question...')
    await userActions.type(input, 'What is the leave policy?')
    await userActions.click(screen.getByRole('button', { name: 'Send question' }))

    await waitFor(() => expect(conversationService.askQuestion).toHaveBeenCalledWith(
      'conversation-1',
      'What is the leave policy?',
    ))
    expect(await screen.findByText('Leave Policy.pdf · Page 2')).toBeInTheDocument()
  })

  it('escalates the original employee question instead of the fallback answer', async () => {
    const userActions = userEvent.setup()
    conversationService.askQuestion.mockResolvedValue({
      ...conversation,
      messages: [
        { id: 'user-message', role: 'USER', content: 'What is meant by AI?', citations: [] },
        {
          id: 'assistant-message',
          role: 'ASSISTANT',
          content: 'I could not find sufficient evidence.',
          uncertainty: 'No approved evidence met the retrieval threshold.',
          citations: [],
        },
      ],
    })
    escalationService.createEscalation.mockResolvedValue({
      id: 'escalation-1',
      question: 'What is meant by AI?',
      status: 'PENDING',
      created_at: '2026-01-01T10:00:00Z',
      responses: [],
    })
    escalationService.listEscalations
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'escalation-1',
        question: 'What is meant by AI?',
        status: 'PENDING',
        created_at: '2026-01-01T10:00:00Z',
        responses: [],
      }])

    renderWorkspace()
    const input = await screen.findByPlaceholderText('Ask a policy question...')
    await userActions.type(input, 'What is meant by AI?')
    await userActions.click(screen.getByRole('button', { name: 'Send question' }))

    const escalateButton = await screen.findByRole('button', { name: 'Escalate to HR' })
    await userActions.click(escalateButton)

    await waitFor(() => expect(escalationService.createEscalation).toHaveBeenCalledWith(
      'What is meant by AI?',
    ))
    expect(await screen.findAllByText('What is meant by AI?')).not.toHaveLength(0)
  })
})
