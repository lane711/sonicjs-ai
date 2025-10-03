/**
 * Cache Configuration
 *
 * Defines cache configurations for different entity types
 */

export interface CacheConfig {
  ttl: number              // Time-to-live in seconds
  kvEnabled: boolean       // Use KV cache tier
  memoryEnabled: boolean   // Use in-memory cache tier
  namespace: string        // Cache namespace/prefix
  invalidateOn: string[]   // Events that invalidate this cache
  version?: string         // Cache version for busting
}

export interface CacheStats {
  memoryHits: number
  memoryMisses: number
  kvHits: number
  kvMisses: number
  dbHits: number
  totalRequests: number
  hitRate: number
  memorySize: number
  entryCount: number
}

/**
 * Default cache configurations by entity type
 */
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Content (high read, low write)
  content: {
    ttl: 3600,              // 1 hour
    kvEnabled: true,
    memoryEnabled: true,
    namespace: 'content',
    invalidateOn: ['content.update', 'content.delete', 'content.publish'],
    version: 'v1'
  },

  // User data (medium read, medium write)
  user: {
    ttl: 900,               // 15 minutes
    kvEnabled: true,
    memoryEnabled: true,
    namespace: 'user',
    invalidateOn: ['user.update', 'user.delete', 'auth.login'],
    version: 'v1'
  },

  // Configuration (high read, very low write)
  config: {
    ttl: 7200,              // 2 hours
    kvEnabled: true,
    memoryEnabled: true,
    namespace: 'config',
    invalidateOn: ['config.update', 'plugin.activate', 'plugin.deactivate'],
    version: 'v1'
  },

  // Media metadata (high read, low write)
  media: {
    ttl: 3600,              // 1 hour
    kvEnabled: true,
    memoryEnabled: true,
    namespace: 'media',
    invalidateOn: ['media.upload', 'media.delete', 'media.update'],
    version: 'v1'
  },

  // API responses (very high read, low write)
  api: {
    ttl: 300,               // 5 minutes
    kvEnabled: true,
    memoryEnabled: true,
    namespace: 'api',
    invalidateOn: ['content.update', 'content.publish'],
    version: 'v1'
  },

  // Session data (very high read, medium write)
  session: {
    ttl: 1800,              // 30 minutes
    kvEnabled: false,       // Only in-memory for sessions
    memoryEnabled: true,
    namespace: 'session',
    invalidateOn: ['auth.logout'],
    version: 'v1'
  },

  // Plugin data
  plugin: {
    ttl: 3600,              // 1 hour
    kvEnabled: true,
    memoryEnabled: true,
    namespace: 'plugin',
    invalidateOn: ['plugin.activate', 'plugin.deactivate', 'plugin.update'],
    version: 'v1'
  },

  // Collections/schema
  collection: {
    ttl: 7200,              // 2 hours
    kvEnabled: true,
    memoryEnabled: true,
    namespace: 'collection',
    invalidateOn: ['collection.update', 'collection.delete'],
    version: 'v1'
  }
}

/**
 * Get cache configuration for a specific namespace
 */
export function getCacheConfig(namespace: string): CacheConfig {
  return CACHE_CONFIGS[namespace] || {
    ttl: 3600,
    kvEnabled: true,
    memoryEnabled: true,
    namespace,
    invalidateOn: [],
    version: 'v1'
  }
}

/**
 * Generate a cache key with consistent format
 * Format: {namespace}:{type}:{identifier}:{version}
 */
export function generateCacheKey(
  namespace: string,
  type: string,
  identifier: string,
  version?: string
): string {
  const v = version || getCacheConfig(namespace).version || 'v1'
  return `${namespace}:${type}:${identifier}:${v}`
}

/**
 * Parse a cache key back into its components
 */
export function parseCacheKey(key: string): {
  namespace: string
  type: string
  identifier: string
  version: string
} | null {
  const parts = key.split(':')
  if (parts.length !== 4) {
    return null
  }

  return {
    namespace: parts[0] || '',
    type: parts[1] || '',
    identifier: parts[2] || '',
    version: parts[3] || ''
  }
}

/**
 * Generate a hash for complex query parameters
 */
export function hashQueryParams(params: Record<string, any>): string {
  // Sort keys for consistent hashing
  const sortedKeys = Object.keys(params).sort()
  const normalized = sortedKeys.map(key => `${key}=${params[key]}`).join('&')

  // Simple hash function (for better performance, consider using crypto)
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

/**
 * Create a pattern for cache invalidation
 */
export function createCachePattern(
  namespace: string,
  type?: string,
  identifier?: string
): string {
  let pattern = namespace
  if (type) pattern += `:${type}`
  if (identifier) pattern += `:${identifier}`
  return pattern + ':*'
}
