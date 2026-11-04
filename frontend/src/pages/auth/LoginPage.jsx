import { useState } from 'react'
import { Alert, Button, Paper, TextField, Typography } from '@mui/material'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(form)
      const destination = user.roles.includes('ADMIN') ? '/admin' : '/employee'
      navigate(location.state?.from?.pathname || destination, { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <Paper elevation={8} className="w-full max-w-md space-y-6 p-8">
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Policy Assistant
          </Typography>
          <Typography color="text.secondary">
            Sign in to your approved knowledge workspace.
          </Typography>
        </div>
        {error && <Alert severity="error">{error}</Alert>}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <TextField
            required
            fullWidth
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <TextField
            required
            fullWidth
            label="Password"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <Button fullWidth size="large" variant="contained" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <Typography color="text.secondary">
          Need an employee account? <Link to="/register">Register here</Link>
        </Typography>
      </Paper>
    </main>
  )
}
