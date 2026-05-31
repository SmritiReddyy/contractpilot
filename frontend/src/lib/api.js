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
  restoreVersion: (contractId, versionId) => api.post(`/contracts/${contractId}/versions/${versionId}/restore`),
  analyze: (id) => api.post(`/contracts/${id}/analyze`),
  auditTrail: (id) => api.get(`/contracts/${id}/audit`),
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

export default api
