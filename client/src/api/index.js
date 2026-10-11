import axios from 'axios'

// Both client and server are on the same domain in production.
// In development, the Vite proxy handles /api → localhost:3001.
const api = axios.create({ baseURL: '/api' })

export const getCustomers = (params = {}) => api.get('/customers', { params }).then(r => r.data)
export const getCustomer = (id) => api.get(`/customers/${id}`).then(r => r.data)
export const createCustomer = (data) => api.post('/customers', data).then(r => r.data)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then(r => r.data)
export const deleteCustomer = (id) => api.delete(`/customers/${id}`).then(r => r.data)

export const getProperties = (params = {}) => api.get('/properties', { params }).then(r => r.data)
export const getProperty = (id) => api.get(`/properties/${id}`).then(r => r.data)
export const createProperty = (data) => api.post('/properties', data).then(r => r.data)
export const updateProperty = (id, data) => api.put(`/properties/${id}`, data).then(r => r.data)
export const deleteProperty = (id) => api.delete(`/properties/${id}`).then(r => r.data)

export const findMatches = (data) => api.post('/matchmaking/find', data).then(r => r.data)

export const getDeals = (params = {}) => api.get('/deals', { params }).then(r => r.data)
export const getDealStats = () => api.get('/deals/stats').then(r => r.data)
export const getDeal = (id) => api.get(`/deals/${id}`).then(r => r.data)
export const createDeal = (data) => api.post('/deals', data).then(r => r.data)
export const updateDeal = (id, data) => api.put(`/deals/${id}`, data).then(r => r.data)
export const deleteDeal = (id) => api.delete(`/deals/${id}`).then(r => r.data)

export const getSettings = () => api.get('/settings').then(r => r.data)
export const saveSettings = (data) => api.put('/settings', data).then(r => r.data)

export async function getDashboardStats() {
  const res = await api.get('/deals/dashboard-stats');
  return res.data;
}
