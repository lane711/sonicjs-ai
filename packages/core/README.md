# @sonicjs-cms/core

> Core framework for SonicJS - A modern, TypeScript-first headless CMS built for Cloudflare's edge platform.

[![Version](https://img.shields.io/npm/v/@sonicjs-cms/core)](https://www.npmjs.com/package/@sonicjs-cms/core)
[![License](https://img.shields.io/npm/l/@sonicjs-cms/core)](./LICENSE)

---

## 🏠 New to SonicJS?

**Visit [sonicjs.com](https://sonicjs.com) for full documentation and guides.**

To create a new SonicJS project, use:

```bash
npx create-sonicjs my-app
```

This is the recommended way to get started with SonicJS. It sets up everything you need with a single command.

---

## ✨ Features

- 🚀 **Edge-First**: Runs on Cloudflare Workers for sub-50ms global response times
- 📦 **Zero Cold Starts**: V8 isolates provide instant startup
- 🔒 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🔌 **Plugin System**: Extensible architecture with hooks and middleware
- ⚡ **Three-Tier Caching**: Memory, KV, and database layers for optimal performance
- 🎨 **Admin Interface**: Beautiful glass morphism design system
- 🔐 **Authentication**: JWT-based auth with role-based permissions
- 📝 **Content Management**: Dynamic collections with versioning and workflows
- 🖼️ **Media Management**: R2 storage with automatic optimization
- 🌐 **REST API**: Auto-generated endpoints for all collections

## 📦 Installation

```bash
npm install @sonicjs-cms/core
```

### Required Peer Dependencies

```bash
npm install @cloudflare/workers-types hono drizzle-orm zod
```

### Optional Dependencies

```bash
npm install wrangler drizzle-kit  # For development
```

## 🚀 Quick Start

### 1. Create Your Application

```typescript
// src/index.ts
import { createSonicJSApp } from '@sonicjs-cms/core'
import type { SonicJSConfig } from '@sonicjs-cms/core'

const config: SonicJSConfig = {
  collections: {
    directory: './src/collections',
    autoSync: true
  },
  plugins: {
    directory: './src/plugins',
    autoLoad: false
  }
}

export default createSonicJSApp(config)
```

### 2. Define Collections

```typescript
// src/collections/blog-posts.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'blog-posts',
  displayName: 'Blog Posts',
  description: 'Manage your blog posts',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Title',
        required: true,
        maxLength: 200
      },
      content: {
        type: 'markdown',
        title: 'Content',
        required: true
      },
      publishedAt: {
        type: 'datetime',
        title: 'Published Date'
      },
      status: {
        type: 'select',
        title: 'Status',
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
      }
    },
    required: ['title', 'content']
  }
} satisfies CollectionConfig
```

### 3. Configure Cloudflare Workers

```toml
# wrangler.toml
name = "my-sonicjs-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-sonicjs-db"
database_id = "your-database-id"
migrations_dir = "./node_modules/@sonicjs-cms/core/migrations"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-sonicjs-media"
```

### 4. Start Development

```bash
# Run migrations
wrangler d1 migrations apply DB --local

# Start dev server
wrangler dev
```

Visit `http://localhost:8787/admin` to access the admin interface.

## 📚 Core Exports

### Main Application

```typescript
import { createSonicJSApp } from '@sonicjs-cms/core'
import type { SonicJSConfig, SonicJSApp, Bindings, Variables } from '@sonicjs-cms/core'
```

### Services

```typescript
import {
  loadCollectionConfigs,
  syncCollections,
  MigrationService,
  Logger,
  PluginService
} from '@sonicjs-cms/core'
```

### Middleware

```typescript
import {
  requireAuth,
  requireRole,
  requirePermission,
  loggingMiddleware,
  cacheHeaders,
  securityHeaders
} from '@sonicjs-cms/core'
```

### Types

```typescript
import type {
  CollectionConfig,
  FieldConfig,
  Plugin,
  PluginContext,
  User,
  Content,
  Media
} from '@sonicjs-cms/core'
```

### Templates

```typescript
import {
  renderForm,
  renderTable,
  renderPagination,
  renderAlert
} from '@sonicjs-cms/core'
```

### Utilities

```typescript
import {
  sanitizeInput,
  TemplateRenderer,
  QueryFilterBuilder,
  metricsTracker
} from '@sonicjs-cms/core'
```

### Database

```typescript
import {
  createDb,
  users,
  collections,
  content,
  media
} from '@sonicjs-cms/core'
```

## 🔌 Subpath Exports

The package provides organized subpath exports:

```typescript
// Services only
import { MigrationService } from '@sonicjs-cms/core/services'

// Middleware only
import { requireAuth } from '@sonicjs-cms/core/middleware'

// Types only
import type { CollectionConfig } from '@sonicjs-cms/core/types'

// Templates only
import { renderForm } from '@sonicjs-cms/core/templates'

// Utilities only
import { sanitizeInput } from '@sonicjs-cms/core/utils'

// Plugins only
import { HookSystemImpl } from '@sonicjs-cms/core/plugins'
```

## 🎯 Usage Examples

### Custom Routes

```typescript
import { Hono } from 'hono'
import { requireAuth } from '@sonicjs-cms/core/middleware'
import type { Bindings } from '@sonicjs-cms/core'

const customRoutes = new Hono<{ Bindings: Bindings }>()

customRoutes.get('/api/custom', requireAuth(), async (c) => {
  const db = c.env.DB
  // Your custom logic
  return c.json({ message: 'Custom endpoint' })
})

// In your app config
export default createSonicJSApp({
  routes: [{ path: '/custom', handler: customRoutes }]
})
```

### Custom Plugin

```typescript
import type { Plugin } from '@sonicjs-cms/core'

export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',

  async onActivate() {
    console.log('Plugin activated!')
  },

  hooks: {
    'content.beforeSave': async (content) => {
      // Transform content before saving
      content.metadata = { modified: new Date() }
      return content
    }
  }
} satisfies Plugin
```

### Accessing Services

```typescript
import { Logger, MigrationService } from '@sonicjs-cms/core'

const logger = new Logger({ category: 'custom', level: 'info' })
logger.info('Application started')

const migrationService = new MigrationService(db)
await migrationService.runAllMigrations()
```

## 🏗️ Architecture

```
@sonicjs-cms/core
├── src/
│   ├── app.ts              # Application factory
│   ├── db/                 # Database schemas & utilities
│   ├── services/           # Business logic
│   ├── middleware/         # Request processing
│   ├── routes/             # HTTP handlers
│   ├── templates/          # Admin UI components
│   ├── plugins/            # Plugin system & core plugins
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
├── migrations/             # Core database migrations
└── dist/                   # Compiled output
```

## 🔄 Versioning

SonicJS follows semantic versioning:

- **v2.x.x** - Current npm package (core extracted)
- **v1.x.x** - Legacy monolith (deprecated)

**Current Version**: `2.0.0-alpha.1`

### Upgrade Path

```bash
# Install the new package
npm install @sonicjs-cms/core@2.0.0-alpha.1

# Run any new migrations
wrangler d1 migrations apply DB

# Test your application
npm run dev
```

## 📖 Documentation

- [Getting Started](https://docs.sonicjs.com/getting-started)
- [API Reference](https://docs.sonicjs.com/api)
- [Collections Guide](https://docs.sonicjs.com/collections)
- [Plugin Development](https://docs.sonicjs.com/plugins)
- [Deployment](https://docs.sonicjs.com/deployment)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 📄 License

MIT © SonicJS Team - See [LICENSE](./LICENSE) for details.

## 💬 Support & Community

- **Issues**: [GitHub Issues](https://github.com/sonicjs/sonicjs/issues)
- **Discord**: [Join our community](https://discord.gg/sonicjs)
- **Docs**: [docs.sonicjs.com](https://docs.sonicjs.com)
- **Twitter**: [@sonicjscms](https://twitter.com/sonicjscms)

## 🔖 Resources

- [Starter Template](../../templates/starter) - Greenfield project template
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [R2 Storage](https://developers.cloudflare.com/r2/)

## ⚡ Performance

- Global edge deployment
- Sub-50ms response times
- Zero cold starts
- Automatic scaling
- Built-in caching

## 🛡️ Security

- JWT authentication
- Role-based access control (RBAC)
- Permission system
- Secure headers
- Input sanitization

---

**Built with ❤️ for the edge** | v2.0.0-alpha.1
