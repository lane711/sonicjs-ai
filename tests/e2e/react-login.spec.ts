import { test, expect } from '@playwright/test'

test.describe('React Login Flow', () => {
  const baseURL = 'http://localhost:3000'
  const testUser = {
    email: 'admin@sonicjs.com',
    password: 'admin123',
  }

  test.beforeEach(async ({ page, context }) => {
    // Clear any existing auth state
    await context.clearCookies()
    // Go to page first so localStorage is available
    await page.goto(`${baseURL}/auth/login`)
    await page.evaluate(() => localStorage.clear())
  })

  test('should display login page', async ({ page }) => {
    await page.goto(`${baseURL}/auth/login`)

    // Check page title and form elements
    await expect(page.locator('h1')).toContainText('Sign in')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(`${baseURL}/auth/login`)

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 })
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto(`${baseURL}/auth/login`)

    // Fill in valid credentials
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(`${baseURL}/admin`, { timeout: 5000 })

    // Verify we're on the dashboard
    await expect(page.locator('h1')).toContainText('Dashboard')

    // Verify user info is displayed
    await expect(page.locator('text=admin@sonicjs.com')).toBeVisible()
  })

  test('should store auth token in localStorage', async ({ page }) => {
    await page.goto(`${baseURL}/auth/login`)

    // Login
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')

    // Wait for redirect
    await page.waitForURL(`${baseURL}/admin`, { timeout: 5000 })

    // Check localStorage has token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(token).toBeTruthy()
    expect(token).toMatch(/^eyJ/) // JWT tokens start with eyJ
  })

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto(`${baseURL}/admin`)

    // Should redirect to login
    await page.waitForURL(`${baseURL}/auth/login`, { timeout: 5000 })
  })

  test('should redirect to dashboard when accessing login page while authenticated', async ({ page }) => {
    // First login
    await page.goto(`${baseURL}/auth/login`)
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${baseURL}/admin`, { timeout: 5000 })

    // Try to go back to login page
    await page.goto(`${baseURL}/auth/login`)

    // Should redirect back to dashboard
    await page.waitForURL(`${baseURL}/admin`, { timeout: 5000 })
  })

  test('should persist authentication across page refreshes', async ({ page }) => {
    // Login
    await page.goto(`${baseURL}/auth/login`)
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${baseURL}/admin`, { timeout: 5000 })

    // Reload page
    await page.reload()

    // Should still be authenticated
    await expect(page).toHaveURL(`${baseURL}/admin`)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should navigate sidebar menu items', async ({ page }) => {
    // Login first
    await page.goto(`${baseURL}/auth/login`)
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${baseURL}/admin`, { timeout: 5000 })

    // Verify sidebar is visible
    await expect(page.locator('text=SonicJS')).toBeVisible()
    await expect(page.locator('a[href="/admin"]')).toBeVisible()

    // Check for common menu items
    const dashboardLink = page.locator('a[href="/admin"]').first()
    await expect(dashboardLink).toBeVisible()
  })

  test('should display dashboard components', async ({ page }) => {
    // Login
    await page.goto(`${baseURL}/auth/login`)
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${baseURL}/admin`, { timeout: 5000 })

    // Check for dashboard components
    await expect(page.locator('text=Phase 2 Complete')).toBeVisible()
    await expect(page.locator('text=Catalyst Design System')).toBeVisible()

    // Check for stats cards
    await expect(page.locator('text=Content Items')).toBeVisible()
    await expect(page.locator('text=Collections')).toBeVisible()
    await expect(page.locator('text=Media Files')).toBeVisible()

    // Check for test modal button
    const modalButton = page.locator('button:has-text("Test Modal")')
    await expect(modalButton).toBeVisible()

    // Click modal button and verify modal opens
    await modalButton.click()
    await expect(page.locator('text=Example Modal')).toBeVisible()
  })
})
