/**
 * React Router Configuration
 *
 * Define routes and protected route logic
 */

import React from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// Components
import { AdminLayoutCatalyst } from '@/components/layout/AdminLayoutCatalyst'

// Lazy load pages
const LoginPage = React.lazy(() => import('@/pages/LoginPage'))
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'))
const ContentPage = React.lazy(() => import('@/pages/ContentPage'))
const MediaPage = React.lazy(() => import('@/pages/MediaPage'))
const UsersPage = React.lazy(() => import('@/pages/UsersPage'))
const PluginsPage = React.lazy(() => import('@/pages/PluginsPage'))
const ActivityLogsPage = React.lazy(() => import('@/pages/ActivityLogsPage'))
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'))

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return <Outlet />
}

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 */
function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}

/**
 * Router Configuration
 */
export const router = createBrowserRouter([
  // Public routes
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/auth/login',
        element: <LoginPage />,
      },
    ],
  },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayoutCatalyst />,
        children: [
          {
            path: '/admin',
            element: <DashboardPage />,
          },
          {
            path: '/admin/content',
            element: <ContentPage />,
          },
          {
            path: '/admin/media',
            element: <MediaPage />,
          },
          {
            path: '/admin/users',
            element: <UsersPage />,
          },
          {
            path: '/admin/plugins',
            element: <PluginsPage />,
          },
          {
            path: '/admin/logs',
            element: <ActivityLogsPage />,
          },
          {
            path: '/admin/settings',
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },

  // Redirect root to admin
  {
    path: '/',
    element: <Navigate to="/admin" replace />,
  },

  // 404 page
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
