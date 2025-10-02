/**
 * Dashboard Page
 *
 * Main admin dashboard
 */

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Welcome back, {user?.firstName}!
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats cards */}
          <div className="backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 rounded-xl border border-white/20 dark:border-zinc-800/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Content Items
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">0</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              Total content in system
            </p>
          </div>

          <div className="backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 rounded-xl border border-white/20 dark:border-zinc-800/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Collections
            </h3>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">0</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              Content collections
            </p>
          </div>

          <div className="backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 rounded-xl border border-white/20 dark:border-zinc-800/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Media Files
            </h3>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">0</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              Files in media library
            </p>
          </div>
        </div>

        <div className="mt-8 backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 rounded-xl border border-white/20 dark:border-zinc-800/50 shadow-lg p-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
            🎉 React UI is Live!
          </h2>
          <p className="text-zinc-700 dark:text-zinc-300 mb-4">
            Phase 1 of the React migration is complete. This is a fully functional React app
            running alongside the Hono backend.
          </p>
          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p>✅ React + Vite configured</p>
            <p>✅ Authentication flow working</p>
            <p>✅ API client with token handling</p>
            <p>✅ React Router with protected routes</p>
            <p>✅ React Query for data fetching</p>
            <p>✅ Tailwind CSS with dark mode</p>
          </div>
        </div>
      </div>
    </div>
  )
}
