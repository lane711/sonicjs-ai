/**
 * API Service Layer
 *
 * Centralized service for making API calls to the backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios'

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for authentication
})

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add any global request configuration here
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

// Content API
export const contentApi = {
  getAll: async (filters?: { search?: string; type?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.status) params.append('status', filters.status)

    const response = await apiClient.get(`/content?${params.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/content/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await apiClient.post('/content', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/content/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/content/${id}`)
    return response.data
  },
}

// Media API
export const mediaApi = {
  getAll: async (filters?: { search?: string; type?: string }) => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.type) params.append('type', filters.type)

    const response = await apiClient.get(`/media?${params.toString()}`)
    return response.data
  },

  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/media/${id}`)
    return response.data
  },
}

// Users API
export const usersApi = {
  getAll: async (filters?: { search?: string; role?: string }) => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.role) params.append('role', filters.role)

    const response = await apiClient.get(`/users?${params.toString()}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await apiClient.post('/users', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/users/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`)
    return response.data
  },
}

// Plugins API
export const pluginsApi = {
  getAll: async () => {
    const response = await apiClient.get('/plugins')
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/plugins/${id}`)
    return response.data
  },

  install: async (name: string) => {
    const response = await apiClient.post('/plugins/install', { name })
    return response.data
  },

  uninstall: async (id: string) => {
    const response = await apiClient.delete(`/plugins/${id}`)
    return response.data
  },

  updateSettings: async (id: string, settings: any) => {
    const response = await apiClient.put(`/plugins/${id}/settings`, settings)
    return response.data
  },
}

// Activity Logs API
export const logsApi = {
  getAll: async (filters?: { search?: string; type?: string; userId?: string }) => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.userId) params.append('userId', filters.userId)

    const response = await apiClient.get(`/logs?${params.toString()}`)
    return response.data
  },
}

// Settings API
export const settingsApi = {
  get: async () => {
    const response = await apiClient.get('/settings')
    return response.data
  },

  update: async (data: any) => {
    const response = await apiClient.put('/settings', data)
    return response.data
  },
}

export default apiClient
