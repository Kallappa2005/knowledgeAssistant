import api from './api'

export async function listConversations() {
  const { data } = await api.get('/conversations')
  return data
}

export async function createConversation(title) {
  const { data } = await api.post('/conversations', { title })
  return data
}

export async function getConversation(conversationId) {
  const { data } = await api.get(`/conversations/${conversationId}`)
  return data
}

export async function askQuestion(conversationId, question) {
  const { data } = await api.post(`/conversations/${conversationId}/questions`, { question })
  return data
}

export async function deleteConversation(conversationId) {
  await api.delete(`/conversations/${conversationId}`)
}
