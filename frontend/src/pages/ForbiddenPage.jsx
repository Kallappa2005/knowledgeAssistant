import { Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Typography variant="h4">Access denied</Typography>
      <Typography color="text.secondary">Your role cannot access this page.</Typography>
      <Button component={Link} to="/login" variant="contained">Return to sign in</Button>
    </main>
  )
}
