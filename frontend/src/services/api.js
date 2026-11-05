import axios from 'axios'

let accessToken = null
let refreshSession = null
let refreshPromise = null

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function setAccessToken(token) {
  accessToken = token
}

export function setRefreshSession(handler) {
  refreshSession = handler
}

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (!error.response) return 'Unable to reach the server. Check that the backend is running.'
  const detail = error.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return fallback
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config
    const isAuthRequest = request?.url?.startsWith('/auth/')
    if (error.response?.status !== 401 || !refreshSession || request?._retry || isAuthRequest) {
      return Promise.reject(error)
    }

    request._retry = true
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null
    })
    const refreshed = await refreshPromise
    if (!refreshed) return Promise.reject(error)
    return api(request)
  },
)

export default api
