import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminHomePage from './pages/admin/AdminHomePage'
import EmployeeHomePage from './pages/employee/EmployeeHomePage'
import ForbiddenPage from './pages/ForbiddenPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

function LandingRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={user.roles.includes('ADMIN') ? '/admin' : '/employee'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
        <Route path="/employee" element={<EmployeeHomePage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminHomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
