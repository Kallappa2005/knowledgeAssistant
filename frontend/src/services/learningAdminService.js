import api from './api'

export async function createLearningCourse({ title, description, dueDate, estimatedMinutes, file }) {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('description', description)
  formData.append('due_date', dueDate)
  formData.append('estimated_minutes', String(estimatedMinutes))
  formData.append('file', file)
  const { data } = await api.post('/admin/learning/courses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function listLearningCourses() {
  const { data } = await api.get('/admin/learning/courses')
  return data
}

export async function listLearningEmployees() {
  const { data } = await api.get('/admin/learning/employees')
  return data
}

export async function assignLearningCourse(courseId, employeeIds) {
  const { data } = await api.post(`/admin/learning/courses/${courseId}/assign`, {
    employee_ids: employeeIds,
  })
  return data
}

export async function listLearningAssignments() {
  const { data } = await api.get('/admin/learning/assignments')
  return data
}
