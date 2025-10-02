/**
 * React Query Configuration
 *
 * Configure TanStack Query for data fetching and caching
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Keep cached data for 10 minutes
      gcTime: 10 * 60 * 1000,

      // Retry failed requests 1 time
      retry: 1,

      // Refetch on window focus in production only
      refetchOnWindowFocus: import.meta.env.PROD,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry failed mutations 0 times (don't retry mutations by default)
      retry: 0,
    },
  },
})

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'] as const,
  },

  // Content
  content: {
    all: ['content'] as const,
    lists: () => ['content', 'list'] as const,
    list: (filters: Record<string, any>) => ['content', 'list', filters] as const,
    details: () => ['content', 'detail'] as const,
    detail: (id: string) => ['content', 'detail', id] as const,
  },

  // Collections
  collections: {
    all: ['collections'] as const,
    lists: () => ['collections', 'list'] as const,
    list: (filters: Record<string, any>) => ['collections', 'list', filters] as const,
    details: () => ['collections', 'detail'] as const,
    detail: (id: string) => ['collections', 'detail', id] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => ['users', 'list'] as const,
    list: (filters: Record<string, any>) => ['users', 'list', filters] as const,
    details: () => ['users', 'detail'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },

  // Media
  media: {
    all: ['media'] as const,
    lists: () => ['media', 'list'] as const,
    list: (filters: Record<string, any>) => ['media', 'list', filters] as const,
    details: () => ['media', 'detail'] as const,
    detail: (id: string) => ['media', 'detail', id] as const,
  },

  // Plugins
  plugins: {
    all: ['plugins'] as const,
    active: ['plugins', 'active'] as const,
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    general: ['settings', 'general'] as const,
    security: ['settings', 'security'] as const,
  },
}
