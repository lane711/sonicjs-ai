# SonicJS AI Development Guidelines

This project is a Cloudflare-native headless CMS built with **Hono.js** and TypeScript.

## Core Technology Stack
- **Framework**: Hono.js (ultrafast web framework)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Validation**: Zod schemas
- **Testing**: Vitest (unit tests) + Playwright (E2E)
- **Frontend**: HTMX + HTML for admin interface
- **Deployment**: Wrangler CLI

## Development Workflow

1. **Plan First**: Read the codebase, understand the problem, and write a plan to project-plan.md
2. **Todo Management**: Create specific todo items that can be checked off as you complete them
3. **Get Approval**: Before starting work, check in with me to verify the plan
4. **Iterative Development**: Work through todo items, marking them complete as you go
5. **High-Level Updates**: Give brief explanations of changes made at each step
6. **Simplicity Focus**: Make minimal, targeted changes. Avoid complex refactoring.
7. **Documentation**: Add a review section to project-plan.md summarizing changes

## Key Principles
- **Edge-First**: Leverage Cloudflare's global edge network
- **TypeScript-First**: Strong typing throughout the application
- **Configuration over UI**: Developer-centric approach
- **AI-Friendly**: Clean, structured codebase for AI assistance

## Claude AI Memory Setup

This project uses Claude's memory MCP server to maintain context across sessions. The memory is stored in a shared file so all developers benefit from accumulated project knowledge.

### Setup for New Developers

1. **Copy shared settings**:
   ```bash
   cp .claude/settings.shared.json .claude/settings.local.json
   ```

2. **Install memory MCP server**:
   ```bash
   npm install -g @modelcontextprotocol/server-memory
   ```

3. **Restart Claude Desktop** to load the MCP server

### Memory Storage

- **Location**: `docs/ai/claude-memory.json`
- **Tracked in Git**: Yes, so all developers share the same context
- **Contains**: Project facts, user preferences, development patterns, and accumulated knowledge

### Benefits

- **Persistent Context**: Claude remembers project details across sessions
- **Team Knowledge**: Shared memory means consistent AI assistance for all developers
- **Learning**: Memory improves over time as more context is added

## Recent Development Updates (December 2024)

### Glass Morphism Design System Implementation

The admin interface has been completely redesigned using a glass morphism design pattern for a modern, cohesive look.

#### Design Components
- **Backdrop Effects**: `backdrop-blur-md bg-black/20` for glass effect
- **Borders**: `border border-white/10` for subtle definition
- **Shadows**: `shadow-xl` for depth and layering
- **Corners**: `rounded-xl` for modern appearance
- **Spacing**: `space-y-6` for consistent layout rhythm

#### Implemented Pages
1. **Settings Page** (`admin-settings.template.ts`):
   - Comprehensive tabbed interface (General, Appearance, Security, Notifications, Storage)
   - Interactive JavaScript for tab switching and form handling
   - Bulk save functionality and reset options
   - Full glass morphism styling

2. **Collections Pages**:
   - **List Page**: Glass header, enhanced table, improved empty state, quick actions section
   - **Form Page**: Glass breadcrumbs, consistent form styling, updated action buttons

3. **Content List Page**: Updated with glass morphism styling and improved button interactions

4. **Media Library**: Already implemented with glass morphism design patterns

#### Navigation Updates
- Added Settings link to admin sidebar
- Updated icon consistency across navigation items
- Proper navigation highlighting for current page

#### Design Patterns Established
- **Headers**: Glass cards with title, description, and primary actions
- **Tables**: Glass containers with enhanced styling and hover effects
- **Forms**: Glass backgrounds with consistent input styling
- **Buttons**: Gradient buttons with glass hover effects
- **Empty States**: Centered content with gradient icons and compelling CTAs
- **Quick Actions**: Grid layouts with hover animations

### Development Approach

When working on new admin pages or components:
1. Follow the established glass morphism patterns
2. Use consistent spacing (`space-y-6`) between sections
3. Apply glass backgrounds to major containers
4. Use gradient buttons for primary actions
5. Include hover effects and transitions for interactivity
6. Maintain consistent typography and color usage

### File Structure for Glass Morphism
- All admin page templates in `src/templates/pages/admin-*.template.ts`
- Shared layout in `src/templates/layouts/admin-layout-v2.template.ts`
- Component templates in `src/templates/components/`
- Route handlers in `src/routes/admin.ts`