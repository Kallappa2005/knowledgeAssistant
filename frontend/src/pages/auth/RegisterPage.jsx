import { useState } from 'react'
import { Alert, Button, Paper, TextField, Typography } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
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
      setError(requestError.response?.data?.detail || 'Unable to create the account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <Paper elevation={8} className="w-full max-w-md space-y-6 p-8">
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Create employee account
          </Typography>
          <Typography color="text.secondary">
            Public registration creates an employee account only.
          </Typography>
        </div>
        {error && <Alert severity="error">{error}</Alert>}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <TextField
            required
            fullWidth
            label="Full name"
            value={form.full_name}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
          />
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
            helperText="At least 8 characters"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <Button fullWidth size="large" variant="contained" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <Typography color="text.secondary">
          Already registered? <Link to="/login">Sign in</Link>
        </Typography>
      </Paper>
    </main>
  )
}
