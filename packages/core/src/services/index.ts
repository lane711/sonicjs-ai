/**
 * Services Module Exports
 *
 * Core business logic services for SonicJS
 */

// Collection Management
export {
  loadCollectionConfigs,
  loadCollectionConfig,
  getAvailableCollectionNames,
  validateCollectionConfig,
} from './collection-loader'

export {
  syncCollections,
  syncCollection,
  isCollectionManaged,
  getManagedCollections,
  cleanupRemovedCollections,
  fullCollectionSync,
} from './collection-sync'

// Database Migrations
export { MigrationService } from './migrations'
export type { Migration, MigrationStatus } from './migrations'

// Logging
export { Logger, getLogger, initLogger } from './logger'
export type { LogLevel, LogCategory, LogEntry, LogFilter } from './logger'

// Plugin Services
export { PluginService } from './plugin-service'
export { PluginBootstrapService } from './plugin-bootstrap'
export type { CorePlugin } from './plugin-bootstrap'

// Cache Service
export { CacheService, getCacheService, CACHE_CONFIGS } from './cache'
export type { CacheConfig } from './cache'

// Settings Service
export { SettingsService } from './settings'
export type { Setting, GeneralSettings } from './settings'
