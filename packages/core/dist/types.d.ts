import { Hono, MiddlewareHandler, Context } from 'hono';
import { z } from 'zod';
import { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

/**
 * Collection Configuration Types
 *
 * These types define the structure for collection configuration files.
 * Collections can be defined in TypeScript/JSON files and synced to the database.
 */
type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'url' | 'richtext' | 'markdown' | 'json' | 'array' | 'object' | 'reference' | 'media' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'textarea' | 'slug' | 'color' | 'file';
interface FieldConfig {
    type: FieldType;
    title?: string;
    description?: string;
    required?: boolean;
    default?: any;
    placeholder?: string;
    helpText?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
    enumLabels?: string[];
    collection?: string;
    items?: FieldConfig;
    properties?: Record<string, FieldConfig>;
    format?: string;
    widget?: string;
    dependsOn?: string;
    showWhen?: any;
}
interface CollectionSchema {
    type: 'object';
    properties: Record<string, FieldConfig>;
    required?: string[];
}
interface CollectionConfig {
    /**
     * Unique machine name for the collection (lowercase, underscores)
     * e.g., 'blog_posts', 'products', 'team_members'
     */
    name: string;
    /**
     * Human-readable display name
     * e.g., 'Blog Posts', 'Products', 'Team Members'
     */
    displayName: string;
    /**
     * Optional description of the collection
     */
    description?: string;
    /**
     * JSON schema definition for the collection's content structure
     */
    schema: CollectionSchema;
    /**
     * If true, this collection is managed by config files and cannot be edited in the UI
     * Default: true for config-based collections
     */
    managed?: boolean;
    /**
     * If true, the collection is active and available for use
     * Default: true
     */
    isActive?: boolean;
    /**
     * Optional icon name for the collection (used in admin UI)
     */
    icon?: string;
    /**
     * Optional color for the collection (hex code)
     */
    color?: string;
    /**
     * Optional default sort field
     */
    defaultSort?: string;
    /**
     * Optional default sort order
     */
    defaultSortOrder?: 'asc' | 'desc';
    /**
     * Optional fields to show in list view
     */
    listFields?: string[];
    /**
     * Optional search fields
     */
    searchFields?: string[];
    /**
     * Optional metadata
     */
    metadata?: Record<string, any>;
}
interface CollectionConfigModule {
    default: CollectionConfig;
}
/**
 * Result of syncing a collection
 */
interface CollectionSyncResult {
    name: string;
    status: 'created' | 'updated' | 'unchanged' | 'error';
    message?: string;
    error?: string;
}

/**
 * SonicJS Plugin System Types
 *
 * Defines the core interfaces and types for the plugin system
 */

interface Plugin {
    /** Unique plugin identifier */
    name: string;
    /** Plugin version (semantic versioning) */
    version: string;
    /** Human-readable description */
    description?: string;
    /** Plugin author information */
    author?: {
        name: string;
        email?: string;
        url?: string;
    };
    /** Plugin dependencies (other plugins required) */
    dependencies?: string[];
    /** SonicJS version compatibility */
    compatibility?: string;
    /** Plugin license */
    license?: string;
    routes?: PluginRoutes[];
    middleware?: PluginMiddleware[];
    models?: PluginModel[];
    services?: PluginService[];
    adminPages?: PluginAdminPage[];
    adminComponents?: PluginComponent[];
    menuItems?: PluginMenuItem[];
    hooks?: PluginHook[];
    install?: (context: PluginContext) => Promise<void>;
    uninstall?: (context: PluginContext) => Promise<void>;
    activate?: (context: PluginContext) => Promise<void>;
    deactivate?: (context: PluginContext) => Promise<void>;
    configure?: (config: PluginConfig) => Promise<void>;
}
interface PluginContext {
    /** Database instance */
    db: D1Database;
    /** Key-value storage */
    kv: KVNamespace;
    /** R2 storage bucket */
    r2?: R2Bucket;
    /** Plugin configuration */
    config: PluginConfig;
    /** Core SonicJS services */
    services: {
        auth: AuthService;
        content: ContentService;
        media: MediaService;
    };
    /** Hook system for inter-plugin communication */
    hooks: HookSystem | ScopedHookSystem;
    /** Logging utilities */
    logger: PluginLogger;
}
interface PluginConfig {
    /** Plugin-specific configuration */
    [key: string]: any;
    /** Whether plugin is enabled */
    enabled: boolean;
    /** Plugin installation timestamp */
    installedAt?: number;
    /** Plugin last update timestamp */
    updatedAt?: number;
}
interface PluginRoutes {
    /** Route path prefix */
    path: string;
    /** Hono route handler */
    handler: Hono;
    /** Route description */
    description?: string;
    /** Whether route requires authentication */
    requiresAuth?: boolean;
    /** Required roles for access */
    roles?: string[];
    /** Route priority (for ordering) */
    priority?: number;
}
interface PluginMiddleware {
    /** Middleware name */
    name: string;
    /** Middleware handler function */
    handler: MiddlewareHandler;
    /** Middleware description */
    description?: string;
    /** Middleware priority (lower = earlier) */
    priority?: number;
    /** Routes to apply middleware to */
    routes?: string[];
    /** Whether to apply globally */
    global?: boolean;
}
interface PluginModel {
    /** Model name */
    name: string;
    /** Database table name */
    tableName: string;
    /** Zod schema for validation */
    schema: z.ZodSchema;
    /** Database migrations */
    migrations: string[];
    /** Model relationships */
    relationships?: ModelRelationship[];
    /** Whether model extends core content */
    extendsContent?: boolean;
}
interface ModelRelationship {
    type: 'oneToOne' | 'oneToMany' | 'manyToMany';
    target: string;
    foreignKey?: string;
    joinTable?: string;
}
interface PluginService {
    /** Service name */
    name: string;
    /** Service implementation */
    implementation: any;
    /** Service description */
    description?: string;
    /** Service dependencies */
    dependencies?: string[];
    /** Whether service is singleton */
    singleton?: boolean;
}
interface PluginAdminPage {
    /** Page path (relative to /admin) */
    path: string;
    /** Page title */
    title: string;
    /** Page component/template */
    component: string;
    /** Page description */
    description?: string;
    /** Required permissions */
    permissions?: string[];
    /** Menu item configuration */
    menuItem?: PluginMenuItem;
    /** Page icon */
    icon?: string;
}
interface PluginComponent {
    /** Component name */
    name: string;
    /** Component template function */
    template: (props: any) => string;
    /** Component description */
    description?: string;
    /** Component props schema */
    propsSchema?: z.ZodSchema;
}
interface PluginMenuItem {
    /** Menu item label */
    label: string;
    /** Menu item path */
    path: string;
    /** Menu item icon */
    icon?: string;
    /** Menu item order */
    order?: number;
    /** Parent menu item */
    parent?: string;
    /** Required permissions */
    permissions?: string[];
    /** Whether item is active */
    active?: boolean;
}
interface PluginHook {
    /** Hook name */
    name: string;
    /** Hook handler function */
    handler: HookHandler;
    /** Hook priority */
    priority?: number;
    /** Hook description */
    description?: string;
}
type HookHandler = (data: any, context: HookContext) => Promise<any>;
interface HookContext {
    /** Plugin that registered the hook */
    plugin: string;
    /** Hook execution context */
    context: PluginContext;
    /** Cancel hook execution */
    cancel?: () => void;
}
interface HookSystem {
    /** Register a hook handler */
    register(hookName: string, handler: HookHandler, priority?: number): void;
    /** Execute all handlers for a hook */
    execute(hookName: string, data: any, context?: any): Promise<any>;
    /** Remove a hook handler */
    unregister(hookName: string, handler: HookHandler): void;
    /** Get all registered hooks */
    getHooks(hookName: string): PluginHook[];
    /** Create a scoped hook system (optional) */
    createScope?(pluginName: string): ScopedHookSystem;
}
interface ScopedHookSystem {
    /** Register a hook handler */
    register(hookName: string, handler: HookHandler, priority?: number): void;
    /** Execute all handlers for a hook */
    execute(hookName: string, data: any, context?: any): Promise<any>;
    /** Remove a hook handler */
    unregister(hookName: string, handler: HookHandler): void;
    /** Remove all hooks for this scope */
    unregisterAll(): void;
}
interface PluginRegistry {
    /** Get plugin by name */
    get(name: string): Plugin | undefined;
    /** Get all registered plugins */
    getAll(): Plugin[];
    /** Get active plugins */
    getActive(): Plugin[];
    /** Register a plugin */
    register(plugin: Plugin): Promise<void>;
    /** Unregister a plugin */
    unregister(name: string): Promise<void>;
    /** Check if plugin is registered */
    has(name: string): boolean;
    /** Activate a plugin */
    activate(name: string): Promise<void>;
    /** Deactivate a plugin */
    deactivate(name: string): Promise<void>;
    /** Get plugin configuration */
    getConfig(name: string): PluginConfig | undefined;
    /** Set plugin configuration */
    setConfig(name: string, config: PluginConfig): void;
    /** Get plugin status */
    getStatus(name: string): PluginStatus | undefined;
    /** Get all plugin statuses */
    getAllStatuses(): Map<string, PluginStatus>;
    /** Resolve plugin load order based on dependencies */
    resolveLoadOrder(): string[];
}
interface PluginManager {
    /** Plugin registry */
    registry: PluginRegistry;
    /** Hook system */
    hooks: HookSystem;
    /** Initialize plugin system */
    initialize(context: PluginContext): Promise<void>;
    /** Load plugins from configuration */
    loadPlugins(config: PluginConfig[]): Promise<void>;
    /** Install a plugin */
    install(plugin: Plugin, config?: PluginConfig): Promise<void>;
    /** Uninstall a plugin */
    uninstall(name: string): Promise<void>;
    /** Get plugin status */
    getStatus(name: string): PluginStatus;
}
interface PluginStatus {
    name: string;
    version: string;
    active: boolean;
    installed: boolean;
    hasErrors: boolean;
    errors?: string[];
    lastError?: string;
}
interface AuthService {
    /** Verify user permissions */
    hasPermission(userId: string, permission: string): Promise<boolean>;
    /** Get current user */
    getCurrentUser(context: Context): Promise<any>;
    /** Create authentication middleware */
    createMiddleware(options?: any): MiddlewareHandler;
}
interface ContentService {
    /** Get content by ID */
    getById(id: string): Promise<any>;
    /** Create new content */
    create(data: any): Promise<any>;
    /** Update content */
    update(id: string, data: any): Promise<any>;
    /** Delete content */
    delete(id: string): Promise<void>;
    /** Search content */
    search(query: string, options?: any): Promise<any[]>;
}
interface MediaService {
    /** Upload file */
    upload(file: File, options?: any): Promise<any>;
    /** Get media by ID */
    getById(id: string): Promise<any>;
    /** Delete media */
    delete(id: string): Promise<void>;
    /** Transform image */
    transform(id: string, options: any): Promise<string>;
}
interface PluginLogger {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error, data?: any): void;
}
interface PluginBuilderOptions {
    name: string;
    version: string;
    description?: string;
    author?: Plugin['author'];
    dependencies?: string[];
}
interface PluginValidator {
    /** Validate plugin definition */
    validate(plugin: Plugin): PluginValidationResult;
    /** Validate plugin dependencies */
    validateDependencies(plugin: Plugin, registry: PluginRegistry): PluginValidationResult;
    /** Validate plugin compatibility */
    validateCompatibility(plugin: Plugin, version: string): PluginValidationResult;
}
interface PluginValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
declare const HOOKS: {
    readonly APP_INIT: "app:init";
    readonly APP_READY: "app:ready";
    readonly APP_SHUTDOWN: "app:shutdown";
    readonly REQUEST_START: "request:start";
    readonly REQUEST_END: "request:end";
    readonly REQUEST_ERROR: "request:error";
    readonly AUTH_LOGIN: "auth:login";
    readonly AUTH_LOGOUT: "auth:logout";
    readonly AUTH_REGISTER: "auth:register";
    readonly USER_LOGIN: "user:login";
    readonly USER_LOGOUT: "user:logout";
    readonly CONTENT_CREATE: "content:create";
    readonly CONTENT_UPDATE: "content:update";
    readonly CONTENT_DELETE: "content:delete";
    readonly CONTENT_PUBLISH: "content:publish";
    readonly CONTENT_SAVE: "content:save";
    readonly MEDIA_UPLOAD: "media:upload";
    readonly MEDIA_DELETE: "media:delete";
    readonly MEDIA_TRANSFORM: "media:transform";
    readonly PLUGIN_INSTALL: "plugin:install";
    readonly PLUGIN_UNINSTALL: "plugin:uninstall";
    readonly PLUGIN_ACTIVATE: "plugin:activate";
    readonly PLUGIN_DEACTIVATE: "plugin:deactivate";
    readonly ADMIN_MENU_RENDER: "admin:menu:render";
    readonly ADMIN_PAGE_RENDER: "admin:page:render";
    readonly DB_MIGRATE: "db:migrate";
    readonly DB_SEED: "db:seed";
};
type HookName = typeof HOOKS[keyof typeof HOOKS];

/**
 * Plugin Manifest Types
 *
 * Defines the structure for plugin manifest.json files
 */
interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    homepage?: string;
    repository?: string;
    license?: string;
    category: string;
    tags?: string[];
    dependencies?: string[];
    settings?: Record<string, any>;
    hooks?: Record<string, string>;
    routes?: Array<{
        path: string;
        method: string;
        handler: string;
        description?: string;
    }>;
    permissions?: Record<string, string>;
    adminMenu?: {
        label: string;
        icon: string;
        path: string;
        order: number;
    };
}

export { type AuthService, type CollectionConfig, type CollectionConfigModule, type CollectionSchema, type CollectionSyncResult, type ContentService, type FieldConfig, type FieldType, HOOKS, type HookContext, type HookHandler, type HookName, type HookSystem, type MediaService, type ModelRelationship, type Plugin, type PluginAdminPage, type PluginBuilderOptions, type PluginComponent, type PluginConfig, type PluginContext, type PluginHook, type PluginLogger, type PluginManager, type PluginManifest, type PluginMenuItem, type PluginMiddleware, type PluginModel, type PluginRegistry, type PluginRoutes, type PluginService, type PluginStatus, type PluginValidationResult, type PluginValidator, type ScopedHookSystem };
