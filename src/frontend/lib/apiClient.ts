/**
 * API Client
 *
 * Axios-based HTTP client with authentication token handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import type { APIResponse, APIError } from '@shared/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

class APIClient {
  private client: AxiosInstance

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<APIError>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.removeToken()
          window.location.href = '/auth/login'
        }
        return Promise.reject(this.normalizeError(error))
      }
    )
  }

  /**
   * Get authentication token from storage
   */
  private getToken(): string | null {
    // Try localStorage first
    const localToken = localStorage.getItem('auth_token')
    if (localToken) return localToken

    // Fallback to cookie
    const cookieToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('auth_token='))
      ?.split('=')[1]

    return cookieToken || null
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token)
    // Also set as cookie for SSR compatibility
    document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Strict`
  }

  /**
   * Remove authentication token
   */
  removeToken(): void {
    localStorage.removeItem('auth_token')
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }

  /**
   * Normalize error response
   */
  private normalizeError(error: AxiosError<APIError>): Error {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error
      const message = apiError.message || 'An error occurred'
      const newError = new Error(message)
      ;(newError as any).code = apiError.code
      ;(newError as any).details = apiError.details
      ;(newError as any).status = error.response.status
      return newError
    }

    return error
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  /**
   * Upload file
   */
  async upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      }
    }

    const response = await this.client.post<T>(url, formData, config)
    return response.data
  }
}

// Export singleton instance
export const apiClient = new APIClient()

// Export class for testing
export { APIClient }
