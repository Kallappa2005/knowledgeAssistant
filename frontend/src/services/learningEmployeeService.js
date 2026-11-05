import api from './api'

export async function listMyLearning() {
  const { data } = await api.get('/learning/my-courses')
  return data
}

export async function getTrainingDocument(assignmentId) {
  const response = await api.get(`/learning/assignments/${assignmentId}/document`, {
    responseType: 'blob',
  })
  return response.data
}

export async function generateLearningSummary(assignmentId) {
  const { data } = await api.post(`/learning/assignments/${assignmentId}/summary`)
  return data
}

export async function generateKnowledgeCheck(assignmentId) {
  const { data } = await api.post(`/learning/assignments/${assignmentId}/quiz`)
  return data
}

export async function submitKnowledgeCheck(assignmentId, attemptId, answers) {
  const { data } = await api.post(
    `/learning/assignments/${assignmentId}/quiz/${attemptId}/submit`,
    { answers },
  )
  return data
}

export async function markLearningComplete(assignmentId) {
  const { data } = await api.post(`/learning/assignments/${assignmentId}/complete`, {
    confirm: true,
  })
  return data
}
