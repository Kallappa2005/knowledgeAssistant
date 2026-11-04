import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from '../services/authService'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, finishLoading] = useReducer(() => false, true)

  const applyAuthResponse = useCallback((authResponse) => {
    setAccessToken(authResponse.access_token)
    setUser(authResponse.user)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const authResponse = await refreshAccessToken()
      applyAuthResponse(authResponse)
      return authResponse.user
    } catch {
      setAccessToken(null)
      setUser(null)
      return null
    }
  }, [applyAuthResponse])

  useEffect(() => {
    // Session restoration is an external async boundary during provider initialization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSession().finally(finishLoading)
  }, [refreshSession])

  const login = useCallback(async (credentials) => {
    const authResponse = await loginUser(credentials)
    applyAuthResponse(authResponse)
    return authResponse.user
  }, [applyAuthResponse])

  const register = useCallback(async (details) => {
    return registerUser(details)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({
    accessToken,
    user,
    isLoading,
    isAuthenticated: Boolean(accessToken && user),
    login,
    register,
    logout,
    refreshSession,
    getCurrentUser,
  }), [accessToken, user, isLoading, login, register, logout, refreshSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
