import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  withCredentials: true,
  timeout: 10000,
})

api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login')
  }
  return Promise.reject(error)
})
export default api
