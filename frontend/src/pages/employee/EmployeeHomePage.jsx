import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Chip,
  Drawer,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SendRounded from '@mui/icons-material/SendRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import SupportAgentRounded from '@mui/icons-material/SupportAgentRounded'
import ArticleOutlined from '@mui/icons-material/ArticleOutlined'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import {
  askQuestion,
  createConversation,
  getConversation,
  listConversations,
  deleteConversation,
} from '../../services/conversationService'
import {
  createEscalation,
  deleteEscalation,
  listEscalations,
} from '../../services/escalationService'
import { getApiErrorMessage } from '../../services/api'

const DRAWER_WIDTH = 288

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatRelativeTime(value) {
  const now = Date.now()
  const diff = now - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return formatDate(value)
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 2z" fill="currentColor" opacity="0.9"/>
      <path d="M19 16l.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9L19 16z" fill="currentColor" opacity="0.6"/>
    </svg>
  )
}

function EscalationStatusBadge({ status }) {
  const configs = {
    PENDING: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
    IN_REVIEW: { label: 'In Review', bg: '#e0e7ff', color: '#3730a3' },
    RESPONDED: { label: 'Responded', bg: '#d1fae5', color: '#065f46' },
    CLOSED: { label: 'Closed', bg: '#f1f5f9', color: '#475569' },
  }
  const cfg = configs[status] || { label: status, bg: '#f1f5f9', color: '#475569' }
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function CitationCard({ citation }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="pka-citation w-full cursor-pointer p-3 text-left transition-all"
    >
      <div className="flex items-start gap-2">
        <ArticleOutlined sx={{ fontSize: 15, color: '#6366f1', mt: 0.1, flexShrink: 0 }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-700">
            {citation.document_name}
            {citation.page_number ? ` · p.${citation.page_number}` : ''}
          </p>
          {open && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500 animate-fadeSlideUp">
              {citation.excerpt}
            </p>
          )}
        </div>
        <ExpandMoreRounded
          sx={{
            fontSize: 16,
            color: '#94a3b8',
            flexShrink: 0,
            transition: 'transform 200ms',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </div>
    </button>
  )
}

function MessageBubble({ message, escalationQuestion, onEscalate }) {
  const isUser = message.role === 'USER'

  if (isUser) {
    return (
      <div className="flex justify-end animate-fadeSlideUp">
        <div className="pka-bubble-user max-w-[75%] px-5 py-3.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start animate-fadeSlideUp">
      <div className="pka-bubble-ai max-w-[85%] space-y-3 p-5">
        <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">{message.content}</p>

        {message.uncertainty && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <span className="text-sm">⚠️</span>
            <p className="text-xs font-medium text-amber-800">{message.uncertainty}</p>
          </div>
        )}

        {message.citations?.length > 0 && (
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Sources
            </p>
            {message.citations.map((c) => (
              <CitationCard key={c.chunk_id} citation={c} />
            ))}
          </div>
        )}

        {message.uncertainty && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<SupportAgentRounded sx={{ fontSize: 15 }} />}
            onClick={() => onEscalate(escalationQuestion)}
            disabled={!escalationQuestion}
            sx={{
              borderColor: '#e2e8f0',
              color: '#475569',
              fontSize: '0.75rem',
              borderRadius: '8px',
              '&:hover': { borderColor: '#6366f1', color: '#4f46e5', bgcolor: '#eef2ff' },
            }}
          >
            Escalate to HR
          </Button>
        )}
      </div>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="pka-bubble-ai flex items-center gap-3 px-5 py-4">
        <div className="flex gap-1">
          <span className="pka-thinking-dot" />
          <span className="pka-thinking-dot" />
          <span className="pka-thinking-dot" />
        </div>
        <span className="text-xs text-slate-400 font-medium">Reviewing policy documents…</span>
      </div>
    </div>
  )
}

function EmptyConversation() {
  const prompts = [
    'What is our work-from-home policy?',
    'How many vacation days do I get?',
    'What\'s the process for filing an expense report?',
    'What are the guidelines for performance reviews?',
  ]
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-fadeSlideUp">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg animate-float">
        <SparkleIcon />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-800">How can I help?</h3>
      <p className="mb-7 max-w-sm text-sm text-slate-500">
        Ask any workplace policy question and I'll give you a cited answer from approved company documents.
      </p>
      <div className="grid w-full max-w-sm gap-2">
        {prompts.map((p, i) => (
          <div
            key={i}
            className="animate-fadeSlideUp rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-600 shadow-xs hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-150 cursor-default select-none"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {p}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EmployeeHomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [escalations, setEscalations] = useState([])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [escalationsOpen, setEscalationsOpen] = useState(false)

  const currentTitle = useMemo(
    () => currentConversation?.title || 'New conversation',
    [currentConversation],
  )

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation?.messages, isSending])

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [conversationList, escalationList] = await Promise.all([
          listConversations(),
          listEscalations(),
        ])
        setConversations(conversationList)
        setEscalations(escalationList)
        if (conversationList.length > 0) {
          setCurrentConversation(await getConversation(conversationList[0].id))
        } else {
          const conversation = await createConversation('New conversation')
          setCurrentConversation(conversation)
          setConversations([conversation])
        }
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load your workspace.'))
      } finally {
        setIsLoading(false)
      }
    }
    loadWorkspace()
  }, [])

  async function handleSelectConversation(id) {
    setMobileOpen(false)
    setError('')
    try {
      setCurrentConversation(await getConversation(id))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to open that conversation.'))
    }
  }

  async function handleNewConversation() {
    setError('')
    try {
      const conversation = await createConversation('New conversation')
      setConversations((items) => [conversation, ...items])
      setCurrentConversation(conversation)
      setMobileOpen(false)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create a conversation.'))
    }
  }

  async function handleDeleteConversation(event, conversationId) {
    event.stopPropagation()
    if (!window.confirm('Delete this conversation and all its messages?')) return
    try {
      await deleteConversation(conversationId)
      const remaining = conversations.filter((item) => item.id !== conversationId)
      if (currentConversation?.id === conversationId) {
        if (remaining.length > 0) {
          setCurrentConversation(await getConversation(remaining[0].id))
        } else {
          const conversation = await createConversation('New conversation')
          setCurrentConversation(conversation)
          remaining.push(conversation)
        }
      }
      setConversations(remaining)
      setNotice('Conversation deleted.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to delete the conversation.'))
    }
  }

  async function handleDeleteEscalation(escalationId) {
    if (!window.confirm('Delete this closed HR request?')) return
    try {
      await deleteEscalation(escalationId)
      setEscalations((items) => items.filter((item) => item.id !== escalationId))
      setNotice('Closed HR request deleted.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to delete the HR request.'))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || !currentConversation || isSending) return
    setIsSending(true)
    setError('')
    try {
      const updatedConversation = await askQuestion(currentConversation.id, trimmedQuestion)
      setCurrentConversation(updatedConversation)
      setQuestion('')
      setConversations((items) => items.map((item) => (
        item.id === updatedConversation.id
          ? { ...item, title: item.title || trimmedQuestion.slice(0, 60), updated_at: updatedConversation.updated_at }
          : item
      )))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to get an answer right now.'))
    } finally {
      setIsSending(false)
    }
  }

  async function handleEscalate(text) {
    const trimmedQuestion = text?.trim()
    if (!trimmedQuestion) {
      setError('The original question could not be found. Please ask it again before escalating.')
      return
    }
    try {
      await createEscalation(trimmedQuestion)
      setNotice('Your question was sent to the HR support queue.')
      setEscalations(await listEscalations())
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create an escalation.'))
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  const openEscalations = escalations.filter((e) => !['CLOSED'].includes(e.status))

  /* ── Sidebar Content ───────────────────────────────────────────── */
  const drawer = (
    <Box className="pka-sidebar flex h-full flex-col" sx={{ width: DRAWER_WIDTH }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
          <SparkleIcon />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">PolicyIQ</p>
          <p className="text-[10px] text-slate-500 leading-tight">Employee workspace</p>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-3">
        <Button
          fullWidth
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={handleNewConversation}
          sx={{
            justifyContent: 'flex-start',
            background: 'rgba(99,102,241,0.15)',
            color: '#a5b4fc',
            borderRadius: '10px',
            py: 1,
            fontWeight: 600,
            fontSize: '0.8125rem',
            border: '1px solid rgba(99,102,241,0.25)',
            '&:hover': {
              background: 'rgba(99,102,241,0.25)',
              color: '#c7d2fe',
            },
          }}
        >
          New conversation
        </Button>
        <Button
          fullWidth
          startIcon={<AutoStoriesRounded sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/employee/learning')}
          sx={{
            justifyContent: 'flex-start',
            color: '#94a3b8',
            borderRadius: '10px',
            py: 1,
            mt: 1,
            fontWeight: 600,
            fontSize: '0.8125rem',
            '&:hover': { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0' },
          }}
        >
          My learning
        </Button>
      </div>

      {/* Conversations */}
      <div className="mb-1 px-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Chats</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.map((conv) => {
          const isActive = conv.id === currentConversation?.id
          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => handleSelectConversation(conv.id)}
              className={`group mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/20 border border-indigo-500/30'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium leading-tight ${isActive ? 'text-indigo-200' : 'text-slate-300'}`}>
                  {conv.title || 'Untitled conversation'}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {formatRelativeTime(conv.updated_at)}
                </p>
              </div>
              <Tooltip title="Delete" placement="right">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Delete ${conv.title || 'conversation'}`}
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteConversation(e, conv.id) }}
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-all hover:bg-white/10 hover:text-red-400"
                >
                  <DeleteOutlineRounded sx={{ fontSize: 15 }} />
                </span>
              </Tooltip>
            </button>
          )
        })}
      </div>

      {/* HR Escalations section */}
      <div className="border-t border-white/5">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-3 text-left"
          onClick={() => setEscalationsOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <SupportAgentRounded sx={{ fontSize: 15, color: '#64748b' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">HR Requests</span>
          </div>
          <div className="flex items-center gap-1.5">
            {openEscalations.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {openEscalations.length}
              </span>
            )}
            <ExpandMoreRounded sx={{ fontSize: 16, color: '#475569', transition: 'transform 200ms', transform: escalationsOpen ? 'rotate(180deg)' : 'none' }} />
          </div>
        </button>

        {escalationsOpen && (
          <div className="max-h-44 overflow-y-auto px-3 pb-3 space-y-1.5 animate-fadeSlideUp">
            {escalations.length === 0 ? (
              <p className="px-2 text-xs text-slate-600">No requests submitted.</p>
            ) : (
              escalations.map((esc) => (
                <div key={esc.id} className="rounded-lg bg-white/4 border border-white/5 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-xs text-slate-300 leading-relaxed">{esc.question}</p>
                    <EscalationStatusBadge status={esc.status} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600">{formatDate(esc.created_at)}</p>
                  {esc.responses?.length > 0 && (
                    <p className="mt-1.5 line-clamp-1 text-[10px] text-emerald-400">
                      ↩ HR: {esc.responses[esc.responses.length - 1].response}
                    </p>
                  )}
                  {esc.status === 'CLOSED' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEscalation(esc.id)}
                      className="mt-1.5 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* User section */}
      <div className="border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: '0.8125rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            }}
          >
            {user.full_name[0]}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-200 leading-tight">{user.full_name}</p>
            <p className="truncate text-[11px] text-slate-500 leading-tight">{user.email}</p>
          </div>
          <Tooltip title="Sign out" placement="top">
            <IconButton
              size="small"
              onClick={handleLogout}
              sx={{ color: '#475569', '&:hover': { color: '#94a3b8', bgcolor: 'rgba(255,255,255,0.05)' } }}
            >
              <LogoutRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </Box>
  )

  /* ── Main layout ───────────────────────────────────────────────── */
  return (
    <Box className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <Box component="nav" className="hidden md:block" sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
        <Drawer
          variant="permanent"
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              background: '#0d1117',
              border: 'none',
              borderRight: '1px solid rgba(255,255,255,0.05)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Mobile sidebar */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, background: '#0d1117', border: 'none' } }}
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-xs md:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{currentTitle}</p>
            <p className="text-xs text-slate-400">Answers grounded in approved policy documents</p>
          </div>
        </div>

        {/* Chat area */}
        <Box className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-4 md:p-6">
          {error && (
            <div className="mb-4 animate-fadeSlideUp rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              <span className="font-semibold">Error: </span>{error}
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-3 text-xs font-bold text-red-400 hover:text-red-600"
              >
                Dismiss
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                <span className="pka-thinking-dot" />
                <span className="pka-thinking-dot" />
                <span className="pka-thinking-dot" />
              </div>
              <p className="text-xs text-slate-400 font-medium">Loading workspace…</p>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto pb-4">
                {currentConversation?.messages?.length === 0 && <EmptyConversation />}
                {currentConversation?.messages?.map((message, index, messages) => {
                  const escalationQuestion = [...messages]
                    .slice(0, index)
                    .reverse()
                    .find((item) => item.role === 'USER')?.content
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      escalationQuestion={escalationQuestion}
                      onEscalate={handleEscalate}
                    />
                  )
                })}
                {isSending && <ThinkingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="mt-4">
                <form
                  onSubmit={handleSubmit}
                  className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-md transition-shadow focus-within:shadow-lg focus-within:border-indigo-300"
                >
                  <TextField
                    fullWidth
                    multiline
                    maxRows={5}
                    placeholder="Ask a policy question… (Shift+Enter for new line)"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                    inputProps={{ maxLength: 2000 }}
                    variant="standard"
                    sx={{
                      '& .MuiInput-root': {
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.875rem',
                        '&::before': { display: 'none' },
                        '&::after': { display: 'none' },
                      },
                      '& textarea': { color: '#1e293b', lineHeight: 1.6 },
                      '& textarea::placeholder': { color: '#94a3b8' },
                    }}
                  />
                  <Tooltip title="Send (Enter)" placement="top">
                    <span>
                      <IconButton
                        type="submit"
                        disabled={!question.trim() || isSending}
                        aria-label="Send question"
                        sx={{
                          mb: 0.5,
                          width: 38,
                          height: 38,
                          background: question.trim() && !isSending
                            ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                            : '#f1f5f9',
                          color: question.trim() && !isSending ? '#fff' : '#94a3b8',
                          borderRadius: '10px',
                          flexShrink: 0,
                          transition: 'all 200ms ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #4338ca, #4f46e5)',
                            boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
                          },
                          '&.Mui-disabled': { background: '#f1f5f9', color: '#cbd5e1' },
                        }}
                      >
                        {isSending ? (
                          <CircularProgress size={16} sx={{ color: '#94a3b8' }} />
                        ) : (
                          <SendRounded sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </form>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  {escalations.length > 0
                    ? `${escalations.length} HR request${escalations.length === 1 ? '' : 's'} submitted`
                    : 'Answers are based on approved policy documents only. Do not share personal information.'}
                </p>
              </div>
            </>
          )}
        </Box>
      </Box>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={5000}
        onClose={() => setNotice('')}
        message={notice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
