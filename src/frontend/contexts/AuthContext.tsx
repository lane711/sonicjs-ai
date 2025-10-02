/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/lib/apiClient'
import type { User, LoginCredentials, AuthResponse } from '@shared/types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing auth on mount
  useEffect(() => {
    checkAuth()
  }, [])

  /**
   * Check if user is authenticated
   */
  async function checkAuth() {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      // Verify token with backend - returns {user: {...}}
      const response = await apiClient.get<{ user: User }>('/api/auth/me')
      setUser(response.user)
    } catch (error) {
      // Token invalid or expired
      apiClient.removeToken()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Login with credentials
   */
  async function login(credentials: LoginCredentials) {
    try {
      // apiClient.post now returns T directly (unwrapped from axios response)
      // Backend returns {user: {...}, token: "..."}
      const authData = await apiClient.post<AuthResponse>('/api/auth/login', credentials)

      if (!authData || !authData.token || !authData.user) {
        throw new Error('Invalid response from server')
      }

      // Store token
      apiClient.setToken(authData.token)

      // Set user
      setUser(authData.user)
    } catch (error: any) {
      // Provide more helpful error message
      const message = error.response?.data?.error || error.message || 'Login failed'
      throw new Error(message)
    }
  }

  /**
   * Logout user
   */
  async function logout() {
    try {
      // Call logout endpoint
      await apiClient.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local state regardless of API call result
      apiClient.removeToken()
      setUser(null)
    }
  }

  /**
   * Refresh user data
   */
  async function refreshUser() {
    try {
      // Returns {user: {...}}
      const response = await apiClient.get<{ user: User }>('/api/auth/me')
      setUser(response.user)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // If refresh fails, log user out
      await logout()
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
