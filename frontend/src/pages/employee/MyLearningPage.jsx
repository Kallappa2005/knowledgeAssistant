import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
} from '@mui/material'
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded'
import ArticleOutlined from '@mui/icons-material/ArticleOutlined'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import QuizRounded from '@mui/icons-material/QuizRounded'
import SummarizeRounded from '@mui/icons-material/SummarizeRounded'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import {
  generateKnowledgeCheck,
  generateLearningSummary,
  getTrainingDocument,
  listMyLearning,
  markLearningComplete,
  submitKnowledgeCheck,
} from '../../services/learningEmployeeService'
import { getApiErrorMessage } from '../../services/api'

const drawerWidth = 288

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusStyle(status) {
  if (status === 'COMPLETION_REPORTED' || status === 'COMPLETED') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (status === 'OVERDUE') return 'bg-rose-100 text-rose-700'
  if (status === 'IN_PROGRESS') return 'bg-indigo-100 text-indigo-700'
  return 'bg-amber-100 text-amber-700'
}

function CourseCard({ assignment, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(assignment)}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        active
          ? 'border-indigo-300 bg-indigo-50 shadow-sm'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <AutoStoriesRounded fontSize="small" />
        </div>
        <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyle(assignment.status)}`}>
          {assignment.status.replaceAll('_', ' ')}
        </span>
      </div>
      <p className="line-clamp-2 font-bold text-slate-800">{assignment.course.title}</p>
      <p className="mt-1 text-xs text-slate-500">Due {formatDate(assignment.course.due_date)}</p>
      <p className="mt-3 text-xs font-medium text-slate-400">{assignment.course.estimated_minutes} min estimated</p>
    </button>
  )
}

export default function MyLearningPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [selected, setSelected] = useState(null)
  const [summary, setSummary] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [quizResult, setQuizResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  async function loadAssignments() {
    const items = await listMyLearning()
    setAssignments(items)
    setSelected((current) => items.find((item) => item.id === current?.id) || items[0] || null)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAssignments()
        .catch((requestError) => setError(getApiErrorMessage(requestError, 'Unable to load your learning.')))
        .finally(() => setLoading(false))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  function selectAssignment(assignment) {
    setSelected(assignment)
    setSummary('')
    setQuiz(null)
    setAnswers({})
    setQuizResult(null)
    setMobileOpen(false)
  }

  async function runAction(action, successMessage) {
    if (!selected) return
    setBusy(action)
    setError('')
    try {
      await action()
      if (successMessage) setNotice(successMessage)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to complete that learning action.'))
    } finally {
      setBusy('')
    }
  }

  async function openDocument() {
    await runAction(async () => {
      const blob = await getTrainingDocument(selected.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    })
  }

  async function generateSummary() {
    await runAction(async () => {
      const result = await generateLearningSummary(selected.id)
      setSummary(result.summary)
    })
  }

  async function generateQuiz() {
    await runAction(async () => {
      const result = await generateKnowledgeCheck(selected.id)
      setQuiz(result)
      setAnswers({})
      setQuizResult(null)
    })
  }

  async function submitQuiz(event) {
    event.preventDefault()
    if (busy || quizResult || !quiz) return
    await runAction(async () => {
      const result = await submitKnowledgeCheck(
        selected.id,
        quiz.attempt_id,
        quiz.questions.map((question) => ({
          question_id: question.id,
          answer: answers[question.id] || '',
        })),
      )
      setQuizResult(result)
      await loadAssignments()
    })
  }

  async function completeCourse() {
    if (!window.confirm('I confirm that I have completed this training.')) return
    await runAction(async () => {
      await markLearningComplete(selected.id)
      await loadAssignments()
    }, 'Completion reported to HR.')
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const completedCount = useMemo(
    () => assignments.filter((item) => ['COMPLETION_REPORTED', 'COMPLETED'].includes(item.status)).length,
    [assignments],
  )

  const drawer = (
    <Box className="pka-sidebar flex h-full flex-col" sx={{ width: drawerWidth }}>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <AutoStoriesRounded fontSize="small" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">PolicyIQ</p>
          <p className="text-[10px] text-slate-500">Employee workspace</p>
        </div>
      </div>
      <div className="px-3">
        <button type="button" onClick={() => navigate('/employee')} className="mb-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white">
          Policy Assistant
        </button>
        <button type="button" className="w-full rounded-lg border border-indigo-500/25 bg-indigo-600/20 px-3 py-2 text-left text-sm font-semibold text-indigo-200">
          My Learning
        </button>
      </div>
      <div className="mt-auto border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>{user.full_name[0]}</Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-200">{user.full_name}</p>
            <p className="truncate text-[11px] text-slate-500">{user.email}</p>
          </div>
          <Tooltip title="Sign out">
            <IconButton size="small" onClick={handleLogout} sx={{ color: '#64748b' }}><LogoutRounded fontSize="small" /></IconButton>
          </Tooltip>
        </div>
      </div>
    </Box>
  )

  return (
    <Box className="flex min-h-screen bg-slate-50">
      <Box component="nav" className="hidden md:block" sx={{ width: drawerWidth, flexShrink: 0 }}>
        <Drawer variant="permanent" sx={{ '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', background: '#0d1117' } }}>{drawer}</Drawer>
      </Box>
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: drawerWidth, background: '#0d1117' } }}>{drawer}</Drawer>
      <Box className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-7">
          <div>
            <p className="text-sm font-semibold text-slate-800">My Learning</p>
            <p className="text-xs text-slate-400">Build knowledge at your own pace</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-7">
          {error && <Alert severity="error" onClose={() => setError('')} className="mb-5">{error}</Alert>}
          {loading ? (
            <div className="flex min-h-[50vh] items-center justify-center"><CircularProgress /></div>
          ) : (
            <div className="animate-fadeSlideUp space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Learning companion</p>
                  <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Keep growing, {user.full_name.split(' ')[0]}</h1>
                  <p className="mt-1 text-sm text-slate-500">Review assigned training, test your understanding, and report completion.</p>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Progress</p>
                  <p className="text-xl font-extrabold text-indigo-700">{completedCount}/{assignments.length} complete</p>
                </div>
              </div>
              {assignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
                  <AutoStoriesRounded className="mb-3 text-slate-300" sx={{ fontSize: 44 }} />
                  <p className="font-semibold text-slate-700">No courses assigned yet</p>
                  <p className="mt-1 text-sm text-slate-400">HR will add training here when it is ready.</p>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                  <div className="space-y-3">
                    {assignments.map((assignment) => <CourseCard key={assignment.id} assignment={assignment} active={selected?.id === assignment.id} onSelect={selectAssignment} />)}
                  </div>
                  {selected && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                        <div>
                          <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyle(selected.status)}`}>{selected.status.replaceAll('_', ' ')}</span>
                          <h2 className="mt-3 text-xl font-bold text-slate-900">{selected.course.title}</h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{selected.course.description}</p>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>Due <strong className="text-slate-700">{formatDate(selected.course.due_date)}</strong></p>
                          <p className="mt-1"><strong className="text-slate-700">{selected.course.estimated_minutes} min</strong> estimated</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 py-5">
                        <Button variant="outlined" startIcon={<ArticleOutlined />} onClick={openDocument} disabled={Boolean(busy)}>
                          Open training PDF
                        </Button>
                        <Button variant="contained" startIcon={<SummarizeRounded />} onClick={generateSummary} disabled={Boolean(busy)}>
                          {busy === 'summary' ? 'Generating…' : 'Generate summary'}
                        </Button>
                        <Button variant="outlined" startIcon={<QuizRounded />} onClick={generateQuiz} disabled={Boolean(busy)}>
                          {busy === 'quiz' ? 'Generating…' : 'Knowledge check'}
                        </Button>
                      </div>
                      {summary && <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4"><p className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-500">AI summary</p><p className="whitespace-pre-line text-sm leading-relaxed text-indigo-950">{summary}</p></div>}
                      {quiz && (
                        <form onSubmit={submitQuiz} className="mb-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div><p className="font-bold text-slate-800">Knowledge check</p><p className="text-xs text-slate-500">Answer all three questions, then submit.</p></div>
                          {quiz.questions.map((item, index) => (
                            <div key={item.id}>
                              <label className="mb-1 block text-sm font-semibold text-slate-700">{index + 1}. {item.question}</label>
                              <TextField fullWidth size="small" value={answers[item.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Your answer" />
                            </div>
                          ))}
                          <Button type="submit" variant="contained" disabled={Boolean(busy) || Object.keys(answers).length < 3}>Submit answers</Button>
                          {quizResult && <Alert severity={quizResult.score >= 67 ? 'success' : 'warning'}>Score: {quizResult.score}% ({quizResult.correct_answers}/{quizResult.total_questions})</Alert>}
                        </form>
                      )}
                      {selected.status !== 'COMPLETION_REPORTED' && selected.status !== 'COMPLETED' ? (
                        <Button color="success" variant="contained" startIcon={<CheckCircleRounded />} onClick={completeCourse} disabled={Boolean(busy)}>Mark as completed</Button>
                      ) : (
                        <Alert severity="success">Completion reported on {new Date(selected.completion_date).toLocaleDateString()}.</Alert>
                      )}
                    </section>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </Box>
      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice('')} message={notice} />
    </Box>
  )
}
