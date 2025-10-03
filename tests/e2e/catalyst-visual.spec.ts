import { test, expect } from '@playwright/test'

const VITE_URL = process.env.VITE_URL || 'http://localhost:3002'

test('verify Catalyst layout renders with styles', async ({ page }) => {
  // Go to login page
  await page.goto(`${VITE_URL}/auth/login`)

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // Check that Tailwind is loaded by verifying button has gradient background
  const signInButton = page.getByRole('button', { name: /sign in/i })
  await expect(signInButton).toBeVisible()

  const buttonBg = await signInButton.evaluate((el) => {
    return window.getComputedStyle(el).backgroundImage
  })

  console.log('Sign In button background:', buttonBg)
  expect(buttonBg).toContain('gradient')

  // Take screenshot of login page
  await page.screenshot({ path: 'test-results/react-login-styled.png', fullPage: true })

  // Try to login
  await page.fill('input[id="email"]', 'admin@sonicjs.com')
  await page.fill('input[id="password"]', 'admin')

  // Take screenshot before clicking
  await page.screenshot({ path: 'test-results/react-login-filled.png', fullPage: true })

  // Click sign in and wait briefly
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)

  // Take screenshot of whatever page we're on
  await page.screenshot({ path: 'test-results/react-after-login.png', fullPage: true })

  // Check if we're on admin page OR still on login page
  const currentUrl = page.url()
  console.log('Current URL after login:', currentUrl)

  // If we're on admin page, check for sidebar
  if (currentUrl.includes('/admin')) {
    console.log('Successfully navigated to admin!')

    // Check for Catalyst sidebar styling
    const sidebar = page.locator('nav').first()
    await expect(sidebar).toBeVisible()

    const sidebarBg = await sidebar.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    console.log('Sidebar background color:', sidebarBg)

    // Take final screenshot of admin dashboard
    await page.screenshot({ path: 'test-results/react-admin-catalyst.png', fullPage: true })
  } else {
    console.log('Still on login page')

    // Check for error message
    const errorMessage = await page.locator('text=/invalid|error|failed/i').first()
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent()
      console.log('Error message:', errorText)
    }
  }
})
