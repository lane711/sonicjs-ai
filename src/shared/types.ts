/**
 * Shared Types between Frontend and Backend
 *
 * These types are used by both the React frontend and Hono backend
 */

// User types
export interface User {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  role: 'admin' | 'editor' | 'author' | 'viewer'
  timezone: string
  language: string
  isActive: boolean
  emailVerified: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  exp: number
  iat: number
}

// Content types
export interface Content {
  id: string
  title: string
  slug: string
  contentType: string
  data: Record<string, any>
  status: 'draft' | 'published' | 'archived'
  authorId: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

// Collection types
export interface Collection {
  id: string
  name: string
  label: string
  description: string | null
  icon: string | null
  fields: CollectionField[]
  createdAt: string
  updatedAt: string
}

export interface CollectionField {
  id: string
  name: string
  label: string
  type: string
  required: boolean
  searchable: boolean
  config: Record<string, any>
  order: number
}

// Media types
export interface MediaFile {
  id: string
  filename: string
  originalFilename: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  uploadedBy: string
  createdAt: string
}

// API Response types
export interface APIResponse<T> {
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
  links?: {
    next?: string
    prev?: string
    first?: string
    last?: string
  }
}

export interface APIError {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

// Plugin types
export interface Plugin {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  author: string
  category: string
  status: 'active' | 'inactive'
  isCore: boolean
  settings: Record<string, any>
}
