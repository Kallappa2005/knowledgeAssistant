import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Avatar, Box, Button, Checkbox, CircularProgress, Drawer, FormControlLabel, IconButton, Snackbar, TextField, Tooltip } from '@mui/material'
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded'
import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import {
  assignLearningCourse,
  createLearningCourse,
  listLearningAssignments,
  listLearningCourses,
  listLearningEmployees,
} from '../../services/learningAdminService'
import { getApiErrorMessage } from '../../services/api'

const drawerWidth = 288

function formatDate(value) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

export default function LearningManagementPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [courses, setCourses] = useState([])
  const [employees, setEmployees] = useState([])
  const [assignments, setAssignments] = useState([])
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', estimatedMinutes: 30, file: null })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  async function loadData() {
    const [courseItems, employeeItems, assignmentItems] = await Promise.all([
      listLearningCourses(),
      listLearningEmployees(),
      listLearningAssignments(),
    ])
    setCourses(courseItems)
    setEmployees(employeeItems)
    setAssignments(assignmentItems)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData()
        .catch((requestError) => setError(getApiErrorMessage(requestError, 'Unable to load learning management.')))
        .finally(() => setLoading(false))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function createCourse(event) {
    event.preventDefault()
    if (!form.file) {
      setError('Choose a training PDF first.')
      return
    }
    setBusy('create')
    setError('')
    try {
      await createLearningCourse(form)
      setForm({ title: '', description: '', dueDate: '', estimatedMinutes: 30, file: null })
      if (fileRef.current) fileRef.current.value = ''
      await loadData()
      setNotice('Course created.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create the course.'))
    } finally {
      setBusy('')
    }
  }

  async function assignCourse(courseId) {
    const assignedEmployeeIds = assignedEmployeeIdsByCourse.get(courseId) || new Set()
    const employeeIds = selectedEmployees.filter((employeeId) => !assignedEmployeeIds.has(employeeId))
    if (employeeIds.length === 0) {
      setError('Select at least one employee.')
      return
    }
    setBusy(`assign-${courseId}`)
    setError('')
    try {
      await assignLearningCourse(courseId, employeeIds)
      setSelectedEmployees([])
      await loadData()
      setNotice('Course assigned.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to assign the course.'))
    } finally {
      setBusy('')
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const selectedCourseIds = useMemo(() => new Set(assignments.map((item) => item.course_id)), [assignments])
  const assignedEmployeeIdsByCourse = (() => {
    const result = new Map()
    assignments.forEach((assignment) => {
      const employeeIds = result.get(assignment.course_id) || new Set()
      employeeIds.add(assignment.employee_id)
      result.set(assignment.course_id, employeeIds)
    })
    return result
  })()
  const drawer = (
    <Box className="pka-sidebar flex h-full flex-col" sx={{ width: drawerWidth }}>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white"><AutoStoriesRounded fontSize="small" /></div>
        <div><p className="text-sm font-bold text-white">PolicyIQ</p><p className="text-[10px] text-slate-500">Admin command center</p></div>
      </div>
      <div className="space-y-1 px-3">
        <button type="button" onClick={() => navigate('/admin')} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white">Policy administration</button>
        <button type="button" className="w-full rounded-lg border border-indigo-500/25 bg-indigo-600/20 px-3 py-2 text-left text-sm font-semibold text-indigo-200">Learning management</button>
      </div>
      <div className="mt-auto border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>{user.full_name[0]}</Avatar>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{user.full_name}</p><p className="truncate text-[11px] text-slate-500">{user.email}</p></div>
          <Tooltip title="Sign out"><IconButton size="small" onClick={handleLogout} sx={{ color: '#64748b' }}><LogoutRounded fontSize="small" /></IconButton></Tooltip>
        </div>
      </div>
    </Box>
  )

  return (
    <Box className="flex min-h-screen bg-slate-50">
      <Box component="nav" className="hidden md:block" sx={{ width: drawerWidth, flexShrink: 0 }}><Drawer variant="permanent" sx={{ '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', background: '#0d1117' } }}>{drawer}</Drawer></Box>
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: drawerWidth, background: '#0d1117' } }}>{drawer}</Drawer>
      <Box className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-7">
          <div><p className="text-sm font-semibold text-slate-800">Learning management</p><p className="text-xs text-slate-400">Create training and track employee progress</p></div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-7">
          {error && <Alert severity="error" onClose={() => setError('')} className="mb-5">{error}</Alert>}
          {loading ? <div className="flex min-h-[50vh] items-center justify-center"><CircularProgress /></div> : (
            <div className="animate-fadeSlideUp space-y-6">
              <form onSubmit={createCourse} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><CloudUploadRounded /></div><div><h1 className="font-bold text-slate-900">Create a training course</h1><p className="text-xs text-slate-500">Upload a PDF and make it available to selected employees.</p></div></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField name="title" label="Course title" value={form.title} onChange={updateForm} required />
                  <div>
                    <label htmlFor="learning-due-date" className="mb-1.5 block text-sm font-medium text-slate-600">Due date <span className="text-rose-500">*</span></label>
                    <TextField id="learning-due-date" name="dueDate" type="date" value={form.dueDate} onChange={updateForm} required fullWidth aria-label="Due date" />
                  </div>
                  <TextField name="estimatedMinutes" label="Estimated minutes" type="number" value={form.estimatedMinutes} onChange={updateForm} required inputProps={{ min: 1 }} />
                  <Button variant="outlined" component="label" sx={{ justifyContent: 'flex-start' }}>{form.file?.name || 'Choose training PDF'}<input ref={fileRef} hidden type="file" accept="application/pdf" onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} /></Button>
                  <TextField className="md:col-span-2" name="description" label="Description" value={form.description} onChange={updateForm} required multiline minRows={2} />
                </div>
                <Button type="submit" className="mt-4" variant="contained" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create course'}</Button>
              </form>
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Courses and assignments</h2><p className="text-xs text-slate-500">Assign training and review current progress.</p></div>
                {courses.length === 0 ? <p className="p-8 text-sm text-slate-500">No courses created yet.</p> : <div className="divide-y divide-slate-100">{courses.map((course) => (
                  <div key={course.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold text-slate-800">{course.title}</h3><p className="mt-1 text-xs text-slate-500">{course.description}</p><p className="mt-2 text-xs text-slate-400">Due {formatDate(course.due_date)} · {course.estimated_minutes} min</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{selectedCourseIds.has(course.id) ? 'Assigned' : 'Not assigned'}</span></div>
                    <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Employees</span>{employees.map((employee) => {
                      const alreadyAssigned = assignedEmployeeIdsByCourse.get(course.id)?.has(employee.id)
                      return <FormControlLabel key={employee.id} className="!mr-1" control={<Checkbox size="small" disabled={alreadyAssigned} checked={!alreadyAssigned && selectedEmployees.includes(employee.id)} onChange={(event) => setSelectedEmployees((current) => event.target.checked ? [...current, employee.id] : current.filter((id) => id !== employee.id))} />} label={<span className={`text-xs ${alreadyAssigned ? 'text-slate-400 line-through' : ''}`}>{employee.full_name}{alreadyAssigned ? ' (Already assigned)' : ''}</span>} />
                    })}<Button size="small" variant="outlined" onClick={() => assignCourse(course.id)} disabled={busy === `assign-${course.id}` || employees.every((employee) => assignedEmployeeIdsByCourse.get(course.id)?.has(employee.id))}>{busy === `assign-${course.id}` ? 'Assigning…' : 'Assign selected'}</Button></div>
                  </div>
                ))}</div>}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Progress</h2></div>{assignments.length === 0 ? <p className="p-8 text-sm text-slate-500">No assignments yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Course</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Score</th></tr></thead><tbody className="divide-y divide-slate-100">{assignments.map((item) => <tr key={item.id}><td className="px-5 py-3 font-medium text-slate-700">{item.employee.full_name}</td><td className="px-5 py-3 text-slate-600">{item.course.title}</td><td className="px-5 py-3"><span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{item.status.replaceAll('_', ' ')}</span></td><td className="px-5 py-3 text-slate-600">{item.knowledge_check_score ?? '—'}</td></tr>)}</tbody></table></div>}</section>
            </div>
          )}
        </main>
      </Box>
      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice('')} message={notice} />
    </Box>
  )
}
