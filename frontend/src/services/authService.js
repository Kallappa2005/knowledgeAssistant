import api from './api'

export async function registerUser(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function loginUser(payload) {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export async function refreshAccessToken() {
  const { data } = await api.post('/auth/refresh')
  return data
}

export async function logoutUser() {
  await api.post('/auth/logout')
}

export async function getCurrentUser(accessToken) {
  const { data } = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}
