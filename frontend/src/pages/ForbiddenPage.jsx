import { Button } from '@mui/material'
import { Link } from 'react-router-dom'

export default function ForbiddenPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-orb-pulse absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="animate-orb-pulse delay-300 absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="animate-scaleIn relative text-center">
        {/* Lock icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-white/10">
          <svg
            className="h-9 w-9 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-500">403 Forbidden</div>
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white">Access denied</h1>
        <p className="mb-8 text-sm text-slate-400">
          Your account doesn't have permission to view this page.
          <br />
          Please contact your administrator if you believe this is an error.
        </p>

        <Button
          component={Link}
          to="/login"
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)',
              boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
            },
          }}
        >
          Return to sign in
        </Button>
      </div>
    </main>
  )
}
