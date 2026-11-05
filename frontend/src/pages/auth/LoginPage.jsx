import { useState } from 'react'
import { Button, IconButton, InputAdornment, TextField } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getApiErrorMessage } from '../../services/api'

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 2z" fill="currentColor" opacity="0.9"/>
      <path d="M19 16l.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9L19 16z" fill="currentColor" opacity="0.6"/>
      <path d="M5 16l.6 1.8 1.8.6-1.8.6L5 20.8l-.6-1.8-1.8-.6 1.8-.6L5 16z" fill="currentColor" opacity="0.4"/>
    </svg>
  )
}

const features = [
  { icon: '🔒', text: 'Role-based access control' },
  { icon: '📄', text: 'Answers grounded in approved PDFs' },
  { icon: '🔗', text: 'Full source citations on every answer' },
  { icon: '🧑‍💼', text: 'HR escalation when AI isn\'t enough' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(form)
      const isAdmin = user.roles.includes('ADMIN')
      const destination = isAdmin ? '/admin' : '/employee'
      const requestedPath = location.state?.from?.pathname
      const requestedPathAllowed = requestedPath
        && (isAdmin
          ? requestedPath === '/admin' || requestedPath.startsWith('/admin/')
          : requestedPath === '/employee' || requestedPath.startsWith('/employee/'))
      navigate(requestedPathAllowed ? requestedPath : destination, { replace: true, state: null })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to sign in. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-slate-950">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-orb-pulse absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="animate-orb-pulse delay-300 absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-3xl" />
        <div className="animate-orb-pulse delay-500 absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* ── Left hero panel ───────────────────────────────────────── */}
      <section className="animate-fadeIn relative hidden w-[52%] flex-col justify-between p-14 lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
            <SparkleIcon />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">PolicyIQ</span>
        </div>

        {/* Hero text */}
        <div className="max-w-lg animate-fadeSlideUp">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
            Enterprise Knowledge Platform
          </div>
          <h1 className="mb-5 text-5xl font-extrabold leading-[1.08] tracking-tight text-white">
            Policy answers,
            <br />
            <span className="pka-gradient-text">grounded in truth.</span>
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-slate-400">
            Ask any workplace policy question and get precise, cited answers directly from your company's approved documents.
          </p>
          <ul className="space-y-3">
            {features.map((f, i) => (
              <li
                key={i}
                className="animate-fadeSlideUp flex items-center gap-3 text-slate-300"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-base">{f.icon}</span>
                <span className="text-sm font-medium">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer tagline */}
        <p className="text-sm text-slate-600">Trusted knowledge. Clear decisions.</p>
      </section>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <section className="relative flex flex-1 items-center justify-center p-6 lg:p-14">
        <div className="animate-scaleIn w-full max-w-[420px]">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <SparkleIcon />
            </div>
            <span className="text-base font-bold text-white">PolicyIQ</span>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/8 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="mt-1.5 text-sm text-slate-400">Sign in to your policy workspace.</p>
            </div>

            {location.state?.registered && (
              <div className="mb-5 animate-fadeSlideUp rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300">
                ✓ Account created — you can sign in now.
              </div>
            )}
            {error && (
              <div className="mb-5 animate-fadeSlideUp rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-300">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Email address
                </label>
                <TextField
                  required
                  fullWidth
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 1.5 },
                      '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(99,102,241,0.2)' },
                    },
                    '& input': { color: '#fff' },
                    '& input::placeholder': { color: 'rgba(255,255,255,0.3)' },
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Password
                </label>
                <TextField
                  required
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  size="small"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            size="small"
                            sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff' } }}
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 1.5 },
                      '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(99,102,241,0.2)' },
                    },
                    '& input': { color: '#fff' },
                    '& input::placeholder': { color: 'rgba(255,255,255,0.3)' },
                  }}
                />
              </div>
              <Button
                fullWidth
                size="large"
                variant="contained"
                type="submit"
                disabled={isSubmitting}
                className="pka-btn-glow"
                sx={{
                  mt: 1,
                  py: 1.4,
                  fontSize: '0.9375rem',
                  background: isSubmitting
                    ? undefined
                    : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)',
                    boxShadow: '0 4px 20px rgba(79,70,229,0.5)',
                  },
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="pka-thinking-dot" />
                    <span className="pka-thinking-dot" />
                    <span className="pka-thinking-dot" />
                  </span>
                ) : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
