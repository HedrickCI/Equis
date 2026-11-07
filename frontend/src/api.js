// Thin wrapper over the Equis API. Keeping fetch calls in one place means the
// components stay about rendering.

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw new Error(detail.detail ?? `Request failed: ${response.status}`)
  }
  return response.json()
}

export const api = {
  createGroup: (name) =>
    request('/groups', { method: 'POST', body: JSON.stringify({ name }) }),

  getGroup: (groupId) => request(`/groups/${groupId}`),

  addMember: (groupId, member) =>
    request(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(member),
    }),

  addTask: (groupId, task) =>
    request(`/groups/${groupId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  allocate: (groupId) =>
    request(`/groups/${groupId}/allocate`, { method: 'POST' }),

  reassign: (taskId, memberId) =>
    request(`/tasks/${taskId}/assignee?member_id=${memberId ?? ''}`, {
      method: 'PATCH',
    }),
}
