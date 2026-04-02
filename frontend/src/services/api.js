import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ── Axios Instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Request interceptor - attach JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor - handle 401 / token refresh
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await axios.post(`${BASE_URL}/token/refresh/`, { refresh })
        localStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  googleAuth: (data) => api.post('/auth/google/', data),
  profile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (data) => api.post('/auth/change-password/', data),
}

// ── Conversations ─────────────────────────────────────────────────────────────
export const conversationApi = {
  list: (params) => api.get('/conversations/', { params }),
  get: (id) => api.get(`/conversations/${id}/`),
  create: (data) => api.post('/conversations/', data),
  update: (id, data) => api.patch(`/conversations/${id}/`, data),
  delete: (id) => api.delete(`/conversations/${id}/`),
  star: (id) => api.post(`/conversations/${id}/star/`),
  archive: (id) => api.post(`/conversations/${id}/archive/`),
  share: (id) => api.post(`/conversations/${id}/share/`),
  recent: () => api.get('/conversations/recent/'),
  starred: () => api.get('/conversations/starred/'),
}

// ── Chat / Messages ───────────────────────────────────────────────────────────
export const chatApi = {
  // Streaming - returns fetch response for SSE
  sendMessage: async (data) => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${BASE_URL}/chat/send/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    return response
  },
  regenerate: (messageId) => api.post(`/chat/messages/${messageId}/regenerate/`),
  feedback: (messageId, data) => api.post(`/chat/messages/${messageId}/feedback/`, data),
}

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectApi = {
  list: () => api.get('/projects/'),
  get: (id) => api.get(`/projects/${id}/`),
  create: (data) => api.post('/projects/', data),
  update: (id, data) => api.patch(`/projects/${id}/`, data),
  delete: (id) => api.delete(`/projects/${id}/`),
  star: (id) => api.post(`/projects/${id}/star/`),
  archive: (id) => api.post(`/projects/${id}/archive/`),
}

// ── Artifacts ─────────────────────────────────────────────────────────────────
export const artifactApi = {
  list: () => api.get('/artifacts/'),
  get: (id) => api.get(`/artifacts/${id}/`),
  create: (data) => api.post('/artifacts/', data),
  update: (id, data) => api.patch(`/artifacts/${id}/`, data),
  delete: (id) => api.delete(`/artifacts/${id}/`),
  versions: (id) => api.get(`/artifacts/${id}/versions/`),
  publish: (id) => api.post(`/artifacts/${id}/publish/`),
}

// ── Search ────────────────────────────────────────────────────────────────────
export const searchApi = {
  search: (q) => api.get('/search/', { params: { q } }),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  getSubscription: () => api.get('/subscriptions/'),
  mpesa: (data) => api.post('/payments/mpesa/', data),
  stripe: (data) => api.post('/payments/stripe/', data),
  paypal: (data) => api.post('/payments/paypal/', data),
  history: () => api.get('/payments/history/'),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationApi = {
  list: () => api.get('/notifications/'),
  markAllRead: () => api.patch('/notifications/'),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard/'),
  metrics: (days = 30) => api.get('/admin/metrics/', { params: { days } }),

  // Users
  users: (params) => api.get('/admin/users/', { params }),
  toggleUser: (id) => api.post(`/admin/users/${id}/toggle_active/`),
  changeUserPlan: (id, plan) => api.post(`/admin/users/${id}/change_plan/`, { plan }),

  // Training
  datasets: () => api.get('/admin/training/datasets/'),
  createDataset: (data) => api.post('/admin/training/datasets/', data),
  uploadSamples: (id, data) => api.post(`/admin/training/datasets/${id}/bulk_upload/`, data),

  samples: (params) => api.get('/admin/training/samples/', { params }),
  reviewSample: (id, data) => api.post(`/admin/training/samples/${id}/review/`, data),

  trainingRuns: () => api.get('/admin/training/runs/'),
  createRun: (data) => api.post('/admin/training/runs/', data),
  startRun: (id) => api.post(`/admin/training/runs/${id}/start/`),
  pauseRun: (id) => api.post(`/admin/training/runs/${id}/pause/`),
  cancelRun: (id) => api.post(`/admin/training/runs/${id}/cancel/`),
  runMetrics: (id) => api.get(`/admin/training/runs/${id}/metrics/`),

  benchmarks: (params) => api.get('/admin/benchmarks/', { params }),
  accuracyReport: (model) => api.get('/admin/benchmarks/accuracy_report/', { params: { model } }),
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
export const createChatSocket = (conversationId) => {
  const token = localStorage.getItem('access_token')
  const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
  const path = conversationId ? `/ws/chat/${conversationId}/` : '/ws/chat/'
  return new WebSocket(`${wsBase}${path}?token=${token}`)
}

export const createTrainingSocket = (runId) => {
  const token = localStorage.getItem('access_token')
  const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
  return new WebSocket(`${wsBase}/ws/training/${runId}/?token=${token}`)
}

export default api