import { useState } from 'react'
import { Button, IconButton, InputAdornment, TextField } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { Link, useNavigate } from 'react-router-dom'
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

function PasswordStrengthBar({ password }) {
  const strength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  })()

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981']

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="mb-1 flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= strength ? colors[strength] : '#e2e8f0' }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: colors[strength] }}>
        {labels[strength]}
      </p>
    </div>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await register(form)
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create the account.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const darkInputSx = {
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
    '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)', marginLeft: 0 },
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-orb-pulse absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="animate-orb-pulse delay-400 absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-violet-500/15 blur-3xl" />
      </div>

      <div className="animate-scaleIn relative w-full max-w-[440px]">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl animate-float">
            <SparkleIcon />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Employee access to Policy Assistant</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 animate-fadeSlideUp rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-300">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Full name</label>
              <TextField
                required
                fullWidth
                autoComplete="name"
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                size="small"
                sx={darkInputSx}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Email address</label>
              <TextField
                required
                fullWidth
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                size="small"
                sx={darkInputSx}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
              <TextField
                required
                fullWidth
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
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
                sx={darkInputSx}
              />
              <PasswordStrengthBar password={form.password} />
            </div>

            <Button
              fullWidth
              size="large"
              variant="contained"
              type="submit"
              disabled={isSubmitting}
              sx={{
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
              ) : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Trust note */}
        <p className="mt-5 text-center text-xs text-slate-600">
          By creating an account you agree to our company's data usage policy.
        </p>
      </div>
    </main>
  )
}
