import { Button, Paper, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export default function EmployeeHomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <Paper className="mx-auto max-w-3xl space-y-4 p-8">
        <Typography variant="h4">Employee workspace</Typography>
        <Typography>Welcome, {user.full_name}. The assistant workspace will be added in the next frontend phase.</Typography>
        <Button variant="outlined" onClick={handleLogout}>Sign out</Button>
      </Paper>
    </main>
  )
}
