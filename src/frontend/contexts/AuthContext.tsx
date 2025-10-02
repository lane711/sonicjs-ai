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

      // Verify token with backend
      const response = await apiClient.get<User>('/auth/me')
      setUser(response.data)
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
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials)

      // Store token
      apiClient.setToken(response.data.token)

      // Set user
      setUser(response.data.user)
    } catch (error) {
      throw error
    }
  }

  /**
   * Logout user
   */
  async function logout() {
    try {
      // Call logout endpoint
      await apiClient.post('/auth/logout')
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
      const response = await apiClient.get<User>('/auth/me')
      setUser(response.data)
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
