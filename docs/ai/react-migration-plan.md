# React Migration Plan

## Overview
This document outlines the plan to migrate the SonicJS admin UI from server-side rendered templates to a React-based SPA, while maintaining the exact same visual design and user experience using the Catalyst design system.

---

## Current Architecture

### Technology Stack
- **Backend**: Hono (Cloudflare Workers)
- **Rendering**: Server-side template strings (TypeScript)
- **Styling**: Tailwind CSS with Catalyst design tokens
- **Interactivity**: Vanilla JavaScript, HTMX (minimal usage)
- **State**: Server-driven, form submissions, page reloads

### Template Structure
```
src/templates/
├── components/        # Reusable UI components
│   ├── button.template.ts
│   ├── card.template.ts
│   ├── dynamic-field.template.ts
│   ├── sidebar.template.ts
│   └── ...
├── layouts/          # Page layouts
│   ├── admin-layout-catalyst.template.ts
│   └── base-layout.template.ts
└── pages/            # Full page templates
    ├── admin-content-list.template.ts
    ├── admin-content-edit.template.ts
    ├── admin-design.template.ts
    └── ...
```

### Routes Serving Templates
- `/admin/*` - Admin dashboard routes
- `/auth/*` - Authentication pages
- `/content/*` - Public content routes

---

## Target Architecture

### Technology Stack
- **Backend**: Hono (unchanged - API only)
- **Frontend Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Catalyst (unchanged)
- **State Management**: React Context + hooks initially, consider Zustand/Jotai later
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Fetch API / Axios

### Project Structure
```
src/
├── backend/          # Existing Hono API
│   ├── routes/
│   ├── middleware/
│   └── index.ts
├── frontend/         # New React app
│   ├── components/   # React components
│   │   ├── ui/       # Base UI components (buttons, cards, etc.)
│   │   ├── forms/    # Form components
│   │   ├── layout/   # Layout components
│   │   └── features/ # Feature-specific components
│   ├── pages/        # Route pages
│   ├── hooks/        # Custom hooks
│   ├── contexts/     # React contexts
│   ├── lib/          # Utilities, API client
│   ├── styles/       # Global styles
│   └── main.tsx      # Entry point
├── public/           # Static assets
└── shared/           # Shared types between backend/frontend
```

---

## Migration Phases

### Phase 1: Setup & Infrastructure (Week 1) ✅ **COMPLETED**
**Goal**: Set up React build pipeline alongside existing Hono backend

#### Tasks
1. **Install Dependencies** ✅
   - [x] React, ReactDOM
   - [x] Vite with Cloudflare Workers plugin
   - [x] React Router
   - [x] TanStack Query
   - [x] React Hook Form, Zod
   - [x] Type definitions

2. **Configure Build System** ✅
   - [x] Set up Vite config for Cloudflare Workers
   - [x] Configure dual build: React SPA + Hono API
   - [x] Set up dev server proxy (Vite dev → Hono API)
   - [x] Configure TypeScript for frontend/backend separation

3. **API Layer Preparation** ✅
   - [x] Audit all existing routes - identify which are API vs template renders
   - [x] Create API client wrapper with auth token handling
   - [x] Set up React Query configuration
   - [x] Define TypeScript types for all API responses

4. **Routing Setup** ✅
   - [x] Configure React Router with same route structure
   - [x] Set up protected routes (require auth)
   - [x] Implement navigation guards
   - [x] Create 404/error boundary pages

5. **Authentication Flow** ✅
   - [x] Implement token storage (localStorage/cookie)
   - [x] Create auth context/provider
   - [x] Build login/logout hooks
   - [x] Set up axios/fetch interceptors for auth headers

**Deliverables**:
- ✅ Vite + React running alongside Hono
- ✅ Dev environment with hot reload
- ✅ Auth flow working end-to-end
- ✅ API client configured with token handling

**Implementation Summary**:
- Created complete React app structure in `src/frontend/`
- Configured Vite with React plugin and proper TypeScript support
- Built API client with automatic token injection and error handling
- Implemented AuthContext with login/logout and user state management
- Set up React Router with ProtectedRoute and PublicRoute guards
- Configured React Query with sensible defaults and query key patterns
- Created Login, Dashboard, and 404 pages
- Added npm scripts: `dev:frontend`, `dev:all`, `build:frontend`
- All authentication flow working end-to-end

---

### Phase 2: Design System & Core Components (Week 2)
**Goal**: Build React component library matching existing Catalyst design

#### Tasks
1. **Tailwind Configuration**
   - Copy exact Tailwind config from current setup
   - Ensure all Catalyst design tokens are available
   - Set up CSS reset and global styles
   - Configure dark mode support

2. **Base UI Components** (1:1 port from templates)
   - Button component (all variants: primary, secondary, outline, etc.)
   - Input, Textarea, Select components
   - Card component (all variants)
   - Badge, Tag components
   - Modal/Dialog component
   - Dropdown/Menu components
   - Table component
   - Pagination component
   - Loading states (spinners, skeletons)

3. **Layout Components**
   - AdminLayout (sidebar + header)
   - AuthLayout (centered forms)
   - Sidebar component
   - Header component with user menu
   - Breadcrumbs component

4. **Form Components**
   - DynamicField (field type router)
   - TextField, TextArea
   - Select, MultiSelect
   - Checkbox, Radio
   - DatePicker, TimePicker
   - File Upload
   - Rich Text Editor integration
   - Form validation display (errors, hints)

5. **Component Documentation**
   - Set up Storybook (optional but recommended)
   - Document all component props
   - Create example usage for each component
   - Visual regression testing setup (Chromatic/Percy)

**Deliverables**:
- ✅ Complete UI component library
- ✅ Components match pixel-perfect with current design
- ✅ Dark mode support
- ✅ Accessibility compliant (ARIA labels, keyboard nav)
- ✅ Component documentation

---

### Phase 3: Admin Pages - Part 1 (Week 3-4)
**Goal**: Migrate core admin pages to React

#### Priority Pages
1. **Login/Auth Pages**
   - `/auth/login` - Login form
   - `/auth/register` - Registration form
   - `/auth/logout` - Logout handler
   - Password reset flow

2. **Dashboard**
   - `/admin` - Main dashboard
   - Stats cards
   - Activity feed
   - Quick actions

3. **Content Management**
   - `/admin/content` - Content list with filters
   - `/admin/content/:id/edit` - Content edit form
   - `/admin/content/create` - Content creation
   - Bulk actions (delete, publish, archive)
   - Search and filtering
   - Pagination
   - Status badges

4. **Collection Management**
   - `/admin/content/collection/:id` - Collection view
   - Collection field management
   - Content type configuration

#### Tasks per Page
1. Create page component
2. Implement data fetching with React Query
3. Build form handling with React Hook Form
4. Implement client-side validation
5. Handle loading/error states
6. Test all user interactions
7. Ensure exact UI match with current design

**Deliverables**:
- ✅ Core admin pages in React
- ✅ Full feature parity with current pages
- ✅ Optimistic updates for better UX
- ✅ Client-side caching with React Query

---

### Phase 4: Admin Pages - Part 2 (Week 5-6)
**Goal**: Migrate remaining admin pages

#### Pages
1. **User Management**
   - `/admin/users` - User list
   - `/admin/users/:id` - User profile
   - User invitation flow
   - Role management

2. **Media Library**
   - `/admin/media` - Media browser
   - Upload interface (drag-drop)
   - Image preview/editing
   - Media metadata editing
   - Cloudflare Images integration

3. **Settings Pages**
   - `/admin/settings` - General settings
   - `/admin/design` - Design customization
   - `/admin/api-reference` - API documentation

4. **Plugin Pages**
   - `/admin/faq` - FAQ management
   - `/admin/workflow` - Workflow automation
   - `/admin/logs` - System logs viewer

5. **Advanced Features**
   - Real-time updates (WebSocket/SSE)
   - Collaborative editing indicators
   - Keyboard shortcuts
   - Command palette (Cmd+K)

**Deliverables**:
- ✅ All admin pages migrated
- ✅ Advanced UX features implemented
- ✅ Performance optimized (code splitting, lazy loading)

---

### Phase 5: Testing & Quality Assurance (Week 7)
**Goal**: Ensure production readiness

#### Testing Strategy
1. **Unit Tests**
   - Vitest for component testing
   - React Testing Library
   - Test coverage > 70% for critical paths

2. **Integration Tests**
   - Test user flows (login → create content → publish)
   - API integration tests
   - Form submission tests

3. **E2E Tests**
   - Playwright or Cypress
   - Critical user journeys
   - Cross-browser testing

4. **Performance Testing**
   - Lighthouse scores (90+ for all metrics)
   - Bundle size analysis
   - Render performance profiling
   - Memory leak detection

5. **Accessibility Testing**
   - WCAG 2.1 AA compliance
   - Screen reader testing
   - Keyboard navigation testing
   - Color contrast validation

6. **Visual Regression Testing**
   - Compare React UI with current template UI
   - Ensure pixel-perfect match
   - Test responsive breakpoints

**Deliverables**:
- ✅ Comprehensive test suite
- ✅ 90+ Lighthouse scores
- ✅ Zero visual regressions
- ✅ Accessibility compliant

---

### Phase 6: Deployment & Migration (Week 8)
**Goal**: Ship React UI to production

#### Deployment Strategy
1. **Feature Flag Approach**
   - Add feature flag: `ENABLE_REACT_UI`
   - Deploy both UIs simultaneously
   - Gradual rollout to users (10% → 50% → 100%)

2. **Routing Strategy**
   - Option A: `/admin-react/*` for new UI (test alongside old)
   - Option B: Feature flag at backend redirects to React bundle
   - Option C: A/B test with session-based routing

3. **Build Configuration**
   - Optimize Vite build for production
   - Configure caching headers
   - Set up CDN for static assets (R2 bucket)
   - Implement service worker for offline support

4. **Monitoring & Analytics**
   - Add error tracking (Sentry/Cloudflare Web Analytics)
   - Performance monitoring (Core Web Vitals)
   - User analytics (events, page views)
   - Track migration metrics (adoption rate, errors)

5. **Rollback Plan**
   - Keep old template system intact
   - Quick toggle to disable React UI
   - Database rollback procedure (if needed)

**Deliverables**:
- ✅ React UI deployed to production
- ✅ Monitoring and analytics in place
- ✅ Rollback plan documented and tested
- ✅ 100% user migration completed

---

### Phase 7: Cleanup & Optimization (Week 9)
**Goal**: Remove old code, optimize bundle

#### Tasks
1. **Code Cleanup**
   - Remove old template files (`src/templates/**`)
   - Remove unused middleware
   - Remove HTMX dependencies
   - Clean up unused npm packages

2. **Bundle Optimization**
   - Code splitting by route
   - Lazy load heavy components
   - Tree-shaking optimization
   - Image optimization
   - Font optimization (subset, preload)

3. **Performance Tuning**
   - Implement virtual scrolling for large lists
   - Optimize re-renders (React.memo, useMemo)
   - Prefetch data on hover (navigation links)
   - Implement request deduplication

4. **Documentation**
   - Update developer documentation
   - Create component usage guides
   - Document state management patterns
   - Create troubleshooting guide

5. **Developer Experience**
   - Set up ESLint + Prettier for React
   - Configure pre-commit hooks
   - Update contributing guidelines
   - Create React coding standards doc

**Deliverables**:
- ✅ Old code removed
- ✅ Optimized bundle size (<200kb initial)
- ✅ Updated documentation
- ✅ Improved DX for future development

---

## API Changes Required

### New API Endpoints Needed
Most existing API endpoints can be reused, but some new ones may be needed:

1. **Batch Operations**
   - `POST /api/content/batch` - Batch content operations
   - `POST /api/media/batch` - Batch media operations

2. **Real-time Features**
   - `GET /api/stream/notifications` - SSE endpoint
   - `GET /api/stream/presence` - Collaborative editing presence

3. **Enhanced Responses**
   - Pagination metadata in all list endpoints
   - Include related resources in responses (reduce round-trips)
   - Add `include` query param for resource expansion

### API Improvements
1. **Consistent Response Format**
   ```typescript
   {
     data: T | T[],
     meta: {
       total: number,
       page: number,
       limit: number
     },
     links: {
       next: string,
       prev: string
     }
   }
   ```

2. **Error Format Standardization**
   ```typescript
   {
     error: {
       code: string,
       message: string,
       details: Record<string, string[]>
     }
   }
   ```

3. **Add Rate Limiting Headers**
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`

---

## Technical Decisions

### State Management
**Decision**: Start with Context API + hooks, migrate to Zustand if needed

**Rationale**:
- Context API sufficient for initial implementation
- Avoid premature optimization
- Zustand easy to add later if performance issues arise

### Data Fetching
**Decision**: TanStack Query (React Query)

**Rationale**:
- Built-in caching, background refetching
- Optimistic updates out of the box
- DevTools for debugging
- Industry standard for React data fetching

### Styling
**Decision**: Keep Tailwind + Catalyst tokens

**Rationale**:
- Already using Tailwind
- No CSS-in-JS overhead
- Familiar to existing codebase
- Design tokens provide consistency

### Form Handling
**Decision**: React Hook Form + Zod

**Rationale**:
- Performant (uncontrolled inputs)
- Zod integration for type-safe validation
- Good DX with TypeScript
- Minimal re-renders

### Build Tool
**Decision**: Vite

**Rationale**:
- Fast HMR in development
- Excellent Cloudflare Workers support
- Modern ESM-based bundling
- Great TypeScript support
- Plugin ecosystem

---

## Risk Mitigation

### Risk 1: Visual Inconsistency
**Impact**: High
**Probability**: Medium

**Mitigation**:
- Set up visual regression testing early (Week 2)
- Create side-by-side comparison tool
- Regular design reviews
- Pixel-perfect component library before page migration

### Risk 2: Performance Degradation
**Impact**: High
**Probability**: Low

**Mitigation**:
- Performance budgets from Day 1
- Lighthouse CI in GitHub Actions
- Bundle size monitoring
- React DevTools profiling during development

### Risk 3: Auth/Security Issues
**Impact**: Critical
**Probability**: Low

**Mitigation**:
- Thorough auth flow testing
- Security audit before production
- Token refresh mechanism
- XSS/CSRF protection review

### Risk 4: Data Loss During Migration
**Impact**: Critical
**Probability**: Very Low

**Mitigation**:
- No database changes required
- API compatibility maintained
- Feature flag for instant rollback
- Backup plan with old templates

### Risk 5: Timeline Overrun
**Impact**: Medium
**Probability**: Medium

**Mitigation**:
- Weekly progress reviews
- Flexible scope (nice-to-haves can be deferred)
- Parallel development where possible
- Clear prioritization (core features first)

---

## Success Metrics

### Technical Metrics
- ✅ Lighthouse Performance Score: 90+
- ✅ Lighthouse Accessibility Score: 100
- ✅ First Contentful Paint: <1.5s
- ✅ Time to Interactive: <3s
- ✅ Bundle Size (initial): <200kb gzipped
- ✅ Test Coverage: >70%

### User Experience Metrics
- ✅ Zero visual regressions
- ✅ Feature parity: 100%
- ✅ Page load time reduction: >30%
- ✅ Interaction responsiveness: <100ms
- ✅ Crash-free rate: >99.9%

### Business Metrics
- ✅ Zero data loss incidents
- ✅ User adoption: 100% within 2 weeks
- ✅ Support tickets: <5 migration-related
- ✅ Developer velocity: +50% (after migration)

---

## Team & Resources

### Required Skills
- React + TypeScript expertise
- Tailwind CSS proficiency
- API design knowledge
- Testing (unit, integration, E2E)
- Cloudflare Workers experience

### Estimated Effort
- **Total**: 9 weeks (1 developer full-time)
- **Can be parallelized**: 6 weeks (2 developers)

### Dependencies
- Design approval for any UI changes
- QA resources for testing (Week 7)
- DevOps for deployment configuration

---

## Open Questions

1. **Rich Text Editor**: Which library? (TipTap, Slate, Lexical?)
2. **Image Editing**: Client-side editing or server-side?
3. **Real-time Collaboration**: Required for v1 or defer to v2?
4. **Offline Support**: Service worker + IndexedDB caching?
5. **Mobile Admin**: Responsive only or dedicated mobile app?
6. **Internationalization**: i18n support from day 1?
7. **Theme Customization**: Runtime theme switching?
8. **Analytics**: Which platform (Cloudflare, Google, PostHog)?

---

## Next Steps

1. **Week 0 (Pre-work)**
   - [ ] Review and approve this plan
   - [ ] Set up project board (Linear/Jira)
   - [ ] Create GitHub project for tracking
   - [ ] Provision development environment
   - [ ] Schedule kickoff meeting

2. **Week 1 (Immediate)**
   - [ ] Initialize React + Vite setup
   - [ ] Configure build pipeline
   - [ ] Set up authentication flow
   - [ ] Create API client boilerplate

3. **Week 2 (Component Library)**
   - [ ] Build base UI components
   - [ ] Set up Storybook
   - [ ] Visual regression testing
   - [ ] Design system documentation

---

## Appendix

### Technology Stack Details

#### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.55.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.8",
    "axios": "^1.7.0",
    "zustand": "^4.5.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "playwright": "^1.47.0",
    "typescript": "^5.6.0"
  }
}
```

#### Build Configuration Files
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript config (frontend)
- `tsconfig.node.json` - TypeScript config (backend)
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `.eslintrc.json` - ESLint rules
- `playwright.config.ts` - E2E test config
- `vitest.config.ts` - Unit test config

### File Naming Conventions
- Components: `PascalCase.tsx` (e.g., `Button.tsx`)
- Hooks: `useCamelCase.ts` (e.g., `useAuth.ts`)
- Utils: `camelCase.ts` (e.g., `apiClient.ts`)
- Types: `PascalCase.types.ts` (e.g., `User.types.ts`)
- Constants: `UPPER_SNAKE_CASE.ts` (e.g., `API_ROUTES.ts`)

### Folder Structure Template
```
frontend/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── forms/
│   │   ├── LoginForm.tsx
│   │   ├── ContentForm.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── AdminLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── features/
│       ├── content/
│       ├── media/
│       └── users/
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── ContentList.tsx
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── useContent.ts
│   └── ...
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── lib/
│   ├── apiClient.ts
│   ├── utils.ts
│   └── constants.ts
├── types/
│   ├── api.types.ts
│   ├── content.types.ts
│   └── ...
├── styles/
│   ├── globals.css
│   └── tailwind.css
└── main.tsx
```

---

**Document Version**: 1.0
**Last Updated**: October 2, 2025
**Author**: Claude Code
**Status**: Draft - Awaiting Approval
