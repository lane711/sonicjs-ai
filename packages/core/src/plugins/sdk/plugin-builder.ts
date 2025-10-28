/**
 * Plugin Builder SDK
 * 
 * Provides a fluent API for building SonicJS plugins
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { Plugin, PluginBuilderOptions, PluginRoutes, PluginMiddleware, PluginModel, PluginService, PluginAdminPage, PluginComponent, PluginHook, PluginMenuItem } from '../types'

export class PluginBuilder {
  private plugin: Partial<Plugin>

  constructor(options: PluginBuilderOptions) {
    this.plugin = {
      name: options.name,
      version: options.version,
      description: options.description,
      author: options.author,
      dependencies: options.dependencies,
      routes: [],
      middleware: [],
      models: [],
      services: [],
      adminPages: [],
      adminComponents: [],
      menuItems: [],
      hooks: []
    }
  }

  /**
   * Create a new plugin builder
   */
  static create(options: PluginBuilderOptions): PluginBuilder {
    return new PluginBuilder(options)
  }

  /**
   * Add metadata to the plugin
   */
  metadata(metadata: {
    description?: string
    author?: Plugin['author']
    license?: string
    compatibility?: string
    dependencies?: string[]
  }): PluginBuilder {
    Object.assign(this.plugin, metadata)
    return this
  }

  /**
   * Add routes to plugin
   */
  addRoutes(routes: PluginRoutes[]): PluginBuilder {
    this.plugin.routes = [...(this.plugin.routes || []), ...routes]
    return this
  }

  /**
   * Add a single route to plugin
   */
  addRoute(path: string, handler: Hono, options?: {
    description?: string
    requiresAuth?: boolean
    roles?: string[]
    priority?: number
  }): PluginBuilder {
    const route: PluginRoutes = {
      path,
      handler,
      ...options
    }
    this.plugin.routes = [...(this.plugin.routes || []), route]
    return this
  }

  /**
   * Add middleware to plugin
   */
  addMiddleware(middleware: PluginMiddleware[]): PluginBuilder {
    this.plugin.middleware = [...(this.plugin.middleware || []), ...middleware]
    return this
  }

  /**
   * Add a single middleware to plugin
   */
  addSingleMiddleware(name: string, handler: any, options?: {
    description?: string
    priority?: number
    routes?: string[]
    global?: boolean
  }): PluginBuilder {
    const middleware: PluginMiddleware = {
      name,
      handler,
      ...options
    }
    this.plugin.middleware = [...(this.plugin.middleware || []), middleware]
    return this
  }

  /**
   * Add models to plugin
   */
  addModels(models: PluginModel[]): PluginBuilder {
    this.plugin.models = [...(this.plugin.models || []), ...models]
    return this
  }

  /**
   * Add a single model to plugin
   */
  addModel(name: string, options: {
    tableName: string
    schema: z.ZodSchema
    migrations: string[]
    relationships?: PluginModel['relationships']
    extendsContent?: boolean
  }): PluginBuilder {
    const model: PluginModel = {
      name,
      ...options
    }
    this.plugin.models = [...(this.plugin.models || []), model]
    return this
  }

  /**
   * Add services to plugin
   */
  addServices(services: PluginService[]): PluginBuilder {
    this.plugin.services = [...(this.plugin.services || []), ...services]
    return this
  }

  /**
   * Add a single service to plugin
   */
  addService(name: string, implementation: any, options?: {
    description?: string
    dependencies?: string[]
    singleton?: boolean
  }): PluginBuilder {
    const service: PluginService = {
      name,
      implementation,
      ...options
    }
    this.plugin.services = [...(this.plugin.services || []), service]
    return this
  }

  /**
   * Add admin pages to plugin
   */
  addAdminPages(pages: PluginAdminPage[]): PluginBuilder {
    this.plugin.adminPages = [...(this.plugin.adminPages || []), ...pages]
    return this
  }

  /**
   * Add a single admin page to plugin
   */
  addAdminPage(path: string, title: string, component: string, options?: {
    description?: string
    permissions?: string[]
    icon?: string
    menuItem?: PluginMenuItem
  }): PluginBuilder {
    const page: PluginAdminPage = {
      path,
      title,
      component,
      ...options
    }
    this.plugin.adminPages = [...(this.plugin.adminPages || []), page]
    return this
  }

  /**
   * Add admin components to plugin
   */
  addComponents(components: PluginComponent[]): PluginBuilder {
    this.plugin.adminComponents = [...(this.plugin.adminComponents || []), ...components]
    return this
  }

  /**
   * Add a single admin component to plugin
   */
  addComponent(name: string, template: (props: any) => string, options?: {
    description?: string
    propsSchema?: z.ZodSchema
  }): PluginBuilder {
    const component: PluginComponent = {
      name,
      template,
      ...options
    }
    this.plugin.adminComponents = [...(this.plugin.adminComponents || []), component]
    return this
  }

  /**
   * Add menu items to plugin
   */
  addMenuItems(items: PluginMenuItem[]): PluginBuilder {
    this.plugin.menuItems = [...(this.plugin.menuItems || []), ...items]
    return this
  }

  /**
   * Add a single menu item to plugin
   */
  addMenuItem(label: string, path: string, options?: {
    icon?: string
    order?: number
    parent?: string
    permissions?: string[]
  }): PluginBuilder {
    const menuItem: PluginMenuItem = {
      label,
      path,
      ...options
    }
    this.plugin.menuItems = [...(this.plugin.menuItems || []), menuItem]
    return this
  }

  /**
   * Add hooks to plugin
   */
  addHooks(hooks: PluginHook[]): PluginBuilder {
    this.plugin.hooks = [...(this.plugin.hooks || []), ...hooks]
    return this
  }

  /**
   * Add a single hook to plugin
   */
  addHook(name: string, handler: any, options?: {
    priority?: number
    description?: string
  }): PluginBuilder {
    const hook: PluginHook = {
      name,
      handler,
      ...options
    }
    this.plugin.hooks = [...(this.plugin.hooks || []), hook]
    return this
  }

  /**
   * Add lifecycle hooks
   */
  lifecycle(hooks: {
    install?: Plugin['install']
    uninstall?: Plugin['uninstall']
    activate?: Plugin['activate']
    deactivate?: Plugin['deactivate']
    configure?: Plugin['configure']
  }): PluginBuilder {
    Object.assign(this.plugin, hooks)
    return this
  }

  /**
   * Build the plugin
   */
  build(): Plugin {
    // Validate required fields
    if (!this.plugin.name || !this.plugin.version) {
      throw new Error('Plugin name and version are required')
    }

    return this.plugin as Plugin
  }
}

/**
 * Helper functions for common plugin patterns
 */
export class PluginHelpers {
  /**
   * Create a REST API route for a model
   */
  static createModelAPI(modelName: string, options?: {
    basePath?: string
    permissions?: {
      read?: string[]
      write?: string[]
      delete?: string[]
    }
  }): Hono {
    const app = new Hono()
    const basePath = options?.basePath || `/${modelName.toLowerCase()}`

    // GET /models - List all
    app.get('/', async (c) => {
      // Implementation would depend on the model service
      return c.json({ message: `List ${modelName} items` })
    })

    // GET /models/:id - Get by ID
    app.get('/:id', async (c) => {
      const id = c.req.param('id')
      return c.json({ message: `Get ${modelName} with ID: ${id}` })
    })

    // POST /models - Create new
    app.post('/', async (c) => {
      return c.json({ message: `Create new ${modelName}` })
    })

    // PUT /models/:id - Update
    app.put('/:id', async (c) => {
      const id = c.req.param('id')
      return c.json({ message: `Update ${modelName} with ID: ${id}` })
    })

    // DELETE /models/:id - Delete
    app.delete('/:id', async (c) => {
      const id = c.req.param('id')
      return c.json({ message: `Delete ${modelName} with ID: ${id}` })
    })

    return app
  }

  /**
   * Create an admin CRUD interface for a model
   */
  static createAdminInterface(modelName: string, options?: {
    icon?: string
    permissions?: string[]
    fields?: Array<{
      name: string
      type: string
      label: string
      required?: boolean
    }>
  }): {
    pages: PluginAdminPage[]
    menuItems: PluginMenuItem[]
  } {
    const basePath = `/admin/${modelName.toLowerCase()}`
    const displayName = modelName.charAt(0).toUpperCase() + modelName.slice(1)

    const pages: PluginAdminPage[] = [
      {
        path: basePath,
        title: `${displayName} List`,
        component: `${modelName}List`,
        permissions: options?.permissions,
        icon: options?.icon
      },
      {
        path: `${basePath}/new`,
        title: `New ${displayName}`,
        component: `${modelName}Form`,
        permissions: options?.permissions
      },
      {
        path: `${basePath}/:id`,
        title: `Edit ${displayName}`,
        component: `${modelName}Form`,
        permissions: options?.permissions
      }
    ]

    const menuItems: PluginMenuItem[] = [
      {
        label: displayName,
        path: basePath,
        icon: options?.icon,
        permissions: options?.permissions
      }
    ]

    return { pages, menuItems }
  }

  /**
   * Create a database migration for a model
   */
  static createMigration(tableName: string, fields: Array<{
    name: string
    type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB'
    nullable?: boolean
    primaryKey?: boolean
    unique?: boolean
    defaultValue?: string
  }>): string {
    const columns = fields.map(field => {
      let definition = `${field.name} ${field.type}`
      
      if (field.primaryKey) definition += ' PRIMARY KEY'
      if (field.unique) definition += ' UNIQUE'
      if (!field.nullable && !field.primaryKey) definition += ' NOT NULL'
      if (field.defaultValue) definition += ` DEFAULT ${field.defaultValue}`
      
      return definition
    }).join(',\n  ')

    return `
CREATE TABLE IF NOT EXISTS ${tableName} (
  ${columns},
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TRIGGER IF NOT EXISTS ${tableName}_updated_at
  AFTER UPDATE ON ${tableName}
BEGIN
  UPDATE ${tableName} SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;
    `.trim()
  }

  /**
   * Create a Zod schema for a model
   */
  static createSchema(fields: Array<{
    name: string
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
    optional?: boolean
    validation?: any
  }>): z.ZodSchema {
    const shape: Record<string, z.ZodTypeAny> = {}

    for (const field of fields) {
      let schema: z.ZodTypeAny

      switch (field.type) {
        case 'string':
          schema = z.string()
          break
        case 'number':
          schema = z.number()
          break
        case 'boolean':
          schema = z.boolean()
          break
        case 'date':
          schema = z.date()
          break
        case 'array':
          schema = z.array(z.any())
          break
        case 'object':
          schema = z.object({})
          break
        default:
          schema = z.any()
      }

      if (field.optional) {
        schema = schema.optional()
      }

      if (field.validation) {
        // Apply additional validation
        if (field.type === 'string' && field.validation.min) {
          schema = (schema as z.ZodString).min(field.validation.min)
        }
        if (field.type === 'string' && field.validation.max) {
          schema = (schema as z.ZodString).max(field.validation.max)
        }
        if (field.type === 'string' && field.validation.email) {
          schema = (schema as z.ZodString).email()
        }
        if (field.type === 'string' && field.validation.url) {
          schema = (schema as z.ZodString).url()
        }
      }

      shape[field.name] = schema
    }

    return z.object(shape)
  }
}

/**
 * Common plugin templates
 */
export class PluginTemplates {
  /**
   * Create a simple content type plugin
   */
  static contentType(name: string, fields: Array<{
    name: string
    type: string
    label: string
    required?: boolean
  }>): Plugin {
    const builder = PluginBuilder.create({
      name: `${name}-content-type`,
      version: '1.0.0',
      description: `${name} content type plugin`
    })

    // Create model
    const schema = PluginHelpers.createSchema(
      fields.map(f => ({
        name: f.name,
        type: f.type as any,
        optional: !f.required
      }))
    )

    const migration = PluginHelpers.createMigration(
      name.toLowerCase(),
      fields.map(f => ({
        name: f.name,
        type: 'TEXT',
        nullable: !f.required
      }))
    )

    builder.addModel(name, {
      tableName: name.toLowerCase(),
      schema,
      migrations: [migration],
      extendsContent: true
    })

    // Create API routes
    const apiRoutes = PluginHelpers.createModelAPI(name)
    builder.addRoute(`/api/${name.toLowerCase()}`, apiRoutes)

    // Create admin interface
    const { pages, menuItems } = PluginHelpers.createAdminInterface(name, {
      fields
    })
    builder.addAdminPages(pages)
    builder.addMenuItems(menuItems)

    return builder.build()
  }

  /**
   * Create an analytics plugin
   */
  static analytics(name: string, options?: {
    endpoints?: string[]
    dashboard?: boolean
  }): Plugin {
    const builder = PluginBuilder.create({
      name: `${name}-analytics`,
      version: '1.0.0',
      description: `${name} analytics plugin`
    })

    // Add middleware to track requests
    builder.addSingleMiddleware('analytics-tracker', async (c: any, next: any) => {
      const start = Date.now()
      await next()
      const duration = Date.now() - start
      
      // Log analytics data
      console.info(`Analytics: ${c.req.method} ${c.req.path} - ${duration}ms`)
    }, {
      global: true,
      priority: 1
    })

    // Add analytics API
    const analyticsAPI = new Hono()
    analyticsAPI.get('/stats', (c) => {
      return c.json({ message: 'Analytics stats' })
    })
    builder.addRoute('/api/analytics', analyticsAPI)

    // Add dashboard if requested
    if (options?.dashboard) {
      builder.addAdminPage(
        '/analytics',
        'Analytics Dashboard',
        'AnalyticsDashboard',
        {
          description: 'View analytics and statistics',
          icon: 'chart-bar'
        }
      )

      builder.addMenuItem('Analytics', '/admin/analytics', {
        icon: 'chart-bar',
        order: 100
      })
    }

    return builder.build()
  }
}