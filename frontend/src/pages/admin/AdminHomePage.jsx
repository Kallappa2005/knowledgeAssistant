import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import DashboardRounded from '@mui/icons-material/DashboardRounded'
import DescriptionRounded from '@mui/icons-material/DescriptionRounded'
import SupportAgentRounded from '@mui/icons-material/SupportAgentRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import UploadFileRounded from '@mui/icons-material/UploadFileRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import PendingActionsRounded from '@mui/icons-material/PendingActionsRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import InsertDriveFileRounded from '@mui/icons-material/InsertDriveFileRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import SchoolRounded from '@mui/icons-material/SchoolRounded'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import {
  approveDocument,
  deactivateDocument,
  listAdminEscalations,
  listAuditLogs,
  listDocuments,
  processDocument,
  respondToEscalation,
  updateEscalationStatus,
  uploadDocument,
} from '../../services/adminService'
import { getApiErrorMessage } from '../../services/api'

const DRAWER_WIDTH = 260
const documentStatuses = ['PENDING', 'PROCESSING', 'APPROVED', 'FAILED', 'DEACTIVATED']

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatRelativeDate(value) {
  const now = Date.now()
  const diff = now - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return formatDate(value)
}

function statusConfig(status) {
  const configs = {
    APPROVED:    { label: 'Approved',    bg: '#d1fae5', color: '#065f46', muiColor: 'success' },
    RESPONDED:   { label: 'Responded',   bg: '#d1fae5', color: '#065f46', muiColor: 'success' },
    CLOSED:      { label: 'Closed',      bg: '#f1f5f9', color: '#475569', muiColor: 'default' },
    FAILED:      { label: 'Failed',      bg: '#fee2e2', color: '#991b1b', muiColor: 'error' },
    DEACTIVATED: { label: 'Deactivated', bg: '#fee2e2', color: '#991b1b', muiColor: 'error' },
    PROCESSING:  { label: 'Processing',  bg: '#e0e7ff', color: '#3730a3', muiColor: 'info' },
    IN_REVIEW:   { label: 'In Review',   bg: '#e0e7ff', color: '#3730a3', muiColor: 'info' },
    PENDING:     { label: 'Pending',     bg: '#fef3c7', color: '#92400e', muiColor: 'warning' },
  }
  return configs[status] || { label: status, bg: '#f1f5f9', color: '#475569', muiColor: 'default' }
}

function StatusBadge({ status }) {
  const cfg = statusConfig(status)
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold leading-5"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 2z" fill="currentColor" opacity="0.9"/>
      <path d="M19 16l.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9L19 16z" fill="currentColor" opacity="0.6"/>
    </svg>
  )
}

function StatCard({ icon, label, value, gradient, iconBg }) {
  return (
    <div className="pka-stat-card flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm cursor-default">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon || <DescriptionRounded />}
      </div>
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
    </div>
  )
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

export default function AdminHomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState(0)
  const [documents, setDocuments] = useState([])
  const [escalations, setEscalations] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [selectedEscalation, setSelectedEscalation] = useState(null)
  const [response, setResponse] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  async function loadData() {
    const [documentList, escalationList, auditLogList] = await Promise.all([
      listDocuments(),
      listAdminEscalations(),
      listAuditLogs(),
    ])
    setDocuments(documentList)
    setEscalations(escalationList)
    setAuditLogs(auditLogList)
  }

  useEffect(() => {
    // Initial workspace hydration is an external async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'Unable to load admin workspace.')))
      .finally(() => setIsLoading(false))
  }, [])

  const filteredDocuments = useMemo(() => documents.filter((document) => {
    const matchesSearch = document.original_filename.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (!statusFilter || document.status === statusFilter)
  }), [documents, search, statusFilter])

  const filteredEscalations = useMemo(() => escalations.filter((item) => (
    item.question.toLowerCase().includes(search.toLowerCase())
      || item.status.toLowerCase().includes(search.toLowerCase())
  )), [escalations, search])

  const stats = useMemo(() => ({
    approved: documents.filter((item) => item.status === 'APPROVED').length,
    processing: documents.filter((item) => ['PENDING', 'PROCESSING'].includes(item.status)).length,
    openEscalations: escalations.filter((item) => !['CLOSED', 'RESPONDED'].includes(item.status)).length,
  }), [documents, escalations])

  async function performAction(id, action, successMessage) {
    setBusyId(id)
    setError('')
    try {
      await action()
      await loadData()
      setNotice(successMessage)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The action could not be completed.'))
    } finally {
      setBusyId('')
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDF files can be uploaded.')
      return
    }
    setUploadName(file.name)
    setUploadProgress(0)
    setIsUploadOpen(true)
    try {
      await uploadDocument(file, (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
        }
      })
      await loadData()
      setNotice(`${file.name} uploaded and awaiting review.`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Upload failed.'))
    } finally {
      setUploadName('')
      setUploadProgress(0)
      setIsUploadOpen(false)
    }
  }

  async function handleStatusChange(escalation, nextStatus) {
    await performAction(
      escalation.id,
      () => updateEscalationStatus(escalation.id, nextStatus),
      `Escalation moved to ${nextStatus.replace('_', ' ').toLowerCase()}.`,
    )
    if (nextStatus === 'CLOSED') setSelectedEscalation(null)
  }

  async function handleResponse() {
    if (!selectedEscalation || !response.trim()) return
    await performAction(
      selectedEscalation.id,
      () => respondToEscalation(selectedEscalation.id, response.trim()),
      'Response sent to the employee.',
    )
    setResponse('')
    setSelectedEscalation(null)
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const navigation = [
    { label: 'Overview', icon: <DashboardRounded sx={{ fontSize: 18 }} />, tab: 0 },
    { label: 'Knowledge base', icon: <DescriptionRounded sx={{ fontSize: 18 }} />, tab: 1 },
    {
      label: 'Escalation inbox',
      icon: <SupportAgentRounded sx={{ fontSize: 18 }} />,
      tab: 2,
      badge: stats.openEscalations,
    },
    { label: 'Audit activity', icon: <HistoryRounded sx={{ fontSize: 18 }} />, tab: 3 },
    { label: 'Learning management', icon: <SchoolRounded sx={{ fontSize: 18 }} />, route: '/admin/learning' },
  ]

  /* ── Sidebar ─────────────────────────────────────────────────────── */
  const drawer = (
    <Box
      className="pka-sidebar flex h-full flex-col"
      sx={{ width: DRAWER_WIDTH, background: '#0d1117' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
          <SparkleIcon />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">PolicyIQ</p>
          <p className="text-[10px] text-slate-500 leading-tight">Admin command center</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-0.5 px-2">
        {navigation.map((item) => {
          const isActive = activeTab === item.tab
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.route) {
                  navigate(item.route)
                } else {
                  setActiveTab(item.tab)
                }
                setMobileOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/25 font-semibold'
                  : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span className={isActive ? 'text-indigo-400' : 'text-slate-600'}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Upload quick action */}
      <div className="px-3 pb-3">
        <Button
          fullWidth
          startIcon={<UploadFileRounded sx={{ fontSize: 16 }} />}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            justifyContent: 'flex-start',
            background: 'rgba(255,255,255,0.04)',
            color: '#64748b',
            borderRadius: '10px',
            py: 1,
            fontWeight: 600,
            fontSize: '0.8125rem',
            border: '1px solid rgba(255,255,255,0.06)',
            '&:hover': { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' },
          }}
        >
          Upload PDF
        </Button>
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
            <p className="truncate text-[11px] text-slate-500 leading-tight">Admin · {user.email}</p>
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

  /* ── Tab: Overview ───────────────────────────────────────────────── */
  function renderOverview() {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    const statusProgressConfigs = {
      PENDING:     { color: '#f59e0b', bg: '#fef3c7' },
      PROCESSING:  { color: '#6366f1', bg: '#e0e7ff' },
      APPROVED:    { color: '#10b981', bg: '#d1fae5' },
      FAILED:      { color: '#ef4444', bg: '#fee2e2' },
      DEACTIVATED: { color: '#94a3b8', bg: '#f1f5f9' },
    }

    return (
      <div className="animate-fadeSlideUp space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {greeting}, {user.full_name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here's the current status of your policy knowledge base.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<DescriptionRounded sx={{ color: '#4f46e5', fontSize: 22 }} />}
            label="Total documents"
            value={documents.length}
            iconBg="bg-indigo-100"
          />
          <StatCard
            icon={<CheckCircleRounded sx={{ color: '#10b981', fontSize: 22 }} />}
            label="Approved sources"
            value={stats.approved}
            iconBg="bg-emerald-100"
          />
          <StatCard
            icon={<PendingActionsRounded sx={{ color: '#f59e0b', fontSize: 22 }} />}
            label="Processing queue"
            value={stats.processing}
            iconBg="bg-amber-100"
          />
          <StatCard
            icon={<WarningAmberRounded sx={{ color: '#ef4444', fontSize: 22 }} />}
            label="Open escalations"
            value={stats.openEscalations}
            iconBg="bg-red-100"
          />
        </div>

        {/* Two-column panels */}
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* Knowledge base health */}
          <div className="animate-fadeSlideUp delay-100 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Knowledge base health</h3>
                <p className="text-xs text-slate-500">Document lifecycle at a glance</p>
              </div>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadFileRounded sx={{ fontSize: 15 }} />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ borderColor: '#e2e8f0', color: '#475569', borderRadius: '8px', fontSize: '0.75rem', '&:hover': { borderColor: '#6366f1', color: '#4f46e5' } }}
              >
                Upload PDF
              </Button>
            </div>
            {documents.length === 0 ? (
              <EmptyState icon={<InsertDriveFileRounded />} title="No documents yet" message="Upload your first policy PDF to get started." />
            ) : (
              <div className="space-y-4">
                {documentStatuses.map((status) => {
                  const count = documents.filter((item) => item.status === status).length
                  const percent = documents.length ? (count / documents.length) * 100 : 0
                  const cfg = statusProgressConfigs[status] || {}
                  return (
                    <div key={status}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                          <span className="text-xs font-medium text-slate-700">{status.replace('_', ' ')}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">{count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${percent}%`, backgroundColor: cfg.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent escalations */}
          <div className="animate-fadeSlideUp delay-200 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900">Latest escalations</h3>
            <p className="mb-4 text-xs text-slate-500">Requests that may need attention</p>
            {escalations.length === 0 ? (
              <EmptyState icon={<SupportAgentRounded />} title="Inbox is clear" message="No employee escalations yet." />
            ) : (
              <div className="space-y-2">
                {escalations.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setSelectedEscalation(item); setActiveTab(2) }}
                    className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all duration-150 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                      <SupportAgentRounded sx={{ fontSize: 14, color: '#4f46e5' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">{item.question}</p>
                      <p className="text-[10px] text-slate-400">{formatRelativeDate(item.created_at)}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Tab: Documents ──────────────────────────────────────────────── */
  function renderDocuments() {
    return (
      <div className="animate-fadeSlideUp rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          title="Knowledge base"
          description="Upload, review, and index approved policy sources."
          action={
            <Button
              variant="contained"
              startIcon={<UploadFileRounded sx={{ fontSize: 16 }} />}
              onClick={() => fileInputRef.current?.click()}
              size="small"
            >
              Upload PDF
            </Button>
          }
        />

        {/* Search + filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 min-w-[180px]">
            <SearchRounded sx={{ fontSize: 16, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <Select
            size="small"
            displayEmpty
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              fontSize: '0.8125rem',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
              borderRadius: '8px',
              bgcolor: '#f8fafc',
            }}
          >
            <MenuItem value=""><em>All statuses</em></MenuItem>
            {documentStatuses.map((s) => (
              <MenuItem key={s} value={s} sx={{ fontSize: '0.8125rem' }}>
                {s.replace('_', ' ')}
              </MenuItem>
            ))}
          </Select>
        </div>

        {filteredDocuments.length === 0 ? (
          <EmptyState icon={<InsertDriveFileRounded />} title="No matching documents" message="Try a different search or upload a PDF." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Document</th>
                  <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Uploaded</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="pka-table-row group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-indigo-50 transition-colors">
                          <InsertDriveFileRounded sx={{ fontSize: 16, color: '#94a3b8' }} className="group-hover:!text-indigo-500 transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{document.original_filename}</p>
                          <p className="text-xs text-slate-400">{Math.round(document.file_size_bytes / 1024)} KB</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <StatusBadge status={document.status} />
                    </td>
                    <td className="py-4">
                      <p className="text-xs text-slate-500">{formatDate(document.created_at)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {document.status === 'PENDING' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => performAction(document.id, () => approveDocument(document.id), 'Document approved.')}
                            sx={{ fontSize: '0.75rem', borderColor: '#e2e8f0', color: '#10b981', '&:hover': { borderColor: '#10b981', bgcolor: '#d1fae5' } }}
                          >
                            Approve
                          </Button>
                        )}
                        {document.status === 'APPROVED' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => performAction(document.id, () => processDocument(document.id), 'Document indexed successfully.')}
                            sx={{ fontSize: '0.75rem', borderColor: '#e2e8f0', color: '#4f46e5', '&:hover': { borderColor: '#4f46e5', bgcolor: '#eef2ff' } }}
                          >
                            Index
                          </Button>
                        )}
                        {['APPROVED', 'PROCESSING'].includes(document.status) && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => performAction(document.id, () => deactivateDocument(document.id), 'Document deactivated.')}
                            sx={{ fontSize: '0.75rem', borderColor: '#e2e8f0', color: '#ef4444', '&:hover': { borderColor: '#ef4444', bgcolor: '#fee2e2' } }}
                          >
                            Deactivate
                          </Button>
                        )}
                        {busyId === document.id && <CircularProgress size={16} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  /* ── Tab: Escalations ────────────────────────────────────────────── */
  function renderEscalations() {
    return (
      <div className="animate-fadeSlideUp rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader title="Escalation inbox" description="Review employee questions and keep responses moving." />

        {/* Search */}
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            <SearchRounded sx={{ fontSize: 16, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search questions or statuses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
          {/* List */}
          <div className="max-h-[560px] overflow-y-auto border-r border-slate-100">
            {filteredEscalations.length === 0 ? (
              <EmptyState icon={<SupportAgentRounded />} title="No escalations found" message="Your support inbox is clear." />
            ) : (
              filteredEscalations.map((item) => {
                const isSelected = selectedEscalation?.id === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedEscalation(item)}
                    className={`flex w-full flex-col gap-1.5 border-b border-slate-100 px-4 py-3.5 text-left transition-all duration-150 ${
                      isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-slate-800 leading-snug">
                        {item.question}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{formatRelativeDate(item.created_at)}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Detail panel */}
          {selectedEscalation ? (
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employee request</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{selectedEscalation.question}</h3>
                </div>
                <StatusBadge status={selectedEscalation.status} />
              </div>
              <p className="mb-5 text-xs text-slate-400">
                Submitted {formatDate(selectedEscalation.created_at)}
              </p>

              {/* Response history */}
              {selectedEscalation.responses?.length > 0 && (
                <div className="mb-5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">HR Responses</p>
                  {selectedEscalation.responses.map((r) => (
                    <div key={r.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                      <p className="text-sm text-slate-700 leading-relaxed">{r.response}</p>
                      <p className="mt-1.5 text-[10px] text-slate-400">{formatDate(r.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedEscalation.status === 'PENDING' && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleStatusChange(selectedEscalation, 'IN_REVIEW')}
                    sx={{ borderColor: '#e2e8f0', color: '#4f46e5', '&:hover': { borderColor: '#4f46e5', bgcolor: '#eef2ff' } }}
                  >
                    Start review
                  </Button>
                )}
                {selectedEscalation.status === 'RESPONDED' && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleStatusChange(selectedEscalation, 'CLOSED')}
                    sx={{ borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}
                  >
                    Close request
                  </Button>
                )}
              </div>

              {/* Response composer */}
              {['PENDING', 'IN_REVIEW'].includes(selectedEscalation.status) && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-600">Write a response</p>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Write a helpful, accurate response for the employee…"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    sx={{ bgcolor: '#fff', borderRadius: 1 }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={!response.trim() || busyId === selectedEscalation.id}
                    onClick={handleResponse}
                    size="small"
                  >
                    {busyId === selectedEscalation.id ? 'Sending…' : 'Send response'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center text-slate-400">
              <SupportAgentRounded sx={{ fontSize: 40, mb: 1.5, opacity: 0.3 }} />
              <p className="text-sm font-medium">Select an escalation</p>
              <p className="text-xs">Choose a request to review and respond.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Tab: Audit ──────────────────────────────────────────────────── */
  function renderAuditLogs() {
    const actionColors = {
      UPLOAD: { bg: '#e0e7ff', color: '#3730a3' },
      APPROVE: { bg: '#d1fae5', color: '#065f46' },
      DEACTIVATE: { bg: '#fee2e2', color: '#991b1b' },
      PROCESS: { bg: '#fef3c7', color: '#92400e' },
      RESPOND: { bg: '#d1fae5', color: '#065f46' },
    }

    return (
      <div className="animate-fadeSlideUp rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader title="Audit activity" description="A transparent record of all administrative actions." />
        {auditLogs.length === 0 ? (
          <EmptyState icon={<HistoryRounded />} title="No activity yet" message="Administrative actions will appear here." />
        ) : (
          <div className="divide-y divide-slate-50 p-2">
            {auditLogs.map((log, i) => {
              const actionKey = log.action?.split('_')[0] || ''
              const colorCfg = actionColors[actionKey] || { bg: '#f1f5f9', color: '#475569' }
              return (
                <div
                  key={log.id}
                  className="animate-fadeSlideUp flex items-start gap-4 rounded-xl px-4 py-3.5 hover:bg-slate-50 transition-colors"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: colorCfg.bg }}
                    >
                      <HistoryRounded sx={{ fontSize: 14, color: colorCfg.color }} />
                    </div>
                    {i < auditLogs.length - 1 && (
                      <div className="mt-1 h-full w-px bg-slate-100" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                        style={{ backgroundColor: colorCfg.bg, color: colorCfg.color }}
                      >
                        {log.action?.replaceAll('_', ' ')}
                      </span>
                      <span className="text-xs font-medium text-slate-600">{log.resource_type}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {log.resource_id || 'system'} · {formatRelativeDate(log.created_at)}
                    </p>
                  </div>
                  <p className="shrink-0 text-[11px] text-slate-400 hidden sm:block">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ── Main layout ─────────────────────────────────────────────────── */
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
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-xs md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="font-medium text-slate-400">Admin</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-700">{navigation[activeTab].label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              System healthy
            </span>
            <Tooltip title="Refresh data">
              <IconButton
                size="small"
                onClick={() => loadData().catch(() => {})}
                sx={{ color: '#64748b' }}
              >
                <RefreshRounded sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Page content */}
        <Box className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-6">
          {error && (
            <div className="mb-5 animate-fadeSlideUp rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
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
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                <span className="pka-thinking-dot" />
                <span className="pka-thinking-dot" />
                <span className="pka-thinking-dot" />
              </div>
              <p className="text-xs text-slate-400 font-medium">Loading workspace…</p>
            </div>
          ) : (
            <>
              {activeTab === 0 && renderOverview()}
              {activeTab === 1 && renderDocuments()}
              {activeTab === 2 && renderEscalations()}
              {activeTab === 3 && renderAuditLogs()}
            </>
          )}
        </Box>
      </Box>

      {/* Hidden file input */}
      <input ref={fileInputRef} hidden type="file" accept="application/pdf" onChange={handleUpload} />

      {/* Upload progress dialog */}
      <Dialog open={isUploadOpen} PaperProps={{ sx: { borderRadius: 3, minWidth: 320, p: 1 } }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>Uploading policy PDF</DialogTitle>
        <DialogContent>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <InsertDriveFileRounded sx={{ color: '#4f46e5', fontSize: 20 }} />
            </div>
            <p className="truncate text-sm font-medium text-slate-700">{uploadName}</p>
          </div>
          <div className="pka-upload-track mb-2">
            <div className="pka-upload-bar" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-xs text-slate-400">{uploadProgress}% uploaded — please wait</p>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4500}
        onClose={() => setNotice('')}
        message={notice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
