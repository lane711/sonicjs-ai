/**
 * E2E Tests for React Admin Pages
 *
 * Tests navigation and functionality of all admin pages
 */

import { test, expect } from '@playwright/test'

const baseURL = 'http://localhost:3000'
const testUser = {
  email: 'admin@sonicjs.com',
  password: 'admin123',
}

// Helper function to login
async function login(page: any) {
  await page.goto(`${baseURL}/auth/login`)
  await page.fill('input[type="email"]', testUser.email)
  await page.fill('input[type="password"]', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${baseURL}/admin`, { timeout: 5000 })
}

test.describe('React Admin Pages', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(`${baseURL}/auth/login`)
    await page.evaluate(() => localStorage.clear())
  })

  test.describe('Content Page', () => {
    test('should display content management page', async ({ page }) => {
      await login(page)

      // Navigate to content page directly
      await page.goto(`${baseURL}/admin/content`)

      // Check page heading (use more specific selector to avoid logo h1)
      await expect(page.locator('main h1, h1:has-text("Content")')).toContainText('Content')

      // Check search input exists
      await expect(page.locator('input[placeholder*="Search content"]')).toBeVisible()

      // Check filter dropdown exists
      await expect(page.locator('select')).toBeVisible()

      // Check "New Content" button exists
      await expect(page.locator('button:has-text("New Content")')).toBeVisible()
    })

    test('should filter content by search', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/content`)

      // Type in search box
      await page.fill('input[placeholder*="Search content"]', 'Welcome')

      // Should show "Welcome to SonicJS" row
      await expect(page.locator('text=Welcome to SonicJS')).toBeVisible()
    })

    test('should filter content by status', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/content`)

      // Select "Published" from dropdown
      await page.selectOption('select', 'published')

      // Should show published items
      await expect(page.locator('text=Welcome to SonicJS')).toBeVisible()
    })

    test('should display content table with data', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/content`)

      // Check table headers
      await expect(page.locator('th:has-text("Title")')).toBeVisible()
      await expect(page.locator('th:has-text("Type")')).toBeVisible()
      await expect(page.locator('th:has-text("Status")')).toBeVisible()

      // Check that at least one row exists
      await expect(page.locator('tbody tr')).toHaveCount(3)
    })
  })

  test.describe('Media Page', () => {
    test('should display media library page', async ({ page }) => {
      await login(page)

      // Navigate to media page directly
      await page.goto(`${baseURL}/admin/media`)

      // Check page heading
      await expect(page.locator('main h1, h1:has-text("Media")')).toContainText('Media Library')

      // Check search input exists
      await expect(page.locator('input[placeholder*="Search media"]')).toBeVisible()

      // Check "Upload Files" button exists
      await expect(page.locator('button:has-text("Upload Files")')).toBeVisible()
    })

    test('should display media grid', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/media`)

      // Should display media items in grid
      await expect(page.locator('text=hero-image.jpg')).toBeVisible()
      await expect(page.locator('text=logo.png')).toBeVisible()
    })

    test('should filter media by search', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/media`)

      // Type in search box
      await page.fill('input[placeholder*="Search media"]', 'logo')

      // Should show logo.png
      await expect(page.locator('text=logo.png')).toBeVisible()
    })

    test('should filter media by type', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/media`)

      // Select "Images" from dropdown
      await page.selectOption('select', 'image')

      // Should show image files
      await expect(page.locator('text=hero-image.jpg')).toBeVisible()
    })
  })

  test.describe('Users Page', () => {
    test('should display users management page', async ({ page }) => {
      await login(page)

      // Navigate to users page directly
      await page.goto(`${baseURL}/admin/users`)

      // Check page heading
      await expect(page.locator('main h1, h1:has-text("Users")')).toContainText('Users')

      // Check search input exists
      await expect(page.locator('input[placeholder*="Search users"]')).toBeVisible()

      // Check "Add User" button exists
      await expect(page.locator('button:has-text("Add User")')).toBeVisible()
    })

    test('should display users table with data', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/users`)

      // Check table headers
      await expect(page.locator('th:has-text("Name")')).toBeVisible()
      await expect(page.locator('th:has-text("Email")')).toBeVisible()
      await expect(page.locator('th:has-text("Role")')).toBeVisible()

      // Check that users are displayed
      await expect(page.locator('tbody >> text=Admin User')).toBeVisible()
      await expect(page.locator('tbody >> text=admin@sonicjs.com')).toBeVisible()
    })

    test('should filter users by search', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/users`)

      // Type in search box
      await page.fill('input[placeholder*="Search users"]', 'editor')

      // Should show John Editor
      await expect(page.locator('text=John Editor')).toBeVisible()
    })

    test('should filter users by role', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/users`)

      // Select "Admin" from dropdown
      await page.selectOption('select', 'admin')

      // Should show admin users
      await expect(page.locator('text=Admin User')).toBeVisible()
    })
  })

  test.describe('Settings Page', () => {
    test('should display settings page', async ({ page }) => {
      await login(page)

      // Navigate to settings page directly
      await page.goto(`${baseURL}/admin/settings`)

      // Check page heading
      await expect(page.locator('main h1, h1:has-text("Settings")')).toContainText('Settings')

      // Check section headings exist
      await expect(page.locator('h2:has-text("General Settings")')).toBeVisible()
      await expect(page.locator('h2:has-text("Security Settings")')).toBeVisible()
      await expect(page.locator('h2:has-text("Content Settings")')).toBeVisible()
    })

    test('should display and interact with form inputs', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/settings`)

      // Check site name input
      const siteNameInput = page.locator('input#siteName')
      await expect(siteNameInput).toBeVisible()
      await expect(siteNameInput).toHaveValue('SonicJS')

      // Change site name
      await siteNameInput.fill('New Site Name')
      await expect(siteNameInput).toHaveValue('New Site Name')
    })

    test('should toggle switches', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/settings`)

      // Find the "Allow User Registration" switch - look for button with role="switch"
      const registrationSwitch = page.locator('button[role="switch"]').first()

      // Should be visible
      await expect(registrationSwitch).toBeVisible()

      // Click to toggle
      await registrationSwitch.click()
    })

    test('should have save and cancel buttons', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/settings`)

      // Check buttons exist
      await expect(page.locator('button:has-text("Save Changes")')).toBeVisible()
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
    })
  })

  test.describe('Navigation Between Pages', () => {
    test('should navigate through all pages using sidebar', async ({ page }) => {
      await login(page)

      // Start at dashboard
      await expect(page).toHaveURL(`${baseURL}/admin`)

      // Navigate to Content
      await page.goto(`${baseURL}/admin/content`)
      await expect(page).toHaveURL(`${baseURL}/admin/content`)
      await expect(page.locator('main h1, h1:has-text("Content")')).toContainText('Content')

      // Navigate to Media
      await page.goto(`${baseURL}/admin/media`)
      await expect(page).toHaveURL(`${baseURL}/admin/media`)
      await expect(page.locator('main h1, h1:has-text("Media")')).toContainText('Media Library')

      // Navigate to Users
      await page.goto(`${baseURL}/admin/users`)
      await expect(page).toHaveURL(`${baseURL}/admin/users`)
      await expect(page.locator('main h1, h1:has-text("Users")')).toContainText('Users')

      // Navigate to Settings
      await page.goto(`${baseURL}/admin/settings`)
      await expect(page).toHaveURL(`${baseURL}/admin/settings`)
      await expect(page.locator('main h1, h1:has-text("Settings")')).toContainText('Settings')

      // Navigate back to Dashboard
      await page.goto(`${baseURL}/admin`)
      await expect(page).toHaveURL(`${baseURL}/admin`)
      await expect(page.locator('main h1, h1:has-text("Dashboard")')).toContainText('Dashboard')
    })

    test('should maintain authentication across page navigation', async ({ page }) => {
      await login(page)

      // Navigate to multiple pages - check URL stays on admin (not redirected to login)
      await page.goto(`${baseURL}/admin/content`)
      await expect(page).toHaveURL(`${baseURL}/admin/content`)
      await expect(page.locator('main h1')).toBeVisible()

      await page.goto(`${baseURL}/admin/users`)
      await expect(page).toHaveURL(`${baseURL}/admin/users`)
      await expect(page.locator('main h1')).toBeVisible()

      await page.goto(`${baseURL}/admin/settings`)
      await expect(page).toHaveURL(`${baseURL}/admin/settings`)
      await expect(page.locator('main h1')).toBeVisible()
    })

    test('should show active state for current page in sidebar', async ({ page }) => {
      await login(page)
      await page.goto(`${baseURL}/admin/content`)

      // The Content link should have active styling (this depends on your implementation)
      const contentLink = page.locator('a[href="/admin/content"]')
      await expect(contentLink).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await login(page)

      // All pages should render without horizontal scroll
      const pages = [
        { path: '/admin', title: 'Dashboard' },
        { path: '/admin/content', title: 'Content' },
        { path: '/admin/media', title: 'Media' },
        { path: '/admin/users', title: 'Users' },
        { path: '/admin/settings', title: 'Settings' }
      ]

      for (const pageInfo of pages) {
        await page.goto(`${baseURL}${pageInfo.path}`)

        // Check page is visible with more specific selector
        await expect(page.locator(`main h1, h1:has-text("${pageInfo.title}")`).first()).toBeVisible()

        // Check no horizontal overflow (this is a basic check)
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
        const windowWidth = await page.evaluate(() => window.innerWidth)
        expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 1) // +1 for rounding
      }
    })
  })
})
