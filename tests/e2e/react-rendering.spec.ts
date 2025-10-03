import { test, expect } from '@playwright/test'

const VITE_URL = process.env.VITE_URL || 'http://localhost:3002'

test.describe('React App Rendering', () => {
  test('should render login page correctly', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Listen for page errors
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error)
    })

    await page.goto(`${VITE_URL}/auth/login`)
    await page.waitForLoadState('networkidle')

    // Log any errors found
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors)
    }
    if (pageErrors.length > 0) {
      console.log('Page errors:', pageErrors.map((e) => e.message))
    }

    // Check if root div has content
    const rootContent = await page.locator('#root').innerHTML()
    console.log('Root content length:', rootContent.length)
    console.log('Root content preview:', rootContent.substring(0, 500))

    // Root should have content (React should have rendered)
    expect(rootContent.length).toBeGreaterThan(0)

    // Should not have React errors
    expect(pageErrors.length).toBe(0)
  })

  test('should render login form elements', async ({ page }) => {
    await page.goto(`${VITE_URL}/auth/login`)
    await page.waitForTimeout(2000) // Give React time to render

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true })

    // Check for login heading
    const loginHeading = page.getByRole('heading', { name: /welcome to sonicjs/i })
    await expect(loginHeading).toBeVisible({ timeout: 5000 })

    // Check for email input
    const emailInput = page.getByLabel(/email/i)
    await expect(emailInput).toBeVisible()

    // Check for password input
    const passwordInput = page.getByLabel(/password/i)
    await expect(passwordInput).toBeVisible()

    // Check for submit button
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await expect(submitButton).toBeVisible()
  })

  test('should have proper page structure', async ({ page }) => {
    await page.goto(`${VITE_URL}/auth/login`)
    await page.waitForLoadState('networkidle')

    // Check if React root is mounted
    const root = page.locator('#root')
    await expect(root).toBeVisible()

    // Check if there's actual content in the root
    const hasContent = await root.evaluate((el) => {
      return el.children.length > 0
    })

    expect(hasContent).toBeTruthy()
  })
})
