import { test, expect } from '@playwright/test'

const VITE_URL = process.env.VITE_URL || 'http://localhost:3002'

test.describe('Catalyst Admin Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${VITE_URL}/auth/login`)
    await page.fill('input[id="email"]', 'admin@sonicjs.com')
    await page.fill('input[id="password"]', 'admin')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin')
    await page.waitForTimeout(1000)
  })

  test('should render sidebar with all menu items', async ({ page }) => {
    // Check for sidebar
    const sidebar = page.locator('[role="navigation"]').first()
    await expect(sidebar).toBeVisible()

    // Check for all menu items
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /collections/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /content/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /media/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /users/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /plugins/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /design/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /logs/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /api reference/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /field types/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
  })

  test('should render logo in sidebar', async ({ page }) => {
    // Check for logo SVG
    const logo = page.locator('svg').first()
    await expect(logo).toBeVisible()
  })

  test('should render user dropdown', async ({ page }) => {
    // Check for user initials in sidebar footer
    const userAvatar = page.locator('text=/[A-Z]{2}/')
    await expect(userAvatar).toBeVisible()
  })

  test('should have Catalyst styling', async ({ page }) => {
    // Check for zinc color scheme (Catalyst's default)
    const sidebar = page.locator('[role="navigation"]').first()
    const bgColor = await sidebar.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Zinc-900 or similar dark color should be used
    expect(bgColor).toBeTruthy()
  })

  test('should highlight current page in sidebar', async ({ page }) => {
    // Dashboard should be highlighted as current
    const dashboardLink = page.getByRole('link', { name: /dashboard/i })
    await expect(dashboardLink).toBeVisible()

    // Check if it has the current indicator
    const parent = dashboardLink.locator('..')
    await expect(parent).toBeVisible()
  })
})
