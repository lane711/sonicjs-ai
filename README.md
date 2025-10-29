# SonicJS

A modern, TypeScript-first headless CMS built for Cloudflare's edge platform with Hono.js.

> **📦 Get Started:** `npx create-sonicjs@latest my-app`
>
> **⚠️ Note:** This repository is for **developing the SonicJS core package**. To build an application with SonicJS, use the command above to create a new project.

## 🚀 Features

### Core Platform
- **⚡ Edge-First**: Built specifically for Cloudflare Workers with global performance
- **🔧 Developer-Centric**: Configuration over UI, TypeScript-first approach  
- **🤖 AI-Friendly**: Structured codebase designed for AI-assisted development
- **🔌 Plugin System**: Extensible architecture without core modifications
- **📱 Modern Stack**: Hono.js, TypeScript, D1, R2, and HTMX

### Advanced Content Management (Stage 5)
- **📝 Rich Text Editor**: TinyMCE integration with customizable toolbars
- **🎛️ Dynamic Fields**: Custom field types (text, number, date, boolean, select, media)
- **📚 Content Versioning**: Complete revision history with restore functionality
- **⏰ Content Scheduling**: Publish/unpublish automation with date controls
- **🔄 Workflow System**: Draft → Review → Published → Archived with role-based permissions
- **💾 Auto-Save**: Automatic content saving every 30 seconds
- **👁️ Live Preview**: Real-time content preview before publishing
- **📋 Content Duplication**: One-click content copying and templates
- **🛡️ XSS Protection**: Comprehensive input validation and HTML escaping

## 🛠 Technology Stack

### Core Framework
- **Hono.js** - Ultrafast web framework for Cloudflare Workers
- **TypeScript** - Strict type safety throughout
- **HTMX** - Enhanced HTML for dynamic interfaces

### Cloudflare Services
- **D1** - SQLite database at the edge
- **R2** - Object storage for media
- **Workers** - Serverless compute runtime
- **KV** - Key-value storage for caching
- **Images API** - Image optimization and transformation

### Development Tools
- **Vitest** - Fast unit testing
- **Playwright** - End-to-end testing
- **Wrangler** - Local development and deployment
- **Drizzle ORM** - Type-safe database queries

## 🏁 Quick Start

### For Application Developers (Using SonicJS)

If you want to **build an application** with SonicJS:

```bash
# Create a new SonicJS application
npx create-sonicjs@latest my-app

# Navigate to your app
cd my-app

# Start development server
npm run dev

# Visit http://localhost:8787
```

Your app will be created with:
- ✅ SonicJS CMS pre-configured
- ✅ Database migrations ready
- ✅ Example content collections
- ✅ Admin interface at `/admin`
- ✅ Ready to deploy to Cloudflare

### For Package Developers (Contributing to SonicJS)

If you want to **contribute to the SonicJS core package**:

```bash
# Clone this repository
git clone https://github.com/lane711/sonicjs-ai.git
cd sonicjs-ai

# Install dependencies
npm install

# Build the core package
npm run build:core

# Create a test app to validate changes
npx create-sonicjs@latest my-sonicjs-app

# Run tests
npm test
```

#### Working with Database Migrations

When developing the core package, migrations are located in `packages/core/migrations/`. Your test app will reference these migrations through the npm workspace symlink.

**From your test app directory** (e.g., `my-sonicjs-app/`):

```bash
# Check migration status (local D1 database)
wrangler d1 migrations list DB --local

# Apply pending migrations to local database
wrangler d1 migrations apply DB --local

# Apply migrations to production database
wrangler d1 migrations apply DB --remote
```

**Important Notes:**
- The test app's `wrangler.toml` points to: `migrations_dir = "./node_modules/@sonicjs-cms/core/migrations"`
- Since the core package is symlinked via npm workspaces, changes to migrations are immediately available
- After creating new migrations in `packages/core/migrations/`, rebuild the core package: `npm run build:core`
- Always apply migrations to your test database before running the dev server or tests

**Creating New Migrations:**

1. Create a new migration file in `packages/core/migrations/` following the naming pattern: `NNN_description.sql`
2. Write your migration SQL (use `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE` for idempotency)
3. Rebuild the core package: `npm run build:core`
4. Apply to your test database: `cd my-sonicjs-app && wrangler d1 migrations apply DB --local`

### Common Commands (For Apps)

```bash
# Start development server
npm run dev

# Deploy to Cloudflare
npm run deploy

# Database operations
npm run db:migrate     # Apply migrations
npm run db:studio      # Open database studio

# Run tests
npm test
```

## 📁 Project Structure

This is a **package development monorepo** for building and maintaining the SonicJS CMS npm package.

```
sonicjs-ai/
├── packages/
│   ├── core/              # 📦 Main CMS package (published as @sonicjs-cms/core)
│   │   ├── src/
│   │   │   ├── routes/    # All route handlers (admin, API, auth)
│   │   │   ├── templates/ # HTML templates & components
│   │   │   ├── middleware/# Authentication & middleware
│   │   │   ├── utils/     # Utility functions
│   │   │   └── db/        # Database schemas & migrations
│   │   └── package.json   # @sonicjs-cms/core
│   ├── templates/         # Template system package
│   └── scripts/           # Build scripts & generators
│
├── my-sonicjs-app/        # 🧪 Test application (gitignored)
│   └── ...                # Created with: npx create-sonicjs@latest
│                          # Used for testing the published package
│
├── www/                   # 🌐 Marketing website
├── tests/e2e/             # End-to-end test suites
└── drizzle/               # Database migrations
```

### Important Notes

⚠️ **This is NOT an application repository** - it's for developing the `@sonicjs-cms/core` npm package.

- **`packages/core/`** - The main package published to npm
- **`my-sonicjs-app/`** - Test installation for validating the published package (can be deleted/recreated)
- **No root `src/`** - Application code lives in `packages/core/` or test apps like `my-sonicjs-app/`

## 🔧 Content Management

### Creating Collections
SonicJS uses a dynamic field system. Create collections through the admin interface or define them in the database:

```sql
-- Example: Blog Posts collection with custom fields
INSERT INTO collections (id, name, display_name, description, schema) VALUES (
  'blog-posts', 'blog_posts', 'Blog Posts', 'Article content collection',
  '{"type":"object","properties":{"title":{"type":"string","required":true}}}'
);

-- Add dynamic fields
INSERT INTO content_fields (collection_id, field_name, field_type, field_label, field_options) VALUES
  ('blog-posts', 'title', 'text', 'Title', '{"maxLength": 200, "required": true}'),
  ('blog-posts', 'content', 'richtext', 'Content', '{"toolbar": "full", "height": 400}'),
  ('blog-posts', 'excerpt', 'text', 'Excerpt', '{"maxLength": 500, "rows": 3}'),
  ('blog-posts', 'featured_image', 'media', 'Featured Image', '{"accept": "image/*"}'),
  ('blog-posts', 'publish_date', 'date', 'Publish Date', '{"defaultToday": true}'),
  ('blog-posts', 'is_featured', 'boolean', 'Featured Post', '{"default": false}');
```

### Field Types
- **text**: Single-line text with validation
- **richtext**: WYSIWYG editor with TinyMCE
- **number**: Numeric input with min/max constraints
- **boolean**: Checkbox with custom labels
- **date**: Date picker with format options
- **select**: Dropdown with single/multi-select
- **media**: File picker with preview

## 🌐 API Endpoints

### Content Management
- `GET /admin/content/new?collection=id` - Create new content form
- `GET /admin/content/:id/edit` - Edit content form
- `POST /admin/content/` - Create content with validation
- `PUT /admin/content/:id` - Update content with versioning
- `DELETE /admin/content/:id` - Delete content

### Advanced Features
- `POST /admin/content/preview` - Preview content before publishing
- `POST /admin/content/duplicate` - Duplicate existing content
- `GET /admin/content/:id/versions` - Get version history
- `POST /admin/content/:id/restore/:version` - Restore specific version
- `GET /admin/content/:id/version/:version/preview` - Preview historical version

### Public API
- `GET /api/content` - Get published content (paginated)
- `GET /api/collections/:collection/content` - Get content by collection
- `GET /api/collections` - List all collections

## 🚀 Deployment

### Deploying Your SonicJS Application

After creating your app with `npx create-sonicjs@latest`:

```bash
# 1. Configure your Cloudflare project
# Update wrangler.toml with your project settings

# 2. Create production database
wrangler d1 create my-app-db

# 3. Apply database migrations
npm run db:migrate:prod

# 4. Deploy to Cloudflare Workers
npm run deploy
```

Your app will be live at: `https://your-app.workers.dev`

### Environment Configuration

```toml
# wrangler.toml
name = "my-sonicjs-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-app-media"
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## 📚 Documentation

- [Project Plan](docs/project-plan.md) - Development roadmap and stages
- [AI Instructions](docs/ai-instructions.md) - Comprehensive development guidelines
- [Development Guidelines](docs/CLAUDE.md) - Development workflow and principles

## 🔌 Plugin Development

Create plugins for extending SonicJS functionality:

```typescript
// src/plugins/my-plugin/index.ts
import { Plugin } from '@sonicjs/core'

export default {
  name: 'my-plugin',
  hooks: {
    'content:beforeCreate': async (content) => {
      // Plugin logic here
      return content
    }
  }
} as Plugin
```

## 🌟 Why SonicJS?

### Edge Performance
- Global distribution via Cloudflare's network
- Sub-100ms response times worldwide
- Automatic scaling and DDoS protection
- No cold starts - instant responses

### Developer Experience
- TypeScript-first with full type safety
- Hot reload development environment
- `create-sonicjs` CLI for instant setup
- Comprehensive documentation

### AI-Friendly Architecture
- Clean, structured codebase
- TypeScript types for autocomplete
- Clear conventions and patterns
- Built for AI-assisted development

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for more details.

## 📞 Support

- [GitHub Issues](https://github.com/lane711/sonicjs-ai/issues)
- [Documentation](docs/)
- [Community Discussions](https://github.com/lane711/sonicjs-ai/discussions)

---

Built with ❤️ for the Cloudflare ecosystem