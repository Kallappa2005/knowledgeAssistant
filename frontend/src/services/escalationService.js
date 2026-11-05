import api from './api'

export async function listEscalations() {
  const { data } = await api.get('/escalations')
  return data
}

export async function createEscalation(question) {
  const { data } = await api.post('/escalations', { question })
  return data
}

export async function deleteEscalation(escalationId) {
  await api.delete(`/escalations/${escalationId}`)
}
