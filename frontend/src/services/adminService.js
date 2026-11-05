import api from './api'

export async function listDocuments(status) {
  const params = status ? { status_filter: status } : undefined
  const { data } = await api.get('/admin/documents', { params })
  return data
}

export async function uploadDocument(file, onUploadProgress) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/admin/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
  return data
}

export async function approveDocument(documentId) {
  const { data } = await api.patch(`/admin/documents/${documentId}/approve`)
  return data
}

export async function deactivateDocument(documentId) {
  const { data } = await api.patch(`/admin/documents/${documentId}/deactivate`)
  return data
}

export async function processDocument(documentId) {
  const { data } = await api.post(`/admin/documents/${documentId}/process`)
  return data
}

export async function listAdminEscalations() {
  const { data } = await api.get('/admin/escalations')
  return data
}

export async function updateEscalationStatus(escalationId, status) {
  const { data } = await api.patch(`/admin/escalations/${escalationId}/status`, { status })
  return data
}

export async function respondToEscalation(escalationId, response) {
  const { data } = await api.post(`/admin/escalations/${escalationId}/responses`, { response })
  return data
}

export async function listAuditLogs() {
  const { data } = await api.get('/admin/escalations/audit-logs')
  return data
}
