import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
}

// Contracts
export const contractsApi = {
  list: () => api.get('/contracts/'),
  create: (data) => api.post('/contracts/', data),
  get: (id) => api.get(`/contracts/${id}`),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
  dashboard: () => api.get('/contracts/dashboard'),
  addSigner: (id, data) => api.post(`/contracts/${id}/signers`, data),
  revokeSigner: (id, signerId) => api.delete(`/contracts/${id}/signers/${signerId}`),
  restoreVersion: (contractId, versionId) => api.post(`/contracts/${contractId}/versions/${versionId}/restore`),
  duplicate: (id) => api.post(`/contracts/${id}/duplicate`),
  analyze: (id) => api.post(`/contracts/${id}/analyze`),
  summarize: (id) => api.post(`/contracts/${id}/summarize`),
  auditTrail: (id) => api.get(`/contracts/${id}/audit`),
  getMilestones: (id) => api.get(`/contracts/${id}/milestones`),
  createMilestone: (id, data) => api.post(`/contracts/${id}/milestones`, data),
  updateMilestone: (id, milestoneId, data) => api.patch(`/contracts/${id}/milestones/${milestoneId}`, data),
  deleteMilestone: (id, milestoneId) => api.delete(`/contracts/${id}/milestones/${milestoneId}`),
  ownerSign: (id, data) => api.post(`/contracts/${id}/owner-sign`, data),
}

// Public signing (no auth needed)
export const signingApi = {
  get: (token) => api.get(`/contracts/sign/${token}`),
  sendOtp: (token) => api.post(`/contracts/sign/${token}/send-otp`),
  verifyOtp: (token, code) => api.post(`/contracts/sign/${token}/verify-otp`, { code }),
  sign: (token, data) => api.post(`/contracts/sign/${token}`, data),
  decline: (token, reason) => api.post(`/contracts/sign/${token}/decline`, { reason }),
  certificate: (token) => api.get(`/contracts/sign/${token}/certificate`),
}

// Templates
export const templatesApi = {
  list: () => api.get('/templates/'),
  create: (data) => api.post('/templates/', data),
  get: (id) => api.get(`/templates/${id}`),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
}

// Clauses
export const clausesApi = {
  list: () => api.get('/clauses/'),
  create: (data) => api.post('/clauses/', data),
  update: (id, data) => api.put(`/clauses/${id}`, data),
  delete: (id) => api.delete(`/clauses/${id}`),
}

export default api
